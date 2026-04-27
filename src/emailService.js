import emailjs from "@emailjs/browser";

// TODO: Replace these with your EmailJS credentials
// 1. Sign up at https://www.emailjs.com/
// 2. Add a Gmail service (or other email service)
// 3. Create an email template with variables: {{to_email}}, {{subject}}, {{message}}
// 4. Copy your Service ID, Template ID, and Public Key below

const SERVICE_ID = "YOUR_SERVICE_ID";
const TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const PUBLIC_KEY = "YOUR_PUBLIC_KEY";

export function sendEmail(toEmail, subject, message) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      subject: subject,
      message: message,
    },
    PUBLIC_KEY
  );
}
