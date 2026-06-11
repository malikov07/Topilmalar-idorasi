from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.items.models import Item
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListCreateView(generics.ListCreateAPIView):
    """GET: my conversations (as owner or inquirer). POST: start/get a thread for an item."""
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects
            .filter(Q(owner=user) | Q(inquirer=user))
            .select_related('item', 'owner', 'inquirer')
            .prefetch_related('item__images', 'messages')
        )

    def create(self, request, *args, **kwargs):
        item_id = request.data.get('item')
        if not item_id:
            return Response({'detail': 'item is required.'}, status=status.HTTP_400_BAD_REQUEST)

        item = get_object_or_404(Item, pk=item_id)

        if item.user_id == request.user.id:
            return Response(
                {'detail': "You can't start a conversation about your own item."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation, _ = Conversation.objects.get_or_create(
            item=item,
            inquirer=request.user,
            defaults={'owner': item.user},
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageListView(generics.ListAPIView):
    """List messages in a conversation and mark the other party's messages as read."""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_conversation(self):
        conversation = get_object_or_404(Conversation, pk=self.kwargs['conversation_id'])
        if not conversation.involves(self.request.user):
            return None
        return conversation

    def list(self, request, *args, **kwargs):
        conversation = self.get_conversation()
        if conversation is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Mark incoming (from the other participant) messages as read.
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        messages = conversation.messages.select_related('sender').all()
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)


class UnreadCountView(APIView):
    """Total unread messages across all of the user's conversations (for the navbar badge)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = (
            Message.objects
            .filter(Q(conversation__owner=request.user) | Q(conversation__inquirer=request.user))
            .filter(is_read=False)
            .exclude(sender=request.user)
            .count()
        )
        return Response({'unread': count})
