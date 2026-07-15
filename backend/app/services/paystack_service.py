"""
Paystack Mobile Money "Charge" integration.

Flow:
1. initiate_momo_charge() -> POST /charge with mobile_money{phone, provider}.
   Customer's phone gets prompted by their network to enter the MoMo PIN.
   Paystack may return status 'send_otp' (needs submit_otp) or 'pay_offline'
   (customer approves on phone; poll/verify or wait for webhook).
2. submit_otp() -> POST /charge/submit_otp, for providers that require it.
3. verify_transaction() -> GET /transaction/verify/:reference to confirm final status.
4. Webhook (see payments route) receives 'charge.success' / 'charge.failed' async.

Runs in MOCK_MODE (no real Paystack key) so the whole system is demoable
without live credentials — it simulates a 'pay_offline' pending charge.
"""
import uuid
import httpx
from app.core.config import get_settings

settings = get_settings()

PROVIDER_MAP = {
    "mtn": "mtn",
    "vodafone": "vod",
    "vod": "vod",
    "airteltigo": "tgo",
    "tgo": "tgo",
}


def _normalize_phone(phone: str) -> str:
    phone = phone.strip().replace(" ", "")
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233"):
        phone = "0" + phone[3:]
    return phone


def initiate_momo_charge(email_placeholder: str, amount: float, phone: str, provider: str) -> dict:
    provider_code = PROVIDER_MAP.get(provider.lower(), provider.lower())
    phone = _normalize_phone(phone)

    if not settings.paystack_configured():
        ref = f"MOCK-{uuid.uuid4().hex[:12]}"
        return {
            "status": True,
            "mock": True,
            "data": {
                "reference": ref,
                "status": "pay_offline",
                "display_text": "Approve the payment prompt on your phone to complete checkout.",
                "gateway_response": "Awaiting customer authorization on device (mock)",
            },
        }

    url = f"{settings.PAYSTACK_BASE_URL}/charge"
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": email_placeholder,  # Paystack requires an email field; a placeholder is fine
        "amount": int(round(amount * 100)),  # pesewas
        "currency": "GHS",
        "mobile_money": {"phone": phone, "provider": provider_code},
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, headers=headers, json=payload)
        return resp.json()


def submit_otp(reference: str, otp: str) -> dict:
    if not settings.paystack_configured():
        return {"status": True, "mock": True, "data": {"reference": reference, "status": "success"}}

    url = f"{settings.PAYSTACK_BASE_URL}/charge/submit_otp"
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"otp": otp, "reference": reference}
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, headers=headers, json=payload)
        return resp.json()


def verify_transaction(reference: str) -> dict:
    if not settings.paystack_configured():
        return {"status": True, "mock": True, "data": {"reference": reference, "status": "success"}}

    url = f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{reference}"
    headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, headers=headers)
        return resp.json()
