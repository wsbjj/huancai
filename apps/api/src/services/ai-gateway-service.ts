import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";

import type { GenerateImageRequest } from "@huancai/shared";

import { aiGatewayConfig } from "../config/ai-gateway-config.js";
import { uploadAssetService } from "./upload-asset-service.js";

type GatewayImage = {
  source: string;
  dataUrl?: string;
};

type GeminiInlineData = {
  mimeType: string;
  data: string;
};

type GatewayStage = "request" | "poll";

class GatewayHttpError extends Error {
  readonly status: number;
  readonly endpointUrl: string;
  readonly stage: GatewayStage;
  readonly channelUnavailable: boolean;

  constructor(params: {
    message: string;
    status: number;
    endpointUrl: string;
    stage: GatewayStage;
    channelUnavailable: boolean;
  }) {
    super(params.message);
    this.name = "GatewayHttpError";
    this.status = params.status;
    this.endpointUrl = params.endpointUrl;
    this.stage = params.stage;
    this.channelUnavailable = params.channelUnavailable;
  }
}

export class GatewayInputError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "GatewayInputError";
    this.statusCode = statusCode;
  }
}

const extensionMimeMap: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

const isDataUrl = (value: string): boolean => value.startsWith("data:");

const parseDataUrl = (
  value: string
): { mimeType: string; buffer: Buffer } | undefined => {
  const matched = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!matched) {
    return undefined;
  }

  const mimeType = matched[1];
  const base64 = matched[2];
  return {
    mimeType,
    buffer: Buffer.from(base64, "base64")
  };
};

const saveBase64Image = async (params: {
  base64: string;
  mimeType?: string;
  filename: string;
}): Promise<string> => {
  const mimeType = params.mimeType || "image/png";
  const dataUrlValue = isDataUrl(params.base64)
    ? params.base64
    : `data:${mimeType};base64,${params.base64}`;
  const parsed = parseDataUrl(dataUrlValue);
  if (!parsed) {
    throw new Error("Gateway returned malformed base64 image.");
  }

  return uploadAssetService.saveBuffer({
    buffer: parsed.buffer,
    filename: params.filename,
    mimeType: parsed.mimeType,
    subdirectory: "processed"
  });
};

const ensureUploadPath = (imagePath: string): string => {
  const cleanPath = decodeURIComponent(imagePath.split("?")[0]);
  if (!cleanPath.startsWith("/uploads/")) {
    throw new Error(`Unsupported local image path: ${imagePath}`);
  }

  const relativePath = cleanPath.slice("/uploads/".length);
  const absolutePath = resolve(uploadAssetService.uploadsRoot, relativePath);
  const normalizedRelative = relative(uploadAssetService.uploadsRoot, absolutePath);

  if (
    normalizedRelative.startsWith("..") ||
    isAbsolute(normalizedRelative)
  ) {
    throw new Error(`Blocked file path outside uploads root: ${imagePath}`);
  }

  return absolutePath;
};

const toDataUrl = async (source: string): Promise<string | undefined> => {
  if (!source) {
    return undefined;
  }

  if (isDataUrl(source)) {
    return source;
  }

  if (!source.startsWith("/uploads/")) {
    return undefined;
  }

  const filePath = ensureUploadPath(source);
  const content = await readFile(filePath);
  const mimeType = extensionMimeMap[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  return `data:${mimeType};base64,${content.toString("base64")}`;
};

const normalizeImage = async (value: string | undefined): Promise<GatewayImage | undefined> => {
  if (!value) {
    return undefined;
  }

  const dataUrl = aiGatewayConfig.includeDataUrls ? await toDataUrl(value) : undefined;
  return {
    source: value,
    dataUrl
  };
};

const resolveGatewayImageSource = async (value: string | undefined): Promise<string | undefined> => {
  const normalized = await normalizeImage(value);
  if (!normalized) {
    return undefined;
  }
  return normalized.dataUrl ?? normalized.source;
};

const resolveGeminiInlineData = async (
  value: string | undefined,
  label: string
): Promise<GeminiInlineData | undefined> => {
  if (!value) {
    return undefined;
  }

  const dataUrlValue = isDataUrl(value) ? value : await toDataUrl(value);
  if (!dataUrlValue) {
    throw new GatewayInputError(
      `Gemini 模式要求 ${label} 使用已上传图片或 data URL，当前值无法转换为 inline_data。`
    );
  }

  const parsed = parseDataUrl(dataUrlValue);
  if (!parsed) {
    throw new Error(`Failed to parse ${label} data URL for Gemini payload.`);
  }

  return {
    mimeType: parsed.mimeType,
    data: parsed.buffer.toString("base64")
  };
};

const extractByPath = (input: unknown, path: string): unknown => {
  if (!path) {
    return undefined;
  }

  const tokens = path.match(/[^.[\]]+/g);
  if (!tokens) {
    return undefined;
  }

  let current: unknown = input;
  for (const token of tokens) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isFinite(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[token];
      continue;
    }

    return undefined;
  }

  return current;
};

const extractFirstString = (input: unknown, paths: string[]): string | undefined => {
  for (const path of paths) {
    const value = extractByPath(input, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const isGeminiImageResponseMode = (): boolean =>
  aiGatewayConfig.http.payloadMode === "nano-banana-generate-content" ||
  aiGatewayConfig.http.payloadMode === "gemini-image-generation-native";

const tryResolveGeneratedImageUrl = async (
  payload: unknown
): Promise<string | undefined> => {
  if (isGeminiImageResponseMode()) {
    const geminiInlineImage = extractGeminiInlineImage(payload);
    if (geminiInlineImage) {
      return saveBase64Image({
        base64: geminiInlineImage.data,
        mimeType: geminiInlineImage.mimeType,
        filename: "gemini-inline-data.png"
      });
    }
  }

  const directUrl = extractFirstString(payload, aiGatewayConfig.http.resultUrlPaths);
  if (directUrl) {
    if (isDataUrl(directUrl)) {
      const parsed = parseDataUrl(directUrl);
      if (!parsed) {
        throw new Error("Gateway returned malformed data URL.");
      }
      return uploadAssetService.saveBuffer({
        buffer: parsed.buffer,
        filename: "gateway-data-url.png",
        mimeType: parsed.mimeType,
        subdirectory: "processed"
      });
    }
    return directUrl;
  }

  const base64Image = extractFirstString(payload, aiGatewayConfig.http.resultBase64Paths);
  if (base64Image) {
    return saveBase64Image({
      base64: base64Image,
      filename: "gateway-base64.png"
    });
  }

  return undefined;
};

const resolveGeneratedImageUrl = async (payload: unknown): Promise<string> => {
  const url = await tryResolveGeneratedImageUrl(payload);
  if (url) {
    return url;
  }

  if (isGeminiImageResponseMode()) {
    throw new Error("Gemini 响应未包含可保存图片。");
  }

  throw new Error(
    `Gateway response does not contain image URL/base64. Checked URL paths: ${aiGatewayConfig.http.resultUrlPaths.join(
      ", "
    )}`
  );
};

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (aiGatewayConfig.http.apiKey) {
    headers[aiGatewayConfig.http.authHeader] = `${aiGatewayConfig.http.authPrefix} ${aiGatewayConfig.http.apiKey}`;
  }

  return headers;
};

const resolveOpenAiImageSize = (aspectRatio: string | undefined): string => {
  if (!aspectRatio || aspectRatio === "1:1") {
    return "1024x1024";
  }

  const portraitRatios = new Set(["5:4", "3:4", "9:16"]);
  if (portraitRatios.has(aspectRatio)) {
    return "1024x1536";
  }

  const landscapeRatios = new Set(["4:3", "16:9"]);
  if (landscapeRatios.has(aspectRatio)) {
    return "1536x1024";
  }

  return "1024x1024";
};

const buildGenericPayload = async (request: GenerateImageRequest): Promise<unknown> => {
  return {
    request,
    moduleId: request.categoryId,
    instruction: request.instruction,
    images: {
      main: await normalizeImage(request.imageUrl),
      garment: await normalizeImage(request.garmentImageBase64),
      fabric: await normalizeImage(request.fabricImageBase64),
      innerWear: await normalizeImage(request.innerWearImageBase64),
      background: await normalizeImage(request.backgroundImageBase64)
    },
    options: {
      aspectRatio: request.aspectRatio,
      imageSize: request.imageSize,
      originalWidth: request.originalWidth,
      originalHeight: request.originalHeight,
      useRawPrompt: request.useRawPrompt,
      skipCompress: request.skipCompress
    },
    meta: {
      source: "huancai-api",
      at: new Date().toISOString()
    }
  };
};

const buildOpenAiImagesPayload = (request: GenerateImageRequest): Record<string, unknown> => {
  const config = aiGatewayConfig.http.openaiImages;
  const payload: Record<string, unknown> = {
    model: config.model,
    prompt: request.instruction,
    n: config.n,
    size: config.size ?? resolveOpenAiImageSize(request.aspectRatio)
  };

  if (config.quality) {
    payload.quality = config.quality;
  }
  if (config.background) {
    payload.background = config.background;
  }

  return payload;
};

const buildOpenAiImagesEditPayload = async (
  request: GenerateImageRequest
): Promise<Record<string, unknown>> => {
  const config = aiGatewayConfig.http.openaiImages;
  const mainImage = await resolveGatewayImageSource(request.imageUrl);
  if (!mainImage) {
    throw new Error("Main image is required for openai-images-edit payload.");
  }

  const referenceImage = await resolveGatewayImageSource(request.garmentImageBase64);
  const imageUrls = [mainImage, referenceImage].filter(
    (entry): entry is string => Boolean(entry)
  );

  const payload: Record<string, unknown> = {
    model: config.model,
    prompt: request.instruction,
    n: config.n,
    image_urls: imageUrls
  };

  if (config.size) {
    payload.size = config.size;
  } else if (request.aspectRatio) {
    payload.size = resolveOpenAiImageSize(request.aspectRatio);
  }

  if (config.quality) {
    payload.quality = config.quality;
  }
  if (config.background) {
    payload.background = config.background;
  }

  return payload;
};

const buildFalNanobanana2EditPayload = async (
  request: GenerateImageRequest
): Promise<Record<string, unknown>> => {
  const mainImage = await resolveGatewayImageSource(request.imageUrl);
  if (!mainImage) {
    throw new Error("Main image is required for fal-nanobanana2-edit payload.");
  }

  const referenceImage = await resolveGatewayImageSource(request.garmentImageBase64);
  const imageUrls = [mainImage, referenceImage].filter(
    (entry): entry is string => Boolean(entry)
  );

  return {
    prompt: request.instruction,
    image_urls: imageUrls,
    num_images: aiGatewayConfig.http.fal.numImages
  };
};

const buildNanoBananaGenerateContentPayload = async (
  request: GenerateImageRequest
): Promise<Record<string, unknown>> => {
  const imageEntries = [
    { label: "main image", value: request.imageUrl },
    { label: "garment image", value: request.garmentImageBase64 },
    { label: "fabric image", value: request.fabricImageBase64 },
    { label: "inner wear image", value: request.innerWearImageBase64 },
    { label: "background image", value: request.backgroundImageBase64 }
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry.value));

  if (imageEntries.length === 0) {
    throw new GatewayInputError("Gemini 模式至少需要 1 张输入图片。");
  }

  if (imageEntries.length > aiGatewayConfig.http.gemini.maxInputImages) {
    throw new GatewayInputError(
      `Nano Banana 最佳支持不超过 ${aiGatewayConfig.http.gemini.maxInputImages} 张输入图，当前收到 ${imageEntries.length} 张。请减少输入图数量后重试。`
    );
  }

  const parts: Array<Record<string, unknown>> = await Promise.all(
    imageEntries.map(async (entry) => {
      const inlineData = await resolveGeminiInlineData(entry.value, entry.label);
      if (!inlineData) {
        throw new GatewayInputError(`Gemini 模式缺少可用的 ${entry.label}。`);
      }

      return {
        inlineData: {
          mimeType: inlineData.mimeType,
          data: inlineData.data
        }
      };
    })
  );

  parts.push({
    text: request.instruction
  });

  const generationConfig: Record<string, unknown> = {
    responseModalities: ["IMAGE"]
  };

  if (request.aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: request.aspectRatio
    };
  }

  return {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig
  };
};

const buildGeminiNativeImageGenerationPayload = (
  request: GenerateImageRequest
): Record<string, unknown> => {
  const imageConfig: Record<string, unknown> = {
    numberOfImages: aiGatewayConfig.http.gemini.numberOfImages
  };

  if (request.aspectRatio) {
    imageConfig.aspectRatio = request.aspectRatio;
  }
  if (aiGatewayConfig.http.gemini.imageSize) {
    imageConfig.imageSize = aiGatewayConfig.http.gemini.imageSize;
  }

  return {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: request.instruction
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig
    }
  };
};

const buildGatewayPayload = async (request: GenerateImageRequest): Promise<unknown> => {
  if (aiGatewayConfig.http.payloadMode === "nano-banana-generate-content") {
    return buildNanoBananaGenerateContentPayload(request);
  }

  if (aiGatewayConfig.http.payloadMode === "gemini-image-generation-native") {
    return buildGeminiNativeImageGenerationPayload(request);
  }

  if (aiGatewayConfig.http.payloadMode === "fal-nanobanana2-edit") {
    return buildFalNanobanana2EditPayload(request);
  }

  if (aiGatewayConfig.http.payloadMode === "openai-images-edit") {
    return buildOpenAiImagesEditPayload(request);
  }

  if (aiGatewayConfig.http.payloadMode === "openai-images") {
    return buildOpenAiImagesPayload(request);
  }

  return buildGenericPayload(request);
};

const truncateText = (value: string, maxLength = 320): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const resolveUrlPath = (url: string): string => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "";
  }
};

const looksLikeHtml = (contentType: string, body: string): boolean => {
  if (contentType.includes("text/html")) {
    return true;
  }

  const normalized = body.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
};

const buildEndpointHint = (url: string): string => {
  const path = resolveUrlPath(url);
  if (!path || path === "/") {
    return `AI_GATEWAY_HTTP_URL currently points to site root (${url}). Please use full JSON API endpoint path, e.g. https://your-host/v1/xxx.`;
  }

  return `Please confirm the endpoint returns JSON (not HTML page): ${url}`;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const extractRequestId = (payload: unknown): string | undefined =>
  extractFirstString(payload, [
    "request_id",
    "requestId",
    "data.request_id",
    "data.requestId",
    "result.request_id",
    "result.requestId"
  ]);

const buildFalResultUrl = (
  endpointUrl: string,
  createPayload: unknown
): string | undefined => {
  const directResponseUrl = extractFirstString(createPayload, [
    "response_url",
    "responseUrl",
    "data.response_url",
    "data.responseUrl"
  ]);
  if (directResponseUrl) {
    return directResponseUrl;
  }

  const requestId = extractRequestId(createPayload);
  if (!requestId) {
    return undefined;
  }

  const template =
    aiGatewayConfig.http.fal.resultPathTemplate.includes("{request_id}")
      ? aiGatewayConfig.http.fal.resultPathTemplate
      : "/fal-ai/auto/requests/{request_id}";
  const resolvedPath = template.replaceAll("{request_id}", requestId);
  try {
    return new URL(resolvedPath, endpointUrl).toString();
  } catch {
    return undefined;
  }
};

const extractTaskStatus = (payload: unknown): string | undefined =>
  extractFirstString(payload, ["status", "state", "data.status", "result.status"]);

const statusLooksFailed = (status: string): boolean =>
  /(failed|error|cancel|timeout|aborted)/i.test(status);

const extractGatewayErrorMessage = (payload: unknown): string | undefined => {
  const fromErrorField = extractFirstString(payload, [
    "error.message",
    "error.msg",
    "error.details",
    "message",
    "msg",
    "detail"
  ]);

  if (fromErrorField) {
    return fromErrorField;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return undefined;
};

const parseGatewayErrorPayload = (rawText: string): string | undefined => {
  if (!rawText.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;
    return extractGatewayErrorMessage(parsed);
  } catch {
    return undefined;
  }
};

const isChannelUnavailableErrorMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("no available channel") ||
    (normalized.includes("under group") && normalized.includes("model"))
  );
};

const extractGeminiInlineImage = (payload: unknown): GeminiInlineData | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    return undefined;
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const parts = (candidate as { content?: { parts?: unknown } }).content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (!part || typeof part !== "object") {
        continue;
      }

      if ((part as { thought?: boolean }).thought === true) {
        continue;
      }

      const inlineData =
        (part as { inline_data?: unknown }).inline_data ??
        (part as { inlineData?: unknown }).inlineData;
      if (!inlineData || typeof inlineData !== "object") {
        continue;
      }

      const mimeType =
        (inlineData as { mime_type?: unknown }).mime_type ??
        (inlineData as { mimeType?: unknown }).mimeType;
      const data = (inlineData as { data?: unknown }).data;

      if (typeof data !== "string" || !data.trim()) {
        continue;
      }

      return {
        mimeType: typeof mimeType === "string" && mimeType.trim() ? mimeType : "image/png",
        data: data.trim()
      };
    }
  }

  return undefined;
};

const parseJsonResponse = async (
  response: Response,
  endpointUrl: string,
  stage: GatewayStage
): Promise<unknown> => {
  const rawText = await response.text();
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (looksLikeHtml(contentType, rawText)) {
    throw new Error(
      `Gateway returned HTML instead of JSON during ${stage} (status=${response.status}, content-type=${contentType || "unknown"}). ${buildEndpointHint(
        endpointUrl
      )} Response preview: ${truncateText(rawText)}`
    );
  }

  if (!response.ok) {
    const providerMessage = parseGatewayErrorPayload(rawText);
    const errorMessage = providerMessage || truncateText(rawText);
    const channelUnavailable = isChannelUnavailableErrorMessage(errorMessage);
    const channelHint = channelUnavailable
      ? " Hint: current token/group has no available channel for this model. Switch token group or configure fallback endpoints/models."
      : "";

    throw new GatewayHttpError({
      message: `Gateway ${stage} failed (${response.status}, endpoint=${endpointUrl}, content-type=${contentType || "unknown"}): ${errorMessage}${channelHint}`,
      status: response.status,
      endpointUrl,
      stage,
      channelUnavailable
    });
  }

  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(
      `Gateway did not return valid JSON during ${stage} (content-type=${contentType || "unknown"}). ${buildEndpointHint(
        endpointUrl
      )} Response preview: ${truncateText(rawText)}`
    );
  }
};

const resolveEndpointUrls = (): string[] =>
  Array.from(
    new Set(
      [aiGatewayConfig.http.url, ...aiGatewayConfig.http.fallbackUrls]
        .map((entry) => entry?.trim())
        .filter((entry): entry is string => Boolean(entry))
    )
  );

const isRetriableEndpointError = (error: unknown): boolean => {
  if (error instanceof GatewayHttpError) {
    if (error.channelUnavailable) {
      return true;
    }

    if (error.status >= 500) {
      return true;
    }

    return error.status === 408 || error.status === 409 || error.status === 425 || error.status === 429;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return true;
  }

  return false;
};

const formatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const buildExhaustedEndpointsError = (
  endpointUrls: string[],
  errors: unknown[]
): Error => {
  const compactMessages = errors
    .slice(0, 3)
    .map((error, index) => `#${index + 1} ${formatErrorMessage(error)}`)
    .join(" | ");
  const channelUnavailable = errors.some((error) =>
    isChannelUnavailableErrorMessage(formatErrorMessage(error))
  );
  const channelHint = channelUnavailable
    ? " Hint: at least one endpoint reported 'No available channel'. Check API key group entitlement or switch model endpoint."
    : "";

  return new Error(
    `AI gateway failed across ${endpointUrls.length} endpoint(s): ${endpointUrls.join(
      ", "
    )}. Recent errors: ${compactMessages}${channelHint}`
  );
};

const generateByEndpoint = async (
  payload: unknown,
  endpointUrl: string
): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiGatewayConfig.http.timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: aiGatewayConfig.http.method,
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const parsed = await parseJsonResponse(response, endpointUrl, "request");

    if (aiGatewayConfig.http.payloadMode !== "fal-nanobanana2-edit") {
      return resolveGeneratedImageUrl(parsed);
    }

    const immediateUrl = await tryResolveGeneratedImageUrl(parsed);
    if (immediateUrl) {
      return immediateUrl;
    }

    const resultUrl = buildFalResultUrl(endpointUrl, parsed);
    if (!resultUrl) {
      throw new Error(
        "Fal nanobanana2 edit request did not return request_id/response_url for polling."
      );
    }

    const pollStartedAt = Date.now();
    while (Date.now() - pollStartedAt < aiGatewayConfig.http.fal.pollTimeoutMs) {
      await sleep(aiGatewayConfig.http.fal.pollIntervalMs);

      const pollResponse = await fetch(resultUrl, {
        method: "GET",
        headers: buildHeaders()
      });
      const pollPayload = await parseJsonResponse(pollResponse, resultUrl, "poll");
      const imageUrl = await tryResolveGeneratedImageUrl(pollPayload);
      if (imageUrl) {
        return imageUrl;
      }

      const status = extractTaskStatus(pollPayload);
      if (status && statusLooksFailed(status)) {
        throw new Error(`Fal task failed with status=${status}.`);
      }
    }

    throw new Error(
      `Fal polling timeout after ${aiGatewayConfig.http.fal.pollTimeoutMs}ms. Please retry later.`
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Gateway request timeout after ${aiGatewayConfig.http.timeoutMs}ms (endpoint=${endpointUrl}).`
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const aiGatewayService = {
  async generate(request: GenerateImageRequest): Promise<string> {
    const endpointUrls = resolveEndpointUrls();
    if (endpointUrls.length === 0) {
      throw new Error(
        "AI gateway is enabled but no endpoint is configured. Please set AI_GATEWAY_HTTP_URL (or AI_GATEWAY_HTTP_URLS)."
      );
    }

    const payload = await buildGatewayPayload(request);
    const errors: unknown[] = [];

    for (let index = 0; index < endpointUrls.length; index += 1) {
      const endpointUrl = endpointUrls[index];
      const hasNext = index < endpointUrls.length - 1;

      try {
        return await generateByEndpoint(payload, endpointUrl);
      } catch (error) {
        errors.push(error);

        if (hasNext && isRetriableEndpointError(error)) {
          console.warn(
            `[AI_GATEWAY] endpoint failed (${endpointUrl}), trying fallback endpoint`,
            error
          );
          continue;
        }

        if (hasNext) {
          throw error;
        }
      }
    }

    throw buildExhaustedEndpointsError(endpointUrls, errors);
  }
};
