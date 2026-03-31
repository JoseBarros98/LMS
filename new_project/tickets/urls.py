from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, TicketCategoryViewSet, category_list, ticket_list

router = DefaultRouter()
router.register(r"tickets", TicketViewSet, basename='ticket')
router.register(r"categories", TicketCategoryViewSet, basename='category')

app_name = 'tickets'

urlpatterns = [
    path('categories-simple/', category_list, name='category-list-simple'),
    path('tickets-simple/', ticket_list, name='ticket-list-simple'),
    path('', include(router.urls)),
]
