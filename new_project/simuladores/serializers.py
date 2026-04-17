from django.utils import timezone
from rest_framework import serializers

from .models import (
    ExplicacionPregunta,
    IntentoSimulador,
    Opcion,
    Pregunta,
    RespuestaIntento,
    Simulador,
    SimuladorDisponibilidadUsuario,
)


# ── Opciones ──────────────────────────────────────────────────────────────────

class OpcionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Opcion
        fields = ['id', 'texto', 'es_correcta', 'orden']


class OpcionPublicaSerializer(serializers.ModelSerializer):
    """Sin revelar es_correcta al estudiante durante el intento."""
    class Meta:
        model = Opcion
        fields = ['id', 'texto', 'orden']


# ── Explicación ───────────────────────────────────────────────────────────────

class ExplicacionPreguntaSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ExplicacionPregunta
        fields = ['id', 'texto', 'imagen', 'imagen_url']

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        return None


# ── Preguntas ─────────────────────────────────────────────────────────────────

class PreguntaSerializer(serializers.ModelSerializer):
    opciones = OpcionSerializer(many=True)
    explicacion = ExplicacionPreguntaSerializer(read_only=True)

    class Meta:
        model = Pregunta
        fields = ['id', 'tipo', 'texto', 'puntaje', 'orden', 'opciones', 'explicacion']

    def create(self, validated_data):
        opciones_data = validated_data.pop('opciones', [])
        pregunta = Pregunta.objects.create(**validated_data)
        for op in opciones_data:
            Opcion.objects.create(pregunta=pregunta, **op)
        return pregunta

    def update(self, instance, validated_data):
        opciones_data = validated_data.pop('opciones', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if opciones_data is not None:
            instance.opciones.all().delete()
            for op in opciones_data:
                Opcion.objects.create(pregunta=instance, **op)
        return instance


class PreguntaPublicaSerializer(serializers.ModelSerializer):
    """Para el estudiante durante el intento: sin revelar cuál es correcta."""
    opciones = OpcionPublicaSerializer(many=True)

    class Meta:
        model = Pregunta
        fields = ['id', 'tipo', 'texto', 'puntaje', 'orden', 'opciones']


# ── Simulador ─────────────────────────────────────────────────────────────────

class SimuladorListSerializer(serializers.ModelSerializer):
    imagen_portada_url_full = serializers.SerializerMethodField()
    esta_disponible = serializers.SerializerMethodField()
    curso_nombre = serializers.SerializerMethodField()
    ruta_nombre = serializers.SerializerMethodField()
    total_preguntas = serializers.SerializerMethodField()
    fecha_apertura_efectiva = serializers.SerializerMethodField()
    fecha_cierre_efectiva = serializers.SerializerMethodField()

    class Meta:
        model = Simulador
        fields = [
            'id', 'titulo', 'descripcion',
            'imagen_portada_url', 'imagen_portada_url_full',
            'curso', 'curso_nombre',
            'ruta', 'ruta_nombre',
            'fecha_apertura', 'fecha_cierre',
            'fecha_apertura_efectiva', 'fecha_cierre_efectiva',
            'tiempo_limite_minutos', 'max_intentos',
            'publicado', 'esta_disponible',
            'total_preguntas',
        ]

    def get_imagen_portada_url_full(self, obj):
        request = self.context.get('request')
        if obj.imagen_portada and request:
            return request.build_absolute_uri(obj.imagen_portada.url)
        return obj.imagen_portada_url or None

    def get_curso_nombre(self, obj):
        return obj.curso.titulo if obj.curso else None

    def get_ruta_nombre(self, obj):
        return obj.ruta.titulo if obj.ruta else None

    def get_total_preguntas(self, obj):
        return obj.preguntas.count()

    def get_esta_disponible(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return obj.is_available_for_user(user)

    def get_fecha_apertura_efectiva(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        apertura, _ = obj.get_effective_window_for_user(user)
        return apertura

    def get_fecha_cierre_efectiva(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        _, cierre = obj.get_effective_window_for_user(user)
        return cierre


class SimuladorDetalleSerializer(SimuladorListSerializer):
    preguntas = PreguntaSerializer(many=True, read_only=True)

    class Meta(SimuladorListSerializer.Meta):
        fields = SimuladorListSerializer.Meta.fields + ['preguntas']


class SimuladorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Simulador
        fields = [
            'id', 'titulo', 'descripcion',
            'imagen_portada', 'imagen_portada_url',
            'curso', 'ruta',
            'fecha_apertura', 'fecha_cierre',
            'tiempo_limite_minutos', 'max_intentos',
            'publicado',
        ]

    def validate(self, attrs):
        curso = attrs.get('curso', getattr(self.instance, 'curso', None))
        ruta = attrs.get('ruta', getattr(self.instance, 'ruta', None))

        if bool(curso) == bool(ruta):
            raise serializers.ValidationError(
                'Debes asociar el simulador a un curso o a una ruta (solo uno).'
            )

        return attrs


class SimuladorDisponibilidadUsuarioSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SimuladorDisponibilidadUsuario
        fields = [
            'id',
            'simulador',
            'user',
            'user_email',
            'user_nombre',
            'fecha_apertura',
            'fecha_cierre',
            'motivo',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['simulador', 'created_by', 'created_at', 'updated_at']

    def get_user_nombre(self, obj):
        user = obj.user
        return ' '.join(
            part for part in [user.name, user.paternal_surname, user.maternal_surname] if part
        ).strip() or user.email

    def validate(self, attrs):
        fecha_apertura = attrs.get('fecha_apertura', getattr(self.instance, 'fecha_apertura', None))
        fecha_cierre = attrs.get('fecha_cierre', getattr(self.instance, 'fecha_cierre', None))

        if not fecha_apertura or not fecha_cierre:
            raise serializers.ValidationError('Debes proporcionar fecha de apertura y fecha de cierre.')

        if fecha_cierre <= fecha_apertura:
            raise serializers.ValidationError('La fecha de cierre debe ser posterior a la apertura.')

        return attrs


# ── Respuestas e intentos ─────────────────────────────────────────────────────

class RespuestaIntentoSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.texto', read_only=True)
    pregunta_tipo = serializers.CharField(source='pregunta.tipo', read_only=True)
    pregunta_orden = serializers.IntegerField(source='pregunta.orden', read_only=True)
    pregunta_puntaje = serializers.IntegerField(source='pregunta.puntaje', read_only=True)
    opcion_texto = serializers.SerializerMethodField()
    opcion_correcta = serializers.SerializerMethodField()
    todas_opciones = serializers.SerializerMethodField()
    explicacion = serializers.SerializerMethodField()

    class Meta:
        model = RespuestaIntento
        fields = [
            'id', 'pregunta', 'pregunta_texto', 'pregunta_tipo',
            'pregunta_orden', 'pregunta_puntaje',
            'opcion_elegida', 'opcion_texto',
            'opcion_correcta',
            'todas_opciones',
            'es_correcta',
            'explicacion',
        ]

    def get_opcion_texto(self, obj):
        return obj.opcion_elegida.texto if obj.opcion_elegida else None

    def get_opcion_correcta(self, obj):
        correcta = obj.pregunta.opciones.filter(es_correcta=True).first()
        if correcta:
            return {'id': str(correcta.id), 'texto': correcta.texto}
        return None

    def get_todas_opciones(self, obj):
        return [
            {'id': str(op.id), 'texto': op.texto, 'es_correcta': op.es_correcta, 'orden': op.orden}
            for op in obj.pregunta.opciones.order_by('orden')
        ]

    def get_explicacion(self, obj):
        explicacion = getattr(obj.pregunta, 'explicacion', None)
        if not explicacion:
            return None
        request = self.context.get('request')
        imagen_url = None
        if explicacion.imagen and request:
            imagen_url = request.build_absolute_uri(explicacion.imagen.url)
        return {'texto': explicacion.texto, 'imagen_url': imagen_url}


class IntentoSimuladorSerializer(serializers.ModelSerializer):
    respuestas = RespuestaIntentoSerializer(many=True, read_only=True)
    simulador_titulo = serializers.CharField(source='simulador.titulo', read_only=True)
    simulador_curso_nombre = serializers.SerializerMethodField()
    simulador_ruta_nombre = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_nombre = serializers.SerializerMethodField()

    class Meta:
        model = IntentoSimulador
        fields = [
            'id', 'simulador', 'simulador_titulo',
            'simulador_curso_nombre', 'simulador_ruta_nombre',
            'user_email', 'user_nombre',
            'iniciado_en', 'finalizado_en',
            'tiempo_transcurrido_segundos',
            'puntaje_obtenido',
            'total_correctas', 'total_incorrectas', 'total_no_respondidas',
            'completado',
            'respuestas',
        ]

    def get_simulador_curso_nombre(self, obj):
        return obj.simulador.curso.titulo if obj.simulador.curso else None

    def get_simulador_ruta_nombre(self, obj):
        simulador = obj.simulador
        if simulador.ruta:
            return simulador.ruta.titulo
        if simulador.curso and simulador.curso.ruta:
            return simulador.curso.ruta.titulo
        return None

    def get_user_nombre(self, obj):
        user = obj.user
        return ' '.join(
            part for part in [user.name, user.paternal_surname, user.maternal_surname] if part
        ).strip() or user.email


class IntentoListSerializer(serializers.ModelSerializer):
    simulador_titulo = serializers.CharField(source='simulador.titulo', read_only=True)

    class Meta:
        model = IntentoSimulador
        fields = [
            'id', 'simulador', 'simulador_titulo',
            'iniciado_en', 'finalizado_en',
            'tiempo_transcurrido_segundos',
            'puntaje_obtenido',
            'total_correctas', 'total_incorrectas', 'total_no_respondidas',
            'completado',
        ]


# ── Payload para enviar respuestas ────────────────────────────────────────────

class EnviarRespuestasSerializer(serializers.Serializer):
    respuestas = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de {pregunta_id, opcion_id} (opcion_id puede ser null)',
    )
    tiempo_transcurrido_segundos = serializers.IntegerField(min_value=0)
