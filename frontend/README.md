# Frontend - Plataforma LMS

Aplicación cliente construida con React y Vite. Se encarga de la interfaz de usuario, autenticación y consumo de la API Django.

## Stack

- React 19
- Vite 8
- React Router
- Axios
- TailwindCSS 4
- Nginx (en Docker para servir build de producción)

## Scripts disponibles

```bash
npm install
npm run dev      # Desarrollo local (Vite)
npm run build    # Build de producción
npm run preview  # Previsualizar build
npm run lint     # Lint del proyecto
```

## Desarrollo local (sin Docker)

1. Instala dependencias:

```bash
npm install
```

2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

3. Abre la URL que muestra Vite (por defecto http://localhost:5173).

Nota: para funcionar correctamente necesita que el backend esté levantado y accesible.

## Ejecución con Docker

Este frontend se construye y sirve con Nginx desde el servicio `frontend` en `docker-compose.yml`.

Desde la raíz del proyecto:

```bash
docker-compose up --build -d frontend
```

Acceso:

- http://localhost

## Estructura relevante

```text
src/
├── api/          # Clientes y llamadas a API
├── components/   # Componentes reutilizables y modales
├── context/      # Contextos globales (AuthContext)
├── hooks/        # Hooks personalizados
├── pages/        # Vistas/páginas principales
└── utils/        # Utilidades
```

## Recomendaciones

- Mantén la lógica de red dentro de `src/api/`.
- Usa `src/context/AuthContext.jsx` para información de sesión.
- Antes de abrir PR, ejecuta `npm run lint` y valida el flujo de login.

