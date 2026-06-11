from django.db.models import Q, F
from django.shortcuts import render
from django.core.files.storage import default_storage
import os
from .utils import analyze_item_image
from .taxonomy import resolve_categories_from_suggestions
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework import permissions
from .models import Item, Category, SavedItem
from .serializers import ItemSerializer,CategorySerializer
from .permissions import IsOwnerOrReadOnly
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    # Crucial for React file uploads! Tells DRF to expect FormData, not just raw JSON.
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action == 'toggle_save':
            return [IsAuthenticated()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        # Best Practice: Optimize database queries
        # select_related is for ForeignKey (1-to-1 or Many-to-1)
        # prefetch_related is for reverse ForeignKeys (1-to-Many, like your images)
        qs = Item.objects.select_related('user', 'category').prefetch_related('images').all()
        
        # Filtering logic
        search = self.request.query_params.get('search')
        category = self.request.query_params.get('category')
        status = self.request.query_params.get('status')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        is_resolved = self.request.query_params.get('is_resolved')
        saved = self.request.query_params.get('saved')
        include_resolved = self.request.query_params.get('include_resolved')
        user_id = self.request.query_params.get('user')

        if self.action == 'list' and include_resolved != 'true':
            qs = qs.filter(is_resolved=False)

        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        if category:
            # Include selected category and all of its subcategories
            category_ids = []
            stack = [int(category)]
            while stack:
                current_id = stack.pop()
                if current_id in category_ids:
                    continue
                category_ids.append(current_id)
                child_ids = list(Category.objects.filter(parent_id=current_id).values_list('id', flat=True))
                stack.extend(child_ids)

            qs = qs.filter(Q(category_id__in=category_ids) | Q(categories__id__in=category_ids)).distinct()
        if status:
            qs = qs.filter(status=status)
        if start_date:
            qs = qs.filter(date_lost_or_found__gte=start_date)
        if end_date:
            qs = qs.filter(date_lost_or_found__lte=end_date)
        if is_resolved is not None:
            qs = qs.filter(is_resolved=is_resolved.lower() == 'true')
        if saved == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(saved_by__user=self.request.user)
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Count one view per detail fetch (atomic, race-safe)
        Item.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        instance.refresh_from_db(fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # Absolute Security: Force the 'user' to be whoever is making the request
        # using their secure JWT token. The user CANNOT fake this.
        item = serializer.save(user=self.request.user)

        # Strict taxonomy mode: map AI suggestions to existing categories only
        suggested_categories = self.request.data.get('suggested_categories')
        resolved_categories, main_category = resolve_categories_from_suggestions(suggested_categories)

        if resolved_categories:
            item.categories.add(*resolved_categories)

        if not item.category:
            item.category = main_category

        item.is_processed = True
        item.save()

        # Process the image properly only if we need legacy tasks
        # process_item_images.delay(item.id)

    def perform_update(self, serializer):
        item = serializer.save()

        suggested_categories = self.request.data.get('suggested_categories')
        if suggested_categories is not None:
            resolved_categories, main_category = resolve_categories_from_suggestions(suggested_categories)
            if resolved_categories:
                item.categories.set(resolved_categories)
            if main_category:
                item.category = main_category
            item.is_processed = True
            item.save()

    @action(detail=False, methods=['post'], url_path='analyze-image')
    def analyze_image(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"error": "No image provided"}, status=400)
        
        # Save temp file
        path = default_storage.save('temp/' + image_file.name, image_file)
        full_path = default_storage.path(path)
        
        try:
            result = analyze_item_image(full_path)
            return Response(result)
        finally:
            if os.path.exists(full_path):
                os.remove(full_path)

    @action(detail=True, methods=['post'], url_path='toggle-save')
    def toggle_save(self, request, pk=None):
        item = self.get_object()
        saved_obj = SavedItem.objects.filter(user=request.user, item=item).first()

        if saved_obj:
            saved_obj.delete()
            return Response({'saved': False})

        SavedItem.objects.create(user=request.user, item=item)
        return Response({'saved': True})


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny] # Anyone can see the categories


