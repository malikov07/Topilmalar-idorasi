from os import getenv
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
time_zone = ZoneInfo("Asia/Tashkent")
import requests
from dotenv import load_dotenv
load_dotenv()
from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from django.utils.crypto import get_random_string
from .models import User, OTP
from .serializers import RegisterSerializer, GoogleSocialAuthSerializer, OTPVerificationSerializer,CustomTokenObtainPairSerializer, SendOTPSerializer, UserProfileSerializer
from .utils import send_otp_with_sdk  
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.base import ContentFile

# Create your views here.
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  # Allow anyone to register
    parser_classes = [MultiPartParser, FormParser] # For handling avatar image uploads

    def create(self,request, *args, **kwargs):
        user = User.objects.filter(email=request.data.get('email')).first()
        if user and not user.is_verified:
            
            email_result = send_otp_with_sdk(user.email)
            if not email_result:
                return Response({"email_send_error": "Failed to send OTP email."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.first_name=request.data.get('first_name', user.first_name)
            user.last_name=request.data.get('last_name', user.last_name)
            user.phone_number=request.data.get('phone_number', user.phone_number)
            user.is_staff=False
            user.is_active=True

            avatar = request.data.get('avatar')
            if avatar:  
                user.avatar = avatar
            
            user.save()
            
            # Save OTP to database
            otp = OTP.objects.filter(user=user).first()
            if otp:
                otp.code = email_result
                otp.created_at = datetime.now(time_zone)
                otp.expires_at = datetime.now(time_zone) + timedelta(minutes=10)
                otp.save()
            else:
                date_expires = datetime.now(time_zone) + timedelta(minutes=10)
                OTP.objects.create(user=user, code=email_result, expires_at=date_expires)

            return Response({"message": "User already exists but is not verified. OTP sent to email."}, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email_result = send_otp_with_sdk(request.data.get('email'))
        if not email_result:
            return Response({"email_send_error": "Failed to send OTP email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()

        # Save OTP to database
        otp = OTP.objects.filter(user=user).first()
        if otp:
            otp.code = email_result
            otp.created_at = datetime.now(time_zone)
            otp.expires_at = datetime.now(time_zone) + timedelta(minutes=10)
            otp.save()
        else:
            date_expires = datetime.now(time_zone) + timedelta(minutes=10)
            OTP.objects.create(user=user, code=email_result, expires_at=date_expires)


        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {
                    'user_id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_verified': user.is_verified,
                    'avatar': user.avatar.url if user.avatar else None
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }
        )
    

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GoogleSocialAuthSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['auth_token']

        try:
            # 1. Verify the token with Google
            google_response = requests.get(f'https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}')

            if google_response.status_code != 200:
                return Response({"error": "Invalid Google token"}, status=400)

            id_info = google_response.json()

            # 2. Get user info from the verified token
            email = id_info['email']
            first_name = id_info.get('given_name', '')
            last_name = id_info.get('family_name', '')
            picture_url = id_info.get('picture', None) # Grab the URL string

            # 3. Check if user exists (Login vs Register)
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_verified': True, 
                    'password': get_random_string(length=32),
                    # We DO NOT put 'avatar': picture_url here!
                }
            )

            # Ensure existing users are marked as verified if they log in with Google
            if not user.is_verified:
                user.is_verified = True
                user.save()

            # 4. DOWNLOAD AND SAVE THE AVATAR
            # If Google gave us a picture, and the user doesn't already have one saved
            if picture_url and not user.avatar:
                img_response = requests.get(picture_url)
                
                if img_response.status_code == 200:
                    # Create a safe, unique filename
                    file_name = f"google_avatar_{user.id}.jpg"
                    # Convert the internet data into a Django File and save it
                    user.avatar.save(file_name, ContentFile(img_response.content), save=True)

            # 5. Generate JWT Tokens
            refresh = RefreshToken.for_user(user)

            avatar_url = None
            if user.avatar and hasattr(user.avatar, 'url'):
                avatar_url = request.build_absolute_uri(user.avatar.url)

            return Response({
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_verified': user.is_verified,
                    
                    # ADD THIS CRUCIAL LINE:
                    'avatar': avatar_url 
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)

        except ValueError:
            # Token is invalid or expired
            return Response(
                {'error': 'Invalid Google token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )    


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    serializer_class = OTPVerificationSerializer

    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp_code')
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        otp = OTP.objects.filter(user=user, code=otp_code).first()
        if not otp:
            return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
        if otp.expires_at < datetime.now(time_zone):
            return Response({"error": "OTP has expired."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_verified = True
        user.save()
        token = RefreshToken.for_user(user)
        return Response({
            "message": "OTP verified successfully.",
            "user": {
                "user_id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_verified": user.is_verified,
            },
            "tokens": {
                "refresh": str(token),
                "access": str(token.access_token),
            }
        }, status=status.HTTP_200_OK)
    

class SendOTPView(APIView):
    permission_classes = [AllowAny]
    serializer_class = SendOTPSerializer

    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        email_result = send_otp_with_sdk(user.email)
        if isinstance(email_result, dict) and "error" in email_result:
            return Response({"email_send_error": email_result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
        
        otp = OTP.objects.filter(user=user).first()
        if otp:
            otp.code = email_result
            otp.created_at = datetime.now(time_zone)
            otp.expires_at = datetime.now(time_zone) + timedelta(minutes=10)
            otp.save()
        else:
            date_expires = datetime.now(time_zone) + timedelta(minutes=10)
            OTP.objects.create(user=user, code=email_result, expires_at=date_expires)

        return Response({"message": "OTP sent successfully."}, status=status.HTTP_200_OK)
    

class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    # Use the safe profile serializer!
    serializer_class = UserProfileSerializer 
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] # For the avatar image

    def get_object(self):
        return self.request.user

from .serializers import ChangePasswordSerializer

class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # OTP orqali tasdiqlangan bo'lsa eski parol talab qilinmaydi.
            
            # Yangi parolni o'rnatish
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            return Response({"detail": "Parol muvaffaqiyatli o'zgartirildi."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
