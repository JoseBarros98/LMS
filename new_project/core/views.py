from datetime import date

from django.db.models import Q
import secrets
import string

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from core.access import get_dashboard_sections, has_page_access, has_role_permission, is_admin_user
from core.api_permissions import RoleActionPermission
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.response import Response


def get_active_enrollment_filters(user):
    from cursos.models import MatriculaCurso, MatriculaRuta

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

    return matriculas_curso, matriculas_ruta


def build_user_name(user):
    return ' '.join(
        part for part in [user.name, user.paternal_surname, user.maternal_surname] if part
    ).strip() or user.email


def build_daily_series(entries, total_days=7):
    today = date.today()
    day_index = {
        (today.fromordinal(today.toordinal() - offset)).isoformat(): 0
        for offset in range(total_days)
    }

    labels = []
    for offset in range(total_days - 1, -1, -1):
        current_day = today.fromordinal(today.toordinal() - offset)
        labels.append({
            'key': current_day.isoformat(),
            'label': current_day.strftime('%d/%m'),
            'value': 0,
        })

    for item in entries:
        day_key = item['day']
        for label in labels:
            if label['key'] == day_key:
                label['value'] += item['value']
                break

    return [{'label': item['label'], 'value': item['value']} for item in labels]


def build_admin_chart_payload(open_tickets, in_progress_tickets, resolved_tickets, urgent_tickets):
    from cursos.models import Curso, Leccion, MatriculaCurso, MatriculaRuta, Ruta
    from tickets.models import Ticket

    enrollment_entries = [
        {
            'day': enrollment.created_at.date().isoformat(),
            'value': 1,
        }
        for enrollment in list(MatriculaCurso.objects.order_by('-created_at')[:50])
        + list(MatriculaRuta.objects.order_by('-created_at')[:50])
    ]

    return {
        'academy_mix': [
            {'name': 'Cursos publicados', 'value': Curso.objects.filter(publicado=True).count()},
            {'name': 'Cursos borrador', 'value': Curso.objects.filter(publicado=False).count()},
            {'name': 'Rutas publicadas', 'value': Ruta.objects.filter(publicado=True).count()},
            {'name': 'Lecciones publicadas', 'value': Leccion.objects.filter(publicado=True).count()},
        ],
        'tickets_by_status': [
            {'name': 'Abiertos', 'value': open_tickets},
            {'name': 'En progreso', 'value': in_progress_tickets},
            {'name': 'Resueltos', 'value': resolved_tickets},
            {'name': 'Cerrados', 'value': Ticket.objects.filter(status='closed').count()},
        ],
        'tickets_by_priority': [
            {'name': 'Baja', 'value': Ticket.objects.filter(priority='low').count()},
            {'name': 'Media', 'value': Ticket.objects.filter(priority='medium').count()},
            {'name': 'Alta', 'value': Ticket.objects.filter(priority='high').count()},
            {'name': 'Urgente', 'value': urgent_tickets},
        ],
        'enrollments_last_7_days': build_daily_series(enrollment_entries),
    }


def build_admin_dashboard(user, sections):
    from cursos.models import Curso, Leccion, MatriculaCurso, MatriculaRuta, Ruta
    from simuladores.models import Simulador
    from tickets.models import Notification, Ticket

    unread_notifications = Notification.objects.filter(recipient=user, is_read=False).count()
    open_tickets = Ticket.objects.filter(status='open').count()
    in_progress_tickets = Ticket.objects.filter(status='in_progress').count()
    resolved_tickets = Ticket.objects.filter(status='resolved').count()
    urgent_tickets = Ticket.objects.filter(priority='urgent').count()

    recent_course_enrollments = [
        {
            'id': f'curso-{enrollment.id}',
            'title': build_user_name(enrollment.user),
            'subtitle': f'Matriculado en {enrollment.curso.titulo}',
            'meta': enrollment.created_at.isoformat(),
            'href': '/matriculas',
            'tone': 'emerald',
        }
        for enrollment in MatriculaCurso.objects.select_related('user', 'curso').order_by('-created_at')[:3]
    ]
    recent_route_enrollments = [
        {
            'id': f'ruta-{enrollment.id}',
            'title': build_user_name(enrollment.user),
            'subtitle': f'Matriculado en la ruta {enrollment.ruta.titulo}',
            'meta': enrollment.created_at.isoformat(),
            'href': '/matriculas',
            'tone': 'sky',
        }
        for enrollment in MatriculaRuta.objects.select_related('user', 'ruta').order_by('-created_at')[:3]
    ]
    academy_highlights = sorted(
        recent_course_enrollments + recent_route_enrollments,
        key=lambda item: item['meta'],
        reverse=True,
    )[:5]

    support_highlights = [
        {
            'id': f'ticket-{ticket.id}',
            'title': ticket.title,
            'subtitle': build_user_name(ticket.user),
            'meta': ticket.created_at.isoformat(),
            'href': '/tickets',
            'tone': 'amber' if ticket.priority in {'high', 'urgent'} else 'slate',
        }
        for ticket in Ticket.objects.select_related('user').order_by('-created_at')[:5]
    ]

    recent_users = [
        {
            'id': f'user-{created_user.id}',
            'title': build_user_name(created_user),
            'subtitle': created_user.role.name if created_user.role else 'Sin rol asignado',
            'meta': created_user.created_at.isoformat(),
            'href': '/users',
            'tone': 'indigo',
        }
        for created_user in User.objects.select_related('role').order_by('-created_at')[:5]
    ]

    return {
        'viewer_name': build_user_name(user),
        'role_name': getattr(getattr(user, 'role', None), 'name', ''),
        'kind': 'admin',
        'sections': sections,
        'overview_cards': [
            {
                'id': 'users',
                'label': 'Usuarios activos',
                'value': User.objects.filter(is_active=True).count(),
                'description': 'Cuentas activas registradas en la plataforma.',
                'href': '/users',
                'tone': 'slate',
            },
            {
                'id': 'roles',
                'label': 'Roles configurados',
                'value': Role.objects.count(),
                'description': 'Roles disponibles para asignacion.',
                'href': '/roles',
                'tone': 'indigo',
            },
            {
                'id': 'courses',
                'label': 'Cursos publicados',
                'value': Curso.objects.filter(publicado=True).count(),
                'description': 'Oferta academica visible actualmente.',
                'href': '/courses',
                'tone': 'emerald',
            },
            {
                'id': 'simulators',
                'label': 'Simuladores activos',
                'value': Simulador.objects.filter(publicado=True).count(),
                'description': 'Evaluaciones listas para resolverse.',
                'href': '/simuladores',
                'tone': 'sky',
            },
            {
                'id': 'tickets',
                'label': 'Tickets abiertos',
                'value': open_tickets + in_progress_tickets,
                'description': f'{unread_notifications} notificaciones sin leer para tu cuenta.',
                'href': '/tickets',
                'tone': 'amber',
            },
        ],
        'academy': {
            'title': 'Estado academico',
            'description': 'Resumen de publicacion y matriculas recientes.',
            'stats': [
                {
                    'id': 'routes',
                    'label': 'Rutas publicadas',
                    'value': Ruta.objects.filter(publicado=True).count(),
                    'description': 'Rutas activas disponibles para venta o asignacion.',
                    'tone': 'sky',
                },
                {
                    'id': 'draft_courses',
                    'label': 'Cursos en borrador',
                    'value': Curso.objects.filter(publicado=False).count(),
                    'description': 'Cursos aun no visibles al estudiante.',
                    'tone': 'slate',
                },
                {
                    'id': 'lessons',
                    'label': 'Lecciones publicadas',
                    'value': Leccion.objects.filter(publicado=True).count(),
                    'description': 'Contenido academico listo para consumo.',
                    'tone': 'indigo',
                },
                {
                    'id': 'enrollments',
                    'label': 'Matriculas activas',
                    'value': MatriculaCurso.objects.filter(activa=True).count() + MatriculaRuta.objects.filter(activa=True).count(),
                    'description': 'Matriculas activas entre cursos y rutas.',
                    'tone': 'emerald',
                },
            ],
            'highlights': academy_highlights,
        },
        'support': {
            'title': 'Mesa de ayuda',
            'description': 'Carga operativa del soporte y tickets recientes.',
            'stats': [
                {
                    'id': 'open',
                    'label': 'Abiertos',
                    'value': open_tickets,
                    'description': 'Tickets pendientes de primera atencion.',
                    'tone': 'amber',
                },
                {
                    'id': 'in_progress',
                    'label': 'En progreso',
                    'value': in_progress_tickets,
                    'description': 'Solicitudes asignadas y en seguimiento.',
                    'tone': 'sky',
                },
                {
                    'id': 'resolved',
                    'label': 'Resueltos',
                    'value': resolved_tickets,
                    'description': 'Tickets resueltos sin cerrar todavia.',
                    'tone': 'emerald',
                },
                {
                    'id': 'urgent',
                    'label': 'Urgentes',
                    'value': urgent_tickets,
                    'description': 'Incidencias marcadas con prioridad urgente.',
                    'tone': 'rose',
                },
            ],
            'highlights': support_highlights,
        },
        'activity': {
            'title': 'Actividad reciente',
            'description': 'Ultimos movimientos relevantes del sistema.',
            'items': recent_users,
        },
        'charts': build_admin_chart_payload(open_tickets, in_progress_tickets, resolved_tickets, urgent_tickets),
    }


def build_student_progress_chart(cursos_qs, user):
    from cursos.models import ProgresoLeccion

    progress_data = []
    for course in cursos_qs[:6]:
        total_lessons = max(course.total_lecciones or 0, 0)
        completed_lessons = ProgresoLeccion.objects.filter(
            user=user,
            leccion__seccion__curso=course,
            completada=True,
        ).count()
        progress_value = round((completed_lessons / total_lessons) * 100, 1) if total_lessons else 0
        progress_data.append({
            'name': course.titulo[:24],
            'value': progress_value,
        })
    return progress_data


def build_student_chart_payload(user, cursos_qs, tickets, simuladores, upcoming_simulators):
    return {
        'course_progress': build_student_progress_chart(cursos_qs, user),
        'tickets_by_status': [
            {'name': 'Abiertos', 'value': tickets.filter(status='open').count()},
            {'name': 'En progreso', 'value': tickets.filter(status='in_progress').count()},
            {'name': 'Resueltos', 'value': tickets.filter(status='resolved').count()},
            {'name': 'Cerrados', 'value': tickets.filter(status='closed').count()},
        ],
        'simulator_availability': [
            {'name': 'Disponibles ahora', 'value': len(simuladores)},
            {'name': 'Con ventana programada', 'value': len(upcoming_simulators)},
            {'name': 'Cursos activos', 'value': cursos_qs.exclude(estado='bloqueado').count()},
        ],
    }


def build_student_dashboard(user, sections):
    from cursos.models import Curso, Leccion, ProgresoLeccion
    from simuladores.models import Simulador
    from tickets.models import Notification, Ticket

    matriculas_curso, matriculas_ruta = get_active_enrollment_filters(user)
    course_ids = list(matriculas_curso.values_list('curso_id', flat=True))
    route_ids = set(matriculas_ruta.values_list('ruta_id', flat=True))
    cursos_qs = Curso.objects.filter(
        Q(id__in=course_ids) | Q(ruta_id__in=route_ids)
    ).filter(publicado=True).distinct()
    accessible_course_ids = set(cursos_qs.values_list('id', flat=True))

    simuladores = [
        simulador
        for simulador in Simulador.objects.select_related('curso', 'ruta').filter(publicado=True)
        if simulador.is_available_for_user(user)
    ]
    upcoming_simulators = []
    for simulador in Simulador.objects.select_related('curso', 'ruta').filter(publicado=True):
        apertura, cierre = simulador.get_effective_window_for_user(user)
        if not apertura:
            continue
        if simulador.curso_id:
            if simulador.curso_id not in accessible_course_ids:
                continue
        elif simulador.ruta_id and simulador.ruta_id not in route_ids:
            continue

        available_now = simulador.is_available_for_user(user)

        upcoming_simulators.append(
            {
                'id': f'simulador-{simulador.id}',
                'title': simulador.titulo,
                'subtitle': simulador.curso.titulo if simulador.curso else simulador.ruta.titulo,
                'meta': apertura.isoformat(),
                'href': '/simuladores',
                'tone': 'sky' if available_now else 'slate',
            }
        )

    notifications = Notification.objects.filter(recipient=user).order_by('-created_at')[:5]
    tickets = Ticket.objects.filter(user=user)
    completed_lessons = ProgresoLeccion.objects.filter(user=user, completada=True).count()
    total_lessons = Leccion.objects.filter(seccion__curso__in=cursos_qs, publicado=True).distinct().count()

    return {
        'viewer_name': build_user_name(user),
        'role_name': getattr(getattr(user, 'role', None), 'name', ''),
        'kind': 'student',
        'sections': sections,
        'overview_cards': [
            {
                'id': 'courses',
                'label': 'Cursos disponibles',
                'value': cursos_qs.count(),
                'description': 'Cursos activos segun tus matriculas vigentes.',
                'href': '/courses',
                'tone': 'emerald',
            },
            {
                'id': 'routes',
                'label': 'Rutas activas',
                'value': matriculas_ruta.count(),
                'description': 'Rutas academicas a las que tienes acceso.',
                'href': '/courses',
                'tone': 'sky',
            },
            {
                'id': 'simulators',
                'label': 'Simuladores disponibles',
                'value': len(simuladores),
                'description': 'Evaluaciones que puedes resolver ahora mismo.',
                'href': '/simuladores',
                'tone': 'indigo',
            },
            {
                'id': 'tickets',
                'label': 'Tickets abiertos',
                'value': tickets.filter(status__in=['open', 'in_progress']).count(),
                'description': 'Seguimiento de tus solicitudes activas.',
                'href': '/tickets',
                'tone': 'amber',
            },
            {
                'id': 'notifications',
                'label': 'Notificaciones nuevas',
                'value': Notification.objects.filter(recipient=user, is_read=False).count(),
                'description': 'Avisos pendientes de revisar.',
                'href': '/configuracion',
                'tone': 'rose',
            },
        ],
        'academy': {
            'title': 'Tu avance academico',
            'description': 'Resumen de progreso y proximos hitos.',
            'stats': [
                {
                    'id': 'completed_lessons',
                    'label': 'Lecciones completadas',
                    'value': completed_lessons,
                    'description': f'De un total de {total_lessons} lecciones visibles.',
                    'tone': 'emerald',
                },
                {
                    'id': 'available_courses',
                    'label': 'Cursos habilitados',
                    'value': cursos_qs.exclude(estado='bloqueado').count(),
                    'description': 'Cursos disponibles para continuar hoy.',
                    'tone': 'sky',
                },
                {
                    'id': 'locked_courses',
                    'label': 'Cursos bloqueados',
                    'value': cursos_qs.filter(estado='bloqueado').count(),
                    'description': 'Contenido con acceso restringido temporalmente.',
                    'tone': 'slate',
                },
                {
                    'id': 'upcoming_simulators',
                    'label': 'Ventanas de simulador',
                    'value': len(upcoming_simulators),
                    'description': 'Simuladores asociados a tus cursos o rutas.',
                    'tone': 'indigo',
                },
            ],
            'highlights': sorted(upcoming_simulators, key=lambda item: item['meta'])[:5],
        },
        'support': {
            'title': 'Estado de soporte',
            'description': 'Tus tickets y su avance actual.',
            'stats': [
                {
                    'id': 'open',
                    'label': 'Abiertos',
                    'value': tickets.filter(status='open').count(),
                    'description': 'Tickets aun sin atencion inicial.',
                    'tone': 'amber',
                },
                {
                    'id': 'in_progress',
                    'label': 'En progreso',
                    'value': tickets.filter(status='in_progress').count(),
                    'description': 'Casos en seguimiento por soporte.',
                    'tone': 'sky',
                },
                {
                    'id': 'resolved',
                    'label': 'Resueltos',
                    'value': tickets.filter(status='resolved').count(),
                    'description': 'Tickets resueltos pendientes de cierre.',
                    'tone': 'emerald',
                },
                {
                    'id': 'closed',
                    'label': 'Cerrados',
                    'value': tickets.filter(status='closed').count(),
                    'description': 'Solicitudes cerradas correctamente.',
                    'tone': 'slate',
                },
            ],
            'highlights': [
                {
                    'id': f'ticket-{ticket.id}',
                    'title': ticket.title,
                    'subtitle': f'Estado: {ticket.get_status_display()}',
                    'meta': ticket.updated_at.isoformat(),
                    'href': '/tickets',
                    'tone': 'amber' if ticket.priority in {'high', 'urgent'} else 'slate',
                }
                for ticket in tickets.order_by('-updated_at')[:5]
            ],
        },
        'activity': {
            'title': 'Ultima actividad',
            'description': 'Resumen de tus notificaciones mas recientes.',
            'items': [
                {
                    'id': f'notification-{notification.id}',
                    'title': notification.title,
                    'subtitle': notification.message,
                    'meta': notification.created_at.isoformat(),
                    'href': '/configuracion',
                    'tone': 'rose' if not notification.is_read else 'slate',
                }
                for notification in notifications
            ],
        },
        'charts': build_student_chart_payload(user, cursos_qs, tickets, simuladores, upcoming_simulators),
    }

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'roles'

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'users'
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='reset_password')
    def reset_password(self, request, pk=None):
        if not has_role_permission(request.user, 'users', 'reset_password') and not is_admin_user(request.user):
            return Response(
                {'detail': 'No tienes permisos para restablecer contraseñas.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = self.get_object()
        alphabet = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        user.set_password(new_password)
        user.save()
        return Response({'password': new_password})
    
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    if not has_role_permission(request.user, 'users', 'update_profile') and not is_admin_user(request.user):
        return Response({'detail': 'No tienes permisos para editar tu perfil.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    if not has_page_access(request.user, 'dashboard'):
        return Response(
            {'detail': 'No tienes permisos para ver el dashboard.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if is_admin_user(request.user):
        return Response(
            {'detail': 'El dashboard de administrador se consulta desde /api/dashboard/admin-summary/.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    sections = get_dashboard_sections(request.user)
    payload = build_student_dashboard(request.user, sections)

    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_admin_summary(request):
    if not is_admin_user(request.user):
        return Response(
            {'detail': 'Este dashboard es solo para administradores.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not has_page_access(request.user, 'dashboard'):
        return Response(
            {'detail': 'No tienes permisos para ver el dashboard.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    sections = get_dashboard_sections(request.user)
    payload = build_admin_dashboard(request.user, sections)

    return Response(payload)