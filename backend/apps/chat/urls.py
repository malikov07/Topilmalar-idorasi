from django.urls import path
from .views import ConversationListCreateView, MessageListView, UnreadCountView

urlpatterns = [
    path('chat/conversations/', ConversationListCreateView.as_view(), name='conversation-list'),
    path('chat/conversations/<int:conversation_id>/messages/', MessageListView.as_view(), name='conversation-messages'),
    path('chat/unread-count/', UnreadCountView.as_view(), name='chat-unread-count'),
]
