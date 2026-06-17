import test from "node:test";
import assert from "node:assert/strict";

test("builds Gemini native image generation payload from Apifox documentation", async () => {
  process.env.AI_GATEWAY_HTTP_URL = "https://example.com/generateContent";
  process.env.AI_GATEWAY_HTTP_PAYLOAD_MODE = "gemini-image-generation-native";
  process.env.AI_GATEWAY_GEMINI_IMAGE_SIZE = "2K";
  process.env.AI_GATEWAY_GEMINI_NUMBER_OF_IMAGES = "1";

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
      imageUrl: "unused-for-native-mode",
      instruction: "a studio fashion campaign image",
      aspectRatio: "3:4"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const payload = JSON.parse(capturedBody) as {
    contents: Array<{
      role?: string;
      parts: Array<{ text?: string }>;
    }>;
    generationConfig?: {
      responseModalities?: string[];
      imageConfig?: {
        aspectRatio?: string;
        imageSize?: string;
        numberOfImages?: number;
      };
    };
  };

  assert.equal(payload.contents[0].role, "user");
  assert.deepEqual(payload.contents[0].parts, [
    { text: "a studio fashion campaign image" }
  ]);
  assert.deepEqual(payload.generationConfig, {
    responseModalities: ["IMAGE"],
    imageConfig: {
      aspectRatio: "3:4",
      imageSize: "2K",
      numberOfImages: 1
    }
  });
});
