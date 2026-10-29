import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@ecommerce.com",
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};
