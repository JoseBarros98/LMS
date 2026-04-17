import secrets
import string
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Max, Sum
from rest_framework import serializers
from core.models import User

from .models import (
    ComentarioCurso,
    CuotaPagoMatricula,
    Curso,
    Leccion,
    MatriculaCurso,
    MatriculaRuta,
    MediatecaItem,
    ProgresoLeccion,
    Ruta,
    Seccion,
)


def generate_enrollment_access_code(prefix='MAT'):
    alphabet = string.ascii_uppercase + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(8))
    return f'{prefix}-{token}'


def _duration_to_total_minutes(duration_value):
    if not duration_value:
        return 0

    if isinstance(duration_value, timedelta):
        total_seconds = int(duration_value.total_seconds())
        return (total_seconds + 59) // 60

    return int(duration_value)


def _credit_installments_for_route_duration(duration_value):
    duration_min = _duration_to_total_minutes(duration_value)
    if duration_min <= 480:
        return 2
    if duration_min <= 1200:
        return 3
    if duration_min <= 2400:
        return 4
    return 5


def _default_payment_dates(base_date, installments):
    start = base_date or date.today()
    return [start + timedelta(days=30 * index) for index in range(installments)]


def _split_amount_by_installments(total_amount, installments):
    if installments <= 0:
        return []

    total = Decimal(total_amount or 0).quantize(Decimal('0.01'))
    base = (total / installments).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    amounts = [base for _ in range(installments)]
    difference = total - sum(amounts)
    amounts[-1] = (amounts[-1] + difference).quantize(Decimal('0.01'))
    return amounts


class CuotaPagoMatriculaSerializer(serializers.ModelSerializer):
    saldo_pendiente = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CuotaPagoMatricula
        fields = [
            'id',
            'numero',
            'monto',
            'monto_pagado',
            'saldo_pendiente',
            'fecha_pago',
            'fecha_pago_real',
            'estado',
        ]
        read_only_fields = ['id', 'numero', 'monto', 'monto_pagado', 'saldo_pendiente']


class CuotaPagoControlSerializer(serializers.ModelSerializer):
    saldo_pendiente = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CuotaPagoMatricula
        fields = [
            'id',
            'numero',
            'monto',
            'monto_pagado',
            'saldo_pendiente',
            'fecha_pago',
            'fecha_pago_real',
            'estado',
        ]
        read_only_fields = [
            'id',
            'numero',
            'monto',
            'monto_pagado',
            'saldo_pendiente',
            'fecha_pago_real',
            'estado',
        ]


class RegistrarPagoCuotaSerializer(serializers.Serializer):
    monto_abonado = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    fecha_pago_real = serializers.DateField(required=False)


class RutaSerializer(serializers.ModelSerializer):
    total_cursos = serializers.IntegerField(read_only=True)
    precio_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    duracion_total_min = serializers.DurationField(read_only=True)

    class Meta:
        model = Ruta
        fields = [
            'id',
            'titulo',
            'descripcion',
            'orden',
            'publicado',
            'slug',
            'total_cursos',
            'precio_total',
            'duracion_total_min',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class CursoSerializer(serializers.ModelSerializer):
    ruta_titulo = serializers.SerializerMethodField()
    nivel_label = serializers.CharField(source='get_nivel_display', read_only=True)
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)
    imagen_portada_url = serializers.SerializerMethodField()
    imagen_portada = serializers.ImageField(write_only=True, required=False, allow_null=True)
    generar_slug_con_ruta = serializers.BooleanField(write_only=True, required=False, default=False)
    auto_orden_en_ruta = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Curso
        fields = [
            'id',
            'ruta',
            'ruta_titulo',
            'titulo',
            'descripcion',
            'imagen_portada',
            'imagen_portada_url',
            'nivel',
            'nivel_label',
            'estado',
            'estado_label',
            'publicado',
            'orden',
            'slug',
            'video_intro_url',
            'tiene_mediateca',
            'total_lecciones',
            'duracion_total_min',
            'precio',
            'generar_slug_con_ruta',
            'auto_orden_en_ruta',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']
        extra_kwargs = {
            'ruta': {'required': False, 'allow_null': True},
        }

    def get_ruta_titulo(self, obj):
        return obj.ruta.titulo if obj.ruta_id and obj.ruta else ''

    def get_imagen_portada_url(self, obj):
        if obj.imagen_portada:
            try:
                return obj.imagen_portada.url  # returns /media/cursos/portadas/...
            except ValueError:
                pass
        return None  # ignore old CharField - it stored non-image URLs

    def validate(self, attrs):
        if not self.instance and not attrs.get('imagen_portada'):
            raise serializers.ValidationError({'imagen_portada': 'Debes subir una imagen de portada.'})

        return attrs

    def create(self, validated_data):
        generar_slug_con_ruta = validated_data.pop('generar_slug_con_ruta', False)
        auto_orden_en_ruta = validated_data.pop('auto_orden_en_ruta', False)
        ruta = validated_data.get('ruta')

        if auto_orden_en_ruta and ruta:
            max_orden = Curso.objects.filter(ruta=ruta).aggregate(max_orden=Max('orden')).get('max_orden') or 0
            validated_data['orden'] = int(max_orden) + 1

        curso = Curso(**validated_data)
        curso._slug_with_route = generar_slug_con_ruta
        curso.save()
        return curso


class ComentarioCursoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(queryset=ComentarioCurso.objects.all(), allow_null=True, required=False, write_only=True)
    parent_id = serializers.UUIDField(read_only=True)
    respuestas = serializers.SerializerMethodField()

    class Meta:
        model = ComentarioCurso
        fields = [
            'id',
            'curso',
            'user',
            'user_nombre',
            'parent',
            'parent_id',
            'contenido',
            'respuestas',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'user_nombre', 'created_at', 'updated_at']

    def get_user_nombre(self, obj):
        full_name = ' '.join(
            filter(
                None,
                [obj.user.name, obj.user.paternal_surname, obj.user.maternal_surname],
            )
        ).strip()
        return full_name or obj.user.email

    def get_respuestas(self, obj):
        respuestas = obj.respuestas.select_related('user').all().order_by('created_at')
        return ComentarioCursoSerializer(respuestas, many=True, context=self.context).data

    def validate(self, attrs):
        curso = attrs.get('curso')
        parent = attrs.get('parent')

        if self.instance and curso is None:
            curso = self.instance.curso

        if parent and curso and parent.curso_id != curso.id:
            raise serializers.ValidationError({'parent': 'La respuesta debe pertenecer al mismo curso.'})

        return attrs


class ProgresoLeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgresoLeccion
        fields = [
            'id',
            'user',
            'leccion',
            'porcentaje',
            'completada',
            'ultimo_acceso',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'ultimo_acceso', 'created_at', 'updated_at']


class LeccionDetalleSerializer(serializers.ModelSerializer):
    progreso = serializers.SerializerMethodField()
    seccion = serializers.PrimaryKeyRelatedField(queryset=Seccion.objects.all(), write_only=True)

    class Meta:
        model = Leccion
        fields = [
            'id',
            'seccion',
            'titulo',
            'descripcion',
            'video_url',
            'duracion_min',
            'orden',
            'publicado',
            'progreso',
        ]

    def get_progreso(self, obj):
        progress_map = self.context.get('progress_map', {})
        progress = progress_map.get(str(obj.id))

        if not progress:
            return {
                'porcentaje': 0,
                'completada': False,
            }

        return {
            'porcentaje': progress.porcentaje,
            'completada': progress.completada,
        }


class SeccionDetalleSerializer(serializers.ModelSerializer):
    lecciones = serializers.SerializerMethodField()
    progreso = serializers.SerializerMethodField()
    curso = serializers.PrimaryKeyRelatedField(queryset=Curso.objects.all(), write_only=True)

    class Meta:
        model = Seccion
        fields = [
            'id',
            'curso',
            'titulo',
            'descripcion',
            'orden',
            'progreso',
            'lecciones',
        ]

    def get_lecciones(self, obj):
        lessons = [
            leccion for leccion in obj.lecciones.all()
            if leccion.publicado or self.context.get('is_admin')
        ]
        return LeccionDetalleSerializer(lessons, many=True, context=self.context).data

    def get_progreso(self, obj):
        lessons = [
            leccion for leccion in obj.lecciones.all()
            if leccion.publicado or self.context.get('is_admin')
        ]
        if not lessons:
            return 0

        progress_map = self.context.get('progress_map', {})
        total = sum((progress_map.get(str(leccion.id)).porcentaje if progress_map.get(str(leccion.id)) else 0) for leccion in lessons)
        return round(total / len(lessons))


class MediatecaItemSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)
    curso = serializers.PrimaryKeyRelatedField(queryset=Curso.objects.all(), write_only=True, required=False)
    curso_id = serializers.SerializerMethodField()
    curso_titulo = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(queryset=MediatecaItem.objects.all(), allow_null=True, required=False)
    parent_titulo = serializers.CharField(source='parent.titulo', read_only=True)
    children_count = serializers.SerializerMethodField()
    archivo = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = MediatecaItem
        fields = [
            'id',
            'curso',
            'curso_id',
            'curso_titulo',
            'parent',
            'parent_titulo',
            'titulo',
            'descripcion',
            'tipo',
            'tipo_label',
            'url',
            'archivo',
            'orden',
            'publicado',
            'children_count',
        ]

    def get_children_count(self, obj):
        return obj.children.count()

    def get_curso_id(self, obj):
        return obj.curso_id

    def get_curso_titulo(self, obj):
        return obj.curso.titulo if obj.curso_id else ''

    def validate(self, attrs):
        curso = attrs.get('curso')
        parent = attrs.get('parent')
        tipo = attrs.get('tipo', getattr(self.instance, 'tipo', MediatecaItem.TIPO_DOCUMENTO))
        url = attrs.get('url')
        archivo = attrs.get('archivo')

        if self.instance and curso is None:
            curso = self.instance.curso

        # On create, curso is required
        if not self.instance and not attrs.get('curso'):
            raise serializers.ValidationError({'curso': 'Este campo es requerido al crear un elemento.'})

        if parent:
            if parent.tipo != MediatecaItem.TIPO_CARPETA:
                raise serializers.ValidationError({'parent': 'Solo puedes guardar elementos dentro de una carpeta.'})

            if curso and parent.curso_id != curso.id:
                raise serializers.ValidationError({'parent': 'La carpeta padre debe pertenecer al mismo curso.'})

            if self.instance and parent.id == self.instance.id:
                raise serializers.ValidationError({'parent': 'Un elemento no puede ser su propia carpeta padre.'})

        if tipo == MediatecaItem.TIPO_CARPETA:
            attrs['url'] = None
            attrs['archivo'] = None
        else:
            if archivo is not None:
                # New file uploaded: clear url
                attrs['url'] = None
            elif url:
                # URL provided: clear existing archivo reference
                attrs['archivo'] = None
            else:
                # Neither provided in this request
                if not self.instance:
                    raise serializers.ValidationError({'url': 'Debes proporcionar una URL o subir un archivo.'})
                # On partial update: keep existing values

        return attrs


class CursoDetalleSerializer(CursoSerializer):
    secciones = serializers.SerializerMethodField()
    comentarios = serializers.SerializerMethodField()
    mediateca = serializers.SerializerMethodField()
    progreso_total = serializers.SerializerMethodField()
    total_completadas = serializers.SerializerMethodField()
    simuladores = serializers.SerializerMethodField()

    class Meta(CursoSerializer.Meta):
        fields = CursoSerializer.Meta.fields + [
            'secciones',
            'comentarios',
            'mediateca',
            'progreso_total',
            'total_completadas',
            'simuladores',
        ]

    def get_secciones(self, obj):
        return SeccionDetalleSerializer(obj.secciones.all(), many=True, context=self.context).data

    def get_comentarios(self, obj):
        queryset = obj.comentarios.select_related('user').all()
        return ComentarioCursoSerializer(queryset, many=True, context=self.context).data

    def get_mediateca(self, obj):
        queryset = obj.mediateca_items.all()
        if not self.context.get('is_admin'):
            queryset = queryset.filter(publicado=True)
        return MediatecaItemSerializer(queryset, many=True, context=self.context).data

    def get_simuladores(self, obj):
        from simuladores.serializers import SimuladorListSerializer

        queryset = obj.simuladores.select_related('curso', 'ruta').prefetch_related('preguntas').all()
        if not self.context.get('is_admin'):
            queryset = queryset.filter(publicado=True)
        return SimuladorListSerializer(queryset, many=True, context=self.context).data

    def get_progreso_total(self, obj):
        lessons = []
        for seccion in obj.secciones.all():
            for leccion in seccion.lecciones.all():
                if leccion.publicado or self.context.get('is_admin'):
                    lessons.append(leccion)

        if not lessons:
            return 0

        progress_map = self.context.get('progress_map', {})
        total = sum((progress_map.get(str(leccion.id)).porcentaje if progress_map.get(str(leccion.id)) else 0) for leccion in lessons)
        return round(total / len(lessons))

    def get_total_completadas(self, obj):
        progress_map = self.context.get('progress_map', {})
        return sum(1 for progress in progress_map.values() if progress.completada)


class MatriculaRutaSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_ci = serializers.CharField(source='user.ci', read_only=True)
    user_telefono = serializers.CharField(source='user.phone_number', read_only=True)
    user_estado = serializers.SerializerMethodField()
    ruta_titulo = serializers.CharField(source='ruta.titulo', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    cuotas = CuotaPagoMatriculaSerializer(source='cuotas_pago', many=True, read_only=True)
    fechas_pago = serializers.ListField(
        child=serializers.DateField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = MatriculaRuta
        fields = [
            'id',
            'user',
            'user_nombre',
            'user_email',
            'user_ci',
            'user_telefono',
            'user_estado',
            'created_by',
            'created_by_nombre',
            'ruta',
            'ruta_titulo',
            'codigo_acceso',
            'plan_pago',
            'numero_cuotas',
            'monto_total',
            'fecha_inicio',
            'fecha_fin',
            'fechas_pago',
            'cuotas',
            'activa',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_user_nombre(self, obj):
        full_name = ' '.join(
            filter(None, [obj.user.name, obj.user.paternal_surname, obj.user.maternal_surname])
        ).strip()
        return full_name or obj.user.email

    def get_user_estado(self, obj):
        return 'Activo' if obj.user.status and obj.user.is_active else 'Inactivo'

    def get_created_by_nombre(self, obj):
        if not obj.created_by:
            return ''
        full_name = ' '.join(
            filter(None, [obj.created_by.name, obj.created_by.paternal_surname, obj.created_by.maternal_surname])
        ).strip()
        return full_name or obj.created_by.email

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        ruta = attrs.get('ruta') if attrs.get('ruta') else (self.instance.ruta if self.instance else None)
        plan_pago = attrs.get('plan_pago') if attrs.get('plan_pago') else (self.instance.plan_pago if self.instance else MatriculaRuta.PLAN_CONTADO)
        fechas_pago = attrs.get('fechas_pago', None)
        requested_cuotas = attrs.get('numero_cuotas')

        if self.instance:
            if fecha_inicio is None:
                fecha_inicio = self.instance.fecha_inicio
            if fecha_fin is None:
                fecha_fin = self.instance.fecha_fin

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'Debe ser mayor o igual a fecha_inicio.'}
            )

        if not ruta:
            raise serializers.ValidationError({'ruta': 'Debe seleccionar una ruta valida.'})

        totals = ruta.cursos.aggregate(
            total_precio=Sum('precio'),
            total_duracion=Sum('duracion_total_min'),
        )
        monto_total = Decimal(totals.get('total_precio') or 0).quantize(Decimal('0.01'))
        total_duracion = totals.get('total_duracion') or timedelta()

        if plan_pago == MatriculaRuta.PLAN_CONTADO:
            numero_cuotas = requested_cuotas if requested_cuotas is not None else (self.instance.numero_cuotas if self.instance else 2)
            if numero_cuotas not in (1, 2):
                raise serializers.ValidationError({'numero_cuotas': 'Para contado en ruta solo se permite 1 o 2 pagos.'})
        else:
            numero_cuotas = _credit_installments_for_route_duration(total_duracion)

        should_sync_cuotas = (
            not self.instance
            or 'plan_pago' in attrs
            or 'numero_cuotas' in attrs
            or fechas_pago is not None
        )

        if fechas_pago is not None and len(fechas_pago) != numero_cuotas:
            raise serializers.ValidationError({'fechas_pago': f'Debe enviar {numero_cuotas} fechas de pago.'})

        attrs['_resolved_numero_cuotas'] = numero_cuotas
        attrs['_resolved_monto_total'] = monto_total
        attrs['_resolved_should_sync_cuotas'] = should_sync_cuotas
        attrs['_resolved_fechas_pago'] = fechas_pago

        return attrs

    def _sync_installments(self, instance, fechas_pago):
        if not fechas_pago:
            fechas_pago = _default_payment_dates(instance.fecha_inicio, instance.numero_cuotas)

        montos = _split_amount_by_installments(instance.monto_total, instance.numero_cuotas)

        instance.cuotas_pago.all().delete()
        cuotas = [
            CuotaPagoMatricula(
                matricula_ruta=instance,
                numero=index + 1,
                monto=montos[index],
                fecha_pago=fechas_pago[index],
            )
            for index in range(instance.numero_cuotas)
        ]
        CuotaPagoMatricula.objects.bulk_create(cuotas)

    def create(self, validated_data):
        resolved_numero_cuotas = validated_data.pop('_resolved_numero_cuotas', 1)
        resolved_monto_total = validated_data.pop('_resolved_monto_total', Decimal('0.00'))
        should_sync_cuotas = validated_data.pop('_resolved_should_sync_cuotas', True)
        resolved_fechas_pago = validated_data.pop('_resolved_fechas_pago', None)
        validated_data.pop('fechas_pago', None)

        if not validated_data.get('codigo_acceso'):
            validated_data['codigo_acceso'] = generate_enrollment_access_code('RUTA')

        validated_data['numero_cuotas'] = resolved_numero_cuotas
        validated_data['monto_total'] = resolved_monto_total
        instance = super().create(validated_data)

        if should_sync_cuotas:
            self._sync_installments(instance, resolved_fechas_pago)

        return instance

    def update(self, instance, validated_data):
        resolved_numero_cuotas = validated_data.pop('_resolved_numero_cuotas', instance.numero_cuotas)
        resolved_monto_total = validated_data.pop('_resolved_monto_total', instance.monto_total)
        should_sync_cuotas = validated_data.pop('_resolved_should_sync_cuotas', False)
        resolved_fechas_pago = validated_data.pop('_resolved_fechas_pago', None)
        validated_data.pop('fechas_pago', None)

        validated_data['numero_cuotas'] = resolved_numero_cuotas
        validated_data['monto_total'] = resolved_monto_total
        instance = super().update(instance, validated_data)

        if should_sync_cuotas:
            self._sync_installments(instance, resolved_fechas_pago)

        return instance


class MatriculaCursoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_ci = serializers.CharField(source='user.ci', read_only=True)
    user_telefono = serializers.CharField(source='user.phone_number', read_only=True)
    user_estado = serializers.SerializerMethodField()
    curso_titulo = serializers.CharField(source='curso.titulo', read_only=True)
    ruta_id = serializers.UUIDField(source='curso.ruta_id', read_only=True)
    ruta_titulo = serializers.SerializerMethodField()
    created_by_nombre = serializers.SerializerMethodField()
    cuotas = CuotaPagoMatriculaSerializer(source='cuotas_pago', many=True, read_only=True)
    fechas_pago = serializers.ListField(
        child=serializers.DateField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = MatriculaCurso
        fields = [
            'id',
            'user',
            'user_nombre',
            'user_email',
            'user_ci',
            'user_telefono',
            'user_estado',
            'created_by',
            'created_by_nombre',
            'curso',
            'curso_titulo',
            'ruta_id',
            'ruta_titulo',
            'codigo_acceso',
            'plan_pago',
            'numero_cuotas',
            'monto_total',
            'fecha_inicio',
            'fecha_fin',
            'fechas_pago',
            'cuotas',
            'activa',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_user_nombre(self, obj):
        full_name = ' '.join(
            filter(None, [obj.user.name, obj.user.paternal_surname, obj.user.maternal_surname])
        ).strip()
        return full_name or obj.user.email

    def get_user_estado(self, obj):
        return 'Activo' if obj.user.status and obj.user.is_active else 'Inactivo'

    def get_created_by_nombre(self, obj):
        if not obj.created_by:
            return ''
        full_name = ' '.join(
            filter(None, [obj.created_by.name, obj.created_by.paternal_surname, obj.created_by.maternal_surname])
        ).strip()
        return full_name or obj.created_by.email

    def get_ruta_titulo(self, obj):
        if not obj.curso or not obj.curso.ruta:
            return ''
        return obj.curso.ruta.titulo

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        curso = attrs.get('curso') if attrs.get('curso') else (self.instance.curso if self.instance else None)
        plan_pago = attrs.get('plan_pago') if attrs.get('plan_pago') else (self.instance.plan_pago if self.instance else MatriculaCurso.PLAN_CONTADO)
        fechas_pago = attrs.get('fechas_pago', None)

        if self.instance:
            if fecha_inicio is None:
                fecha_inicio = self.instance.fecha_inicio
            if fecha_fin is None:
                fecha_fin = self.instance.fecha_fin

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'Debe ser mayor o igual a fecha_inicio.'}
            )

        if not curso:
            raise serializers.ValidationError({'curso': 'Debe seleccionar un curso valido.'})

        if plan_pago != MatriculaCurso.PLAN_CONTADO:
            raise serializers.ValidationError({'plan_pago': 'El plan a credito solo esta disponible para rutas.'})

        numero_cuotas = 1
        should_sync_cuotas = (
            not self.instance
            or 'plan_pago' in attrs
            or 'numero_cuotas' in attrs
            or fechas_pago is not None
        )

        if fechas_pago is not None and len(fechas_pago) != 1:
            raise serializers.ValidationError({'fechas_pago': 'En cursos individuales el pago al contado debe ser unico.'})

        attrs['_resolved_numero_cuotas'] = numero_cuotas
        attrs['_resolved_monto_total'] = Decimal(curso.precio or 0).quantize(Decimal('0.01'))
        attrs['_resolved_should_sync_cuotas'] = should_sync_cuotas
        attrs['_resolved_fechas_pago'] = fechas_pago

        return attrs

    def _sync_installments(self, instance, fechas_pago):
        if not fechas_pago:
            fechas_pago = _default_payment_dates(instance.fecha_inicio, 1)

        instance.cuotas_pago.all().delete()
        CuotaPagoMatricula.objects.create(
            matricula_curso=instance,
            numero=1,
            monto=instance.monto_total,
            fecha_pago=fechas_pago[0],
        )

    def create(self, validated_data):
        resolved_numero_cuotas = validated_data.pop('_resolved_numero_cuotas', 1)
        resolved_monto_total = validated_data.pop('_resolved_monto_total', Decimal('0.00'))
        should_sync_cuotas = validated_data.pop('_resolved_should_sync_cuotas', True)
        resolved_fechas_pago = validated_data.pop('_resolved_fechas_pago', None)
        validated_data.pop('fechas_pago', None)

        if not validated_data.get('codigo_acceso'):
            validated_data['codigo_acceso'] = generate_enrollment_access_code('CURSO')

        validated_data['plan_pago'] = MatriculaCurso.PLAN_CONTADO
        validated_data['numero_cuotas'] = resolved_numero_cuotas
        validated_data['monto_total'] = resolved_monto_total
        instance = super().create(validated_data)

        if should_sync_cuotas:
            self._sync_installments(instance, resolved_fechas_pago)

        return instance

    def update(self, instance, validated_data):
        resolved_numero_cuotas = validated_data.pop('_resolved_numero_cuotas', 1)
        resolved_monto_total = validated_data.pop('_resolved_monto_total', instance.monto_total)
        should_sync_cuotas = validated_data.pop('_resolved_should_sync_cuotas', False)
        resolved_fechas_pago = validated_data.pop('_resolved_fechas_pago', None)
        validated_data.pop('fechas_pago', None)

        validated_data['plan_pago'] = MatriculaCurso.PLAN_CONTADO
        validated_data['numero_cuotas'] = resolved_numero_cuotas
        validated_data['monto_total'] = resolved_monto_total
        instance = super().update(instance, validated_data)

        if should_sync_cuotas:
            self._sync_installments(instance, resolved_fechas_pago)

        return instance


class CreateStudentEnrollmentSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    paternal_surname = serializers.CharField(max_length=100, required=False, allow_blank=True)
    maternal_surname = serializers.CharField(max_length=100, required=False, allow_blank=True)
    ci = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    university = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True, min_length=6)
    codigo_acceso = serializers.CharField(max_length=120, required=False, allow_blank=True, allow_null=True)
    plan_pago = serializers.ChoiceField(choices=MatriculaRuta.PLAN_PAGO_CHOICES, required=False, default=MatriculaRuta.PLAN_CONTADO)
    numero_cuotas = serializers.IntegerField(required=False, min_value=1)
    fecha_inicio = serializers.DateField(required=False, allow_null=True)
    fecha_fin = serializers.DateField(required=False, allow_null=True)
    fechas_pago = serializers.ListField(child=serializers.DateField(), required=False)
    activa = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'Ya existe un usuario con este email.'})

        if User.objects.filter(ci=attrs['ci']).exists():
            raise serializers.ValidationError({'ci': 'Ya existe un usuario con este CI.'})

        if User.objects.filter(phone_number=attrs['phone_number']).exists():
            raise serializers.ValidationError({'phone_number': 'Ya existe un usuario con este telefono.'})

        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'Debe ser mayor o igual a fecha_inicio.'}
            )

        enrollment_type = self.context.get('enrollment_type')
        if enrollment_type == 'curso' and attrs.get('plan_pago') == MatriculaRuta.PLAN_CREDITO:
            raise serializers.ValidationError({'plan_pago': 'El plan a credito solo se puede aplicar a rutas.'})

        if enrollment_type == 'ruta' and attrs.get('plan_pago') == MatriculaRuta.PLAN_CONTADO:
            numero_cuotas = attrs.get('numero_cuotas')
            if numero_cuotas is not None and numero_cuotas not in (1, 2):
                raise serializers.ValidationError({'numero_cuotas': 'Para contado en ruta solo se permite 1 o 2 pagos.'})

        if enrollment_type == 'curso' and attrs.get('numero_cuotas') not in (None, 1):
            raise serializers.ValidationError({'numero_cuotas': 'El pago de cursos individuales es unico.'})

        return attrs
