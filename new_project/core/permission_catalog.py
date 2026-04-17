PERMISSION_CATALOG = {
    'pages': {
        'label': 'Acceso a paginas',
        'actions': [
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
        ],
    },
    'dashboard': {
        'label': 'Dashboard',
        'actions': ['overview', 'academy', 'support', 'activity'],
    },
    'dashboard': {
        'label': 'Dashboard',
        'actions': ['overview', 'academy', 'support', 'activity'],
    },
    'users': {
        'label': 'Usuarios',
        'actions': ['read', 'create', 'update', 'delete', 'assign_role', 'update_profile'],
    },
    'roles': {
        'label': 'Roles',
        'actions': ['read', 'create', 'update', 'delete', 'assign_permissions'],
    },
    'courses': {
        'label': 'Cursos',
        'actions': ['read', 'create', 'update', 'delete', 'view_content', 'view_mediateca', 'view_price', 'manage_enrollments'],
    },
    'simulators': {
        'label': 'Simuladores',
        'actions': ['read', 'create', 'update', 'delete', 'resolve', 'view_attempts', 'view_ranking', 'manage_questions', 'manage_availability'],
    },
    'resources': {
        'label': 'Recursos',
        'actions': ['read', 'create', 'update', 'delete', 'read_enrolled'],
    },
    'flashcards': {
        'label': 'Flashcards',
        'actions': ['read', 'create', 'update', 'delete', 'update_own', 'delete_own', 'study'],
    },
    'tickets': {
        'label': 'Tickets',
        'actions': ['read', 'create', 'update', 'delete', 'read_own', 'update_own', 'respond'],
    },
    'categories': {
        'label': 'Categorias',
        'actions': ['read', 'create', 'update', 'delete'],
    },
    'enrollments': {
        'label': 'Matriculas',
        'actions': ['read', 'create', 'update', 'delete', 'read_own'],
    },
    'routes': {
        'label': 'Rutas',
        'actions': ['read', 'create', 'update', 'delete'],
    },
    'reports': {
        'label': 'Reportes',
        'actions': ['read', 'create', 'update', 'delete', 'export'],
    },
}


def get_valid_permission_actions(resource):
    entry = PERMISSION_CATALOG.get(resource) or {}
    return set(entry.get('actions', []))
