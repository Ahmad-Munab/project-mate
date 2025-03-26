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
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
  
  return resend.emails.send({
    from: process.env.EMAIL_FROM || 'Kanban <notifications@yourapp.com>',
    to: email,
    subject: `Join ${projectName} as ${roleDisplay}`,
    html: generateInviteEmailContent(role, inviteUrl, projectName),
  });
}
