ADMIN_ROLE_NAME = 'administrador'


def is_admin_user(user):
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'role', None)
        and user.role
        and user.role.name.lower() == ADMIN_ROLE_NAME
    )


def get_role_permissions(user):
    role = getattr(user, 'role', None)
    return dict(getattr(role, 'permissions', {}) or {})


def has_role_permission(user, resource, action):
    if is_admin_user(user):
        return True

    if not user or not getattr(user, 'is_authenticated', False):
        return False

    if not resource or not action:
        return False

    resource_permissions = get_role_permissions(user).get(resource) or []
    return action in resource_permissions


def has_any_role_permission(user, resource, actions):
    if is_admin_user(user):
        return True

    return any(has_role_permission(user, resource, action) for action in actions or [])


def has_page_access(user, page_name):
    if is_admin_user(user):
        return True

    return page_name in (get_role_permissions(user).get('pages') or [])


def get_dashboard_sections(user):
    if is_admin_user(user):
        return {
            'overview': True,
            'academy': True,
            'support': True,
            'activity': True,
        }

    dashboard_actions = get_role_permissions(user).get('dashboard') or []
    if not dashboard_actions:
        return {
            'overview': True,
            'academy': True,
            'support': True,
            'activity': True,
        }

    return {
        'overview': 'overview' in dashboard_actions,
        'academy': 'academy' in dashboard_actions,
        'support': 'support' in dashboard_actions,
        'activity': 'activity' in dashboard_actions,
    }