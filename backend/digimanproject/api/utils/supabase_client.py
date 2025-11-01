import os
from supabase import create_client, Client
from ...digimanproject.settings import env

SUPABASE_URL: str = env("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = env("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
