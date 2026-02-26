from django.shortcuts import get_object_or_404, render
from django.views.generic import ListView
from django.contrib.auth import authenticate, login, logout

from django.core.mail import send_mail
from django.conf import settings

from rest_framework.response import Response
from rest_framework.decorators import api_view

from .models import Customer, Address
from .serializers import CustomerSerializer, AddressSerializer

from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.decorators import throttle_classes


@api_view(['POST'])
@throttle_classes([AnonRateThrottle, UserRateThrottle])
def LoginView(request):
    login_value = request.data.get('username')  
    password = request.data.get('password')

    user = Customer.objects.filter(username=login_value).first()
    if not user:
        user = Customer.objects.filter(email=login_value).first()

    if user:
        user_auth = authenticate(request, username=user.username, password=password)
        if user_auth:
            login(request, user_auth)  
            return Response({"message": "Successfully logged in"})
        else:
            return Response({"error": "Invalid password"},status=400)
    else:
        return Response({"error": "User not found"},status=404)
    

@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def LogoutView(request):
    logout(request)
    return Response({"message": "User logged out"})

@api_view(['GET'])
def UserView(request):
    user = request.user
    if request.user.is_authenticated:
        serializer = CustomerSerializer(user, many=False)
        return Response(serializer.data)
    else: 
        return Response({"message": 'user is not authenticated'},status=400)

@api_view(['GET'])
def StatusView(request):
    user = request.user
    if user.is_authenticated:
        return Response({"loggedIn": True, "user": user.username})
    else:
        return Response({"loggedIn": False})


@api_view(['POST'])
@throttle_classes([AnonRateThrottle, UserRateThrottle])
def RegisterView(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    phone = request.data.get('phone')

    if not username or not password:
        return Response({"error": "Username and password are required"}, status=400)
    if Customer.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)
    if email and Customer.objects.filter(email=email).exists():
        return Response({"error": "Email already exists"}, status=400)

    user = Customer(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone=phone
    )
    user.set_password(password)
    user.save()

    user_auth = authenticate(request, username=username, password=password)
    if user_auth:
        login(request, user_auth)  

    try:
        send_mail(
            subject="მოგესალმებით CEYO-ში!",
            message=f"გამარჯობა {first_name or username},\n\n"
            "გმადლობთ რეგისტრაციისთვის CEYO-ზე.\n"
            "თქვენი ანგარიში წარმატებით შეიქმნა.\n\n"
            "თუ ეს ანგარიში თქვენ არ შეგიქმნიათ, შეგიძლიათ უგულებელყოთ ეს წერილი.\n\n"
            "საუკეთესო სურვილებით,\n"
            "CEYO",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        print(f"Mail send failed: {e}")

    return Response({"message": "User Registered"})




@api_view(['PUT'])
def EditUser(request):
    if not request.user.is_authenticated:
        return Response({"error": "User not authenticated"}, status=401)

    user = request.user

    username = user.username

    new_username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    phone = request.data.get('phone')

    if new_username and Customer.objects.filter(username=new_username).exclude(pk=user.pk).exists():
        return Response({"error": "Username already exists"}, status=400)
    if email and Customer.objects.filter(email=email).exclude(pk=user.pk).exists():
        return Response({"error": "Email already exists"}, status=400)

    if new_username and new_username != user.username:
        user.username = new_username
    if email:
        user.email = email
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if phone:
        user.phone = phone
    if password:
        user.set_password(password)

    user.save()
    return Response({"message": "User Edited"})



@api_view(['POST', 'PUT', 'GET'])
# @throttle_classes([AnonRateThrottle, UserRateThrottle])
def HandleAddress(request):
    user = None
    anon_token = None
    full_name = request.data.get('full_name')
    phone = request.data.get('phone')
    email = request.data.get('email')
    address_line1 = request.data.get('address_line1')
    address_line2 = request.data.get('address_line2')
    city = request.data.get('city')

    if request.user.is_authenticated:
        user = request.user
    else:
        anon_token = request.COOKIES.get("anon_token") or request.META.get(
            "HTTP_X_ANONYMOUS_TOKEN"
        )
        if not anon_token:
            return Response({"error": "Anonymous token required"}, status=400)
    
    if request.method == 'GET':
        if request.user.is_authenticated:
            address, created = Address.objects.get_or_create(user=user)
        else:
            address, created = Address.objects.get_or_create(session_key=anon_token)
        

            
        serializer = AddressSerializer(address, many=False)
        return Response(serializer.data)

    if request.method == 'POST':
        if not request.user.is_authenticated:
            address, created = Address.objects.get_or_create(session_key=anon_token)
            if address.session_key != anon_token:
                return Response({"error": "Forbidden"}, status=403)
            address.full_name = full_name
            address.phone = phone
            address.email = email
            address.address_line1 = address_line1
            address.address_line2 = address_line2
            address.city = city
            address.save()
            return Response({"message": "Address Created"})
        else:
            address, created = Address.objects.get_or_create    (user=user)
            address.full_name = full_name
            address.phone = phone
            address.email = email
            address.address_line1 = address_line1
            address.address_line2 = address_line2
            address.city = city
            address.save()
            return Response({"message": "Address Created"})

    if request.method == 'PUT':
        if not request.user.is_authenticated:
            address, created = Address.objects.get_or_create(session_key=anon_token)
            if address.session_key != anon_token:
                return Response({"error": "Forbidden"}, status=403)
        else:
            address, created = Address.objects.get_or_create(user=user)
            if address.user != user:
                return Response({"error": "Forbidden"}, status=403)
            
        if email:
            address.email = email
        if full_name:
            address.full_name = full_name
        if phone:
            address.phone = phone
        if address_line1:
            address.address_line1 = address_line1
        if address_line2:
            address.address_line2 = address_line2
        if city:
            address.city = city

        address.save()

        return Response({"message": "Address Edited"})







