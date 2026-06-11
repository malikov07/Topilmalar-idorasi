from django.db import models
from apps.users.models import BaseModel


class Conversation(BaseModel, models.Model):
    """A chat thread about a specific item, between its owner and one inquirer."""
    item = models.ForeignKey(
        'items.Item', on_delete=models.CASCADE, related_name='conversations'
    )
    # The item owner (denormalised from item.user for simpler queries).
    owner = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='owned_conversations'
    )
    # The user who contacted the owner about the item.
    inquirer = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='inquired_conversations'
    )
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('item', 'inquirer')
        ordering = ['-last_message_at', '-created_at']
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['inquirer']),
        ]

    def __str__(self):
        return f"Conversation #{self.pk} about {self.item_id}"

    def other_participant(self, user):
        """Return the participant that is not `user`."""
        return self.inquirer if user == self.owner else self.owner

    def involves(self, user):
        return user == self.owner or user == self.inquirer


class Message(BaseModel, models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='sent_messages'
    )
    text = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"Message #{self.pk} from {self.sender_id}"
