# Backend - Django API

Backend de la plataforma LMS construido con Django y Django REST Framework.

## Stack

- Django 5.1
- Django REST Framework
- JWT (djangorestframework-simplejwt)
- PostgreSQL
- Docker

## Apps principales

- `core`: usuarios, autenticación, permisos y roles
- `cursos`: gestión de cursos, rutas y contenidos
- `simuladores`: simuladores y recursos asociados
- `flashcards`: tarjetas de estudio
- `tickets`: soporte/incidencias

## Ejecución con Docker (recomendada)

Desde la raíz del repositorio:

```bash
docker-compose up --build -d backend db
```

API disponible en:

- http://localhost:8000

Comandos útiles:

```bash
# Migraciones
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Shell de Django
docker-compose exec backend python manage.py shell

# Tests
docker-compose exec backend python manage.py test
```

## Desarrollo local (sin Docker)

1. Crear entorno virtual e instalar dependencias:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Configurar variables de entorno (ejemplo):

```env
DEBUG=True
SECRET_KEY=tu-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://postgres:root@localhost:5432/new_project_db
```

3. Ejecutar migraciones y servidor:

```bash
python manage.py migrate
python manage.py runserver
```

## Autenticación

El proyecto utiliza JWT con:

- Access token: 1 hora
- Refresh token: 7 días

Revisa la configuración en `new_project/settings.py` (`REST_FRAMEWORK` y `SIMPLE_JWT`).

## Archivos media

- URL de media: `/media/`
- En Docker, `./new_project/media` se monta como volumen para persistencia.

## Notas

- El comando de arranque del servicio backend ejecuta `migrate` antes de levantar `runserver`.
- El sistema puede crear un admin semilla con variables `DEFAULT_ADMIN_*` definidas en compose.
