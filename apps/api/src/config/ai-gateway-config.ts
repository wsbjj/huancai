import "dotenv/config";

type AiGatewayPayloadMode =
  | "generic"
  | "openai-images"
  | "openai-images-edit"
  | "nano-banana-generate-content"
  | "gemini-image-generation-native"
  | "fal-nanobanana2-edit";

type AiGatewayConfig = {
  includeDataUrls: boolean;
  http: {
    url?: string;
    fallbackUrls: string[];
    method: "POST" | "PUT";
    timeoutMs: number;
    payloadMode: AiGatewayPayloadMode;
    apiKey?: string;
    authHeader: string;
    authPrefix: string;
    resultUrlPaths: string[];
    resultBase64Paths: string[];
    openaiImages: {
      model: string;
      n: number;
      size?: string;
      quality?: string;
      background?: string;
    };
    fal: {
      numImages: number;
      pollIntervalMs: number;
      pollTimeoutMs: number;
      resultPathTemplate: string;
    };
    gemini: {
      maxInputImages: number;
      imageSize?: string;
      numberOfImages: number;
    };
  };
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = parseInteger(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

const parseStringList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const list = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return list.length > 0 ? list : fallback;
};

const resolveHttpUrls = (): { primaryUrl?: string; fallbackUrls: string[] } => {
  const explicitPrimary = process.env.AI_GATEWAY_HTTP_URL?.trim();
  const listedUrls = parseStringList(process.env.AI_GATEWAY_HTTP_URLS, []);
  const listedPrimary = listedUrls[0];
  const primaryUrl = explicitPrimary || listedPrimary;
  const listedFallbacks = explicitPrimary ? listedUrls : listedUrls.slice(1);
  const configuredFallbacks = parseStringList(process.env.AI_GATEWAY_HTTP_URL_FALLBACKS, []);

  const fallbackUrls = Array.from(
    new Set(
      [...listedFallbacks, ...configuredFallbacks]
        .map((entry) => entry.trim())
        .filter((entry) => Boolean(entry) && entry !== primaryUrl)
    )
  );

  return {
    primaryUrl: primaryUrl || undefined,
    fallbackUrls
  };
};

const resolvePayloadMode = (): AiGatewayPayloadMode => {
  const raw = process.env.AI_GATEWAY_HTTP_PAYLOAD_MODE?.trim().toLowerCase();
  if (raw === "nano-banana-generate-content" || raw === "gemini-generate-content") {
    return "nano-banana-generate-content";
  }
  if (raw === "gemini-image-generation-native") {
    return "gemini-image-generation-native";
  }
  if (raw === "fal-nanobanana2-edit") {
    return "fal-nanobanana2-edit";
  }
  if (raw === "openai-images-edit") {
    return "openai-images-edit";
  }
  return raw === "openai-images" ? "openai-images" : "generic";
};

const resolvedHttpUrls = resolveHttpUrls();

export const aiGatewayConfig: AiGatewayConfig = {
  includeDataUrls: parseBoolean(process.env.AI_GATEWAY_INCLUDE_DATA_URLS, true),
  http: {
    url: resolvedHttpUrls.primaryUrl,
    fallbackUrls: resolvedHttpUrls.fallbackUrls,
    method: process.env.AI_GATEWAY_HTTP_METHOD?.trim().toUpperCase() === "PUT" ? "PUT" : "POST",
    timeoutMs: parseInteger(process.env.AI_GATEWAY_HTTP_TIMEOUT_MS, 120000),
    payloadMode: resolvePayloadMode(),
    apiKey: process.env.AI_GATEWAY_HTTP_API_KEY?.trim(),
    authHeader: process.env.AI_GATEWAY_HTTP_AUTH_HEADER?.trim() || "Authorization",
    authPrefix: process.env.AI_GATEWAY_HTTP_AUTH_PREFIX?.trim() || "Bearer",
    resultUrlPaths: parseStringList(process.env.AI_GATEWAY_HTTP_RESULT_URL_PATHS, [
      "generatedImageUrl",
      "data.url",
      "data.0.url",
      "images.0.url",
      "result.url",
      "url",
      "output.url"
    ]),
    resultBase64Paths: parseStringList(process.env.AI_GATEWAY_HTTP_RESULT_BASE64_PATHS, [
      "generatedImageBase64",
      "data.b64_json",
      "data.0.b64_json",
      "result.base64",
      "imageBase64",
      "output.base64"
    ]),
    openaiImages: {
      model: process.env.AI_GATEWAY_OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
      n: parsePositiveInteger(process.env.AI_GATEWAY_OPENAI_IMAGE_N, 1),
      size: process.env.AI_GATEWAY_OPENAI_IMAGE_SIZE?.trim() || undefined,
      quality: process.env.AI_GATEWAY_OPENAI_IMAGE_QUALITY?.trim() || undefined,
      background: process.env.AI_GATEWAY_OPENAI_IMAGE_BACKGROUND?.trim() || undefined
    },
    fal: {
      numImages: Math.min(
        parsePositiveInteger(process.env.AI_GATEWAY_FAL_NUM_IMAGES, 1),
        4
      ),
      pollIntervalMs: parsePositiveInteger(
        process.env.AI_GATEWAY_FAL_POLL_INTERVAL_MS,
        1500
      ),
      pollTimeoutMs: parsePositiveInteger(
        process.env.AI_GATEWAY_FAL_POLL_TIMEOUT_MS,
        120000
      ),
      resultPathTemplate:
        process.env.AI_GATEWAY_FAL_RESULT_PATH_TEMPLATE?.trim() ||
        "/fal-ai/auto/requests/{request_id}"
    },
    gemini: {
      maxInputImages: parsePositiveInteger(
        process.env.AI_GATEWAY_GEMINI_MAX_INPUT_IMAGES,
        3
      ),
      imageSize: process.env.AI_GATEWAY_GEMINI_IMAGE_SIZE?.trim() || undefined,
      numberOfImages: parsePositiveInteger(
        process.env.AI_GATEWAY_GEMINI_NUMBER_OF_IMAGES,
        1
      )
    }
  }
};

export const aiGatewayPublicInfo = {
  mode: "http",
  includeDataUrls: aiGatewayConfig.includeDataUrls,
  http: {
    enabled: true,
    hasUrl: Boolean(aiGatewayConfig.http.url),
    hasFallbackUrls: aiGatewayConfig.http.fallbackUrls.length > 0,
    endpointCount:
      (aiGatewayConfig.http.url ? 1 : 0) +
      aiGatewayConfig.http.fallbackUrls.length,
    hasApiKey: Boolean(aiGatewayConfig.http.apiKey),
    timeoutMs: aiGatewayConfig.http.timeoutMs,
    payloadMode: aiGatewayConfig.http.payloadMode,
    falNumImages:
      aiGatewayConfig.http.payloadMode === "fal-nanobanana2-edit"
        ? aiGatewayConfig.http.fal.numImages
        : undefined,
    geminiMaxInputImages:
      aiGatewayConfig.http.payloadMode === "nano-banana-generate-content"
        ? aiGatewayConfig.http.gemini.maxInputImages
        : undefined,
    geminiImageSize:
      aiGatewayConfig.http.payloadMode === "gemini-image-generation-native"
        ? aiGatewayConfig.http.gemini.imageSize
        : undefined,
    geminiNumberOfImages:
      aiGatewayConfig.http.payloadMode === "gemini-image-generation-native"
        ? aiGatewayConfig.http.gemini.numberOfImages
        : undefined,
    openaiImageModel:
      aiGatewayConfig.http.payloadMode === "openai-images"
        ? aiGatewayConfig.http.openaiImages.model
        : undefined
  }
};
