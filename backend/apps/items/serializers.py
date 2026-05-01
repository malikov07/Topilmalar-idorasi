from rest_framework import serializers
from .models import Item, ItemImage, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'name_uz', 'name_en', 'name_ru', 'parent']

class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ['id', 'image']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        return rep

class ItemSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()
    categories = CategorySerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    removed_image_ids = serializers.CharField(write_only=True, required=False)
    
    owner_name = serializers.SerializerMethodField()
    owner_picture = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'title', 'description', 'category', 'categories', 'user', 'owner_name',
            'date_lost_or_found', 'contact_info', 'latitude', 'longitude',
            'location_address', 'is_resolved', 'status', 'images', 
            'uploaded_images', 'owner_picture', 'is_saved', 'created_at', 'views_count',
            'is_processed'
        ]
        read_only_fields = ['user', 'is_processed', 'categories']

    def get_images(self, obj):
        images = obj.images.all()
        valid_images = [img for img in images if getattr(img.image, 'url', None)]
        return ItemImageSerializer(valid_images, many=True, context=self.context).data

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # The 'user' is passed here from perform_create in the ViewSet
        item = Item.objects.create(**validated_data)
        
        for image in uploaded_images:
            ItemImage.objects.create(item=item, image=image)
            
        return item

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        removed_image_ids = validated_data.pop('removed_image_ids', None)

        item = super().update(instance, validated_data)

        for image in uploaded_images:
            ItemImage.objects.create(item=item, image=image)

        if removed_image_ids:
            if isinstance(removed_image_ids, str):
                cleaned_ids = [value.strip() for value in removed_image_ids.split(',') if value.strip()]
            else:
                cleaned_ids = list(removed_image_ids)
            image_ids = [int(value) for value in cleaned_ids if str(value).isdigit()]
            if image_ids:
                ItemImage.objects.filter(item=item, id__in=image_ids).delete()

        return item
    
    def get_owner_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.email

    def get_owner_picture(self, obj):
        request = self.context.get('request')
        if obj.user.avatar and hasattr(obj.user.avatar, 'url'):
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.saved_by.filter(user=request.user).exists()