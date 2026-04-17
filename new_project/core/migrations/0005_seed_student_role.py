from django.db import migrations


STUDENT_PERMISSIONS = {
    'pages': ['dashboard', 'calendario', 'cursos', 'simuladores', 'recursos', 'flashcards', 'tickets'],
    'courses': ['read'],  # Solo ver contenido y mediateca
    'simulators': ['read', 'resolver'],  # Ver simuladores y resolver
    'simulators_ranking': ['read'],  # Ver ranking
    'simulators_attempts': ['read'],  # Ver intentos propios
    'resources': ['read'],  # Ver recursos de cursos matriculados
    'flashcards': ['read', 'create', 'update_own', 'delete_own'],  # Crear, editar/eliminar propias
    'tickets': ['create', 'read_own', 'update_own'],  # Crear, ver propios, editar propios
    'enrollments': ['read'],  # Ver matriculaciones propias
}

ADMIN_PERMISSIONS = {
    'pages': ['dashboard', 'calendario', 'cursos', 'simuladores', 'recursos', 'flashcards', 'tickets', 'users', 'roles', 'categorias', 'matriculas', 'rutas'],
    'users': ['read', 'create', 'update', 'delete'],
    'roles': ['read', 'create', 'update', 'delete'],
    'courses': ['read', 'create', 'update', 'delete'],
    'simulators': ['read', 'create', 'update', 'delete'],
    'resources': ['read', 'create', 'update', 'delete'],
    'flashcards': ['read', 'create', 'update', 'delete'],
    'tickets': ['read', 'create', 'update', 'delete'],
    'categories': ['read', 'create', 'update', 'delete'],
    'enrollments': ['read', 'create', 'update', 'delete'],
    'routes': ['read', 'create', 'update', 'delete'],
    'reports': ['read', 'create', 'update', 'delete'],
}


def seed_student_role(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    # Crear o actualizar rol Estudiante
    role, _ = Role.objects.get_or_create(
        name='Estudiante',
        defaults={
            'description': 'Rol con acceso limitado a funcionalidades de estudiante',
            'permissions': STUDENT_PERMISSIONS,
        },
    )

    role.description = role.description or 'Rol con acceso limitado a funcionalidades de estudiante'
    role.permissions = STUDENT_PERMISSIONS
    role.save(update_fields=['description', 'permissions'])

    # Actualizar permisos de Administrador
    admin_role = Role.objects.filter(name='Administrador').first()
    if admin_role:
        admin_role.permissions = ADMIN_PERMISSIONS
        admin_role.save(update_fields=['permissions'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_seed_default_admin'),
    ]

    operations = [
        migrations.RunPython(seed_student_role, noop_reverse),
    ]
