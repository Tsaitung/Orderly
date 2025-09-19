"""
Security Utilities for SKU Management
Provides input validation, sanitization, and security checks
"""
import re
import html
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import hashlib
import secrets
from datetime import datetime, timedelta
import os

class SecurityValidator:
    """Validates and sanitizes input data for security"""
    
    # Patterns for detecting potential security threats
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)",
        r"(--|#|/\*|\*/)",
        r"(\bOR\b.*=.*)",
        r"(\bAND\b.*=.*)",
        r"(';|\")",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
        r"<object[^>]*>.*?</object>",
    ]
    
    @classmethod
    def validate_sql_safe(cls, value: str) -> bool:
        """Check if input is safe from SQL injection"""
        if not value:
            return True
        
        value_lower = value.lower()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return False
        return True
    
    @classmethod
    def validate_xss_safe(cls, value: str) -> bool:
        """Check if input is safe from XSS attacks"""
        if not value:
            return True
        
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                return False
        return True
    
    @classmethod
    def sanitize_html(cls, value: str) -> str:
        """Escape HTML special characters"""
        return html.escape(value) if value else ""
    
    @classmethod
    def validate_sku_code(cls, sku_code: str) -> bool:
        """Validate SKU code format"""
        # SKU code should only contain alphanumeric, dash, underscore
        pattern = r"^[A-Z0-9\-_]+$"
        return bool(re.match(pattern, sku_code))
    
    @classmethod
    def validate_price(cls, price: float) -> bool:
        """Validate price is within reasonable bounds"""
        return 0 < price < 1000000  # Max 1 million
    
    @classmethod
    def validate_quantity(cls, quantity: int) -> bool:
        """Validate quantity is within reasonable bounds"""
        return 0 <= quantity < 1000000  # Max 1 million

class RateLimiter:
    """Rate limiting for API endpoints"""
    
    def __init__(self):
        self.requests = {}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = datetime.now()
    
    def check_rate_limit(
        self, 
        identifier: str, 
        max_requests: int = 100, 
        window_seconds: int = 60
    ) -> bool:
        """Check if request is within rate limits"""
        
        current_time = datetime.now()
        
        # Cleanup old entries periodically
        if (current_time - self.last_cleanup).seconds > self.cleanup_interval:
            self._cleanup_old_entries(current_time)
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove requests outside the window
        cutoff_time = current_time - timedelta(seconds=window_seconds)
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > cutoff_time
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(current_time)
        return True
    
    def _cleanup_old_entries(self, current_time: datetime):
        """Remove old entries from memory"""
        cutoff_time = current_time - timedelta(minutes=10)
        
        for identifier in list(self.requests.keys()):
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > cutoff_time
            ]
            
            if not self.requests[identifier]:
                del self.requests[identifier]
        
        self.last_cleanup = current_time

class TokenManager:
    """Secure token generation and validation"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate API key with prefix"""
        debug = os.getenv("DEBUG", "False").lower() == "true"
        prefix = "sk_live_" if not debug else "sk_test_"
        token = secrets.token_hex(24)
        return f"{prefix}{token}"
    
    @staticmethod
    def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
        """Hash sensitive data using SHA-256"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        combined = f"{salt}{data}"
        hashed = hashlib.sha256(combined.encode()).hexdigest()
        return f"{salt}${hashed}"
    
    @staticmethod
    def verify_hashed_data(data: str, hashed_value: str) -> bool:
        """Verify data against hashed value"""
        try:
            salt, hash_part = hashed_value.split('$')
            combined = f"{salt}{data}"
            computed_hash = hashlib.sha256(combined.encode()).hexdigest()
            return computed_hash == hash_part
        except:
            return False

def validate_and_sanitize_sku_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize SKU input data"""
    
    validator = SecurityValidator()
    sanitized = {}
    
    # Validate SKU code
    if 'sku_code' in data:
        if not validator.validate_sku_code(data['sku_code']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid SKU code format"
            )
        if not validator.validate_sql_safe(data['sku_code']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid characters in SKU code"
            )
        sanitized['sku_code'] = data['sku_code'].upper()
    
    # Validate and sanitize product name
    if 'product_name' in data:
        if not validator.validate_xss_safe(data['product_name']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid characters in product name"
            )
        sanitized['product_name'] = validator.sanitize_html(data['product_name'])
    
    # Validate price
    if 'price' in data:
        if not validator.validate_price(data['price']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price must be positive and within reasonable bounds"
            )
        sanitized['price'] = round(float(data['price']), 2)
    
    # Validate quantity
    if 'min_order_quantity' in data:
        if not validator.validate_quantity(data['min_order_quantity']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be within reasonable bounds"
            )
        sanitized['min_order_quantity'] = int(data['min_order_quantity'])
    
    # Copy other safe fields
    safe_fields = ['category_id', 'unit', 'status']
    for field in safe_fields:
        if field in data:
            sanitized[field] = data[field]
    
    return sanitized

# Rate limiter instance
rate_limiter = RateLimiter()