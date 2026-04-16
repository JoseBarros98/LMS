from datetime import timedelta

from django.db import migrations, models


def convert_duration_integers_to_timedelta(apps, schema_editor):
    Curso = apps.get_model('cursos', 'Curso')
    Leccion = apps.get_model('cursos', 'Leccion')

    for curso in Curso.objects.all().iterator():
        curso.duracion_total_tmp = timedelta(minutes=curso.duracion_total_min or 0)
        curso.save(update_fields=['duracion_total_tmp'])

    for leccion in Leccion.objects.all().iterator():
        leccion.duracion_tmp = timedelta(minutes=leccion.duracion_min or 0)
        leccion.save(update_fields=['duracion_tmp'])


def revert_duration_timedelta_to_integers(apps, schema_editor):
    Curso = apps.get_model('cursos', 'Curso')
    Leccion = apps.get_model('cursos', 'Leccion')

    for curso in Curso.objects.all().iterator():
        total_seconds = (curso.duracion_total_tmp or timedelta()).total_seconds()
        curso.duracion_total_min = int(total_seconds // 60)
        curso.save(update_fields=['duracion_total_min'])

    for leccion in Leccion.objects.all().iterator():
        total_seconds = (leccion.duracion_tmp or timedelta()).total_seconds()
        leccion.duracion_min = int(total_seconds // 60)
        leccion.save(update_fields=['duracion_min'])


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0012_alter_curso_ruta_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='curso',
            name='duracion_total_tmp',
            field=models.DurationField(default=timedelta, verbose_name='Duracion total'),
        ),
        migrations.AddField(
            model_name='leccion',
            name='duracion_tmp',
            field=models.DurationField(default=timedelta),
        ),
        migrations.RunPython(convert_duration_integers_to_timedelta, revert_duration_timedelta_to_integers),
        migrations.RemoveField(
            model_name='curso',
            name='duracion_total_min',
        ),
        migrations.RemoveField(
            model_name='leccion',
            name='duracion_min',
        ),
        migrations.RenameField(
            model_name='curso',
            old_name='duracion_total_tmp',
            new_name='duracion_total_min',
        ),
        migrations.RenameField(
            model_name='leccion',
            old_name='duracion_tmp',
            new_name='duracion_min',
        ),
    ]
