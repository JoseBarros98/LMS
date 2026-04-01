from rest_framework import serializers

from .models import Curso, MatriculaCurso, MatriculaRuta, Ruta


class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = [
            'id',
            'titulo',
            'descripcion',
            'orden',
            'publicado',
            'slug',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class CursoSerializer(serializers.ModelSerializer):
    ruta_titulo = serializers.CharField(source='ruta.titulo', read_only=True)
    nivel_label = serializers.CharField(source='get_nivel_display', read_only=True)
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Curso
        fields = [
            'id',
            'ruta',
            'ruta_titulo',
            'titulo',
            'descripcion',
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
            'fecha_disponible_desde',
            'fecha_disponible_hasta',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        fecha_desde = attrs.get('fecha_disponible_desde')
        fecha_hasta = attrs.get('fecha_disponible_hasta')

        if self.instance:
            if fecha_desde is None:
                fecha_desde = self.instance.fecha_disponible_desde
            if fecha_hasta is None:
                fecha_hasta = self.instance.fecha_disponible_hasta

        if fecha_desde and fecha_hasta and fecha_hasta < fecha_desde:
            raise serializers.ValidationError(
                {'fecha_disponible_hasta': 'Debe ser mayor o igual que fecha_disponible_desde.'}
            )

        return attrs


class MatriculaRutaSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    ruta_titulo = serializers.CharField(source='ruta.titulo', read_only=True)

    class Meta:
        model = MatriculaRuta
        fields = [
            'id',
            'user',
            'user_nombre',
            'user_email',
            'ruta',
            'ruta_titulo',
            'codigo_acceso',
            'fecha_inicio',
            'fecha_fin',
            'activa',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')

        if self.instance:
            if fecha_inicio is None:
                fecha_inicio = self.instance.fecha_inicio
            if fecha_fin is None:
                fecha_fin = self.instance.fecha_fin

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'Debe ser mayor o igual a fecha_inicio.'}
            )

        return attrs


class MatriculaCursoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    curso_titulo = serializers.CharField(source='curso.titulo', read_only=True)
    ruta_id = serializers.UUIDField(source='curso.ruta_id', read_only=True)
    ruta_titulo = serializers.CharField(source='curso.ruta.titulo', read_only=True)

    class Meta:
        model = MatriculaCurso
        fields = [
            'id',
            'user',
            'user_nombre',
            'user_email',
            'curso',
            'curso_titulo',
            'ruta_id',
            'ruta_titulo',
            'codigo_acceso',
            'fecha_inicio',
            'fecha_fin',
            'activa',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')

        if self.instance:
            if fecha_inicio is None:
                fecha_inicio = self.instance.fecha_inicio
            if fecha_fin is None:
                fecha_fin = self.instance.fecha_fin

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'Debe ser mayor o igual a fecha_inicio.'}
            )

        return attrs
