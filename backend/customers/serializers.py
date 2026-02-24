from rest_framework import serializers
from .models import Customer, Address


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', "username", "first_name", "last_name", 'email', 'phone', 'avatar',"date_joined", "last_login"]

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['user', 'full_name', 'phone', 'email', 'address_line1', 'address_line2', 'city']