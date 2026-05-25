import os
import json
import sqlite3
import urllib.request
import urllib.error
from dotenv import load_dotenv

# Search for the .env file in multiple logical paths
env_paths = [".env", "src/backend/.env", "../.env"]
env_loaded = False
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(path)
        env_loaded = True
        print(f"Loaded environment variables from: {path}")
        break

if not env_loaded:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")
    print("Please ensure they are defined in your .env file.")
    exit(1)

# Connect to local SQLite DB
sqlite_db_paths = ["geotracker.db", "src/backend/geotracker.db", "../geotracker.db"]
sqlite_db_path = None
for path in sqlite_db_paths:
    if os.path.exists(path):
        sqlite_db_path = path
        break

if not sqlite_db_path:
    print("Error: Could not locate SQLite database file geotracker.db")
    exit(1)

print(f"Connecting to SQLite database: {sqlite_db_path}")
conn = sqlite3.connect(sqlite_db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    cursor.execute("SELECT * FROM provider_configs")
    rows = cursor.fetchall()
except sqlite3.OperationalError as e:
    print(f"Error reading provider_configs table from SQLite: {e}")
    conn.close()
    exit(1)

if not rows:
    print("No provider configurations found in local SQLite database.")
    conn.close()
    exit(1)

print(f"Found {len(rows)} provider configurations in local SQLite. Preparing to migrate to Supabase...")

configs_to_migrate = []
for row in rows:
    config_dict = dict(row)
    # SQLite represents booleans as 0 or 1. Convert to true/false for PostgreSQL/JSON
    if "is_active" in config_dict:
        config_dict["is_active"] = bool(config_dict["is_active"])
    configs_to_migrate.append(config_dict)

# Supabase REST API URL for provider_configs table
supabase_endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/provider_configs"
payload = json.dumps(configs_to_migrate).encode("utf-8")

# ─── AUTO-SIGN JWT LOCALLY AS FAILOVER FOR STANDARD PostgREST ───
signed_jwt = None
try:
    import jwt
    # Sign a secure service_role JWT locally using SUPABASE_SECRET_KEY as the HMAC secret
    # This bypasses RLS and satisfies standard PostgREST token expectations.
    payload_jwt = {
        "role": "service_role",
        "iss": "supabase",
        "aud": "authenticated",
        "exp": 2032212000  # Year 2034
    }
    signed_jwt = jwt.encode(payload_jwt, SUPABASE_SECRET_KEY, algorithm="HS256")
    if isinstance(signed_jwt, bytes):
        signed_jwt = signed_jwt.decode("utf-8")
    print("🔑 Success: Locally signed a secure service_role JWT using your SUPABASE_SECRET_KEY.")
except Exception as jwt_err:
    print(f"⚠️ Warning: Could not sign JWT locally ({jwt_err}). Proceeding to fallback header configurations...")

# List of authentication header configurations to try
auth_configs = []

if signed_jwt:
    auth_configs.append({
        "name": "Standard PostgREST JWT (Signed with JWT Secret, using Publishable APIKey)",
        "headers": {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {signed_jwt}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
    })
    auth_configs.append({
        "name": "Standard PostgREST JWT (Signed with JWT Secret, using Secret APIKey)",
        "headers": {
            "apikey": SUPABASE_SECRET_KEY,
            "Authorization": f"Bearer {signed_jwt}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
    })

# Fallbacks for shorter non-JWT keys
auth_configs.append({
    "name": "Raw Secret Key as apikey (no Bearer)",
    "headers": {
        "apikey": SUPABASE_SECRET_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
})
auth_configs.append({
    "name": "Raw Publishable Key as apikey (no Bearer)",
    "headers": {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
})
auth_configs.append({
    "name": "Raw Secret Key in Bearer (original configuration)",
    "headers": {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
})

success = False
for idx, config in enumerate(auth_configs):
    print(f"\n[Attempt {idx+1}/{len(auth_configs)}] Trying: {config['name']}...")
    
    req = urllib.request.Request(
        supabase_endpoint,
        data=payload,
        headers=config["headers"],
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            if status_code in (200, 201, 204):
                print(f"🎉 Success! Migration completed using strategy: {config['name']}.")
                success = True
                break
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"❌ Failed (Status {e.code}): {e.reason}")
        print(f"   Details: {err_body}")
    except Exception as err:
        print(f"❌ Connection error: {err}")

conn.close()

if success:
    print(f"\n🎉 migration complete! Successfully saved {len(configs_to_migrate)} configurations to Supabase DB.")
else:
    print("\n❌ All migration strategies failed.")
    print("Please double check that:")
    print("1. Your SUPABASE_URL, SUPABASE_KEY, and SUPABASE_SECRET_KEY are correct.")
    print("2. The 'provider_configs' table has been created in your Supabase SQL Editor.")
