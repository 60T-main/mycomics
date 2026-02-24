from django.db import models

from django.db import models
from customers.models import Customer, Address

class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT,blank=True,null=True)
    session_key = models.CharField(
        max_length=40, blank=True, null=True,
        help_text="For anonymous before login"
    )
    tier_name = models.CharField(max_length=20)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    delivery_address = models.ForeignKey(Address, on_delete=models.PROTECT,blank=False,null=False, related_name='orders')
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transaction_id = transaction_id = models.BigIntegerField(default=0)
    def __str__(self):
        return f"Order #{self.order_id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    book = models.ForeignKey(
        'products.Book',
        on_delete=models.PROTECT,
        related_name="order_items"
    )
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity
    
    def __str__(self):
        return f"{self.book.title} x {self.quantity}"