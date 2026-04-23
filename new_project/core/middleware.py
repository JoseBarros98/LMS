import json

from django.utils.deprecation import MiddlewareMixin

from .models import AuditLog


SENSITIVE_FIELDS = {'password', 'new_password', 'access', 'refresh', 'token'}


class AuditLogMiddleware(MiddlewareMixin):
    """Registra cambios exitosos en endpoints API mutables."""

    def process_response(self, request, response):
        method = request.method.upper()
        path = request.path or ''

        if method not in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            return response

        if not path.startswith('/api/'):
            return response

        if path.startswith('/api/token/') or path.startswith('/api/audit-logs/'):
            return response

        if response.status_code >= 400:
            return response

        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return response

        resource, entity_id = self._parse_resource(path)
        action = self._resolve_action(method)
        changed_fields = self._extract_fields(request)
        summary = self._build_summary(action, resource, entity_id, changed_fields)

        role_name = ''
        if getattr(user, 'role', None):
            role_name = user.role.name or ''

        actor_name = ' '.join(
            part for part in [getattr(user, 'name', ''), getattr(user, 'paternal_surname', ''), getattr(user, 'maternal_surname', '')] if part
        ).strip() or getattr(user, 'email', 'Usuario')

        AuditLog.objects.create(
            actor=user,
            actor_name=actor_name,
            actor_role_name=role_name,
            action=action,
            resource=resource,
            entity_id=entity_id,
            http_method=method,
            path=path,
            change_summary=summary,
            status_code=response.status_code,
        )

        return response

    def _resolve_action(self, method):
        if method == 'POST':
            return 'create'
        if method in {'PUT', 'PATCH'}:
            return 'update'
        if method == 'DELETE':
            return 'delete'
        return 'other'

    def _parse_resource(self, path):
        chunks = [segment for segment in path.strip('/').split('/') if segment]
        if len(chunks) < 2:
            return '', ''

        # /api/<resource>/<id>/...
        resource = chunks[1]
        entity_id = ''
        if len(chunks) >= 3 and chunks[2] not in {'me'}:
            entity_id = chunks[2]

        return resource, entity_id

    def _extract_fields(self, request):
        content_type = request.META.get('CONTENT_TYPE', '')
        fields = []

        if content_type.startswith('application/json') and request.body:
            try:
                payload = json.loads(request.body.decode('utf-8'))
                if isinstance(payload, dict):
                    fields = list(payload.keys())
            except (ValueError, UnicodeDecodeError):
                fields = []
        elif request.POST:
            fields = list(request.POST.keys())

        clean_fields = [field for field in fields if field not in SENSITIVE_FIELDS]
        return clean_fields[:6]

    def _build_summary(self, action, resource, entity_id, fields):
        labels = {
            'create': 'Creacion',
            'update': 'Actualizacion',
            'delete': 'Eliminacion',
            'other': 'Cambio',
        }
        base = f"{labels.get(action, 'Cambio')} en {resource or 'recurso desconocido'}"
        if entity_id:
            base += f" (ID {entity_id})"

        if fields and action in {'create', 'update'}:
            base += f". Campos: {', '.join(fields)}"

        return base
