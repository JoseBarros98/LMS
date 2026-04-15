# Docker Setup para Django + React

Este proyecto ha sido configurado para ejecutarse en contenedores Docker con los siguientes servicios:
- **Backend**: Django con PostgreSQL
- **Frontend**: React con Nginx
- **Base de datos**: PostgreSQL

## Estructura del Proyecto

```
plataforma/
├── frontend/           # Aplicación React
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── new_project/        # Aplicación Django
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .dockerignore
├── docker-compose.yml  # Orquestación de servicios
└── .env               # Variables de entorno
```

## Requisitos Previos

- Docker instalado
- Docker Compose instalado

## Instrucciones de Uso

### 1. Construir y Levantar los Servicios

```bash
# Construir las imágenes y levantar todos los servicios
docker-compose up --build

# O en modo detached (segundo plano)
docker-compose up --build -d
```

### 2. Acceder a las Aplicaciones

- **Frontend (React)**: http://localhost:80
- **Backend (Django API)**: http://localhost:8000
- **Base de datos (PostgreSQL)**: localhost:5432

### 3. Comandos Útiles

```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver los logs de un servicio específico
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Ejecutar comandos en el contenedor Django
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic --noinput

# Detener los servicios
docker-compose down

# Detener y eliminar volúmenes (cuidado: se pierden datos de la BD)
docker-compose down -v
```

### 4. Migraciones de Base de Datos

La primera vez que levantes los servicios, ejecuta las migraciones:

```bash
docker-compose exec backend python manage.py migrate
```

### 5. Usuario Semilla de Administración

Al ejecutar las migraciones en una instalación nueva, el proyecto crea automáticamente un usuario administrador con rol Administrador.

Credenciales por defecto de desarrollo:

```bash
Email: admin@test.com
Password: Admin123456!
```

Si quieres cambiarlas en otra computadora, define estas variables antes de levantar Docker:

```env
DEFAULT_ADMIN_EMAIL=admin@test.com
DEFAULT_ADMIN_PASSWORD=Admin123456!
DEFAULT_ADMIN_NAME=Admin
```

### 6. Crear Superusuario manualmente

Si además quieres otro acceso al admin de Django:

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Variables de Entorno

Las variables de configuración se encuentran en el archivo `.env`:

```env
# Django Settings
DEBUG=False
SECRET_KEY=tu-secret-key-aqui
ALLOWED_HOSTS=localhost,127.0.0.1,backend

# Database
DATABASE_URL=postgresql://postgres:root@db:5432/new_project_db
POSTGRES_DB=new_project_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root

# Seed admin de desarrollo
DEFAULT_ADMIN_EMAIL=admin@test.com
DEFAULT_ADMIN_PASSWORD=Admin123456!
DEFAULT_ADMIN_NAME=Admin
```

## Configuración Importante

### CORS
El backend está configurado para aceptar peticiones desde:
- http://localhost:3000
- http://127.0.0.1:3000  
- http://frontend (nombre del contenedor Docker)

### Base de Datos
- Los datos de PostgreSQL persisten en un volumen Docker
- El contenedor de Django espera a que la BD esté lista antes de iniciarse

### Archivos Estáticos
- Los archivos estáticos de Django se generan durante el build
- Los archivos media se montan como volumen para persistencia

## Desarrollo vs Producción

Para desarrollo, puedes cambiar las variables en `.env`:
```env
DEBUG=True
```

El frontend React se construye automáticamente durante el build de Docker. Para desarrollo local, puedes seguir usando `npm run dev` fuera de Docker.

## Solución de Problemas

### Si el frontend no carga
- Verifica que el backend esté funcionando
- Revisa los logs: `docker-compose logs frontend`

### Si hay errores de BD
- Espera a que el contenedor de BD esté completamente listo
- Verifica los logs: `docker-compose logs db`

### Si necesitas reconstruir
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Flujo de Trabajo Recomendado

1. Haz cambios en tu código local
2. Reconstruye y levanta los servicios: `docker-compose up --build`
3. Prueba los cambios
4. Cuando estés listo, haz push a tu repositorio

## Soporte

Para cualquier issue relacionado con Docker:
1. Revisa los logs del contenedor específico
2. Verifica que los puertos no estén en uso
3. Asegúrate de tener las últimas versiones de Docker y Docker Compose
