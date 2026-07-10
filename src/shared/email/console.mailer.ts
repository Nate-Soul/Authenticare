import type { Mailer, MailMessage } from "./types.js";
import { logger } from "../utils/logger.js";

export class ConsoleMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    logger.info({ to: msg.to, subject: msg.subject }, `[ConsoleMailer] email\n${msg.text ?? msg.html}`);
  }
}
