import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    # Security: Use UUID to prevent ID enumeration attacks
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    
    email = models.EmailField(_('email address'), unique=True)
    
    # Validator to ensure phone numbers are in valid format (e.g. +998901234567)
    phone_regex = RegexValidator(
        regex=r'^\+?998?\d{9}$|^\d{9}$',
        message="Telefon raqami noto'g'ri formatda. Iltimos, +998XXXXXXXXX yoki XXXXXXXXX formatida kiriting."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, unique=True, blank=True, null=True)

    # Trust & Security Fields
    is_verified = models.BooleanField(default=False, help_text=_('Designates whether this user has verified their phone/email.'))
    
    # Required Django Fields
    is_staff = models.BooleanField(default=False) # For admin access
    is_active = models.BooleanField(default=True) # For banning users
    date_joined = models.DateTimeField(auto_now_add=True)
    avatar = models.ImageField(upload_to='users/avatars/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='users/covers/', null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email' 
    REQUIRED_FIELDS = [] 

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return  f"{self.first_name} {self.last_name}"
    

class OTP(BaseModel, models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    
    def __str__(self):
        return f"OTP for {self.user.email} - Expires at {self.expires_at}"