from rest_framework.permissions import BasePermission

from .access import has_any_role_permission, has_role_permission


class RoleActionPermission(BasePermission):
    default_action_map = {
        'list': 'read',
        'retrieve': 'read',
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        resource = getattr(view, 'permission_resource', None)
        if not resource:
            return True

        action_map = getattr(view, 'permission_action_map', None) or self.default_action_map
        required_action = action_map.get(getattr(view, 'action', None))
        if required_action is None:
            return True

        if isinstance(required_action, (list, tuple, set)):
            return has_any_role_permission(request.user, resource, required_action)

        return has_role_permission(request.user, resource, required_action)