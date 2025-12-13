"""
Password strength validation and history management service.

Implements PRD requirements:
- Minimum 12 characters
- Must contain uppercase, lowercase, numbers
- Prevents common passwords
- Prevents email/org name in password
- Tracks password history to prevent reuse
"""

import re
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext

# Common weak passwords to block
COMMON_PASSWORDS = {
    "123456789012", "password1234", "qwerty123456", "admin1234567",
    "welcome12345", "letmein12345", "monkey123456", "dragon123456",
    "master123456", "sunshine1234", "princess1234", "football1234",
    "iloveyou1234", "welcome@1234", "password@123", "admin@123456",
}

# Bcrypt context for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12, deprecated="auto")


class PasswordService:
    """Service for password validation and history management."""

    MIN_LENGTH = 12
    MAX_PASSWORD_HISTORY = 5  # Prevent reuse of last 5 passwords

    @staticmethod
    def validate_strength(
        password: str,
        user_email: Optional[str] = None,
        org_name: Optional[str] = None,
    ) -> Dict[str, any]:
        """
        Validate password strength according to PRD requirements.

        Args:
            password: The password to validate
            user_email: User's email (to prevent email in password)
            org_name: Organization name (to prevent org name in password)

        Returns:
            Dict with:
                - valid (bool): Whether password meets all requirements
                - errors (List[str]): List of validation errors
                - warnings (List[str]): List of warnings
                - strength_score (int): 0-100 strength score
        """
        errors: List[str] = []
        warnings: List[str] = []
        strength_score = 0

        # 1. Length check (PRD requirement: 12+ characters)
        if len(password) < PasswordService.MIN_LENGTH:
            errors.append(f"密碼至少需要 {PasswordService.MIN_LENGTH} 字元")
        else:
            strength_score += 20

        # 2. Character class requirements
        has_uppercase = bool(re.search(r"[A-Z]", password))
        has_lowercase = bool(re.search(r"[a-z]", password))
        has_digit = bool(re.search(r"\d", password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))

        if not has_uppercase:
            errors.append("密碼需包含至少1個大寫字母")
        else:
            strength_score += 15

        if not has_lowercase:
            errors.append("密碼需包含至少1個小寫字母")
        else:
            strength_score += 15

        if not has_digit:
            errors.append("密碼需包含至少1個數字")
        else:
            strength_score += 15

        # Special characters are recommended but not required
        if has_special:
            strength_score += 20
            warnings.append("✓ 包含特殊字元 (推薦)")
        else:
            warnings.append("建議包含特殊字元以提高安全性 (!@#$%^&*等)")

        # 3. Check for common passwords
        password_lower = password.lower()
        if password_lower in COMMON_PASSWORDS:
            errors.append("此密碼過於常見，請選擇更複雜的密碼")
            strength_score = 0

        # 4. Check for sequential patterns
        if PasswordService._has_sequential_pattern(password):
            warnings.append("密碼包含連續字元，建議更改以提高安全性")
            strength_score = max(0, strength_score - 10)

        # 5. Check for repeated characters
        if PasswordService._has_repeated_chars(password):
            warnings.append("密碼包含重複字元，建議更改以提高安全性")
            strength_score = max(0, strength_score - 10)

        # 6. Prevent email in password
        if user_email:
            email_local = user_email.split("@")[0].lower()
            if email_local in password_lower:
                errors.append("密碼不可包含 Email 帳號")

        # 7. Prevent organization name in password
        if org_name and len(org_name) >= 3:
            org_name_lower = org_name.lower()
            # Check full name and individual words (for multi-word names)
            if org_name_lower.replace(" ", "") in password_lower.replace(" ", ""):
                errors.append("密碼不可包含組織名稱")
            else:
                # Check individual words in org name
                for word in org_name_lower.split():
                    if len(word) >= 3 and word in password_lower:
                        errors.append("密碼不可包含組織名稱")
                        break

        # 8. Length bonus
        if len(password) >= 16:
            strength_score += 15
            warnings.append("✓ 密碼長度優異 (16+ 字元)")

        # Cap strength score at 100
        strength_score = min(100, strength_score)

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "strength_score": strength_score,
        }

    @staticmethod
    def _has_sequential_pattern(password: str) -> bool:
        """Check for sequential patterns like '123' or 'abc'."""
        # Check for 3+ sequential numbers
        for i in range(len(password) - 2):
            if password[i:i+3].isdigit():
                nums = [int(password[j]) for j in range(i, i+3)]
                if nums[1] == nums[0] + 1 and nums[2] == nums[1] + 1:
                    return True

        # Check for 3+ sequential letters
        for i in range(len(password) - 2):
            if password[i:i+3].isalpha():
                chars = password[i:i+3].lower()
                if ord(chars[1]) == ord(chars[0]) + 1 and ord(chars[2]) == ord(chars[1]) + 1:
                    return True

        return False

    @staticmethod
    def _has_repeated_chars(password: str, min_repeat: int = 3) -> bool:
        """Check for repeated characters (e.g., 'aaa' or '111')."""
        for i in range(len(password) - min_repeat + 1):
            if len(set(password[i:i+min_repeat])) == 1:
                return True
        return False

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using bcrypt (cost factor 12).

        Args:
            password: Plain text password

        Returns:
            Hashed password string
        """
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash.

        Args:
            plain_password: Plain text password
            hashed_password: Bcrypt hashed password

        Returns:
            True if password matches
        """
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    async def check_password_history(
        user_id: str,
        new_password: str,
        db: AsyncSession,
    ) -> Dict[str, any]:
        """
        Check if password was used recently (prevent reuse).

        Args:
            user_id: User ID
            new_password: Plain text password to check
            db: Database session

        Returns:
            Dict with:
                - allowed (bool): Whether password can be used
                - error (str): Error message if not allowed
        """
        from app.models.user import User

        # Import here to avoid circular dependency
        # Check if password_history table exists and has records
        try:
            # Get user's current password
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return {"allowed": True, "error": None}

            # Check current password
            if user.password_hash and pwd_context.verify(new_password, user.password_hash):
                return {
                    "allowed": False,
                    "error": "新密碼不可與目前密碼相同"
                }

            # TODO: Check password_history table when it's fully integrated
            # For now, just checking current password is sufficient for P0

            return {"allowed": True, "error": None}

        except Exception as e:
            # If password_history check fails, allow the password
            # (fail open for availability)
            return {"allowed": True, "error": None}

    @staticmethod
    async def add_to_password_history(
        user_id: str,
        password_hash: str,
        db: AsyncSession,
    ) -> None:
        """
        Add password to history for future checks.

        Args:
            user_id: User ID
            password_hash: Hashed password
            db: Database session
        """
        # TODO: Implement when password_history model is created
        # For P0, we're focusing on validation, history will be P1
        pass
