import test from "node:test";
import assert from "node:assert/strict";
import { seedAdmin } from "../src/utils/seedAdmin.js";

function createUserModel(existingUser = null) {
  const calls = { query: null, selected: null, saved: false, created: null };
  class UserModel {
    constructor(values) {
      Object.assign(this, values);
      calls.created = values;
    }
    static findOne(query) {
      calls.query = query;
      return {
        select: async fields => {
          calls.selected = fields;
          return existingUser;
        }
      };
    }
  }
  UserModel.prototype.save = async function save() {
    calls.saved = true;
  };
  return { UserModel, calls };
}

test("admin seeding promotes an existing account and resets its configured password", async () => {
  const existingUser = { email: "admin@example.com", role: "student", password: "old-password", save: async () => { existingUser.saved = true; } };
  const { UserModel, calls } = createUserModel(existingUser);

  const result = await seedAdmin(UserModel, " Admin@Example.com ", "new-secure-password");

  assert.equal(result, existingUser);
  assert.deepEqual(calls.query, { email: "admin@example.com" });
  assert.equal(calls.selected, "+password");
  assert.equal(existingUser.role, "admin");
  assert.equal(existingUser.password, "new-secure-password");
  assert.equal(existingUser.saved, true);
});

test("admin seeding creates a new configured account when none exists", async () => {
  const { UserModel, calls } = createUserModel();

  const result = await seedAdmin(UserModel, "ADMIN@example.com", "new-secure-password");

  assert.deepEqual(calls.created, { name: "UniSphere Admin", email: "admin@example.com" });
  assert.equal(result.role, "admin");
  assert.equal(result.password, "new-secure-password");
  assert.equal(calls.saved, true);
});
