from datetime import date

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Curso, MatriculaCurso, MatriculaRuta, Ruta
from .serializers import (
    CursoSerializer,
    MatriculaCursoSerializer,
    MatriculaRutaSerializer,
    RutaSerializer,
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


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all().order_by('orden', 'titulo')
    serializer_class = RutaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class CursoViewSet(viewsets.ModelViewSet):
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Curso.objects.select_related('ruta').all()

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

        is_admin = (
            self.request.user
            and self.request.user.role
            and self.request.user.role.name.lower() == 'administrador'
        )

        if not is_admin:
            today = date.today()
            matriculas_curso = MatriculaCurso.objects.filter(
                user_id=self.request.user.id,
                activa=True,
            ).filter(
                Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today)
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today)
            )

            matriculas_ruta = MatriculaRuta.objects.filter(
                user_id=self.request.user.id,
                activa=True,
            ).filter(
                Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today)
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today)
            )

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


class MatriculaRutaViewSet(viewsets.ModelViewSet):
    serializer_class = MatriculaRutaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = MatriculaRuta.objects.select_related('user', 'ruta').all()
        user_id = self.request.query_params.get('user_id')
        ruta_id = self.request.query_params.get('ruta_id')
        activa = self.request.query_params.get('activa')

        is_admin = (
            self.request.user
            and self.request.user.role
            and self.request.user.role.name.lower() == 'administrador'
        )

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

        is_admin = (
            self.request.user
            and self.request.user.role
            and self.request.user.role.name.lower() == 'administrador'
        )

        if not is_admin:
            queryset = queryset.filter(user_id=self.request.user.id)

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)
        if activa is not None:
            queryset = queryset.filter(activa=str(activa).lower() in {'1', 'true', 'yes'})

        return queryset.order_by('-created_at')
