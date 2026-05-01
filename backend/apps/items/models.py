from django.db import models
from apps.users.models import User, BaseModel

# Create your models here.
class Category(BaseModel, models.Model):
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, null=True, blank=True)
    name_en = models.CharField(max_length=100, null=True, blank=True)
    name_uz = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.name
    
class ItemStatus(models.TextChoices):
    LOST = 'LOST', 'Lost'
    FOUND = 'FOUND', 'Found'
    
class Item(BaseModel, models.Model):

    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name='items', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='items')
    date_lost_or_found = models.DateField(null=True, blank=True)
    contact_info = models.CharField(max_length=255, null=True, blank=True)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    location_address = models.CharField(max_length=255)
    views_count = models.IntegerField(default=0)
    
    is_resolved = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=ItemStatus.choices)

    is_processed = models.BooleanField(default=False)
    
    categories = models.ManyToManyField(Category, related_name='items_m2m', blank=True)

    def __str__(self):
        return f"{self.title} - {self.user.first_name}"
    
    class Meta:
        ordering = ['-created_at']

        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['date_lost_or_found']),
            models.Index(fields=['is_resolved']),
        ]

class ItemImage(BaseModel, models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='item_images/')
    
    def __str__(self):
        return f"Image for {self.item.title}"


class SavedItem(BaseModel, models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='saved_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='saved_by')

    class Meta:
        unique_together = ('user', 'item')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} -> {self.item.title}"