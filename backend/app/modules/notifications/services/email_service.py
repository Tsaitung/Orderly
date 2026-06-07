"""
Email 發送服務

支援：
- SMTP 郵件發送
- OTP 驗證碼郵件模板
- 異步發送
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import structlog

logger = structlog.get_logger()


class EmailService:
    """Email 發送服務"""

    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_tls: bool = False,
        from_address: str = "noreply@orderly.tw",
        from_name: str = "井然 Orderly"
    ):
        """
        初始化 Email 服務

        Args:
            smtp_host: SMTP 伺服器位址
            smtp_port: SMTP 端口
            smtp_user: SMTP 用戶名（可選）
            smtp_password: SMTP 密碼（可選）
            smtp_tls: 是否使用 TLS
            from_address: 寄件人 Email
            from_name: 寄件人名稱
        """
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.smtp_tls = smtp_tls
        self.from_address = from_address
        self.from_name = from_name

    async def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        user_name: Optional[str] = None,
        purpose: str = "驗證"
    ) -> bool:
        """
        發送 OTP 驗證碼郵件

        Args:
            to_email: 收件人 Email
            otp_code: 6 位數 OTP 驗證碼
            user_name: 用戶名稱（可選）
            purpose: OTP 用途（例如：註冊、重設密碼）

        Returns:
            是否成功發送
        """
        # 郵件主旨
        subject = f"井然 Orderly - {purpose}驗證碼"

        # 郵件內容（HTML 格式）
        html_body = self._create_otp_email_html(
            otp_code=otp_code,
            user_name=user_name,
            purpose=purpose
        )

        # 純文字版本（備用）
        text_body = self._create_otp_email_text(
            otp_code=otp_code,
            user_name=user_name,
            purpose=purpose
        )

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        發送 Email

        Args:
            to_email: 收件人 Email
            subject: 郵件主旨
            html_body: HTML 郵件內容
            text_body: 純文字郵件內容（備用）

        Returns:
            是否成功發送
        """
        try:
            # 創建郵件
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{self.from_name} <{self.from_address}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            # 添加純文字版本
            if text_body:
                msg.attach(MIMEText(text_body, "plain", "utf-8"))

            # 添加 HTML 版本
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            # 連接 SMTP 伺服器並發送
            if self.smtp_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)

            # 登入（如果需要）
            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)

            # 發送郵件
            server.send_message(msg)
            server.quit()

            logger.info(
                "email_sent_successfully",
                to_email=to_email,
                subject=subject
            )

            return True

        except Exception as e:
            logger.error(
                "email_send_failed",
                to_email=to_email,
                subject=subject,
                error=str(e)
            )
            return False

    def _create_otp_email_html(
        self,
        otp_code: str,
        user_name: Optional[str],
        purpose: str
    ) -> str:
        """創建 OTP 郵件的 HTML 內容"""
        greeting = f"您好 {user_name}，" if user_name else "您好，"

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>井然 Orderly - 驗證碼</title>
</head>
<body style="font-family: 'Noto Sans TC', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #A47864 0%, #8B6B5E 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">井然 Orderly</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">供應鏈數位化平台</p>
    </div>

    <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">{greeting}</p>

        <p style="font-size: 16px; margin-bottom: 30px;">
            您的 <strong>{purpose}</strong> 驗證碼為：
        </p>

        <div style="background: #f5f5f5; border: 2px solid #A47864; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #A47864; font-family: 'Courier New', monospace;">
                {otp_code}
            </div>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>注意事項：</strong>
        </p>
        <ul style="font-size: 14px; color: #666; line-height: 1.8;">
            <li>此驗證碼將在 <strong>10 分鐘</strong>後失效</li>
            <li>您有 <strong>5 次</strong>輸入機會</li>
            <li>請勿將此驗證碼透露給任何人</li>
            <li>如果這不是您本人的操作，請忽略此郵件</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            此為系統自動發送的郵件，請勿直接回覆<br>
            © 2025 井然 Orderly. All rights reserved.
        </p>
    </div>
</body>
</html>
"""

    def _create_otp_email_text(
        self,
        otp_code: str,
        user_name: Optional[str],
        purpose: str
    ) -> str:
        """創建 OTP 郵件的純文字內容"""
        greeting = f"您好 {user_name}，" if user_name else "您好，"

        return f"""
{greeting}

您的 {purpose} 驗證碼為：

{otp_code}

注意事項：
- 此驗證碼將在 10 分鐘後失效
- 您有 5 次輸入機會
- 請勿將此驗證碼透露給任何人
- 如果這不是您本人的操作，請忽略此郵件

---
此為系統自動發送的郵件，請勿直接回覆
© 2025 井然 Orderly. All rights reserved.
"""


# 從環境變數創建全域 EmailService 實例
def create_email_service() -> EmailService:
    """從環境變數創建 EmailService 實例"""
    return EmailService(
        smtp_host=os.getenv("SMTP_HOST", "localhost"),
        smtp_port=int(os.getenv("SMTP_PORT", "1025")),
        smtp_user=os.getenv("SMTP_USER"),
        smtp_password=os.getenv("SMTP_PASSWORD"),
        smtp_tls=os.getenv("SMTP_TLS", "false").lower() == "true",
        from_address=os.getenv("EMAIL_FROM_ADDRESS", "noreply@orderly.tw"),
        from_name=os.getenv("EMAIL_FROM_NAME", "井然 Orderly")
    )
