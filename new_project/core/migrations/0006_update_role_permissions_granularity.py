from django.db import migrations


ADMIN_PERMISSIONS = {
    'pages': [
        'dashboard',
        'calendario',
        'cursos',
        'simuladores',
        'recursos',
        'flashcards',
        'tickets',
        'matriculas',
        'rutas',
        'categorias',
        'users',
        'roles',
        'configuracion',
    ],
    'users': ['read', 'create', 'update', 'delete', 'assign_role', 'update_profile'],
    'roles': ['read', 'create', 'update', 'delete', 'assign_permissions'],
    'courses': ['read', 'create', 'update', 'delete', 'view_content', 'view_mediateca', 'view_price', 'manage_enrollments'],
    'simulators': ['read', 'create', 'update', 'delete', 'resolve', 'view_attempts', 'view_ranking', 'manage_questions', 'manage_availability'],
    'resources': ['read', 'create', 'update', 'delete', 'read_enrolled'],
    'flashcards': ['read', 'create', 'update', 'delete', 'update_own', 'delete_own', 'study'],
    'tickets': ['read', 'create', 'update', 'delete', 'read_own', 'update_own', 'respond'],
    'categories': ['read', 'create', 'update', 'delete'],
    'enrollments': ['read', 'create', 'update', 'delete', 'read_own'],
    'routes': ['read', 'create', 'update', 'delete'],
    'reports': ['read', 'create', 'update', 'delete', 'export'],
}

STUDENT_PERMISSIONS = {
    'pages': ['dashboard', 'calendario', 'cursos', 'simuladores', 'recursos', 'flashcards', 'tickets'],
    'courses': ['read', 'view_content', 'view_mediateca'],
    'simulators': ['read', 'resolve', 'view_attempts', 'view_ranking'],
    'resources': ['read', 'read_enrolled'],
    'flashcards': ['read', 'create', 'update_own', 'delete_own', 'study'],
    'tickets': ['create', 'read_own', 'update_own', 'respond'],
    'enrollments': ['read', 'read_own'],
}


def update_role_permissions(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    admin_role = Role.objects.filter(name='Administrador').first()
    if admin_role:
        admin_role.permissions = ADMIN_PERMISSIONS
        admin_role.save(update_fields=['permissions'])

    student_role = Role.objects.filter(name='Estudiante').first()
    if student_role:
        student_role.permissions = STUDENT_PERMISSIONS
        student_role.save(update_fields=['permissions'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_seed_student_role'),
    ]

    operations = [
        migrations.RunPython(update_role_permissions, noop_reverse),
    ]
