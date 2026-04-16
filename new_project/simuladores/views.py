from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ExplicacionPregunta,
    IntentoSimulador,
    Opcion,
    Pregunta,
    RespuestaIntento,
    Simulador,
)
from .serializers import (
    EnviarRespuestasSerializer,
    ExplicacionPreguntaSerializer,
    IntentoListSerializer,
    IntentoSimuladorSerializer,
    PreguntaPublicaSerializer,
    PreguntaSerializer,
    SimuladorDetalleSerializer,
    SimuladorListSerializer,
    SimuladorWriteSerializer,
)


def is_admin(user):
    return bool(
        user
        and getattr(user, 'role', None)
        and user.role
        and user.role.name.lower() == 'administrador'
    )


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return is_admin(request.user)


class SimuladorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Simulador.objects.select_related('curso', 'ruta').prefetch_related('preguntas')
        if not is_admin(self.request.user):
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

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrReadOnly()]
        return [IsAuthenticated()]

    # ── Preguntas del simulador ───────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='preguntas')
    def preguntas(self, request, pk=None):
        simulador = self.get_object()
        qs = simulador.preguntas.prefetch_related('opciones', 'explicacion').order_by('orden')
        if is_admin(request.user):
            serializer = PreguntaSerializer(qs, many=True, context={'request': request})
        else:
            serializer = PreguntaPublicaSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        url_path='preguntas-crear',
        permission_classes=[IsAuthenticated, IsAdminOrReadOnly],
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
        permission_classes=[IsAuthenticated, IsAdminOrReadOnly],
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
        permission_classes=[IsAuthenticated, IsAdminOrReadOnly],
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
        permission_classes=[IsAuthenticated, IsAdminOrReadOnly],
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

        if not simulador.esta_disponible:
            return Response(
                {'detail': 'Este simulador no está disponible en este momento.'},
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
