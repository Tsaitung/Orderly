"""
Unit tests for PasswordService.

Tests password strength validation according to PRD requirements.
"""

import pytest
from app.services.password_service import PasswordService


class TestPasswordStrength:
    """Test password strength validation."""

    def test_valid_strong_password(self):
        """Test that a strong password passes validation."""
        result = PasswordService.validate_strength("SecurePass123!")

        assert result["valid"] is True
        assert len(result["errors"]) == 0
        assert result["strength_score"] >= 70

    def test_password_too_short(self):
        """Test that password under 12 characters fails."""
        result = PasswordService.validate_strength("Short1!")

        assert result["valid"] is False
        assert any("12 字元" in error for error in result["errors"])

    def test_password_minimum_length(self):
        """Test that exactly 12 character password with requirements passes."""
        result = PasswordService.validate_strength("Password123!")

        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_missing_uppercase(self):
        """Test that password without uppercase fails."""
        result = PasswordService.validate_strength("password1234!")

        assert result["valid"] is False
        assert any("大寫字母" in error for error in result["errors"])

    def test_missing_lowercase(self):
        """Test that password without lowercase fails."""
        result = PasswordService.validate_strength("PASSWORD1234!")

        assert result["valid"] is False
        assert any("小寫字母" in error for error in result["errors"])

    def test_missing_digit(self):
        """Test that password without digits fails."""
        result = PasswordService.validate_strength("PasswordOnly!")

        assert result["valid"] is False
        assert any("數字" in error for error in result["errors"])

    def test_common_password_blocked(self):
        """Test that common passwords are blocked."""
        result = PasswordService.validate_strength("password1234")

        assert result["valid"] is False
        assert any("過於常見" in error for error in result["errors"])

    def test_password_contains_email(self):
        """Test that password containing email is rejected."""
        result = PasswordService.validate_strength(
            "MyEmail123test@example.com",
            user_email="test@example.com"
        )

        assert result["valid"] is False
        assert any("Email" in error for error in result["errors"])

    def test_password_contains_org_name(self):
        """Test that password containing org name is rejected."""
        result = PasswordService.validate_strength(
            "OrderlyPlatform123!",
            org_name="Orderly Platform"
        )

        assert result["valid"] is False
        assert any("組織名稱" in error for error in result["errors"])

    def test_sequential_pattern_warning(self):
        """Test that sequential patterns generate warnings."""
        result = PasswordService.validate_strength("Password123456!")

        # Should still pass but with warning
        assert result["valid"] is True
        assert any("連續字元" in warning for warning in result["warnings"])

    def test_repeated_chars_warning(self):
        """Test that repeated characters generate warnings."""
        result = PasswordService.validate_strength("Passwordaaa123!")

        # Should still pass but with warning
        assert result["valid"] is True
        assert any("重複字元" in warning for warning in result["warnings"])

    def test_long_password_bonus(self):
        """Test that 16+ character passwords get bonus score."""
        short_result = PasswordService.validate_strength("Password123!")
        long_result = PasswordService.validate_strength("VeryLongPassword123!")

        assert long_result["strength_score"] > short_result["strength_score"]
        assert any("16+ 字元" in warning for warning in long_result["warnings"])

    def test_special_characters_bonus(self):
        """Test that special characters increase strength score."""
        no_special = PasswordService.validate_strength("Password1234")
        with_special = PasswordService.validate_strength("Password123!")

        assert with_special["strength_score"] > no_special["strength_score"]

    def test_multiple_errors(self):
        """Test that multiple validation errors are reported."""
        result = PasswordService.validate_strength("short")

        # Should fail on multiple criteria
        assert result["valid"] is False
        assert len(result["errors"]) >= 3  # length, uppercase, numbers


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password(self):
        """Test that password hashing works."""
        password = "SecurePassword123!"
        hashed = PasswordService.hash_password(password)

        assert hashed != password
        assert len(hashed) > 50  # Bcrypt hashes are long
        assert hashed.startswith("$2b$")  # Bcrypt format

    def test_verify_correct_password(self):
        """Test that correct password verifies."""
        password = "SecurePassword123!"
        hashed = PasswordService.hash_password(password)

        assert PasswordService.verify_password(password, hashed) is True

    def test_verify_incorrect_password(self):
        """Test that incorrect password fails verification."""
        password = "SecurePassword123!"
        hashed = PasswordService.hash_password(password)

        assert PasswordService.verify_password("WrongPassword123!", hashed) is False

    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)."""
        password = "SecurePassword123!"
        hash1 = PasswordService.hash_password(password)
        hash2 = PasswordService.hash_password(password)

        assert hash1 != hash2  # Different due to salt
        assert PasswordService.verify_password(password, hash1) is True
        assert PasswordService.verify_password(password, hash2) is True


class TestPasswordHistory:
    """Test password history checking."""

    @pytest.mark.asyncio
    async def test_check_password_history_no_user(self):
        """Test password history check with non-existent user."""
        from unittest.mock import AsyncMock, MagicMock

        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))

        result = await PasswordService.check_password_history(
            user_id="non-existent",
            new_password="NewPassword123!",
            db=db
        )

        assert result["allowed"] is True
        assert result["error"] is None

    @pytest.mark.asyncio
    async def test_check_password_history_same_as_current(self):
        """Test that reusing current password is blocked."""
        from unittest.mock import AsyncMock, MagicMock

        # Create mock user with hashed password
        current_password = "CurrentPassword123!"
        hashed = PasswordService.hash_password(current_password)

        # Create a simple mock object instead of User model instance
        mock_user = MagicMock()
        mock_user.id = "test-user"
        mock_user.email = "test@example.com"
        mock_user.password_hash = hashed

        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_user)))

        result = await PasswordService.check_password_history(
            user_id="test-user",
            new_password=current_password,  # Same as current
            db=db
        )

        assert result["allowed"] is False
        assert "相同" in result["error"]


@pytest.mark.parametrize("password,expected_valid,expected_errors_count", [
    ("Aa1!", False, 1),  # Too short
    ("Aa1!Aa1!Aa1!", True, 0),  # Valid minimum
    ("VerySecurePassword123!", True, 0),  # Strong password
    ("alllowercase123!", False, 1),  # Missing uppercase
    ("ALLUPPERCASE123!", False, 1),  # Missing lowercase
    ("NoNumbersHere!", False, 1),  # Missing digit
    ("123456789012", False, 2),  # Missing letters (common password)
    ("password1234", False, 2),  # Common + length
])
def test_password_validation_matrix(password, expected_valid, expected_errors_count):
    """Matrix test for various password combinations."""
    result = PasswordService.validate_strength(password)

    assert result["valid"] == expected_valid
    assert len(result["errors"]) >= expected_errors_count
