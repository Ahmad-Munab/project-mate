import { Resend } from 'resend';
import { generateInviteEmailContent } from '@/utils/emailTemplates';
import type { Role } from '@/types/permissions';

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
const resend = new Resend(apiKey);

export async function sendInviteEmail({
  email,
  role,
  inviteUrl,
  projectName,
}: {
  email: string;
  role: Role;
  inviteUrl: string;
  projectName: string;
}) {
  console.log('📧 Starting email send process...');
  console.log('📝 Email details:', {
    to: email,
    projectName,
    role,
    hasApiKey: !!apiKey,
    apiKeyFirstChars: apiKey ? `${apiKey.substring(0, 5)}...` : 'none'
  });

  try {
    const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();

    // Use Resend's default domain for testing or custom domain if configured
    // Note: EMAIL_FORM might be a typo in .env, should be EMAIL_FROM
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_FORM || 'onboarding@resend.dev';
    console.log(`📤 Using email sender: ${emailFrom}`);
    console.log('Environment variables:', {
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_FORM: process.env.EMAIL_FORM, // Possible typo in .env
    });

    // Generate email content
    const htmlContent = generateInviteEmailContent(role, inviteUrl, projectName);
    console.log('📄 Generated email HTML content (length):', htmlContent.length);

    console.log('📤 Sending email with config:', {
      from: emailFrom,
      to: email,
      subject: `Join ${projectName} as ${roleDisplay}`,
    });

    // Detailed logging before API call
    console.log('🔑 Resend API initialized with key:', apiKey ? 'Valid API key' : 'Missing API key');
    console.log('📨 Calling Resend API...');

    const result = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `Join ${projectName} as ${roleDisplay}`,
      html: htmlContent,
    });

    console.log('✅ Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Email send error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      statusCode: error.statusCode,
      stack: error.stack,
    });

    // More detailed error logging
    if (error.response) {
      console.error('❌ API Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    }

    if (!apiKey) {
      console.error('❌ RESEND_API_KEY is missing or invalid');
    }

    throw error;
  }
}
