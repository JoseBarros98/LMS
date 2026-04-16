import uuid

from django.db import models
from django.conf import settings
from django.utils import timezone


class Simulador(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.CharField(max_length=250, verbose_name='Título')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    imagen_portada = models.ImageField(
        upload_to='simuladores/portadas/', blank=True, null=True, verbose_name='Imagen portada'
    )
    imagen_portada_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Imagen portada URL')

    # Asociación opcional a curso o ruta
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

    fecha_apertura = models.DateTimeField(blank=True, null=True, verbose_name='Fecha de apertura')
    fecha_cierre = models.DateTimeField(blank=True, null=True, verbose_name='Fecha de cierre')
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

    @property
    def esta_disponible(self):
        now = timezone.now()
        if self.fecha_apertura and now < self.fecha_apertura:
            return False
        if self.fecha_cierre and now > self.fecha_cierre:
            return False
        return self.publicado


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
