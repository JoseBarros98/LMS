from rest_framework import serializers

from .models import (
    ComentarioCurso,
    Curso,
    Leccion,
    MatriculaCurso,
    MatriculaRuta,
    MediatecaItem,
    ProgresoLeccion,
    Ruta,
    Seccion,
)


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


class ComentarioCursoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ComentarioCurso
        fields = [
            'id',
            'curso',
            'user',
            'user_nombre',
            'contenido',
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
    parent = serializers.PrimaryKeyRelatedField(queryset=MediatecaItem.objects.all(), allow_null=True, required=False)
    parent_titulo = serializers.CharField(source='parent.titulo', read_only=True)
    children_count = serializers.SerializerMethodField()
    archivo = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = MediatecaItem
        fields = [
            'id',
            'curso',
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

    class Meta(CursoSerializer.Meta):
        fields = CursoSerializer.Meta.fields + [
            'secciones',
            'comentarios',
            'mediateca',
            'progreso_total',
            'total_completadas',
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
