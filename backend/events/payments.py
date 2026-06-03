"""
Paynow integration (EcoCash / OneMoney express + web checkout for card).

Activated only when PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY are set
(see settings.PAYNOW_ENABLED). Until then the app uses the simulated
instant-paid flow, so nothing breaks.

Docs: https://developers.paynow.co.zw
"""
import re

from django.conf import settings

MOBILE_METHODS = {"ECOCASH": "ecocash", "ONEMONEY": "onemoney"}


def _client():
    from paynow import Paynow
    return Paynow(
        settings.PAYNOW_INTEGRATION_ID,
        settings.PAYNOW_INTEGRATION_KEY,
        settings.PAYNOW_RETURN_URL or None,
        settings.PAYNOW_RESULT_URL or None,
    )


def _normalize_phone(phone):
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("263"):
        d = "0" + d[3:]
    if d and not d.startswith("0"):
        d = "0" + d
    return d[:10]


def initiate(order, method, phone):
    """
    Start a Paynow payment. Returns a dict the API hands back to the frontend:
      {success, mode, redirect_url?, poll_url?, instructions?, error?}
    """
    try:
        pn = _client()
        payment = pn.create_payment(
            order.reference, order.buyer_email or "noreply@ticketboy.co.zw"
        )
        payment.add(f"Ticketboy: {order.event.title}", float(order.total))

        if method in MOBILE_METHODS and phone:
            resp = pn.send_mobile(payment, _normalize_phone(phone), MOBILE_METHODS[method])
            return {
                "success": bool(resp.success), "mode": "mobile",
                "poll_url": getattr(resp, "poll_url", ""),
                "instructions": getattr(resp, "instructions", ""),
                "error": None if resp.success else getattr(resp, "error", "Payment failed"),
            }
        resp = pn.send(payment)
        return {
            "success": bool(resp.success), "mode": "web",
            "redirect_url": getattr(resp, "redirect_url", ""),
            "poll_url": getattr(resp, "poll_url", ""),
            "error": None if resp.success else getattr(resp, "error", "Payment failed"),
        }
    except Exception as exc:  # never 500 the checkout on a gateway hiccup
        return {"success": False, "error": str(exc)}


def is_paid(order):
    if not order.poll_url:
        return False
    try:
        status = _client().check_transaction_status(order.poll_url)
        return bool(getattr(status, "paid", False))
    except Exception:
        return False
