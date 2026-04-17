# Plataforma LMS - Guía General

Repositorio con arquitectura full stack para una plataforma educativa:

- Frontend: React + Vite + Nginx
- Backend: Django + Django REST Framework
- Base de datos: PostgreSQL
- Orquestación: Docker Compose

## Estructura principal

```text
plataforma/
├── docker-compose.yml
├── README.md
├── README_DOCKER.md
├── frontend/
└── new_project/
```

## Levantar el proyecto con Docker

Desde la raíz del repositorio:

```bash
docker-compose up --build -d
```

Servicios expuestos:

- Frontend: http://localhost
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Comandos útiles

```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Aplicar migraciones (si hace falta)
docker-compose exec backend python manage.py migrate

# Apagar servicios
docker-compose down
```

## Readmes por módulo

- Frontend: `frontend/README.md`
- Backend: `new_project/README.md`
- Docker detallado: `README_DOCKER.md`

## Usuario admin semilla (desarrollo)

Si no cambias variables de entorno, el contenedor backend crea un admin por defecto:

- Email: admin@test.com
- Password: Admin123456!

Puedes personalizarlo con variables `DEFAULT_ADMIN_*` en `.env` o en el entorno del compose.
