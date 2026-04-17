from decimal import Decimal

from django.db import migrations, models


def mark_course_enrollments_as_covered_by_route(apps, schema_editor):
    MatriculaCurso = apps.get_model('cursos', 'MatriculaCurso')
    MatriculaRuta = apps.get_model('cursos', 'MatriculaRuta')
    CuotaPagoMatricula = apps.get_model('cursos', 'CuotaPagoMatricula')

    route_enrollments = MatriculaRuta.objects.values_list('user_id', 'ruta_id')
    route_map = {(user_id, ruta_id) for user_id, ruta_id in route_enrollments}

    course_enrollments = MatriculaCurso.objects.select_related('curso').all()
    for enrollment in course_enrollments:
        course = getattr(enrollment, 'curso', None)
        route_id = getattr(course, 'ruta_id', None)
        if not route_id:
            continue

        if (enrollment.user_id, route_id) not in route_map:
            continue

        enrollment.incluido_en_ruta = True
        enrollment.monto_total = Decimal('0.00')
        enrollment.numero_cuotas = 0
        enrollment.save(update_fields=['incluido_en_ruta', 'monto_total', 'numero_cuotas'])
        CuotaPagoMatricula.objects.filter(matricula_curso_id=enrollment.id).delete()


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0012_alter_curso_ruta_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='matriculacurso',
            name='incluido_en_ruta',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_course_enrollments_as_covered_by_route, noop_reverse),
    ]
