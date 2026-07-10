import { env } from "../../config/env.js";
import type { Mailer } from "./types.js";
import { ConsoleMailer } from "./console.mailer.js";

let mailer: Mailer;
if (env.MAIL_DRIVER === "smtp") {
  const { SmtpMailer } = await import("./smtp.mailer.js");
  mailer = new SmtpMailer();
} else {
  mailer = new ConsoleMailer();
}
export { mailer };
export type { Mailer, MailMessage } from "./types.js";
export { verifyEmailTemplate, passwordResetTemplate } from "./templates.js";
