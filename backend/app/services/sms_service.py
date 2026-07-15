"""
SMS delivery via Africa's Talking.
Falls back to MOCK_MODE (logs the message, marks as 'sent') when no real
API key is configured, so the whole system is runnable/demo-able out of the box.
"""
import httpx
from app.core.config import get_settings

settings = get_settings()

AT_SEND_URL = "https://api.africastalking.com/version1/messaging"
AT_SANDBOX_SEND_URL = "https://api.sandbox.africastalking.com/version1/messaging"


def _normalize_phone(phone: str) -> str:
    phone = phone.strip().replace(" ", "")
    if phone.startswith("0"):
        phone = "+233" + phone[1:]
    elif phone.startswith("233"):
        phone = "+" + phone
    elif not phone.startswith("+"):
        phone = "+" + phone
    return phone


def send_sms(phone: str, message: str) -> dict:
    phone = _normalize_phone(phone)

    if not settings.sms_configured():
        print(f"[MOCK SMS] to {phone}: {message}")
        return {"mock": True, "status": "sent", "phone": phone, "message": message}

    url = AT_SANDBOX_SEND_URL if settings.AT_USERNAME == "sandbox" else AT_SEND_URL
    headers = {
        "apiKey": settings.AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }
    data = {
        "username": settings.AT_USERNAME,
        "to": phone,
        "message": message,
        "from": settings.AT_SENDER_ID,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, data=data)
            resp.raise_for_status()
            return {"mock": False, "status": "sent", "raw": resp.json()}
    except Exception as e:
        return {"mock": False, "status": "failed", "error": str(e)}
