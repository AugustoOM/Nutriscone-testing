"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { FiCheckCircle, FiChevronLeft } from 'react-icons/fi';

const QUESTIONS = [
  { id: 'color', label: '1. ¿Cómo considera el color del producto?', scale: ['Muy desagradable', 'Desagradable', 'Neutro', 'Agradable', 'Muy agradable'] },
  { id: 'aroma', label: '2. ¿Cómo considera el aroma?', scale: ['Muy débil', 'Débil', 'Moderado', 'Intenso', 'Muy intenso'] },
  { id: 'sabor', label: '3. ¿Cómo considera el sabor?', scale: ['Muy desagradable', 'Desagradable', 'Neutro', 'Agradable', 'Muy agradable'] },
  { id: 'textura', label: '4. ¿Cómo percibe la textura?', scale: ['Muy seca/dura', 'Poco agradable', 'Intermedia', 'Suave y agradable', 'Muy suave y húmeda'] },
  { id: 'nivel_salado', label: '5. ¿Cómo considera el nivel de salado?', scale: ['Muy bajo', 'Bajo', 'Adecuado', 'Alto', 'Muy alto'] },
  { id: 'sabor_garbanzo', label: '6. ¿Cómo considera el sabor a garbanzo?', scale: ['Muy débil', 'Débil', 'Moderado', 'Intenso', 'Muy intenso'] },
  { id: 'aceptacion_global', label: '7. ¿Cómo considera la aceptación global del producto?', scale: ['Me disgusta mucho', 'Me disgusta', 'Ni me gusta ni me disgusta', 'Me gusta', 'Me gusta mucho'] },
];

function isPresenceUserState(value: unknown): value is { online_at: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'online_at' in value &&
    typeof value.online_at === 'string'
  );
}

export default function Encuesta() {
  const [formData, setFormData] = useState<Record<string, number | null | boolean | string>>({
    color: null,
    aroma: null,
    sabor: null,
    textura: null,
    nivel_salado: null,
    sabor_garbanzo: null,
    aceptacion_global: null,
    consumiria_nuevamente: null,
    compraria_en_bar: null,
    cuanto_pagaria: '',
    comentarios: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const router = useRouter();

  const QUEUE_THRESHOLD_USERS = 30;
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);

  const handleChange = (field: string, value: number | boolean | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que todas las preguntas fueron respondidas (comentarios es opcional)
    const requiredFields = ['color', 'aroma', 'sabor', 'textura', 'nivel_salado', 'sabor_garbanzo', 'aceptacion_global', 'consumiria_nuevamente', 'compraria_en_bar'];
    const isComplete = requiredFields.every(field => formData[field] !== null);

    if (!isComplete) {
      setErrorMessage('Por favor, completa todas las preguntas antes de enviar.');
      return;
    }

    if (formData.compraria_en_bar === true && (formData.cuanto_pagaria === '' || formData.cuanto_pagaria === null)) {
      setErrorMessage('Por favor, indica cuánto pagarías por la porción.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      // Limitar comentarios a 500 caracteres
      const dataToInsert = {
        ...formData,
        cuanto_pagaria: formData.compraria_en_bar && formData.cuanto_pagaria !== '' ? Number(formData.cuanto_pagaria) : null,
        comentarios: (formData.comentarios as string).substring(0, 500) || null,
      };

      const { error } = await supabase
        .from('survey_responses')
        .insert([dataToInsert]);

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Ocurrió un error al enviar la encuesta.';
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    if (status === 'success') {
      const timeoutId = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'success') return;

    const userId = Math.random().toString(36).substring(2, 15);
    const channel = supabase.channel('survey_presence', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        const users: { id: string; online_at: string }[] = [];

        for (const id in state) {
          count++;
          const entries = state[id] as unknown;
          const userState = Array.isArray(entries) ? entries[0] : undefined;
          if (isPresenceUserState(userState)) {
            users.push({ id, online_at: userState.online_at });
          }
        }

        setActiveUsersCount(count);
        users.sort((a, b) => new Date(a.online_at).getTime() - new Date(b.online_at).getTime());

        const myIndex = users.findIndex(u => u.id === userId);
        if (myIndex !== -1) {
          setIsWaiting(myIndex >= QUEUE_THRESHOLD_USERS - 1);
          setIsConnecting(false);
        }
      })
      .subscribe(async (subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="mb-6 flex items-center justify-center"><FiCheckCircle className="w-16 h-16 text-brand" /></div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Gracias por participar!</h2>
          <p className="text-slate-600 text-lg">Tus respuestas han sido registradas exitosamente y nos ayudarán a mejorar.</p>
          <p className="text-sm text-slate-500 mt-4">Serás redirigido al menú principal en 5 segundos...</p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#E2864A]"></div>
      </div>
    );
  }

  if (isWaiting) {
    return (
      <div className="min-h-screen bg-[#FBF4E4] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div
          role="alert"
          aria-live="assertive"
          aria-label="Usuario en cola por alta concurrencia"
          data-testid="queue-alert"
          className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl p-10 border border-[#C4B687]/40"
        >
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand/20 animate-pulse">
            <span className="text-4xl">⏳</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-[#E2864A] mb-3">Usuario en cola</p>
          <h2 className="text-3xl font-extrabold text-[#7B5434] mb-4">Te encuentras en cola</h2>
          <p className="text-lg text-slate-600 mb-6">
            Estamos recibiendo muchas respuestas simultáneas. Para garantizar la mejor experiencia, hemos habilitado una sala de espera.
          </p>
          <div className="bg-[#FBF4E4] rounded-2xl p-6 border border-[#C4B687]/30">
            <p className="text-slate-800 font-bold mb-2">Por favor, no cierres esta pestaña.</p>
            <p className="text-sm text-slate-600">
              Ingresarás automáticamente cuando se libere un lugar. Hay <strong>{activeUsersCount}</strong> personas conectadas.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/" className="inline-flex items-center text-slate-500 hover:text-[#E2864A] transition-colors font-medium">
              ← Volver al menú principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF4E4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center bg-white px-5 py-2.5 rounded-xl shadow-sm border border-[#C4B687]/50 text-slate-600 hover:text-[#7B5434] hover:bg-[#FBF4E4] transition-all font-bold">
            <FiChevronLeft className="mr-1 w-5 h-5" /> Volver al inicio
          </Link>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Evaluación de Producto</h1>
          <p className="text-lg text-slate-600">Scones de Garbanzo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="bg-white rounded-3xl shadow-md p-8 transition hover:shadow-lg">
              <h3 className="text-xl font-semibold text-slate-800 mb-6">{q.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {q.scale.map((label, index) => {
                  const value = index + 1;
                  const isSelected = formData[q.id] === value;
                  return (
                    <label
                      key={value}
                      className={`
                        relative flex flex-col items-center p-4 cursor-pointer rounded-2xl border-2 transition-all
                        ${isSelected ? 'border-brand bg-brand-50 shadow-md transform scale-105' : 'border-[#C4B687]/40 bg-white hover:bg-[#FBF4E4] hover:border-[#C4B687]'}
                      `}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={value}
                        className="sr-only"
                        onChange={() => handleChange(q.id, value)}
                      />
                      <span className="text-2xl font-bold mb-2 text-slate-700">{value}</span>
                      <span className="text-xs text-center font-medium text-slate-500 leading-tight">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-3xl shadow-md p-8 transition hover:shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 mb-6">8. ¿Consumiría nuevamente este producto?</h3>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`
                  relative flex items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all
                  ${formData.consumiria_nuevamente === true ? 'border-[#7B5434] bg-[#7B5434]/10 shadow-md transform scale-105' : 'border-[#C4B687]/40 bg-white hover:bg-[#FBF4E4] hover:border-[#C4B687]'}
                `}
              >
                <input
                  type="radio"
                  name="consumiria_nuevamente"
                  className="sr-only"
                  onChange={() => handleChange('consumiria_nuevamente', true)}
                />
                <span className={`text-lg font-bold ${formData.consumiria_nuevamente === true ? 'text-[#7B5434]' : 'text-slate-700'}`}>Sí</span>
              </label>

              <label
                className={`
                  relative flex items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all
                  ${formData.consumiria_nuevamente === false ? 'border-[#E2864A] bg-[#E2864A]/10 shadow-md transform scale-105' : 'border-[#C4B687]/40 bg-white hover:bg-[#FBF4E4] hover:border-[#C4B687]'}
                `}
              >
                <input
                  type="radio"
                  name="consumiria_nuevamente"
                  className="sr-only"
                  onChange={() => handleChange('consumiria_nuevamente', false)}
                />
                <span className={`text-lg font-bold ${formData.consumiria_nuevamente === false ? 'text-[#E2864A]' : 'text-slate-700'}`}>No</span>
              </label>
            </div>
          </div>

          {/* Pregunta 9 - Boolean */}
          <div className="bg-white rounded-3xl shadow-md p-8 transition hover:shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 mb-6">9. ¿Compraría este producto en el bar de la cuenca?</h3>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`
                  relative flex items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all
                  ${formData.compraria_en_bar === true ? 'border-[#7B5434] bg-[#7B5434]/10 shadow-md transform scale-105' : 'border-[#C4B687]/40 bg-white hover:bg-[#FBF4E4] hover:border-[#C4B687]'}
                `}
              >
                <input
                  type="radio"
                  name="compraria_en_bar"
                  className="sr-only"
                  onChange={() => handleChange('compraria_en_bar', true)}
                />
                <span className={`text-lg font-bold ${formData.compraria_en_bar === true ? 'text-[#7B5434]' : 'text-slate-700'}`}>Sí</span>
              </label>

              <label
                className={`
                  relative flex items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all
                  ${formData.compraria_en_bar === false ? 'border-[#E2864A] bg-[#E2864A]/10 shadow-md transform scale-105' : 'border-[#C4B687]/40 bg-white hover:bg-[#FBF4E4] hover:border-[#C4B687]'}
                `}
              >
                <input
                  type="radio"
                  name="compraria_en_bar"
                  className="sr-only"
                  onChange={() => handleChange('compraria_en_bar', false)}
                />
                <span className={`text-lg font-bold ${formData.compraria_en_bar === false ? 'text-[#E2864A]' : 'text-slate-700'}`}>No</span>
              </label>
            </div>
          </div>

          {/* Pregunta 10 - Condicional (Cuánto pagaría) */}
          {formData.compraria_en_bar === true && (
            <div className="bg-white rounded-3xl shadow-md p-8 transition hover:shadow-lg animate-fade-in-up">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">10. ¿Cuánto pagarías por una porción de 3 scones?</h3>
              <p className="text-slate-600 text-sm mb-4">Ingresa el monto en pesos (solo números)</p>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-bold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.cuanto_pagaria as string}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^[0-9]+$/.test(value) && parseInt(value) <= 10000)) {
                      handleChange('cuanto_pagaria', value);
                    }
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#E2864A] focus:outline-none focus:ring-2 focus:ring-[#E2864A]/30 text-slate-800 font-bold placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* Comentarios Opcionales */}
          <div className="bg-white rounded-3xl shadow-md p-8 transition hover:shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">11. Comentarios (Opcional)</h3>
            <p className="text-slate-600 text-sm mb-4">¿Hay algo adicional que quieras comentar sobre el producto?</p>
            <textarea
              value={formData.comentarios as string}
              onChange={(e) => handleChange('comentarios', e.target.value)}
              placeholder="Comparte tus opiniones, sugerencias o comentarios..."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#E2864A] focus:outline-none focus:ring-2 focus:ring-[#E2864A]/30 text-slate-800 placeholder-slate-400 resize-none"
            />
            <p className="text-xs text-slate-500 mt-2">Máximo 500 caracteres</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
              <p className="text-rose-700 font-medium">{errorMessage}</p>
            </div>
          )}

          <div className="flex justify-center pt-6 pb-12">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={`
                px-10 py-4 rounded-xl text-white font-bold text-lg shadow-xl transition-all
                ${status === 'submitting' ? 'bg-brand/60 cursor-not-allowed' : 'btn-brand btn-hover-opacity hover:shadow-brand hover:-translate-y-1'}
              `}
            >
              {status === 'submitting' ? 'Enviando...' : 'Enviar Respuestas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
