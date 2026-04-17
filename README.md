# Plataforma LMS

Repositorio full stack para una plataforma educativa con arquitectura Docker.

## Stack

- Frontend: React + Vite + Nginx
- Backend: Django + Django REST Framework + JWT
- Base de datos: PostgreSQL
- Orquestación: Docker Compose

## Estructura principal

```text
plataforma/
├── docker-compose.yml
├── README.md
├── frontend/
└── new_project/
```

## Requisitos previos

- Docker instalado
- Docker Compose instalado

## Inicio rápido (Docker)

Desde la raíz del repositorio:

```bash
# Construir y levantar todos los servicios
docker-compose up --build -d
```

Servicios expuestos:

- Frontend: http://localhost
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Comandos útiles

```bash
# Estado de contenedores
docker-compose ps

# Logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Migraciones
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Superusuario (opcional)
docker-compose exec backend python manage.py createsuperuser

# Shell de Django
docker-compose exec backend python manage.py shell

# Ejecutar tests
docker-compose exec backend python manage.py test

# Reiniciar backend
docker-compose restart backend

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (pierde datos de BD)
docker-compose down -v
```

## Variables de entorno

La configuración puede definirse en `.env`.

Ejemplo:

```env
# Django
DEBUG=False
SECRET_KEY=tu-secret-key-aqui
ALLOWED_HOSTS=localhost,127.0.0.1,backend

# Database
DATABASE_URL=postgresql://postgres:root@db:5432/new_project_db
POSTGRES_DB=new_project_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root

# Admin semilla
DEFAULT_ADMIN_EMAIL=admin@test.com
DEFAULT_ADMIN_PASSWORD=Admin123456!
DEFAULT_ADMIN_NAME=Admin
DEFAULT_ADMIN_PATERNAL_SURNAME=Root
DEFAULT_ADMIN_MATERNAL_SURNAME=Seed
DEFAULT_ADMIN_UNIVERSITY=LMS
DEFAULT_ADMIN_COUNTRY=Bolivia
```

## Usuario admin semilla (desarrollo)

Si no cambias variables de entorno, el backend crea un admin por defecto:

- Email: admin@test.com
- Password: Admin123456!

## Configuración importante

- CORS permitido para `localhost`, `127.0.0.1` y red interna de Docker.
- PostgreSQL persiste datos en volumen Docker.
- El backend espera que la base de datos esté saludable antes de iniciar.
- `media` se monta como volumen para persistencia de archivos.

## Resolución de problemas

Si frontend no carga:

- Revisa backend: `docker-compose logs -f backend`
- Revisa frontend: `docker-compose logs -f frontend`

Si hay errores de base de datos:

- Revisa db: `docker-compose logs -f db`
- Asegura que el servicio `db` esté `healthy` en `docker-compose ps`

Si necesitas reconstruir todo:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Documentación por módulo

- Frontend: `frontend/README.md`
- Backend: `new_project/README.md`

