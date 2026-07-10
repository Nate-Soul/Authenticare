import { queue } from "../index.js";
import { mailer, type MailMessage } from "../../email/index.js";

export const SEND_EMAIL_JOB = "send-email";
export type SendEmailPayload = MailMessage;

export function registerSendEmailJob(): void {
  queue.process(SEND_EMAIL_JOB, async (payload) => {
    await mailer.send(payload as SendEmailPayload);
  });
}

export async function enqueueEmail(payload: SendEmailPayload): Promise<void> {
  await queue.enqueue(SEND_EMAIL_JOB, payload);
}
