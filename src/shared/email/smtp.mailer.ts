import nodemailer, { type Transporter } from "nodemailer";
import type { Mailer, MailMessage } from "./types.js";
import { env } from "../../config/env.js";

// Bound every phase of the SMTP conversation so an unreachable or slow server
// (e.g. a blocked outbound port) fails fast instead of hanging the queue worker.
const SMTP_TIMEOUT_MS = 10_000;

export class SmtpMailer implements Mailer {
  private transporter: Transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }
  async send(msg: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
  }
}
