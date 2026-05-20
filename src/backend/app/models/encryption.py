import os
import base64
import hashlib
from cryptography.fernet import Fernet

# Generates or retrieves master key
_key_str = os.getenv("MASTER_ENCRYPTION_KEY")
_fallback_key = base64.urlsafe_b64encode(b"a_very_secure_fallback_key_32_ch")

if _key_str:
    try:
        _key_bytes = _key_str.encode()
        # If it's a valid 44-character base64 URL-safe key
        if len(_key_bytes) == 44 and _key_str.endswith("="):
            cipher_suite = Fernet(_key_bytes)
        else:
            # Derive 32-byte key using SHA-256 to ensure validity
            derived_key = base64.urlsafe_b64encode(hashlib.sha256(_key_bytes).digest())
            cipher_suite = Fernet(derived_key)
    except Exception:
        cipher_suite = Fernet(_fallback_key)
else:
    cipher_suite = Fernet(_fallback_key)


def encrypt_key(plain_text: str) -> str:
    """Encrypt a plain text API key to base64 encrypted string."""
    if not plain_text:
        return ""
    encrypted_bytes = cipher_suite.encrypt(plain_text.encode())
    return encrypted_bytes.decode()


def decrypt_key(encrypted_text: str) -> str:
    """Decrypt an encrypted API key back to plain text."""
    if not encrypted_text:
        return ""
    decrypted_bytes = cipher_suite.decrypt(encrypted_text.encode())
    return decrypted_bytes.decode()
