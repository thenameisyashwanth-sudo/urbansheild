"""
WhatsApp notification via Twilio.
Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886)
If not set, notifications are logged but not sent.
"""
import os
import httpx

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def _normalize_phone(phone: str) -> str:
    """Ensure phone has country code for WhatsApp (e.g. +91...)"""
    phone = (phone or "").strip()
    if not phone or phone == "+91XXXXXXXX":
        return ""
    if not phone.startswith("+"):
        if phone.startswith("91") and len(phone) >= 10:
            return f"+{phone}"
        if len(phone) == 10:
            return f"+91{phone}"
    return phone


async def send_whatsapp_to_trusted_contact(phone: str, message: str) -> bool:
    """
    Send WhatsApp message via Twilio. Returns True if sent, False otherwise.
    """
    to = _normalize_phone(phone)
    if not to:
        return False

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[WhatsApp] Credentials not set. Would send to {to}: {message[:80]}...")
        return False

    # Twilio expects To in format whatsapp:+919876543210
    to_whatsapp = f"whatsapp:{to}" if not to.startswith("whatsapp:") else to
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    data = {
        "From": TWILIO_WHATSAPP_FROM,
        "To": to_whatsapp,
        "Body": message,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, auth=auth, data=data)
            if r.status_code in (200, 201):
                return True
            print(f"[WhatsApp] Twilio error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"[WhatsApp] Failed: {e}")
        return False


def format_sos_message(user_name: str, lat: float, lng: float, address: str = "", blood_type: str = "") -> str:
    loc = address or f"{lat:.4f}, {lng:.4f}"
    parts = [
        "🚨 URBANSHIELD SOS ALERT",
        "",
        f"*{user_name}* has triggered an emergency SOS.",
        f"📍 Location: {loc}",
        f"🗺️ Coordinates: https://maps.google.com/?q={lat},{lng}",
    ]
    if blood_type:
        parts.append(f"🩸 Blood type: {blood_type}")
    parts.append("")
    parts.append("Please check on them and contact emergency services (112) if needed.")
    return "\n".join(parts)


def format_deviation_message(user_name: str, lat: float, lng: float, expected_route: str) -> str:
    return "\n".join([
        "⚠️ URBANSHIELD DEVIATION ALERT",
        "",
        f"*{user_name}* has gone off their planned route.",
        f"📍 Last known: {lat:.4f}, {lng:.4f}",
        f"🗺️ Map: https://maps.google.com/?q={lat},{lng}",
        f"📍 Expected route: {expected_route}",
        "",
        "Please check on them.",
    ])
