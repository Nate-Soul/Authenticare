import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "../../src/shared/crypto/tokens.js";
import { ConsoleMailer } from "../../src/shared/email/console.mailer.js";
import { verifyEmailTemplate } from "../../src/shared/email/templates.js";

describe("email token crypto", () => {
  it("hash of the raw token matches the stored hash and is not the raw token", () => {
    const { token, hash } = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
  });
});

describe("ConsoleMailer + templates", () => {
  it("sends without throwing and template contains the link", async () => {
    const mailer = new ConsoleMailer();
    const tpl = verifyEmailTemplate("http://x/verify?token=abc");
    expect(tpl.html).toContain("http://x/verify?token=abc");
    await expect(
      mailer.send({ to: "a@b.com", subject: tpl.subject, html: tpl.html, text: tpl.text }),
    ).resolves.toBeUndefined();
  });
});
