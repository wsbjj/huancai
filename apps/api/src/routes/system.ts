import type { FastifyPluginAsync } from "fastify";

import {
  createDefaultSystemPromptConfig,
  moduleDefinitions,
  modulePromptFieldSpecs,
  systemPromptModuleIds,
  type ResetSystemPromptInput,
  type SystemPromptConfig,
  type SystemPromptModuleId,
  type SystemPromptPayload
} from "@huancai/shared";

import { aiGatewayPublicInfo } from "../config/ai-gateway-config.js";
import { systemPromptsRepository } from "../repositories/system-prompts-repository.js";
import { pointsService } from "../services/points-service.js";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const validateSystemPromptConfig = (input: unknown): SystemPromptConfig => {
  if (!isPlainObject(input)) {
    throw new Error("prompts must be an object.");
  }

  for (const moduleId of Object.keys(input)) {
    if (!systemPromptModuleIds.includes(moduleId as SystemPromptModuleId)) {
      throw new Error(`Unknown system prompt module: ${moduleId}`);
    }
  }

  const nextConfig = createDefaultSystemPromptConfig();
  const nextConfigMap = nextConfig as Record<SystemPromptModuleId, Record<string, string>>;

  for (const moduleId of systemPromptModuleIds) {
    const moduleValue = input[moduleId];
    if (!isPlainObject(moduleValue)) {
      throw new Error(`Prompt config for ${moduleId} must be an object.`);
    }

    const allowedKeys = new Set(modulePromptFieldSpecs[moduleId].map((field) => field.key));
    for (const fieldKey of Object.keys(moduleValue)) {
      if (!allowedKeys.has(fieldKey)) {
        throw new Error(`Unknown prompt field ${moduleId}.${fieldKey}`);
      }
    }

    for (const field of modulePromptFieldSpecs[moduleId]) {
      const rawValue = moduleValue[field.key];
      if (typeof rawValue !== "string") {
        throw new Error(`Prompt field ${moduleId}.${field.key} must be a string.`);
      }

      const trimmed = rawValue.trim();
      if (!trimmed && !field.allowEmpty) {
        throw new Error(`Prompt field ${moduleId}.${field.key} cannot be empty.`);
      }

      nextConfigMap[moduleId][field.key] = trimmed;
    }
  }

  return nextConfig;
};

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/health", async () => {
    return {
      status: "ok",
      service: "@huancai/api",
      aiGateway: aiGatewayPublicInfo,
      now: new Date().toISOString()
    };
  });

  fastify.get<{ Querystring: { userId?: string } }>(
    "/api/system/points",
    async (request) => {
      return pointsService.getSnapshot(request.query.userId);
    }
  );

  fastify.get("/api/modules", async () => {
    return {
      modules: moduleDefinitions
    };
  });

  fastify.get("/api/system/prompts", async (): Promise<SystemPromptPayload> => {
    return {
      prompts: await systemPromptsRepository.get()
    };
  });

  fastify.put<{ Body: SystemPromptPayload }>(
    "/api/system/prompts",
    async (request, reply): Promise<SystemPromptPayload> => {
      try {
        const prompts = validateSystemPromptConfig(request.body?.prompts);
        return {
          prompts: await systemPromptsRepository.save(prompts)
        };
      } catch (error) {
        reply.code(400);
        throw error;
      }
    }
  );

  fastify.post<{ Body: ResetSystemPromptInput }>(
    "/api/system/prompts/reset",
    async (request, reply): Promise<SystemPromptPayload> => {
      try {
        const moduleId = request.body?.moduleId;
        if (moduleId && !systemPromptModuleIds.includes(moduleId)) {
          throw new Error(`Unknown system prompt module: ${moduleId}`);
        }

        return {
          prompts: await systemPromptsRepository.reset(moduleId)
        };
      } catch (error) {
        reply.code(400);
        throw error;
      }
    }
  );
};
