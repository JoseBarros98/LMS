from django.db import migrations, models
import django.db.models.deletion



def add_auditoria_permissions(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    for role in Role.objects.all():
        permissions = dict(role.permissions or {})
        changed = False

        pages = permissions.get('pages')
        if isinstance(pages, list) and role.name.lower() == 'administrador' and 'auditoria' not in pages:
            pages.append('auditoria')
            permissions['pages'] = pages
            changed = True

        audit_logs_actions = permissions.get('audit_logs')
        if role.name.lower() == 'administrador' and not isinstance(audit_logs_actions, list):
            permissions['audit_logs'] = ['read']
            changed = True

        if changed:
            role.permissions = permissions
            role.save(update_fields=['permissions'])


def remove_auditoria_permissions(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    for role in Role.objects.all():
        permissions = dict(role.permissions or {})
        changed = False

        pages = permissions.get('pages')
        if isinstance(pages, list) and 'auditoria' in pages:
            permissions['pages'] = [page for page in pages if page != 'auditoria']
            changed = True

        if 'audit_logs' in permissions:
            permissions.pop('audit_logs', None)
            changed = True

        if changed:
            role.permissions = permissions
            role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_platformsetting'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('actor_name', models.CharField(max_length=200)),
                ('actor_role_name', models.CharField(blank=True, max_length=120)),
                ('action', models.CharField(choices=[('create', 'Creacion'), ('update', 'Actualizacion'), ('delete', 'Eliminacion'), ('other', 'Otro cambio')], default='other', max_length=20)),
                ('resource', models.CharField(blank=True, max_length=120)),
                ('entity_id', models.CharField(blank=True, max_length=80)),
                ('http_method', models.CharField(max_length=10)),
                ('path', models.CharField(max_length=255)),
                ('change_summary', models.TextField()),
                ('status_code', models.PositiveSmallIntegerField(default=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='core.user')),
            ],
            options={
                'verbose_name': 'Registro de auditoria',
                'verbose_name_plural': 'Registros de auditoria',
                'ordering': ['-created_at'],
            },
        ),
        migrations.RunPython(add_auditoria_permissions, remove_auditoria_permissions),
    ]
