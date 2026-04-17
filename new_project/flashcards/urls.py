from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FlashcardGroupViewSet, FlashcardViewSet

router = DefaultRouter()
router.register(r'flashcard-groups', FlashcardGroupViewSet, basename='flashcard-group')
router.register(r'flashcards', FlashcardViewSet, basename='flashcard')

urlpatterns = [
    path('', include(router.urls)),
]
