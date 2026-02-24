from django.urls import path

from .views import LoginView, LogoutView, RegisterView, StatusView,UserView,EditUser,HandleAddress


urlpatterns = [
    path('login/', LoginView, name='login'),
    path('logout/', LogoutView, name='logout'),
    path('register/', RegisterView, name='register'),
    path('edit/', EditUser, name='edit'),
    path('status/', StatusView, name='status'),
    path('user/', UserView, name='user'),
    path('address/', HandleAddress, name='address'),
]