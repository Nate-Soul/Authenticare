interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export function verifyEmailTemplate(link: string): Rendered {
  return {
    subject: "Verify your email",
    text: `Welcome! Confirm your email: ${link}\nThis link expires in 24 hours.`,
    html: `<p>Welcome!</p><p><a href="${link}">Confirm your email</a></p><p>This link expires in 24 hours.</p>`,
  };
}

export function passwordResetTemplate(link: string): Rendered {
  return {
    subject: "Reset your password",
    text: `Reset your password: ${link}\nThis link expires in 1 hour. Ignore if you didn't request it.`,
    html: `<p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour. Ignore if you didn't request it.</p>`,
  };
}
