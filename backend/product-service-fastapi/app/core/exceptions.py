"""
Custom exception classes for the application
"""


class BaseAppException(Exception):
    """Base exception class for application-specific errors"""
    def __init__(self, message: str = "An error occurred"):
        self.message = message
        super().__init__(self.message)


class NotFoundError(BaseAppException):
    """Raised when a requested resource is not found"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message)


class ValidationError(BaseAppException):
    """Raised when data validation fails"""
    def __init__(self, message: str = "Validation error"):
        super().__init__(message)


class DuplicateError(BaseAppException):
    """Raised when attempting to create a duplicate resource"""
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message)


class DatabaseError(BaseAppException):
    """Raised when database operations fail"""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message)


class AuthenticationError(BaseAppException):
    """Raised when authentication fails"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class AuthorizationError(BaseAppException):
    """Raised when authorization fails"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(message)