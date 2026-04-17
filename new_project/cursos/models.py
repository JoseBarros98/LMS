import uuid
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.conf import settings
from django.db.models import Sum
from django.utils.text import slugify


def _build_unique_slug(model_class, base_slug, instance_id=None, fallback_prefix='item'):
    clean_base = (base_slug or '').strip('-')
    if not clean_base:
        clean_base = fallback_prefix

    candidate = clean_base
    suffix = 2
    while model_class.objects.filter(slug=candidate).exclude(id=instance_id).exists():
        candidate = f'{clean_base}-{suffix}'
        suffix += 1
    return candidate


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
        if self.titulo:
            self.slug = _build_unique_slug(
                Ruta,
                slugify(self.titulo),
                instance_id=self.id,
                fallback_prefix='ruta',
            )
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
    ruta = models.ForeignKey(
        Ruta,
        on_delete=models.CASCADE,
        related_name='cursos',
        verbose_name='Ruta',
        blank=True,
        null=True,
    )
    titulo = models.CharField(max_length=250, verbose_name='Titulo')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripcion')
    imagen_portada = models.ImageField(upload_to='cursos/portadas/', blank=True, null=True, verbose_name='Imagen portada')
    imagen_portada_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Imagen portada URL')
    nivel = models.CharField(max_length=15, choices=NIVEL_CHOICES, default=NIVEL_AVANZADO, verbose_name='Nivel')
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=ESTADO_DISPONIBLE, verbose_name='Estado')
    publicado = models.BooleanField(default=False, verbose_name='Publicado')
    orden = models.SmallIntegerField(default=0, verbose_name='Orden')
    slug = models.SlugField(max_length=300, unique=True, blank=True, null=True, verbose_name='Slug')
    video_intro_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Video intro URL')
    tiene_mediateca = models.BooleanField(default=False, verbose_name='Tiene mediateca')
    total_lecciones = models.SmallIntegerField(default=0, verbose_name='Total lecciones')
    duracion_total_min = models.DurationField(default=timedelta, verbose_name='Duracion total')
    precio = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Precio')
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
        ]

    def __str__(self):
        return self.titulo

    def refresh_metrics(self):
        lessons = Leccion.objects.filter(seccion__curso=self)
        totals = lessons.aggregate(
            total_lecciones=models.Count('id'),
            duracion_total_min=Sum('duracion_min'),
        )
        self.total_lecciones = totals['total_lecciones'] or 0
        self.duracion_total_min = totals['duracion_total_min'] or timedelta()

    def save(self, *args, **kwargs):
        include_route_in_slug = bool(getattr(self, '_slug_with_route', False))
        title_slug = slugify(self.titulo or '')

        if include_route_in_slug and self.ruta_id:
            route_title = getattr(self.ruta, 'titulo', '') if hasattr(self, 'ruta') else ''
            route_slug = slugify(route_title)
            base_slug = '-'.join(part for part in [route_slug, title_slug] if part)
        else:
            base_slug = title_slug

        self.slug = _build_unique_slug(
            Curso,
            base_slug,
            instance_id=self.id,
            fallback_prefix='curso',
        )
        super().save(*args, **kwargs)


class Seccion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='secciones')
    titulo = models.CharField(max_length=250)
    descripcion = models.TextField(blank=True, null=True)
    orden = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Seccion'
        verbose_name_plural = 'Secciones'
        ordering = ['orden', 'titulo']
        indexes = [
            models.Index(fields=['curso', 'orden']),
        ]

    def __str__(self):
        return f'{self.curso.titulo} - {self.titulo}'


class Leccion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name='lecciones')
    titulo = models.CharField(max_length=250)
    descripcion = models.TextField(blank=True, null=True)
    video_url = models.CharField(max_length=500)
    duracion_min = models.DurationField(default=timedelta)
    orden = models.SmallIntegerField(default=0)
    publicado = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Leccion'
        verbose_name_plural = 'Lecciones'
        ordering = ['orden', 'titulo']
        indexes = [
            models.Index(fields=['seccion', 'orden']),
            models.Index(fields=['publicado']),
        ]

    def __str__(self):
        return f'{self.seccion.titulo} - {self.titulo}'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        curso = self.seccion.curso
        curso.refresh_metrics()
        curso.save(update_fields=['total_lecciones', 'duracion_total_min', 'updated_at'])

    def delete(self, *args, **kwargs):
        curso = self.seccion.curso
        super().delete(*args, **kwargs)
        curso.refresh_metrics()
        curso.save(update_fields=['total_lecciones', 'duracion_total_min', 'updated_at'])


class ProgresoLeccion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='progresos_leccion')
    leccion = models.ForeignKey(Leccion, on_delete=models.CASCADE, related_name='progresos')
    porcentaje = models.PositiveSmallIntegerField(default=0)
    completada = models.BooleanField(default=False)
    ultimo_acceso = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Progreso de leccion'
        verbose_name_plural = 'Progresos de leccion'
        ordering = ['-ultimo_acceso']
        constraints = [
            models.UniqueConstraint(fields=['user', 'leccion'], name='unique_progreso_user_leccion'),
            models.CheckConstraint(
                condition=models.Q(porcentaje__gte=0) & models.Q(porcentaje__lte=100),
                name='progreso_leccion_porcentaje_valido',
            ),
        ]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['leccion']),
        ]

    def __str__(self):
        return f'{self.user_id} - {self.leccion.titulo} ({self.porcentaje}%)'

    def save(self, *args, **kwargs):
        self.porcentaje = min(max(self.porcentaje or 0, 0), 100)
        self.completada = self.completada or self.porcentaje == 100
        super().save(*args, **kwargs)


class ComentarioCurso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='comentarios')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comentarios_curso')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='respuestas', blank=True, null=True)
    contenido = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Comentario de curso'
        verbose_name_plural = 'Comentarios de curso'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['curso', 'created_at']),
        ]

    def __str__(self):
        return f'{self.user} - {self.curso.titulo}'


class MediatecaItem(models.Model):
    TIPO_CARPETA = 'carpeta'
    TIPO_VIDEO = 'video'
    TIPO_AUDIO = 'audio'
    TIPO_DOCUMENTO = 'documento'
    TIPO_ENLACE = 'enlace'

    TIPO_CHOICES = [
        (TIPO_CARPETA, 'Carpeta'),
        (TIPO_VIDEO, 'Video'),
        (TIPO_AUDIO, 'Audio'),
        (TIPO_DOCUMENTO, 'Documento'),
        (TIPO_ENLACE, 'Enlace'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='mediateca_items')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='children', blank=True, null=True)
    titulo = models.CharField(max_length=250)
    descripcion = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_DOCUMENTO)
    url = models.CharField(max_length=500, blank=True, null=True)
    archivo = models.FileField(upload_to='mediateca/', blank=True, null=True, verbose_name='Archivo')
    orden = models.SmallIntegerField(default=0)
    publicado = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Item de mediateca'
        verbose_name_plural = 'Items de mediateca'
        ordering = ['orden', 'titulo']
        indexes = [
            models.Index(fields=['curso', 'orden']),
            models.Index(fields=['publicado']),
        ]

    def __str__(self):
        return f'{self.curso.titulo} - {self.titulo}'


class MatriculaRuta(models.Model):
    PLAN_CONTADO = 'contado'
    PLAN_CREDITO = 'credito'
    PLAN_PAGO_CHOICES = [
        (PLAN_CONTADO, 'Contado'),
        (PLAN_CREDITO, 'Credito'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matriculas_ruta')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='matriculas_ruta_creadas',
        blank=True,
        null=True,
    )
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='matriculas')
    codigo_acceso = models.CharField(max_length=120, blank=True, null=True)
    plan_pago = models.CharField(max_length=10, choices=PLAN_PAGO_CHOICES, default=PLAN_CONTADO)
    numero_cuotas = models.PositiveSmallIntegerField(default=1)
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
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
    PLAN_CONTADO = 'contado'
    PLAN_CREDITO = 'credito'
    PLAN_PAGO_CHOICES = [
        (PLAN_CONTADO, 'Contado'),
        (PLAN_CREDITO, 'Credito'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matriculas_curso')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='matriculas_curso_creadas',
        blank=True,
        null=True,
    )
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='matriculas')
    codigo_acceso = models.CharField(max_length=120, blank=True, null=True)
    plan_pago = models.CharField(max_length=10, choices=PLAN_PAGO_CHOICES, default=PLAN_CONTADO)
    numero_cuotas = models.PositiveSmallIntegerField(default=1)
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    incluido_en_ruta = models.BooleanField(default=False)
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


class CuotaPagoMatricula(models.Model):
    ESTADO_PENDIENTE = 'pendiente'
    ESTADO_PARCIAL = 'parcial'
    ESTADO_PAGADO = 'pagado'
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_PARCIAL, 'Parcial'),
        (ESTADO_PAGADO, 'Pagado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matricula_ruta = models.ForeignKey(
        MatriculaRuta,
        on_delete=models.CASCADE,
        related_name='cuotas_pago',
        blank=True,
        null=True,
    )
    matricula_curso = models.ForeignKey(
        MatriculaCurso,
        on_delete=models.CASCADE,
        related_name='cuotas_pago',
        blank=True,
        null=True,
    )
    numero = models.PositiveSmallIntegerField()
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    monto_pagado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fecha_pago = models.DateField()
    fecha_pago_real = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cuota de pago'
        verbose_name_plural = 'Cuotas de pago'
        ordering = ['numero']
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(matricula_ruta__isnull=False)
                        & models.Q(matricula_curso__isnull=True)
                    )
                    | (
                        models.Q(matricula_ruta__isnull=True)
                        & models.Q(matricula_curso__isnull=False)
                    )
                ),
                name='cuota_pago_unica_matricula_origen',
            ),
            models.UniqueConstraint(
                fields=['matricula_ruta', 'numero'],
                name='unique_cuota_numero_matricula_ruta',
            ),
            models.UniqueConstraint(
                fields=['matricula_curso', 'numero'],
                name='unique_cuota_numero_matricula_curso',
            ),
        ]
        indexes = [
            models.Index(fields=['matricula_ruta']),
            models.Index(fields=['matricula_curso']),
            models.Index(fields=['fecha_pago']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        matricula_id = self.matricula_ruta_id or self.matricula_curso_id
        return f'{matricula_id} - cuota {self.numero}'

    @property
    def saldo_pendiente(self):
        saldo = (self.monto or Decimal('0.00')) - (self.monto_pagado or Decimal('0.00'))
        if saldo < Decimal('0.00'):
            return Decimal('0.00')
        return saldo

    def refresh_payment_state(self):
        monto = self.monto or Decimal('0.00')
        pagado = self.monto_pagado or Decimal('0.00')

        if pagado <= Decimal('0.00'):
            self.monto_pagado = Decimal('0.00')
            self.estado = self.ESTADO_PENDIENTE
            self.fecha_pago_real = None
        elif pagado < monto:
            self.estado = self.ESTADO_PARCIAL
        else:
            self.monto_pagado = monto
            self.estado = self.ESTADO_PAGADO

    def save(self, *args, **kwargs):
        self.refresh_payment_state()
        super().save(*args, **kwargs)
