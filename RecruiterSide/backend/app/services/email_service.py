"""Email Notification Service."""
from typing import Optional
from app.config import settings


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
):
    """
    Send email notification.
    In production, uses SMTP. For development, logs to console.
    """
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart("alternative")
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "plain"))
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            return True
        except Exception as e:
            print(f"Email send failed: {e}")
            return False
    else:
        # Dev mode — just log
        print(f"📧 [DEV EMAIL] To: {to_email} | Subject: {subject}")
        print(f"   Body: {body[:200]}")
        return True


async def notify_shortlisted(student_email: str, student_name: str, job_title: str, company: str):
    """Send shortlist notification to student."""
    subject = f"Congratulations! You've been shortlisted for {job_title}"
    body = (
        f"Dear {student_name},\n\n"
        f"We are pleased to inform you that you have been shortlisted for the position "
        f"of {job_title} at {company}.\n\n"
        f"Our team was impressed with your profile and would like to move forward "
        f"with the next steps of the recruitment process.\n\n"
        f"You will receive further details about the interview schedule shortly.\n\n"
        f"Best regards,\n{company} Recruitment Team"
    )
    await send_email(student_email, subject, body)


async def notify_interview_scheduled(
    student_email: str,
    student_name: str,
    job_title: str,
    scheduled_at: str,
    mode: str,
    meeting_link: Optional[str] = None,
):
    """Send interview schedule notification."""
    subject = f"Interview Scheduled: {job_title}"
    body = (
        f"Dear {student_name},\n\n"
        f"Your interview for the position of {job_title} has been scheduled.\n\n"
        f"📅 Date & Time: {scheduled_at}\n"
        f"📍 Mode: {mode}\n"
    )
    if meeting_link:
        body += f"🔗 Meeting Link: {meeting_link}\n"
    body += (
        f"\nPlease ensure you are available at the scheduled time. "
        f"If you need to reschedule, please contact us.\n\n"
        f"Good luck!"
    )
    await send_email(student_email, subject, body)
