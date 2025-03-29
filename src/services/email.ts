import { Resend } from "resend";
import { generateInviteEmailContent } from "@/utils/emailTemplates";
import type { Role } from "@/types/permissions";

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
    console.log("📧 Starting email send process...");
    console.log("📝 Email details:", {
        to: email,
        projectName,
        role,
        hasApiKey: !!apiKey,
        apiKeyFirstChars: apiKey ? `${apiKey.substring(0, 5)}...` : "none",
    });

    try {
        const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();

        // IMPORTANT: Use Resend's default domain for testing
        // Gmail domains cannot be verified in Resend, so we must use Resend's domain
        const emailFrom = "onboarding@resend.dev";
        console.log(
            `📤 Using email sender: ${emailFrom} (Resend's default domain)`
        );
        console.log("Environment variables (not used):", {
            EMAIL_FROM: process.env.EMAIL_FROM,
            EMAIL_FORM: process.env.EMAIL_FORM,
        });
        console.log(
            "⚠️ Using Resend's default domain instead of configured domain due to verification requirements"
        );

        // Generate email content
        const htmlContent = generateInviteEmailContent(
            role,
            inviteUrl,
            projectName
        );
        console.log(
            "📄 Generated email HTML content (length):",
            htmlContent.length
        );

        console.log("📤 Sending email with config:", {
            from: emailFrom,
            to: email,
            subject: `Join ${projectName} as ${roleDisplay}`,
        });

        // Detailed logging before API call
        console.log(
            "🔑 Resend API initialized with key:",
            apiKey ? "Valid API key" : "Missing API key"
        );
        console.log("📨 Calling Resend API...");

        const result = await resend.emails.send({
            from: emailFrom,
            to: email,
            subject: `Join ${projectName} as ${roleDisplay}`,
            html: htmlContent,
        });

        console.log("✅ Email sent successfully:", result);
        return result;
    } catch (error) {
        console.error("❌ Email send error:");

        if (!apiKey) {
            console.error("❌ RESEND_API_KEY is missing or invalid");
        }

        throw error;
    }
}
