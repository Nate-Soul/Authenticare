import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "../../src/shared/crypto/tokens.js";

describe("email token crypto", () => {
  it("hash of the raw token matches the stored hash and is not the raw token", () => {
    const { token, hash } = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
  });
});
