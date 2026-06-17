import test from "node:test";
import assert from "node:assert/strict";

import { resolveUploadMaxFileSizeBytes } from "../src/config/upload-config.js";

test("uses 10MB when upload max file size env is missing", () => {
  assert.equal(resolveUploadMaxFileSizeBytes({}), 10 * 1024 * 1024);
});

test("uses UPLOAD_MAX_FILE_SIZE_MB when provided", () => {
  assert.equal(
    resolveUploadMaxFileSizeBytes({ UPLOAD_MAX_FILE_SIZE_MB: "25" }),
    25 * 1024 * 1024
  );
});

test("rejects invalid UPLOAD_MAX_FILE_SIZE_MB values", () => {
  assert.throws(
    () => resolveUploadMaxFileSizeBytes({ UPLOAD_MAX_FILE_SIZE_MB: "0" }),
    /UPLOAD_MAX_FILE_SIZE_MB/
  );
});
