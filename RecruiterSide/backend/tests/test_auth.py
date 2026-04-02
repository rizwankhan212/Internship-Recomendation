"""Tests for authentication endpoints."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_token


class TestPasswordHashing:
    def test_hash_password(self):
        hashed = hash_password("testpass123")
        assert hashed != "testpass123"
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        hashed = hash_password("testpass123")
        assert verify_password("testpass123", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("testpass123")
        assert verify_password("wrongpass", hashed) is False


class TestJWTTokens:
    def test_create_and_decode_access_token(self):
        data = {"sub": "test@example.com", "role": "admin"}
        token = create_access_token(data)
        assert isinstance(token, str)

        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "test@example.com"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_decode_invalid_token(self):
        result = decode_token("invalid.token.here")
        assert result is None

    def test_token_contains_expiry(self):
        token = create_access_token({"sub": "test@example.com"})
        payload = decode_token(token)
        assert "exp" in payload
