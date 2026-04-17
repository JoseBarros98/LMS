import uuid
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class Simulador(models.Model):
    AUTO_WINDOW_DAYS = 7

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.CharField(max_length=250, verbose_name='Título')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    imagen_portada = models.ImageField(
        upload_to='simuladores/portadas/', blank=True, null=True, verbose_name='Imagen portada'
    )
    imagen_portada_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Imagen portada URL')

    # Asociación a curso o ruta (exactamente una)
    curso = models.ForeignKey(
        'cursos.Curso',
        on_delete=models.SET_NULL,
        related_name='simuladores',
        blank=True,
        null=True,
        verbose_name='Curso',
    )
    ruta = models.ForeignKey(
        'cursos.Ruta',
        on_delete=models.SET_NULL,
        related_name='simuladores',
        blank=True,
        null=True,
        verbose_name='Ruta',
    )

    tiempo_limite_minutos = models.PositiveIntegerField(
        default=60, verbose_name='Tiempo límite (minutos)'
    )
    max_intentos = models.PositiveIntegerField(default=1, verbose_name='Intentos permitidos')
    publicado = models.BooleanField(default=False, verbose_name='Publicado')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Simulador'
        verbose_name_plural = 'Simuladores'
        ordering = ['titulo']

    def __str__(self):
        return self.titulo

    def clean(self):
        if bool(self.curso_id) == bool(self.ruta_id):
            raise ValidationError('El simulador debe asociarse a un curso o a una ruta (solo uno).')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def _get_course_completion_datetime(self, user, curso_id):
        from cursos.models import Leccion, ProgresoLeccion

        lessons_qs = Leccion.objects.filter(seccion__curso_id=curso_id, publicado=True)
        total_lessons = lessons_qs.count()
        if total_lessons == 0:
            return None

        completed_qs = ProgresoLeccion.objects.filter(
            user_id=user.id,
            leccion__in=lessons_qs,
            completada=True,
        )

        if completed_qs.count() < total_lessons:
            return None

        return completed_qs.order_by('-updated_at').values_list('updated_at', flat=True).first()

    def _get_route_completion_datetime(self, user, ruta_id):
        from cursos.models import Curso

        course_ids = list(
            Curso.objects.filter(ruta_id=ruta_id, publicado=True).values_list('id', flat=True)
        )
        if not course_ids:
            return None

        completion_dates = []
        for course_id in course_ids:
            completion_dt = self._get_course_completion_datetime(user, course_id)
            if completion_dt is None:
                return None
            completion_dates.append(completion_dt)

        return max(completion_dates) if completion_dates else None

    def get_auto_window_for_user(self, user):
        if not user or not getattr(user, 'is_authenticated', False):
            return None, None

        completion_dt = None
        if self.curso_id:
            completion_dt = self._get_course_completion_datetime(user, self.curso_id)
        elif self.ruta_id:
            completion_dt = self._get_route_completion_datetime(user, self.ruta_id)

        if not completion_dt:
            return None, None

        return completion_dt, completion_dt + timedelta(days=self.AUTO_WINDOW_DAYS)

    def get_effective_window_for_user(self, user):
        override = self.disponibilidades_usuario.filter(user_id=getattr(user, 'id', None)).first()
        if override:
            return override.fecha_apertura, override.fecha_cierre

        return self.get_auto_window_for_user(user)

    def is_available_for_user(self, user):
        if not self.publicado:
            return False

        apertura, cierre = self.get_effective_window_for_user(user)
        now = timezone.now()

        if apertura and now < apertura:
            return False
        if cierre and now > cierre:
            return False
        return bool(apertura and cierre)

    @property
    def esta_disponible(self):
        return self.publicado


class SimuladorDisponibilidadUsuario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    simulador = models.ForeignKey(
        Simulador,
        on_delete=models.CASCADE,
        related_name='disponibilidades_usuario',
        verbose_name='Simulador',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disponibilidades_simulador',
        verbose_name='Usuario',
    )
    fecha_apertura = models.DateTimeField(verbose_name='Fecha de apertura')
    fecha_cierre = models.DateTimeField(verbose_name='Fecha de cierre')
    motivo = models.CharField(max_length=250, blank=True, null=True, verbose_name='Motivo')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='disponibilidades_simulador_creadas',
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Disponibilidad de simulador por usuario'
        verbose_name_plural = 'Disponibilidades de simulador por usuario'
        unique_together = [('simulador', 'user')]

    def __str__(self):
        return f'{self.simulador.titulo} - {self.user_id}'

    def clean(self):
        if self.fecha_cierre <= self.fecha_apertura:
            raise ValidationError('La fecha de cierre debe ser posterior a la fecha de apertura.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Pregunta(models.Model):
    TIPO_MULTIPLE = 'multiple'
    TIPO_VERDADERO_FALSO = 'verdadero_falso'

    TIPO_CHOICES = [
        (TIPO_MULTIPLE, 'Opción múltiple'),
        (TIPO_VERDADERO_FALSO, 'Verdadero o Falso'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    simulador = models.ForeignKey(
        Simulador, on_delete=models.CASCADE, related_name='preguntas', verbose_name='Simulador'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_MULTIPLE, verbose_name='Tipo')
    texto = models.TextField(verbose_name='Texto de la pregunta')
    puntaje = models.PositiveSmallIntegerField(default=1, verbose_name='Puntaje')
    orden = models.PositiveSmallIntegerField(default=0, verbose_name='Orden')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['simulador', 'orden']

    def __str__(self):
        return f'{self.simulador} – P{self.orden}: {self.texto[:60]}'


class Opcion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pregunta = models.ForeignKey(
        Pregunta, on_delete=models.CASCADE, related_name='opciones', verbose_name='Pregunta'
    )
    texto = models.CharField(max_length=500, verbose_name='Texto de la opción')
    es_correcta = models.BooleanField(default=False, verbose_name='Es correcta')
    orden = models.PositiveSmallIntegerField(default=0, verbose_name='Orden')

    class Meta:
        verbose_name = 'Opción'
        verbose_name_plural = 'Opciones'
        ordering = ['pregunta', 'orden']

    def __str__(self):
        return f'{self.pregunta_id} – {self.texto[:50]}'


class ExplicacionPregunta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pregunta = models.OneToOneField(
        Pregunta, on_delete=models.CASCADE, related_name='explicacion', verbose_name='Pregunta'
    )
    texto = models.TextField(blank=True, null=True, verbose_name='Texto de explicación')
    imagen = models.ImageField(
        upload_to='simuladores/explicaciones/', blank=True, null=True, verbose_name='Imagen'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Explicación de pregunta'
        verbose_name_plural = 'Explicaciones de preguntas'

    def __str__(self):
        return f'Explicación – {self.pregunta_id}'


class IntentoSimulador(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    simulador = models.ForeignKey(
        Simulador, on_delete=models.CASCADE, related_name='intentos', verbose_name='Simulador'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intentos_simulador',
        verbose_name='Usuario',
    )
    iniciado_en = models.DateTimeField(auto_now_add=True, verbose_name='Iniciado en')
    finalizado_en = models.DateTimeField(blank=True, null=True, verbose_name='Finalizado en')
    tiempo_transcurrido_segundos = models.PositiveIntegerField(
        blank=True, null=True, verbose_name='Tiempo transcurrido (segundos)'
    )
    puntaje_obtenido = models.DecimalField(
        max_digits=8, decimal_places=2, default=0, verbose_name='Puntaje obtenido'
    )
    total_correctas = models.PositiveSmallIntegerField(default=0, verbose_name='Correctas')
    total_incorrectas = models.PositiveSmallIntegerField(default=0, verbose_name='Incorrectas')
    total_no_respondidas = models.PositiveSmallIntegerField(default=0, verbose_name='No respondidas')
    completado = models.BooleanField(default=False, verbose_name='Completado')

    class Meta:
        verbose_name = 'Intento de simulador'
        verbose_name_plural = 'Intentos de simulador'
        ordering = ['-iniciado_en']

    def __str__(self):
        return f'{self.user} – {self.simulador} ({self.iniciado_en:%Y-%m-%d})'


class RespuestaIntento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intento = models.ForeignKey(
        IntentoSimulador, on_delete=models.CASCADE, related_name='respuestas', verbose_name='Intento'
    )
    pregunta = models.ForeignKey(
        Pregunta, on_delete=models.CASCADE, related_name='respuestas', verbose_name='Pregunta'
    )
    opcion_elegida = models.ForeignKey(
        Opcion,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='respuestas',
        verbose_name='Opción elegida',
    )
    es_correcta = models.BooleanField(default=False, verbose_name='Es correcta')

    class Meta:
        verbose_name = 'Respuesta de intento'
        verbose_name_plural = 'Respuestas de intento'
        unique_together = [('intento', 'pregunta')]

    def __str__(self):
        return f'{self.intento_id} – P{self.pregunta_id}'
