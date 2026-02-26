from django.db import models
import uuid

from customers.models import Customer, Address

class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="orders",
    )
    session_key = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text="For anonymous before login",
    )
    tier_name = models.CharField(max_length=20)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS_CHOICES,
        default="pending",
    )
    delivery_address = models.ForeignKey(
        Address,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="orders",
    )
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transaction_id = models.BigIntegerField(default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["session_key", "status"]),
        ]

    def __str__(self):
        return f"Order #{self.order_id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    book = models.ForeignKey(
        "products.Book",
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.book.title} x {self.quantity}"


class RetryPackOrder(models.Model):
    CONTENT_TYPES = [
        ("CHARACTER", "Character"),
        ("COVER", "Cover"),
        ("PAGE", "Page"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        related_name="retry_packs",
        on_delete=models.CASCADE,
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    content_id = models.UUIDField()
    pack_size = models.PositiveSmallIntegerField(default=3)
    pack_price_gel = models.DecimalField(max_digits=10, decimal_places=2, default=2)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["order", "content_type", "content_id"]),
        ]