import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    """One persistent socket per logged-in user.

    The user joins their personal group `user_<id>`; messages for any of their
    conversations are routed to that group. The client sends:
      {action: 'send', conversation_id, text}
      {action: 'read', conversation_id}
    and receives:
      {type: 'message', message: {...}}
    """

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        self.group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except (TypeError, json.JSONDecodeError):
            return

        action = data.get('action')
        if action == 'send':
            await self.handle_send(data)
        elif action == 'read':
            await self.handle_read(data)

    async def handle_send(self, data):
        conversation_id = data.get('conversation_id')
        text = (data.get('text') or '').strip()
        if not conversation_id or not text:
            return

        result = await self.create_message(conversation_id, text)
        if not result:
            return

        message_payload, recipient_id = result
        # Deliver to both participants' personal groups.
        for uid in {str(self.user.id), str(recipient_id)}:
            await self.channel_layer.group_send(
                f'user_{uid}',
                {'type': 'chat.message', 'message': message_payload},
            )

    async def handle_read(self, data):
        conversation_id = data.get('conversation_id')
        if conversation_id:
            await self.mark_read(conversation_id)

    # ── Group event handlers ──────────────────────────────────────────
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type': 'message', 'message': event['message']}))

    # ── DB helpers ────────────────────────────────────────────────────
    @database_sync_to_async
    def create_message(self, conversation_id, text):
        from .models import Conversation, Message
        try:
            conversation = Conversation.objects.select_related('owner', 'inquirer').get(pk=conversation_id)
        except Conversation.DoesNotExist:
            return None
        if not conversation.involves(self.user):
            return None

        msg = Message.objects.create(conversation=conversation, sender=self.user, text=text)
        conversation.last_message_at = msg.created_at
        conversation.save(update_fields=['last_message_at', 'updated_at'])

        recipient = conversation.other_participant(self.user)
        payload = {
            'id': msg.id,
            'conversation': conversation.id,
            'sender': str(msg.sender_id),
            'text': msg.text,
            'is_read': msg.is_read,
            'created_at': msg.created_at.isoformat(),
        }
        return payload, recipient.id

    @database_sync_to_async
    def mark_read(self, conversation_id):
        from .models import Conversation
        try:
            conversation = Conversation.objects.get(pk=conversation_id)
        except Conversation.DoesNotExist:
            return
        if not conversation.involves(self.user):
            return
        conversation.messages.filter(is_read=False).exclude(sender=self.user).update(is_read=True)
