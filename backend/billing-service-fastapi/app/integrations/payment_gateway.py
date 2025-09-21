"""
Payment Gateway integration for Taiwan market (ECPay, NewebPay)
"""
import hashlib
import hmac
import base64
import json
import aiohttp
import structlog
from typing import Dict, Any, Optional
from datetime import datetime
import os
from urllib.parse import urlencode

logger = structlog.get_logger()


class PaymentGateway:
    """
    Payment gateway integration for Taiwan market
    Supports ECPay and NewebPay payment processors
    """
    
    def __init__(self):
        # ECPay configuration
        self.ecpay_merchant_id = os.getenv("ECPAY_MERCHANT_ID", "")
        self.ecpay_hash_key = os.getenv("ECPAY_HASH_KEY", "")
        self.ecpay_hash_iv = os.getenv("ECPAY_HASH_IV", "")
        self.ecpay_base_url = os.getenv("ECPAY_BASE_URL", "https://payment-stage.ecpay.com.tw")
        
        # NewebPay configuration
        self.newebpay_merchant_id = os.getenv("NEWEBPAY_MERCHANT_ID", "")
        self.newebpay_hash_key = os.getenv("NEWEBPAY_HASH_KEY", "")
        self.newebpay_hash_iv = os.getenv("NEWEBPAY_HASH_IV", "")
        self.newebpay_base_url = os.getenv("NEWEBPAY_BASE_URL", "https://ccore.newebpay.com")
        
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    async def process_payment(self, payment_data: Dict[str, Any], gateway: str = "ecpay") -> Dict[str, Any]:
        """
        Process payment through specified gateway
        """
        try:
            logger.info("Processing payment", 
                       payment_id=payment_data.get("payment_id"),
                       gateway=gateway,
                       amount=payment_data.get("amount"))
            
            if gateway.lower() == "ecpay":
                return await self._process_ecpay_payment(payment_data)
            elif gateway.lower() == "newebpay":
                return await self._process_newebpay_payment(payment_data)
            else:
                raise ValueError(f"Unsupported payment gateway: {gateway}")
                
        except Exception as e:
            logger.error("Payment processing failed", 
                        payment_id=payment_data.get("payment_id"),
                        error=str(e))
            return {"status": "failed", "error": str(e)}
    
    async def _process_ecpay_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process payment through ECPay
        """
        try:
            # Prepare ECPay payment parameters
            params = {
                "MerchantID": self.ecpay_merchant_id,
                "MerchantTradeNo": payment_data["payment_id"],
                "MerchantTradeDate": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
                "PaymentType": "aio",
                "TotalAmount": int(payment_data["amount"]),
                "TradeDesc": payment_data.get("description", "Orderly Platform Commission"),
                "ItemName": payment_data.get("item_name", "Platform Commission Fee"),
                "ReturnURL": payment_data.get("return_url", ""),
                "ChoosePayment": "Credit",  # Credit card payment
                "EncryptType": 1
            }
            
            # Generate ECPay check mac value
            params["CheckMacValue"] = self._generate_ecpay_mac(params)
            
            # Send payment request
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.ecpay_base_url}/Cashier/AioCheckOut/V5"
                
                async with session.post(url, data=params) as response:
                    if response.status == 200:
                        result = await response.text()
                        
                        # Parse ECPay response
                        if "1|OK" in result:
                            logger.info("ECPay payment successful", 
                                       payment_id=payment_data["payment_id"])
                            return {
                                "status": "success",
                                "gateway": "ecpay",
                                "transaction_id": params["MerchantTradeNo"],
                                "response": result
                            }
                        else:
                            logger.error("ECPay payment failed", 
                                        payment_id=payment_data["payment_id"],
                                        response=result)
                            return {
                                "status": "failed",
                                "gateway": "ecpay",
                                "error": result
                            }
                    else:
                        logger.error("ECPay API error", 
                                    status=response.status)
                        return {
                            "status": "failed",
                            "gateway": "ecpay",
                            "error": f"HTTP {response.status}"
                        }
                        
        except Exception as e:
            logger.error("ECPay payment processing error", error=str(e))
            return {"status": "failed", "gateway": "ecpay", "error": str(e)}
    
    async def _process_newebpay_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process payment through NewebPay
        """
        try:
            # Prepare NewebPay payment parameters
            trade_info = {
                "MerchantID": self.newebpay_merchant_id,
                "MerchantOrderNo": payment_data["payment_id"],
                "TimeStamp": int(datetime.now().timestamp()),
                "Version": "2.0",
                "Amt": int(payment_data["amount"]),
                "ItemDesc": payment_data.get("description", "Orderly Platform Commission"),
                "Email": payment_data.get("email", ""),
                "LoginType": 0,
                "CREDIT": 1,  # Enable credit card payment
                "ReturnURL": payment_data.get("return_url", ""),
                "NotifyURL": payment_data.get("notify_url", ""),
                "ClientBackURL": payment_data.get("client_back_url", "")
            }
            
            # Encrypt trade info
            trade_info_encrypted = self._encrypt_newebpay_data(trade_info)
            
            params = {
                "MerchantID": self.newebpay_merchant_id,
                "TradeInfo": trade_info_encrypted,
                "TradeSha": self._generate_newebpay_sha(trade_info_encrypted),
                "Version": "2.0"
            }
            
            # Send payment request
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.newebpay_base_url}/MPG/mpg_gateway"
                
                async with session.post(url, data=params) as response:
                    if response.status == 200:
                        result = await response.text()
                        
                        logger.info("NewebPay payment initiated", 
                                   payment_id=payment_data["payment_id"])
                        return {
                            "status": "pending",
                            "gateway": "newebpay",
                            "transaction_id": payment_data["payment_id"],
                            "response": result
                        }
                    else:
                        logger.error("NewebPay API error", 
                                    status=response.status)
                        return {
                            "status": "failed",
                            "gateway": "newebpay",
                            "error": f"HTTP {response.status}"
                        }
                        
        except Exception as e:
            logger.error("NewebPay payment processing error", error=str(e))
            return {"status": "failed", "gateway": "newebpay", "error": str(e)}
    
    async def verify_payment_callback(self, callback_data: Dict[str, Any], gateway: str) -> Dict[str, Any]:
        """
        Verify payment callback from gateway
        """
        try:
            logger.info("Verifying payment callback", 
                       gateway=gateway,
                       transaction_id=callback_data.get("transaction_id"))
            
            if gateway.lower() == "ecpay":
                return self._verify_ecpay_callback(callback_data)
            elif gateway.lower() == "newebpay":
                return self._verify_newebpay_callback(callback_data)
            else:
                raise ValueError(f"Unsupported payment gateway: {gateway}")
                
        except Exception as e:
            logger.error("Payment callback verification failed", error=str(e))
            return {"valid": False, "error": str(e)}
    
    def _verify_ecpay_callback(self, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify ECPay payment callback
        """
        try:
            # Extract and verify CheckMacValue
            check_mac = callback_data.pop("CheckMacValue", "")
            expected_mac = self._generate_ecpay_mac(callback_data)
            
            if check_mac.upper() == expected_mac.upper():
                return {
                    "valid": True,
                    "status": callback_data.get("RtnCode"),
                    "message": callback_data.get("RtnMsg"),
                    "transaction_id": callback_data.get("MerchantTradeNo"),
                    "trade_no": callback_data.get("TradeNo"),
                    "amount": callback_data.get("TradeAmt")
                }
            else:
                logger.error("ECPay callback MAC verification failed")
                return {"valid": False, "error": "MAC verification failed"}
                
        except Exception as e:
            logger.error("ECPay callback verification error", error=str(e))
            return {"valid": False, "error": str(e)}
    
    def _verify_newebpay_callback(self, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify NewebPay payment callback
        """
        try:
            # Decrypt and verify TradeInfo
            trade_info = callback_data.get("TradeInfo", "")
            trade_sha = callback_data.get("TradeSha", "")
            
            # Verify SHA
            expected_sha = self._generate_newebpay_sha(trade_info)
            
            if trade_sha.upper() == expected_sha.upper():
                # Decrypt trade info
                decrypted_data = self._decrypt_newebpay_data(trade_info)
                
                return {
                    "valid": True,
                    "status": decrypted_data.get("Status"),
                    "message": decrypted_data.get("Message"),
                    "transaction_id": decrypted_data.get("MerchantOrderNo"),
                    "trade_no": decrypted_data.get("TradeNo"),
                    "amount": decrypted_data.get("Amt")
                }
            else:
                logger.error("NewebPay callback SHA verification failed")
                return {"valid": False, "error": "SHA verification failed"}
                
        except Exception as e:
            logger.error("NewebPay callback verification error", error=str(e))
            return {"valid": False, "error": str(e)}
    
    async def query_payment_status(self, transaction_id: str, gateway: str) -> Dict[str, Any]:
        """
        Query payment status from gateway
        """
        try:
            logger.info("Querying payment status", 
                       transaction_id=transaction_id,
                       gateway=gateway)
            
            if gateway.lower() == "ecpay":
                return await self._query_ecpay_status(transaction_id)
            elif gateway.lower() == "newebpay":
                return await self._query_newebpay_status(transaction_id)
            else:
                raise ValueError(f"Unsupported payment gateway: {gateway}")
                
        except Exception as e:
            logger.error("Payment status query failed", error=str(e))
            return {"status": "error", "error": str(e)}
    
    async def _query_ecpay_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Query ECPay payment status
        """
        try:
            params = {
                "MerchantID": self.ecpay_merchant_id,
                "MerchantTradeNo": transaction_id,
                "TimeStamp": int(datetime.now().timestamp())
            }
            
            params["CheckMacValue"] = self._generate_ecpay_mac(params)
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.ecpay_base_url}/Cashier/QueryTradeInfo/V5"
                
                async with session.post(url, data=params) as response:
                    if response.status == 200:
                        result = await response.text()
                        # Parse ECPay query response
                        return {"status": "success", "response": result}
                    else:
                        return {"status": "error", "error": f"HTTP {response.status}"}
                        
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _query_newebpay_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Query NewebPay payment status
        """
        try:
            # NewebPay query implementation
            # This would be similar to the payment process but for querying
            return {"status": "pending", "message": "NewebPay query not implemented"}
            
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    # Helper methods for ECPay
    
    def _generate_ecpay_mac(self, params: Dict[str, Any]) -> str:
        """
        Generate ECPay CheckMacValue
        """
        # Sort parameters and create query string
        sorted_params = sorted([(k, v) for k, v in params.items() if k != "CheckMacValue"])
        query_string = urlencode(sorted_params)
        
        # Add hash key and IV
        raw_string = f"HashKey={self.ecpay_hash_key}&{query_string}&HashIV={self.ecpay_hash_iv}"
        
        # URL encode
        raw_string = raw_string.replace("%20", "+")
        
        # Generate MD5 hash
        mac_value = hashlib.md5(raw_string.encode("utf-8")).hexdigest().upper()
        
        return mac_value
    
    # Helper methods for NewebPay
    
    def _encrypt_newebpay_data(self, data: Dict[str, Any]) -> str:
        """
        Encrypt NewebPay trade info
        """
        # Convert data to query string
        query_string = urlencode(data)
        
        # AES encryption (simplified - should use proper AES implementation)
        # For production, use cryptography library
        encoded = base64.b64encode(query_string.encode()).decode()
        
        return encoded
    
    def _decrypt_newebpay_data(self, encrypted_data: str) -> Dict[str, Any]:
        """
        Decrypt NewebPay trade info
        """
        # AES decryption (simplified)
        try:
            decoded = base64.b64decode(encrypted_data).decode()
            # Parse query string back to dict
            from urllib.parse import parse_qs
            result = parse_qs(decoded)
            return {k: v[0] for k, v in result.items()}
        except Exception:
            return {}
    
    def _generate_newebpay_sha(self, trade_info: str) -> str:
        """
        Generate NewebPay TradeSha
        """
        raw_string = f"HashKey={self.newebpay_hash_key}&{trade_info}&HashIV={self.newebpay_hash_iv}"
        sha_value = hashlib.sha256(raw_string.encode("utf-8")).hexdigest().upper()
        
        return sha_value
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Health check for payment gateways
        """
        try:
            health_status = {
                "ecpay": {"status": "unknown", "configured": bool(self.ecpay_merchant_id)},
                "newebpay": {"status": "unknown", "configured": bool(self.newebpay_merchant_id)}
            }
            
            # Test ECPay connectivity
            if self.ecpay_merchant_id:
                try:
                    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                        async with session.get(f"{self.ecpay_base_url}") as response:
                            health_status["ecpay"]["status"] = "healthy" if response.status == 200 else "degraded"
                except:
                    health_status["ecpay"]["status"] = "unhealthy"
            
            # Test NewebPay connectivity
            if self.newebpay_merchant_id:
                try:
                    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                        async with session.get(f"{self.newebpay_base_url}") as response:
                            health_status["newebpay"]["status"] = "healthy" if response.status == 200 else "degraded"
                except:
                    health_status["newebpay"]["status"] = "unhealthy"
            
            return health_status
            
        except Exception as e:
            logger.error("Payment gateway health check failed", error=str(e))
            return {"error": str(e)}