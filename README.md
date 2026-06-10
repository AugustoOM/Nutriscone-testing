# 🥐 Scones-Scoring (Nutriscone)

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss)

Scones-Scoring es una aplicación web full-stack desarrollada para la recolección de respuestas de encuestas a través de códigos QR y la visualización de estadísticas en tiempo real. 

## ✨ Características Principales

- **📱 Acceso Rápido:** Página principal que genera un código QR para un acceso instantáneo a la encuesta.
- **📝 Formulario de Encuesta:** Interfaz dinámica y responsiva para la carga de datos.
- **📊 Dashboard de Resultados:** Visualización de estadísticas en tiempo real utilizando `Chart.js`.
- **☁️ Backend Serverless:** Integración nativa con **Supabase** para almacenamiento seguro y persistente con políticas de seguridad (RLS).
- **🚀 Performance:** Optimizado con las últimas características de Next.js (App Router, Server Components).
- **🐳 Docker Ready:** Configuración lista para despliegue en contenedores.
- **🧪 Testing Integrado:** Pruebas End-to-End con **Playwright** y Load Testing con **k6**.

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 16.2, React 19, Tailwind CSS v4, Chart.js
- **Backend/Database:** Supabase (PostgreSQL)
- **Lenguaje:** TypeScript
- **Testing:** Playwright (E2E), k6 (Performance)
- **Infraestructura:** Docker, Docker Compose

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Clonar el repositorio y preparar entorno

```bash
git clone <url-del-repositorio>
cd Scones-Scoring
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto y agrega tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Configurar Base de Datos (Supabase)

Ejecuta el script SQL incluido en `supabase_setup.sql` desde el panel SQL de tu proyecto en Supabase para crear las tablas necesarias (`survey_responses`) y configurar RLS.

### 4. Levantar el entorno de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

- **Generador QR:** `/`
- **Encuesta:** `/encuesta`
- **Resultados:** `/resultados`

## 🐳 Despliegue con Docker

El proyecto está preparado para ser ejecutado en contenedores.

1. Asegúrate de tener el archivo `.env` configurado (puedes copiar el `.env.local`):
```bash
cp .env.local .env
```

2. Levantar los servicios:
```bash
docker compose up --build
```

## 🧪 Pruebas y Performance

### Pruebas E2E (Playwright)
```bash
npm run test:e2e
```

### Stress test automatizado (Playwright)
Por defecto ejecuta escenarios de 10, 20 y 30 usuarios concurrentes contra el deploy de Vercel (`https://nutriscone-fyo2.vercel.app`). Cada usuario que logra entrar a la encuesta envía respuestas aleatorias y el comentario final `esto es una prueba`, por lo que el dashboard desplegado debería sumar registros reales:

```bash
npm run test:stress
```

Variables útiles:

```bash
STRESS_USER_STEPS=10,20,30,40,50 npm run test:stress
STRESS_READY_TIMEOUT_MS=60000 npm run test:stress
```

### Pruebas de Carga (k6)
Asegúrate de tener [k6](https://k6.io/) instalado.
```bash
k6 run k6-loadtest.js
```

### Auditoría de Performance (Lighthouse)
```bash
./scripts/lighthouse.sh
```

## 📚 Documentación Adicional

En la raíz del proyecto encontrarás archivos de documentación detallados:
- `INDICE_DOCUMENTACION.txt`: Guía principal de todos los documentos del proyecto.
- `REQUERIMIENTOS.txt`: Listado y estado de los requerimientos funcionales y no funcionales.
- `SUPABASE_DOCUMENTATION.txt`: Detalles de la estructura y configuración de la base de datos.
- `VIABILIDAD_REQUERIMIENTOS.txt`: Análisis técnico de la implementación.

## 🤝 Contribución
Caminos, Roberto Damian - Database
Meza, Santiago - Backend developter
Sosa Wilka, Francisco - Tester
Codermatz, Valentino - Frontend
