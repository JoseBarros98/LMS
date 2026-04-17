from django.db.models import Avg, Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Flashcard, FlashcardGroup, FlashcardStudyEvent
from .serializers import (
    FlashcardGroupDetailSerializer,
    FlashcardGroupSerializer,
    FlashcardSerializer,
    FlashcardStudyAnswerSerializer,
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        owner = getattr(obj, 'owner', None)
        if owner is not None:
            return owner == request.user

        grupo = getattr(obj, 'grupo', None)
        if grupo is not None:
            return grupo.owner == request.user

        return False


class FlashcardGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = FlashcardGroup.objects.select_related('owner').annotate(
            cards_count=Count('cards', distinct=True),
            usuarios_unicos=Count('study_events__user', distinct=True),
            total_intentos=Count('study_events'),
            respuestas_correctas=Count('study_events', filter=Q(study_events__fue_correcta=True)),
            tiempo_medio_seg_agg=Avg('study_events__duracion_segundos'),
        )

        if self.action in ['update', 'partial_update', 'destroy']:
            return queryset.filter(owner=user)

        scope = self.request.query_params.get('scope')
        if scope == 'mine':
            return queryset.filter(owner=user)
        if scope == 'community':
            return queryset.filter(visibilidad=FlashcardGroup.VISIBILITY_PUBLIC)

        return queryset.filter(Q(visibilidad=FlashcardGroup.VISIBILITY_PUBLIC) | Q(owner=user))

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FlashcardGroupDetailSerializer
        return FlashcardGroupSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='registrar-respuesta')
    def registrar_respuesta(self, request, pk=None):
        grupo = self.get_object()

        if grupo.visibilidad != FlashcardGroup.VISIBILITY_PUBLIC and grupo.owner != request.user:
            return Response({'detail': 'No tienes permisos para estudiar este grupo.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = FlashcardStudyAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        card = None
        card_id = serializer.validated_data.get('card_id')
        if card_id:
            card = Flashcard.objects.filter(id=card_id, grupo=grupo).first()
            if not card:
                return Response({'card_id': ['La tarjeta no pertenece al grupo.']}, status=status.HTTP_400_BAD_REQUEST)

        FlashcardStudyEvent.objects.create(
            user=request.user,
            grupo=grupo,
            card=card,
            fue_correcta=serializer.validated_data['fue_correcta'],
            duracion_segundos=serializer.validated_data.get('duracion_segundos', 0),
        )

        return Response({'detail': 'Respuesta registrada.'}, status=status.HTTP_201_CREATED)


class FlashcardViewSet(viewsets.ModelViewSet):
    serializer_class = FlashcardSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Flashcard.objects.select_related('grupo', 'grupo__owner')

        if self.action in ['update', 'partial_update', 'destroy', 'create']:
            queryset = queryset.filter(grupo__owner=user)
        else:
            queryset = queryset.filter(Q(grupo__owner=user) | Q(grupo__visibilidad=FlashcardGroup.VISIBILITY_PUBLIC))

        grupo_id = self.request.query_params.get('grupo_id')
        if grupo_id:
            queryset = queryset.filter(grupo_id=grupo_id)

        return queryset

    def create(self, request, *args, **kwargs):
        grupo_id = request.data.get('grupo')
        if not grupo_id:
            return Response({'grupo': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)

        grupo = FlashcardGroup.objects.filter(id=grupo_id, owner=request.user).first()
        if not grupo:
            return Response({'grupo': ['No tienes permisos para agregar tarjetas en este grupo.']}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)
