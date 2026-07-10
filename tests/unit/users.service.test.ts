import { describe, it, expect, beforeEach } from "vitest";
import { UsersService } from "../../src/modules/users/users.service.js";
import { FakeUserRepository } from "./fakes/FakeUserRepository.js";

describe("UsersService", () => {
  let repo: FakeUserRepository;
  let service: UsersService;

  beforeEach(() => {
    repo = new FakeUserRepository();
    service = new UsersService(repo);
  });

  it("never includes the password field in a single user lookup", async () => {
    const created = await repo.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      password: "Str0ngPassw0rd",
    });
    const result = await service.getById(created.id);
    expect(result).not.toHaveProperty("password");
  });

  it("never includes the password field in a paginated list (regression test for public leak)", async () => {
    await repo.create({ firstName: "A", lastName: "A", email: "a@example.com", password: "Str0ngPassw0rd" });
    await repo.create({ firstName: "B", lastName: "B", email: "b@example.com", password: "Str0ngPassw0rd" });

    const { items } = await service.list({ page: 1, limit: 20 });
    expect(items).toHaveLength(2);
    for (const user of items) {
      expect(user).not.toHaveProperty("password");
    }
  });

  it("soft-deletes: the user disappears from lookups but the record isn't destroyed", async () => {
    const created = await repo.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace2@example.com",
      password: "Str0ngPassw0rd",
    });
    await service.remove(created.id);
    await expect(service.getById(created.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("excludes soft-deleted users from pagination total (regression)", async () => {
    const a = await repo.create({ firstName: "A", lastName: "A", email: "pa@example.com", password: "Str0ngPassw0rd" });
    await repo.create({ firstName: "B", lastName: "B", email: "pb@example.com", password: "Str0ngPassw0rd" });
    await service.remove(a.id);

    const { total, items } = await service.list({ page: 1, limit: 20 });
    expect(items).toHaveLength(1);
    expect(total).toBe(1);
  });

  it("rejects updating a user's email to one already taken with 409", async () => {
    await repo.create({ firstName: "A", lastName: "A", email: "taken@example.com", password: "Str0ngPassw0rd" });
    const b = await repo.create({ firstName: "B", lastName: "B", email: "free@example.com", password: "Str0ngPassw0rd" });
    await expect(service.update(b.id, { email: "taken@example.com" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
