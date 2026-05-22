"""
Shared rate limiter for Jobble Baby API
All API route modules import limiter from here to use @limiter.limit() decorators.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Single shared limiter instance — uses client IP for rate limit keying
# For multi-instance production: replace with Redis storage backend
limiter = Limiter(key_func=get_remote_address)

# Rate limit constants
DEFAULT_RATE = "30/minute"   # General API endpoints
AUTH_RATE = "10/minute"     # Auth endpoints (login, register) — stricter
EXEMPT = None               # Health check endpoints — no rate limit