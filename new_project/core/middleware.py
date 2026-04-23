import json
import logging

from django.utils.deprecation import MiddlewareMixin

from .models import AuditLog


SENSITIVE_FIELDS = {'password', 'new_password', 'access', 'refresh', 'token'}
logger = logging.getLogger(__name__)


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

        try:
            resource, entity_id = self._parse_resource(path)
            action = self._resolve_action(method)
            payload = self._extract_payload(request, response)
            changed_fields = self._extract_fields(payload)
            entity_label = self._extract_entity_label(resource, payload)
            summary = self._build_summary(action, resource, entity_id, entity_label, changed_fields)

            role_name = ''
            if getattr(user, 'role', None):
                role_name = user.role.name or ''

            actor_name = ' '.join(
                part for part in [
                    getattr(user, 'name', ''),
                    getattr(user, 'paternal_surname', ''),
                    getattr(user, 'maternal_surname', ''),
                ] if part
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
        except Exception:
            logger.exception(
                'AuditLogMiddleware fallo al registrar auditoria para %s %s', method, path
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

        resource = chunks[1]
        entity_id = ''
        if len(chunks) >= 3 and chunks[2] not in {'me'}:
            entity_id = chunks[2]

        return resource, entity_id

    def _extract_payload(self, request, response=None):
        """
        Extrae datos del objeto afectado para enriquecer la auditoria.

        Prioridad:
        1. response.data (DRF) — disponible siempre tras la vista, sin riesgo
           de RawPostDataException porque DRF ya consumio el stream del body.
        2. request._body — cache privado de Django, disponible solo si Django
           leyo el body via la propiedad antes de que DRF lo consumiera.
        3. request.POST — para envios multipart/form-encoded.
        """
        payload = {}
        try:
            # 1. Datos de la respuesta DRF (fuente mas fiable).
            resp_data = getattr(response, 'data', None) if response is not None else None
            if isinstance(resp_data, dict):
                payload = resp_data

            # 2. Body cacheado por Django (solo si fue leido via .body antes que DRF).
            if not payload:
                raw = getattr(request, '_body', None)
                content_type = request.META.get('CONTENT_TYPE', '') or ''
                if raw and content_type.startswith('application/json'):
                    parsed = json.loads(raw.decode('utf-8'))
                    if isinstance(parsed, dict):
                        payload = parsed

            # 3. Datos de formulario (multipart / form-encoded).
            if not payload:
                post_data = getattr(request, 'POST', None) or {}
                payload = dict(post_data)

        except Exception:
            payload = {}

        return payload if isinstance(payload, dict) else {}

    def _extract_fields(self, payload):
        if not isinstance(payload, dict):
            return []

        fields = list(payload.keys())
        return [f for f in fields if f not in SENSITIVE_FIELDS][:8]

    def _extract_entity_label(self, resource, payload):
        if not isinstance(payload, dict):
            return ''

        resource = (resource or '').lower()

        if resource in {'users', 'usuarios', 'me'}:
            full_name = ' '.join(
                part for part in [
                    str(payload.get('name', '')).strip(),
                    str(payload.get('paternal_surname', '')).strip(),
                    str(payload.get('maternal_surname', '')).strip(),
                ] if part
            ).strip()
            if full_name:
                return full_name
            email = str(payload.get('email', '')).strip()
            if email:
                return email

        candidates = [
            payload.get('titulo'),
            payload.get('nombre'),
            payload.get('name'),
            payload.get('title'),
            payload.get('email'),
            payload.get('slug'),
            payload.get('codigo_acceso'),
        ]
        for value in candidates:
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text

        return ''

    def _build_summary(self, action, resource, entity_id, entity_label, fields):
        labels = {
            'create': 'Creacion',
            'update': 'Actualizacion',
            'delete': 'Eliminacion',
            'other': 'Cambio',
        }
        base = f"{labels.get(action, 'Cambio')} en {resource or 'recurso desconocido'}"
        if entity_label:
            base += f": {entity_label}"
        if entity_id:
            base += f" (ID {entity_id})"

        if fields and action in {'create', 'update'}:
            base += f". Campos: {', '.join(fields)}"

        return base
