import type {
  CreateGeneratedResultInput,
  CreateGeneratedResultResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GeneratedResult,
  PointsSnapshot,
  ResetSystemPromptInput,
  SystemPromptPayload
} from "@huancai/shared";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const toAbsoluteUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }
  if (typeof window === "undefined") {
    return url;
  }
  return new URL(url, window.location.origin).toString();
};

export const fetchHealth = async (): Promise<{ status: string; now: string }> =>
  request("/api/health");

export const fetchPoints = async (userId = "demo-user"): Promise<PointsSnapshot> =>
  request(`/api/system/points?userId=${encodeURIComponent(userId)}`);

export const fetchSystemPrompts = async (): Promise<SystemPromptPayload> =>
  request("/api/system/prompts");

export const saveSystemPrompts = async (
  payload: SystemPromptPayload
): Promise<SystemPromptPayload> =>
  request("/api/system/prompts", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const resetSystemPrompts = async (
  payload: ResetSystemPromptInput = {}
): Promise<SystemPromptPayload> =>
  request("/api/system/prompts/reset", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const fetchGeneratedResults = async (
  categoryId?: string
): Promise<GeneratedResult[]> => {
  const search = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
  const results = await request<GeneratedResult[]>(`/api/generated-results${search}`);
  return results.map((result) => ({
    ...result,
    originalImageUrl: toAbsoluteUrl(result.originalImageUrl),
    generatedImageUrl: toAbsoluteUrl(result.generatedImageUrl)
  }));
};

export const createGeneratedResult = async (
  payload: CreateGeneratedResultInput
): Promise<CreateGeneratedResultResponse> =>
  request("/api/generated-results", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const generateImage = async (
  payload: GenerateImageRequest
): Promise<GenerateImageResponse> =>
  request("/api/generate-image", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const deleteGeneratedResult = async (id: string): Promise<void> => {
  await request(`/api/generated-results/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
};

const dataUrlToFile = async (dataUrl: string, filename = "upload.png"): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, {
    type: blob.type || "image/png"
  });
};

export const uploadImageFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/generated-results/upload-image", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "上传图片失败");
  }

  const payload = (await response.json()) as { imageUrl: string };
  return payload.imageUrl;
};

export const uploadDataUrl = async (
  dataUrl: string,
  filename = "upload.png"
): Promise<string> => {
  const file = await dataUrlToFile(dataUrl, filename);
  return uploadImageFile(file);
};
