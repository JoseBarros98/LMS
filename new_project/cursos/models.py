import uuid

from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Ruta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.CharField(max_length=250, unique=True, verbose_name='Titulo')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripcion')
    orden = models.SmallIntegerField(default=0, verbose_name='Orden')
    publicado = models.BooleanField(default=False, verbose_name='Publicado')
    slug = models.SlugField(max_length=300, unique=True, blank=True, null=True, verbose_name='Slug')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        verbose_name = 'Ruta'
        verbose_name_plural = 'Rutas'
        ordering = ['orden', 'titulo']

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.slug and self.titulo:
            self.slug = slugify(self.titulo)
        super().save(*args, **kwargs)


class Curso(models.Model):
    NIVEL_BASICO = 'basico'
    NIVEL_INTERMEDIO = 'intermedio'
    NIVEL_AVANZADO = 'avanzado'

    NIVEL_CHOICES = [
        (NIVEL_BASICO, 'Basico'),
        (NIVEL_INTERMEDIO, 'Intermedio'),
        (NIVEL_AVANZADO, 'Avanzado'),
    ]

    ESTADO_DISPONIBLE = 'disponible'
    ESTADO_PROXIMO = 'proximo'
    ESTADO_BLOQUEADO = 'bloqueado'

    ESTADO_CHOICES = [
        (ESTADO_DISPONIBLE, 'Disponible'),
        (ESTADO_PROXIMO, 'Proximo'),
        (ESTADO_BLOQUEADO, 'Bloqueado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='cursos', verbose_name='Ruta')
    titulo = models.CharField(max_length=250, verbose_name='Titulo')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripcion')
    imagen_portada_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Imagen portada URL')
    nivel = models.CharField(max_length=15, choices=NIVEL_CHOICES, default=NIVEL_AVANZADO, verbose_name='Nivel')
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=ESTADO_DISPONIBLE, verbose_name='Estado')
    publicado = models.BooleanField(default=False, verbose_name='Publicado')
    orden = models.SmallIntegerField(default=0, verbose_name='Orden')
    slug = models.SlugField(max_length=300, unique=True, blank=True, null=True, verbose_name='Slug')
    video_intro_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Video intro URL')
    tiene_mediateca = models.BooleanField(default=False, verbose_name='Tiene mediateca')
    total_lecciones = models.SmallIntegerField(default=0, verbose_name='Total lecciones')
    duracion_total_min = models.IntegerField(default=0, verbose_name='Duracion total en minutos')
    fecha_disponible_desde = models.DateField(blank=True, null=True, verbose_name='Fecha disponible desde')
    fecha_disponible_hasta = models.DateField(blank=True, null=True, verbose_name='Fecha disponible hasta')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['ruta', 'orden', 'titulo']
        indexes = [
            models.Index(fields=['ruta']),
            models.Index(fields=['ruta', 'publicado']),
            models.Index(fields=['ruta', 'orden']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_disponible_desde']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(fecha_disponible_hasta__isnull=True)
                    | models.Q(fecha_disponible_desde__isnull=True)
                    | models.Q(fecha_disponible_hasta__gte=models.F('fecha_disponible_desde'))
                ),
                name='curso_fechas_disponibles_validas',
            ),
        ]

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.slug and self.titulo:
            self.slug = slugify(self.titulo)
        super().save(*args, **kwargs)


class MatriculaRuta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matriculas_ruta')
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='matriculas')
    codigo_acceso = models.CharField(max_length=120, blank=True, null=True)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Matricula de ruta'
        verbose_name_plural = 'Matriculas de ruta'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'ruta'], name='unique_matricula_ruta_user_ruta'),
            models.CheckConstraint(
                condition=(
                    models.Q(fecha_fin__isnull=True)
                    | models.Q(fecha_inicio__isnull=True)
                    | models.Q(fecha_fin__gte=models.F('fecha_inicio'))
                ),
                name='matricula_ruta_fechas_validas',
            ),
        ]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['ruta']),
            models.Index(fields=['activa']),
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.ruta.titulo}"


class MatriculaCurso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matriculas_curso')
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='matriculas')
    codigo_acceso = models.CharField(max_length=120, blank=True, null=True)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Matricula de curso'
        verbose_name_plural = 'Matriculas de curso'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'curso'], name='unique_matricula_curso_user_curso'),
            models.CheckConstraint(
                condition=(
                    models.Q(fecha_fin__isnull=True)
                    | models.Q(fecha_inicio__isnull=True)
                    | models.Q(fecha_fin__gte=models.F('fecha_inicio'))
                ),
                name='matricula_curso_fechas_validas',
            ),
        ]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['curso']),
            models.Index(fields=['activa']),
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.curso.titulo}"
