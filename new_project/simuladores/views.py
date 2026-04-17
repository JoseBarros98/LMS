from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.access import has_role_permission, is_admin_user
from core.api_permissions import RoleActionPermission
from core.models import User
from cursos.models import Curso, MatriculaCurso, MatriculaRuta

from .models import (
    ExplicacionPregunta,
    IntentoSimulador,
    Opcion,
    Pregunta,
    RespuestaIntento,
    Simulador,
    SimuladorDisponibilidadUsuario,
)
from .serializers import (
    EnviarRespuestasSerializer,
    ExplicacionPreguntaSerializer,
    IntentoListSerializer,
    IntentoSimuladorSerializer,
    PreguntaPublicaSerializer,
    PreguntaSerializer,
    SimuladorDisponibilidadUsuarioSerializer,
    SimuladorDetalleSerializer,
    SimuladorListSerializer,
    SimuladorWriteSerializer,
)

def is_user_enrolled_for_simulator(simulador, user_id):
    if simulador.ruta_id:
        return MatriculaRuta.objects.filter(
            ruta_id=simulador.ruta_id,
            user_id=user_id,
            activa=True,
        ).exists()

    if simulador.curso_id:
        enrolled_course = MatriculaCurso.objects.filter(
            curso_id=simulador.curso_id,
            user_id=user_id,
            activa=True,
        ).exists()
        if enrolled_course:
            return True

        course_route_id = Curso.objects.filter(id=simulador.curso_id).values_list('ruta_id', flat=True).first()
        if course_route_id:
            return MatriculaRuta.objects.filter(
                ruta_id=course_route_id,
                user_id=user_id,
                activa=True,
            ).exists()

    return False


def build_user_display_name(user):
    return ' '.join(
        part for part in [user.name, user.paternal_surname, user.maternal_surname] if part
    ).strip() or user.email


def build_user_initials(user):
    tokens = [user.name, user.paternal_surname]
    initials = ''.join((token or '').strip()[:1].upper() for token in tokens if token)
    return initials or (user.email[:2].upper() if user.email else 'NA')


def is_better_attempt(candidate, current_best):
    if current_best is None:
        return True

    if candidate.puntaje_obtenido != current_best.puntaje_obtenido:
        return candidate.puntaje_obtenido > current_best.puntaje_obtenido

    candidate_time = candidate.tiempo_transcurrido_segundos or 10 ** 9
    current_time = current_best.tiempo_transcurrido_segundos or 10 ** 9
    if candidate_time != current_time:
        return candidate_time < current_time

    candidate_finished = candidate.finalizado_en or timezone.now()
    current_finished = current_best.finalizado_en or timezone.now()
    return candidate_finished < current_finished

class SimuladorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RoleActionPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_resource = 'simulators'
    permission_action_map = {
        'list': 'read',
        'retrieve': 'read',
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
        'preguntas': 'read',
        'crear_pregunta': 'manage_questions',
        'actualizar_pregunta': 'manage_questions',
        'eliminar_pregunta': 'manage_questions',
        'explicacion_pregunta': 'manage_questions',
        'iniciar_intento': 'resolve',
        'finalizar_intento': 'resolve',
        'disponibilidad_usuario': 'manage_availability',
        'disponibilidades_usuarios': 'manage_availability',
        'mis_intentos': 'view_attempts',
        'resultado_intento': 'view_attempts',
        'ranking': 'view_ranking',
    }

    def get_queryset(self):
        qs = Simulador.objects.select_related('curso', 'ruta').prefetch_related('preguntas')
        if not is_admin_user(self.request.user):
            qs = qs.filter(publicado=True)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SimuladorWriteSerializer
        if self.action == 'retrieve':
            return SimuladorDetalleSerializer
        return SimuladorListSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    # ── Preguntas del simulador ───────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='preguntas')
    def preguntas(self, request, pk=None):
        simulador = self.get_object()
        qs = simulador.preguntas.prefetch_related('opciones', 'explicacion').order_by('orden')
        if has_role_permission(request.user, 'simulators', 'manage_questions'):
            serializer = PreguntaSerializer(qs, many=True, context={'request': request})
        else:
            serializer = PreguntaPublicaSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        url_path='preguntas-crear',
    )
    def crear_pregunta(self, request, pk=None):
        simulador = self.get_object()
        serializer = PreguntaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(simulador=simulador)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['put', 'patch'],
        url_path=r'preguntas-item/(?P<pregunta_pk>[^/.]+)',
    )
    def actualizar_pregunta(self, request, pk=None, pregunta_pk=None):
        simulador = self.get_object()
        try:
            pregunta = simulador.preguntas.get(pk=pregunta_pk)
        except Pregunta.DoesNotExist:
            return Response({'detail': 'Pregunta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        partial = request.method == 'PATCH'
        serializer = PreguntaSerializer(pregunta, data=request.data, partial=partial,
                                         context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'preguntas-item/(?P<pregunta_pk>[^/.]+)/eliminar',
    )
    def eliminar_pregunta(self, request, pk=None, pregunta_pk=None):
        simulador = self.get_object()
        try:
            pregunta = simulador.preguntas.get(pk=pregunta_pk)
        except Pregunta.DoesNotExist:
            return Response({'detail': 'Pregunta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        pregunta.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Explicación de pregunta ───────────────────────────────────────────────

    @action(
        detail=True,
        methods=['put', 'patch'],
        url_path=r'preguntas-item/(?P<pregunta_pk>[^/.]+)/explicacion',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def explicacion_pregunta(self, request, pk=None, pregunta_pk=None):
        simulador = self.get_object()
        try:
            pregunta = simulador.preguntas.get(pk=pregunta_pk)
        except Pregunta.DoesNotExist:
            return Response({'detail': 'Pregunta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        explicacion, _ = ExplicacionPregunta.objects.get_or_create(pregunta=pregunta)
        serializer = ExplicacionPreguntaSerializer(
            explicacion, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # ── Intentos ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='iniciar')
    def iniciar_intento(self, request, pk=None):
        simulador = self.get_object()

        if not simulador.is_available_for_user(request.user):
            apertura, cierre = simulador.get_effective_window_for_user(request.user)
            return Response(
                {
                    'detail': 'Este simulador no está disponible en este momento.',
                    'fecha_apertura_efectiva': apertura,
                    'fecha_cierre_efectiva': cierre,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        intentos_completados = IntentoSimulador.objects.filter(
            simulador=simulador, user=request.user, completado=True
        ).count()

        if intentos_completados >= simulador.max_intentos:
            return Response(
                {'detail': 'Has alcanzado el número máximo de intentos permitidos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si hay un intento incompleto activo, devolvemos ese
        intento_activo = IntentoSimulador.objects.filter(
            simulador=simulador, user=request.user, completado=False
        ).first()

        if intento_activo:
            serializer = IntentoSimuladorSerializer(intento_activo, context={'request': request})
            return Response(serializer.data)

        intento = IntentoSimulador.objects.create(simulador=simulador, user=request.user)
        serializer = IntentoSimuladorSerializer(intento, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path=r'intentos/(?P<intento_pk>[^/.]+)/finalizar')
    def finalizar_intento(self, request, pk=None, intento_pk=None):
        simulador = self.get_object()
        try:
            intento = IntentoSimulador.objects.get(pk=intento_pk, simulador=simulador, user=request.user)
        except IntentoSimulador.DoesNotExist:
            return Response({'detail': 'Intento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if intento.completado:
            return Response({'detail': 'Este intento ya fue finalizado.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EnviarRespuestasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        respuestas_data = serializer.validated_data['respuestas']
        tiempo = serializer.validated_data['tiempo_transcurrido_segundos']

        preguntas = {str(p.id): p for p in simulador.preguntas.prefetch_related('opciones')}
        opciones_map = {}
        for p in preguntas.values():
            for op in p.opciones.all():
                opciones_map[str(op.id)] = op

        with transaction.atomic():
            correctas = 0
            incorrectas = 0
            no_respondidas = 0
            puntaje = 0

            respondidas_ids = set()

            for item in respuestas_data:
                pregunta_id = str(item.get('pregunta_id', ''))
                opcion_id = item.get('opcion_id')
                pregunta = preguntas.get(pregunta_id)
                if not pregunta:
                    continue

                respondidas_ids.add(pregunta_id)
                opcion = opciones_map.get(str(opcion_id)) if opcion_id else None
                es_correcta = bool(opcion and opcion.es_correcta)

                RespuestaIntento.objects.update_or_create(
                    intento=intento,
                    pregunta=pregunta,
                    defaults={'opcion_elegida': opcion, 'es_correcta': es_correcta},
                )

                if opcion is None:
                    no_respondidas += 1
                elif es_correcta:
                    correctas += 1
                    puntaje += pregunta.puntaje
                else:
                    incorrectas += 1

            # Preguntas no incluidas en el payload → no respondidas
            for pid, p in preguntas.items():
                if pid not in respondidas_ids:
                    RespuestaIntento.objects.get_or_create(
                        intento=intento,
                        pregunta=p,
                        defaults={'opcion_elegida': None, 'es_correcta': False},
                    )
                    no_respondidas += 1

            intento.finalizado_en = timezone.now()
            intento.tiempo_transcurrido_segundos = tiempo
            intento.puntaje_obtenido = puntaje
            intento.total_correctas = correctas
            intento.total_incorrectas = incorrectas
            intento.total_no_respondidas = no_respondidas
            intento.completado = True
            intento.save()

        result_serializer = IntentoSimuladorSerializer(intento, context={'request': request})
        return Response(result_serializer.data)

    @action(
        detail=True,
        methods=['get', 'post', 'patch'],
        url_path='disponibilidad-usuario',
    )
    def disponibilidad_usuario(self, request, pk=None):
        simulador = self.get_object()

        if not has_role_permission(request.user, 'simulators', 'manage_availability'):
            return Response({'detail': 'No tienes permisos para esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            user_id = request.query_params.get('user')
            if not user_id:
                return Response({'detail': 'Debes enviar ?user=<uuid>.'}, status=status.HTTP_400_BAD_REQUEST)

            if not is_user_enrolled_for_simulator(simulador, user_id):
                return Response(
                    {'detail': 'El usuario no está matriculado en el curso/ruta asociado a este simulador.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            override = SimuladorDisponibilidadUsuario.objects.filter(
                simulador=simulador,
                user_id=user_id,
            ).first()

            if override:
                payload = SimuladorDisponibilidadUsuarioSerializer(override).data
                payload['es_override'] = True
                return Response(payload)

            user = User.objects.filter(id=user_id).first()
            apertura, cierre = simulador.get_effective_window_for_user(user)
            return Response(
                {
                    'simulador': str(simulador.id),
                    'user': user_id,
                    'fecha_apertura': apertura,
                    'fecha_cierre': cierre,
                    'es_override': False,
                }
            )

        user_id = request.data.get('user')
        if not user_id:
            return Response({'detail': 'El campo user es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_user_enrolled_for_simulator(simulador, user_id):
            return Response(
                {'detail': 'El usuario no está matriculado en el curso/ruta asociado a este simulador.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            disponibilidad = SimuladorDisponibilidadUsuario.objects.get(
                simulador=simulador,
                user_id=user_id,
            )
            serializer = SimuladorDisponibilidadUsuarioSerializer(
                disponibilidad,
                data=request.data,
                partial=request.method == 'PATCH',
            )
        except SimuladorDisponibilidadUsuario.DoesNotExist:
            serializer = SimuladorDisponibilidadUsuarioSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        instance = serializer.save(simulador=simulador, created_by=request.user)
        return Response(
            SimuladorDisponibilidadUsuarioSerializer(instance).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=['get'],
        url_path='disponibilidades-usuarios',
    )
    def disponibilidades_usuarios(self, request, pk=None):
        simulador = self.get_object()

        if not has_role_permission(request.user, 'simulators', 'manage_availability'):
            return Response({'detail': 'No tienes permisos para esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        disponibilidades = SimuladorDisponibilidadUsuario.objects.filter(
            simulador=simulador,
        ).select_related('user', 'created_by').order_by('-updated_at')

        serializer = SimuladorDisponibilidadUsuarioSerializer(disponibilidades, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='mis-intentos')
    def mis_intentos(self, request, pk=None):
        simulador = self.get_object()
        intentos = IntentoSimulador.objects.filter(
            simulador=simulador, user=request.user
        ).order_by('-iniciado_en')
        serializer = IntentoListSerializer(intentos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path=r'intentos/(?P<intento_pk>[^/.]+)/resultado')
    def resultado_intento(self, request, pk=None, intento_pk=None):
        simulador = self.get_object()
        try:
            intento = IntentoSimulador.objects.prefetch_related(
                'respuestas__pregunta__opciones',
                'respuestas__pregunta__explicacion',
                'respuestas__opcion_elegida',
            ).get(pk=intento_pk, simulador=simulador, user=request.user)
        except IntentoSimulador.DoesNotExist:
            return Response({'detail': 'Intento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = IntentoSimuladorSerializer(intento, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='ranking')
    def ranking(self, request, pk=None):
        simulador = self.get_object()

        completed_attempts = IntentoSimulador.objects.filter(
            simulador=simulador,
            completado=True,
        ).select_related('user')

        best_by_user = {}
        user_attempt_count = {}

        for attempt in completed_attempts:
            user_id = str(attempt.user_id)
            user_attempt_count[user_id] = user_attempt_count.get(user_id, 0) + 1
            current_best = best_by_user.get(user_id)
            if is_better_attempt(attempt, current_best):
                best_by_user[user_id] = attempt

        best_attempts = list(best_by_user.values())
        best_attempts.sort(
            key=lambda item: (
                -(item.puntaje_obtenido or 0),
                item.tiempo_transcurrido_segundos or 10 ** 9,
                item.finalizado_en or timezone.now(),
            )
        )

        ranking = []
        my_position = None
        my_user_id = str(request.user.id)

        for idx, attempt in enumerate(best_attempts, start=1):
            user = attempt.user
            entry = {
                'posicion': idx,
                'user_id': str(user.id),
                'user_nombre': build_user_display_name(user),
                'user_email': user.email,
                'iniciales': build_user_initials(user),
                'puntaje': float(attempt.puntaje_obtenido or 0),
                'tiempo_segundos': attempt.tiempo_transcurrido_segundos or 0,
                'intento_id': str(attempt.id),
                'intentos_completados': user_attempt_count.get(str(user.id), 0),
                'finalizado_en': attempt.finalizado_en,
            }
            ranking.append(entry)
            if str(user.id) == my_user_id:
                my_position = entry

        my_best_attempt = best_by_user.get(my_user_id)
        my_stats = {
            'mejor_puntaje': float((my_best_attempt.puntaje_obtenido if my_best_attempt else 0) or 0),
            'mejor_tiempo_segundos': (my_best_attempt.tiempo_transcurrido_segundos if my_best_attempt else 0) or 0,
            'intentos_completados': user_attempt_count.get(my_user_id, 0),
        }

        payload = {
            'simulador': {
                'id': str(simulador.id),
                'titulo': simulador.titulo,
            },
            'total_participantes': len(ranking),
            'top3': ranking[:3],
            'ranking': ranking,
            'mi_posicion': my_position,
            'mis_estadisticas': my_stats,
        }
        return Response(payload)
