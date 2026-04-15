import os
from uuid import NAMESPACE_DNS, uuid5

from django.contrib.auth.hashers import make_password
from django.db import migrations


DEFAULT_PERMISSIONS = {
    'users': ['read', 'create', 'update', 'delete'],
    'roles': ['read', 'create', 'update', 'delete'],
    'courses': ['read', 'create', 'update', 'delete'],
    'reports': ['read', 'create', 'update', 'delete'],
}


def seed_default_admin(apps, schema_editor):
    Role = apps.get_model('core', 'Role')
    User = apps.get_model('core', 'User')

    role, _ = Role.objects.get_or_create(
        name='Administrador',
        defaults={
            'description': 'Rol con acceso administrativo completo',
            'permissions': DEFAULT_PERMISSIONS,
        },
    )

    role.description = role.description or 'Rol con acceso administrativo completo'
    role.permissions = DEFAULT_PERMISSIONS
    role.save(update_fields=['description', 'permissions'])

    email = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@test.com')
    password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'Admin123456!')
    name = os.getenv('DEFAULT_ADMIN_NAME', 'Admin')
    paternal_surname = os.getenv('DEFAULT_ADMIN_PATERNAL_SURNAME', 'Root')
    maternal_surname = os.getenv('DEFAULT_ADMIN_MATERNAL_SURNAME', 'Seed')
    university = os.getenv('DEFAULT_ADMIN_UNIVERSITY', 'LMS')
    country = os.getenv('DEFAULT_ADMIN_COUNTRY', 'Bolivia')

    token = uuid5(NAMESPACE_DNS, email).hex
    ci = os.getenv('DEFAULT_ADMIN_CI', f'ADMIN-{token[:10].upper()}')
    phone_number = os.getenv('DEFAULT_ADMIN_PHONE', f'7{token[:7]}')

    user = User.objects.filter(email=email).first()

    if user:
        user.role_id = role.id
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.status = True
        user.name = user.name or name
        user.paternal_surname = user.paternal_surname or paternal_surname
        user.maternal_surname = user.maternal_surname or maternal_surname
        user.ci = user.ci or ci
        user.phone_number = user.phone_number or phone_number
        user.university = user.university or university
        user.country = user.country or country
        if not user.password:
            user.password = make_password(password)
        user.save()
        return

    User.objects.create(
        name=name,
        paternal_surname=paternal_surname,
        maternal_surname=maternal_surname,
        ci=ci,
        email=email,
        phone_number=phone_number,
        university=university,
        country=country,
        password=make_password(password),
        status=True,
        is_staff=True,
        is_active=True,
        is_superuser=True,
        role_id=role.id,
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_role_user_role'),
    ]

    operations = [
        migrations.RunPython(seed_default_admin, noop_reverse),
    ]
