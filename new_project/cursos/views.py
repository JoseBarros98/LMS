from datetime import date

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ComentarioCurso, Curso, Leccion, MatriculaCurso, MatriculaRuta, ProgresoLeccion, Ruta, Seccion, MediatecaItem
from .serializers import (
    ComentarioCursoSerializer,
    CursoDetalleSerializer,
    CursoSerializer,
    MatriculaCursoSerializer,
    MatriculaRutaSerializer,
    ProgresoLeccionSerializer,
    RutaSerializer,
    SeccionDetalleSerializer,
    LeccionDetalleSerializer,
    MediatecaItemSerializer,
)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return (
            request.user
            and request.user.role
            and request.user.role.name.lower() == 'administrador'
        )


def is_admin_user(user):
    return bool(
        user
        and getattr(user, 'role', None)
        and user.role
        and user.role.name.lower() == 'administrador'
    )


def get_active_enrollment_filters(user):
    today = date.today()
    matriculas_curso = MatriculaCurso.objects.filter(
        user_id=user.id,
        activa=True,
    ).filter(
        Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today)
    ).filter(
        Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today)
    )

    matriculas_ruta = MatriculaRuta.objects.filter(
        user_id=user.id,
        activa=True,
    ).filter(
        Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today)
    ).filter(
        Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today)
    )

    return matriculas_curso, matriculas_ruta, today


def can_access_course(user, curso):
    if is_admin_user(user):
        return True

    matriculas_curso, matriculas_ruta, today = get_active_enrollment_filters(user)

    has_access = matriculas_curso.filter(curso_id=curso.id).exists() or matriculas_ruta.filter(ruta_id=curso.ruta_id).exists()
    if not has_access:
        return False

    if not curso.publicado:
        return False

    if curso.fecha_disponible_desde and curso.fecha_disponible_desde > today:
        return False

    if curso.fecha_disponible_hasta and curso.fecha_disponible_hasta < today:
        return False

    return True


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all().order_by('orden', 'titulo')
    serializer_class = RutaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class CursoViewSet(viewsets.ModelViewSet):
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CursoDetalleSerializer
        return CursoSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_admin'] = is_admin_user(self.request.user)

        if self.action == 'retrieve':
            course = self.get_object()
            progress_map = {
                str(progress.leccion_id): progress
                for progress in ProgresoLeccion.objects.filter(
                    user=self.request.user,
                    leccion__seccion__curso=course,
                ).select_related('leccion')
            }
            context['progress_map'] = progress_map

        return context

    def get_queryset(self):
        queryset = Curso.objects.select_related('ruta').prefetch_related(
            'secciones__lecciones',
            'comentarios__user',
            'mediateca_items',
        ).all()

        ruta_id = self.request.query_params.get('ruta_id')
        publicado = self.request.query_params.get('publicado')
        estado = self.request.query_params.get('estado')

        if ruta_id:
            queryset = queryset.filter(ruta_id=ruta_id)

        if publicado is not None:
            publicado_bool = str(publicado).lower() in {'1', 'true', 'yes'}
            queryset = queryset.filter(publicado=publicado_bool)

        if estado:
            queryset = queryset.filter(estado=estado)

        is_admin = is_admin_user(self.request.user)

        if not is_admin:
            matriculas_curso, matriculas_ruta, today = get_active_enrollment_filters(self.request.user)

            queryset = queryset.filter(
                Q(id__in=matriculas_curso.values_list('curso_id', flat=True))
                | Q(ruta_id__in=matriculas_ruta.values_list('ruta_id', flat=True))
            )

            queryset = queryset.filter(publicado=True).filter(
                Q(fecha_disponible_desde__isnull=True)
                | Q(fecha_disponible_desde__lte=today)
            ).filter(
                Q(fecha_disponible_hasta__isnull=True)
                | Q(fecha_disponible_hasta__gte=today)
            )

        return queryset.order_by('ruta__orden', 'ruta__titulo', 'orden', 'titulo').distinct()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def comentarios(self, request, pk=None):
        curso = self.get_object()
        serializer = ComentarioCursoSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        comentario = ComentarioCurso.objects.create(
            curso=curso,
            user=request.user,
            contenido=serializer.validated_data['contenido'],
        )
        return Response(
            ComentarioCursoSerializer(comentario, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class MatriculaRutaViewSet(viewsets.ModelViewSet):
    serializer_class = MatriculaRutaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = MatriculaRuta.objects.select_related('user', 'ruta').all()
        user_id = self.request.query_params.get('user_id')
        ruta_id = self.request.query_params.get('ruta_id')
        activa = self.request.query_params.get('activa')

        is_admin = is_admin_user(self.request.user)

        if not is_admin:
            queryset = queryset.filter(user_id=self.request.user.id)

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if ruta_id:
            queryset = queryset.filter(ruta_id=ruta_id)
        if activa is not None:
            queryset = queryset.filter(activa=str(activa).lower() in {'1', 'true', 'yes'})

        return queryset.order_by('-created_at')


class MatriculaCursoViewSet(viewsets.ModelViewSet):
    serializer_class = MatriculaCursoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = MatriculaCurso.objects.select_related('user', 'curso', 'curso__ruta').all()
        user_id = self.request.query_params.get('user_id')
        curso_id = self.request.query_params.get('curso_id')
        activa = self.request.query_params.get('activa')

        is_admin = is_admin_user(self.request.user)

        if not is_admin:
            queryset = queryset.filter(user_id=self.request.user.id)

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)
        if activa is not None:
            queryset = queryset.filter(activa=str(activa).lower() in {'1', 'true', 'yes'})

        return queryset.order_by('-created_at')


class ProgresoLeccionViewSet(viewsets.ModelViewSet):
    serializer_class = ProgresoLeccionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ProgresoLeccion.objects.select_related('leccion', 'leccion__seccion', 'leccion__seccion__curso', 'user')
        user_id = self.request.query_params.get('user_id')

        if is_admin_user(self.request.user) and user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            queryset = queryset.filter(user=self.request.user)

        curso_id = self.request.query_params.get('curso_id')
        if curso_id:
            queryset = queryset.filter(leccion__seccion__curso_id=curso_id)

        return queryset.order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        leccion = serializer.validated_data['leccion']
        curso = leccion.seccion.curso
        if not can_access_course(request.user, curso):
            return Response({'detail': 'No tienes acceso a esta leccion.'}, status=status.HTTP_403_FORBIDDEN)

        progreso, created = ProgresoLeccion.objects.update_or_create(
            user=request.user,
            leccion=leccion,
            defaults={
                'porcentaje': serializer.validated_data['porcentaje'],
                'completada': serializer.validated_data.get('completada', False),
            },
        )

        response_serializer = self.get_serializer(progreso)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not is_admin_user(request.user) and instance.user_id != request.user.id:
            return Response({'detail': 'No puedes modificar este progreso.'}, status=status.HTTP_403_FORBIDDEN)

        return super().partial_update(request, *args, **kwargs)


class SeccionViewSet(viewsets.ModelViewSet):
    serializer_class = SeccionDetalleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Seccion.objects.select_related('curso').prefetch_related('lecciones').all()
        curso_id = self.request.query_params.get('curso_id')

        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)

        if not is_admin_user(self.request.user):
            curso_ids = Curso.objects.filter(
                Q(id__in=MatriculaCurso.objects.filter(user=self.request.user, activa=True).values_list('curso_id', flat=True))
                | Q(ruta_id__in=MatriculaRuta.objects.filter(user=self.request.user, activa=True).values_list('ruta_id', flat=True))
            ).values_list('id', flat=True)
            queryset = queryset.filter(curso_id__in=curso_ids)

        return queryset.order_by('orden', 'titulo')


class LeccionViewSet(viewsets.ModelViewSet):
    serializer_class = LeccionDetalleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Leccion.objects.select_related('seccion', 'seccion__curso').all()
        seccion_id = self.request.query_params.get('seccion_id')

        if seccion_id:
            queryset = queryset.filter(seccion_id=seccion_id)

        if not is_admin_user(self.request.user):
            queryset = queryset.filter(publicado=True)
            curso_ids = Curso.objects.filter(
                Q(id__in=MatriculaCurso.objects.filter(user=self.request.user, activa=True).values_list('curso_id', flat=True))
                | Q(ruta_id__in=MatriculaRuta.objects.filter(user=self.request.user, activa=True).values_list('ruta_id', flat=True))
            ).values_list('id', flat=True)
            queryset = queryset.filter(seccion__curso_id__in=curso_ids)

        return queryset.order_by('orden', 'titulo')


class ComentarioCursoViewSet(viewsets.ModelViewSet):
    serializer_class = ComentarioCursoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ComentarioCurso.objects.select_related('user', 'curso').prefetch_related('respuestas__user').all()
        curso_id = self.request.query_params.get('curso_id')

        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)

        if self.action == 'list':
            queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        curso = serializer.validated_data['curso']
        parent = serializer.validated_data.get('parent')
        if not can_access_course(request.user, curso):
            return Response({'detail': 'No tienes acceso a este curso.'}, status=status.HTTP_403_FORBIDDEN)

        if parent and parent.curso_id != curso.id:
            return Response({'detail': 'La respuesta debe pertenecer al mismo curso.'}, status=status.HTTP_400_BAD_REQUEST)

        comentario = ComentarioCurso.objects.create(
            curso=curso,
            user=request.user,
            parent=parent,
            contenido=serializer.validated_data['contenido'],
        )

        return Response(
            ComentarioCursoSerializer(comentario).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not is_admin_user(request.user) and instance.user_id != request.user.id:
            return Response({'detail': 'No puedes eliminar este comentario.'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)


class MediatecaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediatecaItemSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = MediatecaItem.objects.select_related('curso', 'parent').prefetch_related('children').all()
        curso_id = self.request.query_params.get('curso_id')
        parent_id = self.request.query_params.get('parent_id')

        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)

        if parent_id is not None:
            if parent_id in {'', 'null', 'None', 'root'}:
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)

        if not is_admin_user(self.request.user):
            queryset = queryset.filter(publicado=True)
            curso_ids = Curso.objects.filter(
                Q(id__in=MatriculaCurso.objects.filter(user=self.request.user, activa=True).values_list('curso_id', flat=True))
                | Q(ruta_id__in=MatriculaRuta.objects.filter(user=self.request.user, activa=True).values_list('ruta_id', flat=True))
            ).values_list('id', flat=True)
            queryset = queryset.filter(curso_id__in=curso_ids)

        return queryset.order_by('orden', 'titulo')
