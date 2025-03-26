import { Resend } from 'resend';
import { generateInviteEmailContent } from '@/utils/emailTemplates';
import type { Role } from '@/types/permissions';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    hasApiKey: !!process.env.RESEND_API_KEY
  });

  try {
    const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
    // Use Resend's default domain for testing
    const emailFrom = 'onboarding@resend.dev';
    
    console.log('📤 Sending email with config:', {
      from: emailFrom,
      to: email,
      subject: `Join ${projectName} as ${roleDisplay}`,
    });

    const result = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `Join ${projectName} as ${roleDisplay}`,
      html: generateInviteEmailContent(role, inviteUrl, projectName),
    });

    console.log('✅ Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Email send error:', {
      error: error.message,
      code: error.code,
      name: error.name,
      statusCode: error.statusCode,
    });
    throw error;
  }
}
