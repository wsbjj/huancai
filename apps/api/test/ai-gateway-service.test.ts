import test from "node:test";
import assert from "node:assert/strict";

const dataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test("builds GetGoAPI Gemini payload with Apifox camelCase image fields", async () => {
  process.env.AI_GATEWAY_HTTP_URL = "https://example.com/generateContent";
  process.env.AI_GATEWAY_HTTP_PAYLOAD_MODE = "gemini-generate-content";

  const { aiGatewayService } = await import("../src/services/ai-gateway-service.js");
  let capturedBody = "";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    capturedBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ url: "https://example.com/generated.png" }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  };

  try {
    await aiGatewayService.generate({
      resultId: "result-1",
      categoryId: "c15",
      originalPhotoId: "photo-1",
      imageUrl: dataUrl,
      garmentImageBase64: dataUrl,
      instruction: "test prompt"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const payload = JSON.parse(capturedBody) as {
    contents: Array<{
      role?: string;
      parts: Array<Record<string, unknown>>;
    }>;
  };

  assert.equal(payload.contents[0].role, "user");
  assert.deepEqual(Object.keys(payload.contents[0].parts[0]), ["inlineData"]);
  assert.deepEqual(Object.keys(payload.contents[0].parts[0].inlineData as object), [
    "mimeType",
    "data"
  ]);
});
