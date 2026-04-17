from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, DurationField, Q, Sum, Value
from django.db import transaction
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.access import has_role_permission, is_admin_user
from core.api_permissions import RoleActionPermission
from core.models import Role, User
from core.serializers import UserSerializer

from .models import ComentarioCurso, CuotaPagoMatricula, Curso, Leccion, MatriculaCurso, MatriculaRuta, ProgresoLeccion, Ruta, Seccion, MediatecaItem
from .serializers import (
    ComentarioCursoSerializer,
    CuotaPagoControlSerializer,
    CreateStudentEnrollmentSerializer,
    CursoDetalleSerializer,
    CursoSerializer,
    MatriculaCursoSerializer,
    MatriculaRutaSerializer,
    ProgresoLeccionSerializer,
    RegistrarPagoCuotaSerializer,
    RutaSerializer,
    SeccionDetalleSerializer,
    LeccionDetalleSerializer,
    MediatecaItemSerializer,
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

    return True


def ensure_student_role():
    role = Role.objects.filter(name__iexact='estudiante').first()
    if role:
        return role

    return Role.objects.create(
        name='Estudiante',
        description='Rol base para estudiantes',
    )


def extract_enrollment_fields(validated_data):
    payload = {
        'plan_pago': validated_data.get('plan_pago', MatriculaRuta.PLAN_CONTADO),
        'activa': validated_data.get('activa', True),
    }

    # Avoid sending explicit nulls to serializers for optional fields.
    for key in ('codigo_acceso', 'numero_cuotas', 'fechas_pago', 'fecha_inicio', 'fecha_fin'):
        if key in validated_data and validated_data.get(key) is not None:
            payload[key] = validated_data.get(key)

    return payload


def build_student_user_data(validated_data, role):
    return {
        'name': validated_data['name'],
        'paternal_surname': validated_data.get('paternal_surname', ''),
        'maternal_surname': validated_data.get('maternal_surname', ''),
        'ci': validated_data['ci'],
        'email': validated_data['email'],
        'phone_number': validated_data['phone_number'],
        'university': validated_data['university'],
        'country': validated_data['country'],
        'role': role,
        'status': True,
        'is_active': True,
    }


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.annotate(
        total_cursos=Count('cursos', distinct=True),
        precio_total=Coalesce(
            Sum('cursos__precio'),
            Value(0),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
        duracion_total_min=Coalesce(
            Sum('cursos__duracion_total_min'),
            Value(timedelta()),
            output_field=DurationField(),
        ),
    ).order_by('orden', 'titulo')
    serializer_class = RutaSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'routes'

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def crear_estudiante_matriculado(self, request, pk=None):
        if not is_admin_user(request.user):
            return Response({'detail': 'Solo los administradores pueden realizar esta accion.'}, status=status.HTTP_403_FORBIDDEN)

        ruta = self.get_object()
        serializer = CreateStudentEnrollmentSerializer(
            data=request.data,
            context={'enrollment_type': 'ruta'},
        )
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        student_role = ensure_student_role()

        with transaction.atomic():
            user = User.objects.create_user(
                password=validated['password'],
                **build_student_user_data(validated, student_role),
            )
            enrollment_payload = {
                'user': user.id,
                'ruta': ruta.id,
                **extract_enrollment_fields(validated),
            }
            matricula_serializer = MatriculaRutaSerializer(data=enrollment_payload, context={'request': request})
            matricula_serializer.is_valid(raise_exception=True)
            matricula = matricula_serializer.save(created_by=request.user)

        return Response(
            {
                'user': UserSerializer(user, context={'request': request}).data,
                'matricula': MatriculaRutaSerializer(matricula, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CursoViewSet(viewsets.ModelViewSet):
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'courses'

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

            queryset = queryset.filter(publicado=True)

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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def crear_estudiante_matriculado(self, request, pk=None):
        if not is_admin_user(request.user):
            return Response({'detail': 'Solo los administradores pueden realizar esta accion.'}, status=status.HTTP_403_FORBIDDEN)

        curso = self.get_object()
        serializer = CreateStudentEnrollmentSerializer(
            data=request.data,
            context={'enrollment_type': 'curso'},
        )
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        student_role = ensure_student_role()

        with transaction.atomic():
            user = User.objects.create_user(
                password=validated['password'],
                **build_student_user_data(validated, student_role),
            )
            enrollment_payload = {
                'user': user.id,
                'curso': curso.id,
                **extract_enrollment_fields(validated),
            }
            matricula_serializer = MatriculaCursoSerializer(data=enrollment_payload, context={'request': request})
            matricula_serializer.is_valid(raise_exception=True)
            matricula = matricula_serializer.save(created_by=request.user)

        return Response(
            {
                'user': UserSerializer(user, context={'request': request}).data,
                'matricula': MatriculaCursoSerializer(matricula, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MatriculaRutaViewSet(viewsets.ModelViewSet):
    serializer_class = MatriculaRutaSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'enrollments'
    permission_action_map = {
        'list': ['read', 'read_own'],
        'retrieve': ['read', 'read_own'],
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
    }

    def get_queryset(self):
        queryset = MatriculaRuta.objects.select_related('user', 'created_by', 'ruta').prefetch_related('cuotas_pago').all()
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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MatriculaCursoViewSet(viewsets.ModelViewSet):
    serializer_class = MatriculaCursoSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'enrollments'
    permission_action_map = {
        'list': ['read', 'read_own'],
        'retrieve': ['read', 'read_own'],
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
    }

    def get_queryset(self):
        queryset = MatriculaCurso.objects.select_related('user', 'created_by', 'curso', 'curso__ruta').prefetch_related('cuotas_pago').all()
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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CuotaPagoMatriculaViewSet(viewsets.ModelViewSet):
    serializer_class = CuotaPagoControlSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'enrollments'
    permission_action_map = {
        'list': ['read', 'read_own'],
        'retrieve': ['read', 'read_own'],
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
        'registrar_pago': 'update',
    }

    def get_queryset(self):
        queryset = CuotaPagoMatricula.objects.select_related(
            'matricula_ruta__user',
            'matricula_ruta__created_by',
            'matricula_curso__user',
            'matricula_curso__created_by',
        )

        matricula_ruta_id = self.request.query_params.get('matricula_ruta_id')
        matricula_curso_id = self.request.query_params.get('matricula_curso_id')

        if matricula_ruta_id:
            queryset = queryset.filter(matricula_ruta_id=matricula_ruta_id)
        if matricula_curso_id:
            queryset = queryset.filter(matricula_curso_id=matricula_curso_id)

        is_admin = is_admin_user(self.request.user)
        if not is_admin:
            queryset = queryset.filter(
                Q(matricula_ruta__user_id=self.request.user.id)
                | Q(matricula_curso__user_id=self.request.user.id)
            )

        return queryset.order_by('numero')

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        payload = {}
        if 'fecha_pago' in request.data:
            payload['fecha_pago'] = request.data.get('fecha_pago')

        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        cuota = serializer.save()
        return Response(self.get_serializer(cuota).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def registrar_pago(self, request, pk=None):
        if not is_admin_user(request.user):
            return Response({'detail': 'Solo los administradores pueden registrar pagos.'}, status=status.HTTP_403_FORBIDDEN)

        cuota_inicial = self.get_object()
        serializer = RegistrarPagoCuotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        remaining = Decimal(serializer.validated_data['monto_abonado'])
        fecha_pago_real = serializer.validated_data.get('fecha_pago_real', date.today())

        if cuota_inicial.matricula_ruta_id:
            cuotas = CuotaPagoMatricula.objects.filter(
                matricula_ruta_id=cuota_inicial.matricula_ruta_id,
                numero__gte=cuota_inicial.numero,
            ).order_by('numero')
        else:
            cuotas = CuotaPagoMatricula.objects.filter(
                matricula_curso_id=cuota_inicial.matricula_curso_id,
                numero__gte=cuota_inicial.numero,
            ).order_by('numero')

        updated_ids = []
        with transaction.atomic():
            for cuota in cuotas:
                if remaining <= Decimal('0.00'):
                    break

                saldo = cuota.saldo_pendiente
                if saldo <= Decimal('0.00'):
                    continue

                aplicado = saldo if remaining >= saldo else remaining
                cuota.monto_pagado = (cuota.monto_pagado or Decimal('0.00')) + aplicado
                cuota.fecha_pago_real = fecha_pago_real
                cuota.refresh_payment_state()
                cuota.save(update_fields=['monto_pagado', 'estado', 'fecha_pago_real', 'updated_at'])

                updated_ids.append(str(cuota.id))
                remaining -= aplicado

        payload = {
            'updated_cuotas': CuotaPagoControlSerializer(
                CuotaPagoMatricula.objects.filter(id__in=updated_ids).order_by('numero'),
                many=True,
            ).data,
            'monto_abonado': str(serializer.validated_data['monto_abonado']),
            'monto_excedente': str(remaining if remaining > Decimal('0.00') else Decimal('0.00')),
        }
        return Response(payload, status=status.HTTP_200_OK)


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
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'courses'

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
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'courses'

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
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'resources'

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
