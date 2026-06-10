"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiInbox, FiChevronLeft } from 'react-icons/fi';
import { supabase } from '@/lib/supabase/client';

import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type SurveyResponse = {
  id: string;
  color: number;
  aroma: number;
  sabor: number;
  textura: number;
  nivel_salado: number;
  sabor_garbanzo: number;
  aceptacion_global: number;
  consumiria_nuevamente: boolean;
  compraria_en_bar: boolean;
  cuanto_pagaria: number | null;
  comentarios: string | null;
};

export default function Resultados() {
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const password = String(new FormData(form).get('password') ?? '');

    if (password === 'nutriscone2026') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setLoading(true);
      setFetchError('');

      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching data:', error);
        setData([]);
        setFetchError(error.message || 'No se pudieron cargar los resultados.');
      } else {
        setData(responses as SurveyResponse[]);
      }
      setLoading(false);
    };

    fetchData();

    // Suscribirse a cambios en tiempo real (opcional)
    const channel = supabase
      .channel('public:survey_responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'survey_responses' }, payload => {
        setData(current => [...current, payload.new as SurveyResponse]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // fetchData se declara dentro del efecto para evitar acceder a la función antes de su definición.

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand/20">
              <span className="text-2xl text-brand">🔒</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Acceso Restringido</h1>
            <p className="text-slate-500">Ingresa la contraseña para ver los resultados</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                name="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#7B5434] focus:border-[#7B5434] transition-all outline-none placeholder-slate-500 text-slate-800"
              />
              {authError && <p className="text-rose-500 text-sm mt-2 font-medium">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full btn-brand btn-hover-opacity py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg font-bold"
            >
              Ingresar al Dashboard
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex flex-col items-center justify-center p-4">
        <div
          role="alert"
          className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full border border-rose-200 text-center"
        >
          <h2 className="text-2xl font-bold text-slate-800">No se pudieron cargar los resultados</h2>
          <p className="text-slate-600 mt-3">
            Revisá que las variables de Supabase estén configuradas y que la tabla permita lectura pública para el dashboard.
          </p>
          <p className="text-sm text-rose-600 mt-4 break-words">{fetchError}</p>
          <button
            type="button"
            onClick={() => {
              setFetchError('');
              setIsAuthenticated(false);
            }}
            className="mt-6 btn-brand btn-hover-opacity py-3 px-5 rounded-xl transition-colors shadow-md font-bold"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex flex-col items-center justify-center p-4">
        <div className="mb-4"><FiInbox className="w-12 h-12 text-slate-400" /></div>
        <h2 className="text-2xl font-bold text-slate-800">Aún no hay respuestas</h2>
        <p className="text-slate-500 mt-2">Comparte la URL /encuesta para empezar a recibir datos.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-accent font-medium hover:underline"><FiChevronLeft className="w-4 h-4" /> Volver al inicio</Link>
      </div>
    );
  }

  // --- Cálculos Estadísticos ---
  const total = data.length;

  const calculateAverage = (key: keyof SurveyResponse) => {
    const sum = data.reduce((acc, curr) => acc + (curr[key] as number), 0);
    return (sum / total).toFixed(2);
  };

  const promedios = {
    color: calculateAverage('color'),
    aroma: calculateAverage('aroma'),
    sabor: calculateAverage('sabor'),
    textura: calculateAverage('textura'),
    nivel_salado: calculateAverage('nivel_salado'),
    sabor_garbanzo: calculateAverage('sabor_garbanzo'),
    aceptacion_global: calculateAverage('aceptacion_global'),
  };

  const consumiriaSi = data.filter(r => r.consumiria_nuevamente).length;
  const consumiriaNo = total - consumiriaSi;

  // --- Cálculos para Cuánto Pagaría ---
  const cuantoPagariaValues = data
    .map(r => r.cuanto_pagaria)
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const minPagaria = cuantoPagariaValues.length > 0 ? Math.min(...cuantoPagariaValues) : 0;
  const maxPagaria = cuantoPagariaValues.length > 0 ? Math.max(...cuantoPagariaValues) : 0;

  let averagePagaria = 0;
  if (cuantoPagariaValues.length > 0) {
    // Filtrar outliers usando Rango Intercuartílico (IQR) para no romper el promedio
    const sorted = [...cuantoPagariaValues].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    // Rango aceptado
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const filteredValues = sorted.filter(v => v >= lowerBound && v <= upperBound);
    const finalValues = filteredValues.length > 0 ? filteredValues : sorted;
    
    const sum = finalValues.reduce((acc, val) => acc + val, 0);
    averagePagaria = sum / finalValues.length;
  }

  // --- Comentarios ---
  const comentariosList = data
    .map(r => r.comentarios)
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);

  // --- Configuraciones de Gráficos ---
  const barChartData = {
    labels: [
      'Color', 
      'Aroma', 
      'Sabor', 
      'Textura', 
      'Nivel de Sal', 
      'Sabor Garbanzo', 
      'Aceptación Global'
    ],
    datasets: [
      {
        label: 'Promedio de Evaluación (1 al 5)',
        data: [
          promedios.color,
          promedios.aroma,
          promedios.sabor,
          promedios.textura,
          promedios.nivel_salado,
          promedios.sabor_garbanzo,
          promedios.aceptacion_global,
        ],
        backgroundColor: 'rgba(226, 134, 74, 0.8)', // brand-accent
        borderColor: 'rgba(226, 134, 74, 1)',       // brand-accent solid
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const pieChartData = {
    labels: ['Sí, consumiría nuevamente', 'No consumiría'],
    datasets: [
      {
        data: [consumiriaSi, consumiriaNo],
        backgroundColor: [
          'rgba(123, 84, 52, 0.9)', // brand-primary
          'rgba(196, 182, 135, 0.9)', // brand-secondary
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FBF4E4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dashboard de Resultados</h1>
            <p className="mt-2 text-lg text-slate-600">Análisis en tiempo real de los Scones de Garbanzo</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
            <span className="block text-3xl font-black text-brand">{total}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Respuestas</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Gráfico de Barras - Promedios */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Promedios por Categoría</h2>
            <div className="h-80">
              <Bar 
                data={barChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, max: 5 },
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }} 
              />
            </div>
          </div>

          {/* Gráfico de Torta - Intención de Consumo */}
          <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">¿Consumiría Nuevamente?</h2>
            <div className="h-64 w-full flex justify-center">
              <Pie 
                data={pieChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          </div>

        </div>

        {/* Sección de Precio Dispuesto a Pagar */}
        <div className="mt-8 bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Análisis de Precio de Venta (Porción 3 scones)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center border border-[#C4B687]/40 flex flex-col justify-center">
              <span className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Mínimo</span>
              <span className="text-3xl font-black text-slate-700">${minPagaria.toLocaleString('es-AR')}</span>
            </div>
            <div className="bg-brand-50 rounded-2xl p-6 text-center border border-brand/30 shadow-sm transform scale-105 flex flex-col justify-center">
              <span className="block text-sm font-semibold text-brand uppercase tracking-wider mb-2">Promedio Estimado*</span>
              <span className="text-4xl font-black text-brand">${Math.round(averagePagaria).toLocaleString('es-AR')}</span>
              <p className="text-xs text-brand mt-2 opacity-80">*Filtrando valores atípicos (outliers) extremos</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-[#C4B687]/40 flex flex-col justify-center">
              <span className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Máximo</span>
              <span className="text-3xl font-black text-slate-700">${maxPagaria.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        {/* Sección de Comentarios */}
        {comentariosList.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl shadow-lg p-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="mr-3">💬</span>
              Comentarios de los Comensales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comentariosList.map((comentario, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 border border-[#C4B687]/40 shadow-sm relative">
                  <div className="text-6xl text-brand absolute -top-2 left-2 font-serif opacity-20">&quot;</div>
                  <p className="text-slate-700 italic relative z-10 pt-4 leading-relaxed">{comentario}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
            <span className="mr-2">←</span> Volver al panel de control
          </Link>
        </div>
      </div>
    </div>
  );
}
