import stripe
from ..utils.env_getters import env

stripe.api_key = env("STRIPE_SECRET_KEY", default="")