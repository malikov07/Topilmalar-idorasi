from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from .models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data.update({
            'user_id': str(self.user.id),
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'is_verified': self.user.is_verified,
            'has_usable_password': self.user.has_usable_password(),
            'avatar': self.user.avatar.url if self.user.avatar else None,
            'cover_image': self.user.cover_image.url if getattr(self.user, 'cover_image', None) else None
        })

        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )

    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'phone_number', 'password_confirm', 'avatar')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # 2. Pop the avatar out safely before creating the user
        avatar = validated_data.pop('avatar', None)
        
        # 3. Create the secure user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', '')
        )
        
        # 4. If they uploaded an avatar, attach it and save again
        if avatar:
            user.avatar = avatar
            user.save()
            
        return user
    

class GoogleSocialAuthSerializer(serializers.Serializer):
    auth_token = serializers.CharField()


class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(required=True, max_length=6)


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class UserProfileSerializer(serializers.ModelSerializer):
    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 'avatar', 'cover_image', 'has_usable_password']

        read_only_fields = ['id', 'email', 'has_usable_password']

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()
class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True)
