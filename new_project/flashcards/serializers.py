from rest_framework import serializers

from .models import Flashcard, FlashcardGroup, FlashcardStudyEvent


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', 'grupo', 'pregunta', 'respuesta', 'orden', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FlashcardGroupSerializer(serializers.ModelSerializer):
    cards_count = serializers.IntegerField(read_only=True)
    usuarios_unicos = serializers.IntegerField(read_only=True)
    total_intentos = serializers.IntegerField(read_only=True)
    respuestas_correctas = serializers.IntegerField(read_only=True)
    precision = serializers.SerializerMethodField()
    tiempo_medio_seg = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_initials = serializers.SerializerMethodField()
    visibilidad_label = serializers.CharField(source='get_visibilidad_display', read_only=True)

    class Meta:
        model = FlashcardGroup
        fields = [
            'id',
            'owner',
            'owner_name',
            'owner_initials',
            'nombre',
            'descripcion',
            'visibilidad',
            'visibilidad_label',
            'color_tema',
            'cards_count',
            'usuarios_unicos',
            'total_intentos',
            'respuestas_correctas',
            'precision',
            'tiempo_medio_seg',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'owner',
            'created_at',
            'updated_at',
            'owner_name',
            'owner_initials',
            'cards_count',
            'visibilidad_label',
            'usuarios_unicos',
            'total_intentos',
            'respuestas_correctas',
            'precision',
            'tiempo_medio_seg',
        ]

    def get_owner_name(self, obj):
        user = obj.owner
        full_name = ' '.join(
            part for part in [user.name, user.paternal_surname, user.maternal_surname] if part
        ).strip()
        return full_name or user.email

    def get_owner_initials(self, obj):
        user = obj.owner
        initials = ''.join([(user.name or '')[:1], (user.paternal_surname or '')[:1]]).upper()
        if initials:
            return initials
        return (user.email or 'NA')[:2].upper()

    def get_precision(self, obj):
        total = getattr(obj, 'total_intentos', 0) or 0
        if total == 0:
            return 0.0
        correctas = getattr(obj, 'respuestas_correctas', 0) or 0
        return round((correctas / total) * 100, 2)

    def get_tiempo_medio_seg(self, obj):
        promedio = getattr(obj, 'tiempo_medio_seg_agg', None)
        if promedio is None:
            return 0.0
        return round(float(promedio), 2)


class FlashcardGroupDetailSerializer(FlashcardGroupSerializer):
    cards = FlashcardSerializer(many=True, read_only=True)

    class Meta(FlashcardGroupSerializer.Meta):
        fields = FlashcardGroupSerializer.Meta.fields + ['cards']


class FlashcardStudyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashcardStudyEvent
        fields = ['id', 'user', 'grupo', 'card', 'fue_correcta', 'duracion_segundos', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class FlashcardStudyAnswerSerializer(serializers.Serializer):
    card_id = serializers.IntegerField(required=False, allow_null=True)
    fue_correcta = serializers.BooleanField()
    duracion_segundos = serializers.IntegerField(required=False, min_value=0)

    def validate_card_id(self, value):
        if value is None:
            return value

        if value <= 0:
            raise serializers.ValidationError('card_id invalido.')
        return value
