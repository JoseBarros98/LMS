from django.db import migrations


ALL_DASHBOARD_ACTIONS = ['overview', 'academy', 'support', 'activity']
DEFAULT_DASHBOARD_ACTIONS = ['overview', 'academy', 'support']


def update_dashboard_permissions(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    for role in Role.objects.all():
        permissions = dict(role.permissions or {})
        page_permissions = permissions.get('pages') or []

        if 'dashboard' not in page_permissions:
            continue

        if permissions.get('dashboard'):
            continue

        if role.name.lower() == 'administrador':
            permissions['dashboard'] = list(ALL_DASHBOARD_ACTIONS)
        else:
            permissions['dashboard'] = list(DEFAULT_DASHBOARD_ACTIONS)

        role.permissions = permissions
        role.save(update_fields=['permissions'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_update_role_permissions_granularity'),
    ]

    operations = [
        migrations.RunPython(update_dashboard_permissions, noop_reverse),
    ]