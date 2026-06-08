"""Auth social-only route contract tests."""

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.main import app
from app.modules.users.api.v1.oauth import (
    PLATFORM_AUTH_ALLOWED_IPS_ENV,
    OAuthCompleteRegistrationRequest,
    _client_ip_allowed_for_platform,
    _record_platform_failed_attempt,
)


def _paths() -> set[str]:
    return {getattr(route, "path", "") for route in app.routes}


def test_password_and_email_auth_routes_are_not_mounted() -> None:
    paths = _paths()
    removed_paths = {
        "/api/auth/login",
        "/auth/login",
        "/api/auth/register",
        "/auth/register",
        "/api/auth/forgot-password",
        "/auth/forgot-password",
        "/api/auth/reset-password",
        "/auth/reset-password",
        "/api/auth/verify-email",
        "/auth/verify-email",
        "/api/auth/send-email-verification",
        "/auth/send-email-verification",
        "/api/invitations/accept",
        "/invitations/accept",
    }

    assert paths.isdisjoint(removed_paths)


def test_social_auth_recovery_and_platform_provisioning_routes_are_mounted() -> None:
    paths = _paths()
    expected_paths = {
        "/api/auth/oauth/{provider}/initiate",
        "/api/auth/oauth/{provider}/callback",
        "/api/auth/oauth/complete-registration",
        "/api/auth/oauth/link",
        "/api/auth/oauth/{provider}/unlink",
        "/api/auth/oauth/linked-accounts",
        "/api/auth/oauth/recover",
        "/api/auth/account-recovery",
        "/api/auth/admin/platform-provisioning",
        "/api/auth/mfa/verify",
    }

    assert expected_paths.issubset(paths)


def test_complete_registration_requires_server_ticket() -> None:
    with pytest.raises(ValidationError):
        OAuthCompleteRegistrationRequest(
            provider="line",
            provider_user_id="forged-provider-id",
            organization_name="Org",
            organization_type="supplier",
        )

    request = OAuthCompleteRegistrationRequest(
        provider="line",
        registration_ticket="ticket-with-enough-entropy",
        organization_name="Org",
        organization_type="supplier",
    )
    assert request.registration_ticket == "ticket-with-enough-entropy"


def test_platform_ip_allowlist_is_required_outside_local(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv(PLATFORM_AUTH_ALLOWED_IPS_ENV, raising=False)
    assert _client_ip_allowed_for_platform("127.0.0.1") is False

    monkeypatch.setenv(PLATFORM_AUTH_ALLOWED_IPS_ENV, "203.0.113.0/24")
    assert _client_ip_allowed_for_platform("203.0.113.10") is True
    assert _client_ip_allowed_for_platform("198.51.100.10") is False

    monkeypatch.setenv(PLATFORM_AUTH_ALLOWED_IPS_ENV, "*")
    assert _client_ip_allowed_for_platform("203.0.113.10") is False


def test_platform_failed_attempt_locks_on_third_attempt() -> None:
    user = SimpleNamespace(failed_login_attempts=0, locked_until=None)

    assert _record_platform_failed_attempt(user) is False
    assert _record_platform_failed_attempt(user) is False
    assert _record_platform_failed_attempt(user) is True
    assert user.failed_login_attempts == 3
    assert user.locked_until is not None
