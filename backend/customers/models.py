from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Customer(AbstractUser):
    email = models.EmailField(blank=False, null=False, unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username


# accounts/models.py
class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses',
        blank=True, null=True,
    )
    session_key = models.CharField(
        max_length=40, blank=True, null=True,
        help_text="For anonymous address before login"
    )
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=False, null=False)
    email = models.EmailField(blank=False, null=False)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=False, null=False)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Addresses"

    def __str__(self):
        return f"{self.full_name} - {self.address_line1}, {self.city}"