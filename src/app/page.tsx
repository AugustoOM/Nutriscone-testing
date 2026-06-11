"use client";
import Link from 'next/link';
import { FiEdit, FiBarChart } from 'react-icons/fi';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FBF4E4] flex flex-col items-center px-4 py-8 sm:px-6 lg:px-8">
      <header className="w-full max-w-6xl flex justify-end">
        <Link
          href="/resultados"
          className="inline-flex items-center gap-2 rounded-xl border border-[#C4B687]/60 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:border-[#E2864A] hover:text-[#7B5434]"
        >
          <FiBarChart className="h-4 w-4 text-accent" />
          Admin
        </Link>
      </header>

      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-10 text-center">
        <div className="w-full">
          <img
            src="/logo_Nutriscone.jpeg"
            alt="Nutriscone Logo"
            className="mx-auto mb-8 max-h-56 w-auto rounded-3xl shadow-2xl"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.svg'; }}
          />
        </div>

        <section className="mb-10 w-full max-w-2xl rounded-lg border border-[#C4B687]/50 bg-white px-6 py-5 text-center shadow-md">
          <h2 className="mb-3 text-2xl font-black text-[#7B5434]">
            ¿Qué hacemos?
          </h2>
          <p className="text-base leading-7 text-slate-700 sm:text-lg">
            Un scon de garbanzo y zanahoria, pensado como una alternativa nutritiva, sabrosa y diferente para acompañar tus momentos de pausa.
          </p>
        </section>

        <div className="w-full max-w-xl">
          <h1 className="mb-4 text-4xl font-black tracking-normal text-slate-900 sm:text-5xl">
            Encuesta Nutriscone
          </h1>
          <p className="mx-auto mb-8 max-w-md text-lg text-slate-600">
            Evaluación rápida de los scones de garbanzo.
          </p>
          <Link
            href="/encuesta"
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-transparent px-8 py-5 text-xl font-black shadow-xl shadow-brand transition-colors btn-brand btn-hover-opacity sm:w-auto sm:min-w-80"
          >
            <FiEdit className="h-6 w-6" />
            Realizar encuesta
          </Link>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Te llevará menos de 3 minutos
          </p>
        </div>
      </main>
    </div>
  );
}
