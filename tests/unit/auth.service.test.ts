import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { FakeUserRepository } from "./fakes/FakeUserRepository.js";
import { AppError } from "../../src/shared/utils/AppError.js";

describe("AuthService", () => {
  let repo: FakeUserRepository;
  let service: AuthService;

  const validInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    password: "Str0ngPassw0rd",
  };

  beforeEach(() => {
    repo = new FakeUserRepository();
    service = new AuthService(repo);
  });

  it("registers a new user and returns tokens without exposing the password hash", async () => {
    const { user, tokens } = await service.register(validInput);
    expect(user.email).toBe("ada@example.com");
    expect(user).not.toHaveProperty("password");
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  it("rejects registration with a duplicate email", async () => {
    await service.register(validInput);
    await expect(service.register(validInput)).rejects.toThrow(AppError);
  });

  it("does not mutate the stored password hash on unrelated profile updates (regression test)", async () => {
    const { user } = await service.register(validInput);
    const before = await repo.findById(user.id);

    await repo.update(user.id, { firstName: "Augusta" });

    const after = await repo.findById(user.id);
    expect(after?.password).toBe(before?.password);
    // Login must still succeed with the original password after an unrelated update.
    await expect(service.login({ email: validInput.email, password: validInput.password })).resolves.toBeDefined();
  });

  it("logs in with correct credentials and rejects incorrect ones with the same error", async () => {
    await service.register(validInput);

    await expect(service.login({ email: validInput.email, password: validInput.password })).resolves.toBeDefined();

    await expect(
      service.login({ email: validInput.email, password: "wrong-password" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      service.login({ email: "nobody@example.com", password: validInput.password }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rotates the refresh token and rejects reuse of the old one", async () => {
    const { user, tokens } = await service.register(validInput);

    const rotated = await service.refresh(tokens.refreshToken);
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

    // Reusing the original (now-stale) refresh token must fail.
    await expect(service.refresh(tokens.refreshToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // The rotated token still works.
    await expect(service.refresh(rotated.refreshToken)).resolves.toBeDefined();
    void user;
  });

  it("logout revokes all outstanding refresh tokens", async () => {
    const { user, tokens } = await service.register(validInput);
    await service.logout(user.id);
    await expect(service.refresh(tokens.refreshToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
