from django.db import migrations


ADMIN_DASHBOARD_ACTIONS = ['overview', 'academy', 'support', 'activity', 'charts', 'trends']
STUDENT_DASHBOARD_ACTIONS = ['overview', 'academy', 'support', 'activity', 'courses_panel', 'quick_actions']


def update_dashboard_granularity(apps, schema_editor):
    Role = apps.get_model('core', 'Role')

    for role in Role.objects.all():
        permissions = dict(role.permissions or {})

        dashboard_base = permissions.get('dashboard') if isinstance(permissions.get('dashboard'), list) else []
        has_dashboard_page = 'dashboard' in (permissions.get('pages') or [])

        if role.name.lower() == 'administrador':
            permissions['dashboard_admin'] = list(ADMIN_DASHBOARD_ACTIONS)
            permissions['dashboard_student'] = list(STUDENT_DASHBOARD_ACTIONS)
        else:
            if has_dashboard_page:
                # Mantener compatibilidad con roles existentes y dar granularidad por estudiante.
                merged = []
                for action in STUDENT_DASHBOARD_ACTIONS:
                    if action in dashboard_base or action in ['courses_panel', 'quick_actions']:
                        if action not in merged:
                            merged.append(action)
                permissions['dashboard_student'] = merged or list(STUDENT_DASHBOARD_ACTIONS)

        role.permissions = permissions
        role.save(update_fields=['permissions'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_normalize_role_permissions_granularity'),
    ]

    operations = [
        migrations.RunPython(update_dashboard_granularity, noop_reverse),
    ]
