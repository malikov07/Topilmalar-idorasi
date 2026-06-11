from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'text', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'is_read', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Inbox-friendly representation, relative to the requesting user."""
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_image = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'item', 'item_title', 'item_image', 'other_user',
            'last_message', 'unread_count', 'last_message_at', 'created_at',
        ]

    def _request_user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def _abs_url(self, url):
        request = self.context.get('request')
        if url and request:
            return request.build_absolute_uri(url)
        return url

    def get_item_image(self, obj):
        first = obj.item.images.first()
        if first and getattr(first.image, 'url', None):
            return self._abs_url(first.image.url)
        return None

    def get_other_user(self, obj):
        user = self._request_user()
        other = obj.other_participant(user) if user else obj.owner
        avatar = None
        if other.avatar and hasattr(other.avatar, 'url'):
            avatar = self._abs_url(other.avatar.url)
        name = f"{other.first_name} {other.last_name}".strip() or other.email
        return {'id': str(other.id), 'name': name, 'avatar': avatar}

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'text': msg.text,
            'created_at': msg.created_at,
            'sender': str(msg.sender_id),
        }

    def get_unread_count(self, obj):
        user = self._request_user()
        if not user:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=user).count()
