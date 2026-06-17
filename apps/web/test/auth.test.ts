import test from "node:test";
import assert from "node:assert/strict";

import {
  createOperatorSession,
  readOperatorSession,
  clearOperatorSession
} from "../src/lib/auth.js";

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
};

test("operator session trims display name and keeps a stable demo user id", () => {
  const storage = createMemoryStorage();

  const session = createOperatorSession("  云仲  ", storage);

  assert.deepEqual(session, {
    displayName: "云仲",
    userId: "demo-user"
  });
  assert.deepEqual(readOperatorSession(storage), session);
});

test("operator session falls back to default display name when blank", () => {
  const storage = createMemoryStorage();

  assert.equal(createOperatorSession(" ", storage).displayName, "云仲");
});

test("operator session can be cleared", () => {
  const storage = createMemoryStorage();
  createOperatorSession("云仲", storage);

  clearOperatorSession(storage);

  assert.equal(readOperatorSession(storage), undefined);
});
