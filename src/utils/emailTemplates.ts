import type { Role } from "@/types/permissions";

const roleDescriptions: Record<Role, string> = {
  OWNER: "Full control over the project, including managing team members, deleting the project, and all other actions.",
  MANAGER: "Ability to manage tasks, invite team members, and oversee project progress.",
  MEMBER: "Access to view tasks and participate in the project workflow.",
};

const permissionsList: Record<Role, string[]> = {
  OWNER: [
    "View all project content",
    "Create and edit tasks",
    "Delete tasks and content",
    "Manage project settings",
    "Invite team members",
    "Approve member requests",
    "Delete the project",
  ],
  MANAGER: [
    "View all project content",
    "Create and edit tasks",
    "Manage project settings",
    "Invite team members",
  ],
  MEMBER: [
    "View all project content",
    "View and track tasks",
  ],
};

export function generateInviteEmailContent(
  role: Role,
  inviteUrl: string,
  projectName: string
): string {
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background: green;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 16px 0;
        }
        .permissions-list {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
          margin: 16px 0;
        }
        .footer {
          color: #6b7280;
          font-size: 14px;
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>You've Been Invited! 🎉</h2>
          <p>You've been invited to join <strong>${projectName}</strong> as a <strong>${roleDisplay}</strong>.</p>
        </div>

        <p>${roleDescriptions[role]}</p>

        <div class="permissions-list">
          <h3>As a ${roleDisplay}, you'll be able to:</h3>
          <ul>
            ${permissionsList[role].map(perm => `<li>${perm}</li>`).join('')}
          </ul>
        </div>

        <a href="${inviteUrl}" class="button">Accept Invitation</a>

        <p>This invitation will expire in 24 hours for security reasons.</p>

        <div class="footer">
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          <p>For security reasons, please don't forward this email to anyone.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}