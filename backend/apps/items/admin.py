from django.contrib import admin

# Register your models here.
#write code to register models in admin panel beautifully
from .models import Category, Item, ItemImage
from import_export.admin import ImportExportModelAdmin


@admin.register(Category)
class CategoryAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at', 'updated_at')
    search_fields = ('name',)
    ordering = ('-created_at',)

class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1   

@admin.register(Item)
class ItemAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'category', 'date_lost_or_found', 'location_address', 'is_resolved', 'status', 'created_at')
    list_filter = ('status', 'category', 'date_lost_or_found', 'is_resolved')
    search_fields = ('title', 'description', 'location_address')
    ordering = ('-created_at',)
    inlines = [ItemImageInline] 

