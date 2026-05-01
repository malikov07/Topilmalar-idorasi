import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import secrets
from os import getenv
from dotenv import load_dotenv
load_dotenv()

def send_otp_with_sdk( recipient_email):
    api_key = getenv("BREVO_API_KEY")  
    # 1. Setup Configuration
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = api_key
    
    # 2. Initialize the API Client
    api_client = sib_api_v3_sdk.ApiClient(configuration)
    
    # ---------------------------------------------------------
    # THE BULLETPROOF FIX:
    # Force the API key into the client's default headers. 
    # This guarantees the SDK cannot drop it during the request.
    # ---------------------------------------------------------
    api_client.set_default_header("api-key", api_key)

    # 3. Create the Transactional Email API instance
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)

    # 4. Generate a secure 6-digit OTP
    otp_code = str(secrets.randbelow(900000) + 100000)

    # 5. Construct the Email using the exact SDK Models
    sender = sib_api_v3_sdk.SendSmtpEmailSender(
        name="Lost Items Platform", 
        email=getenv("BREVO_SENDER_EMAIL")  # IMPORTANT: Must be a verified sender in Brevo
    )
    to = [sib_api_v3_sdk.SendSmtpEmailTo(email=recipient_email)]
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        sender=sender,
        to=to,
        subject="OTP Verification Code",
        html_content=f"<html><body><h2>Your verification code is: <strong>{otp_code}</strong></h2><p>This code will expire in 10 minutes.</p></body></html>"
    )

    # 6. Send the Email
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"✅ OTP Sent Successfully! Message ID: {api_response.message_id}")
        return otp_code
        
    except ApiException as e:
        print(f"❌ Brevo API Exception: {e}")
        return {"error": f"Failed to send OTP email: {e}"}
    except Exception as e:
        print(f"❌ General Error: {e}")
        return {"error": f"An unexpected error occurred: {e}"}

