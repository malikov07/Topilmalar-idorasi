from django.contrib import admin
from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'item', 'owner', 'inquirer', 'last_message_at')
    search_fields = ('item__title', 'owner__email', 'inquirer__email')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'is_read', 'created_at')
    list_filter = ('is_read',)
