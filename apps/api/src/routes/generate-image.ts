import type { FastifyPluginAsync } from "fastify";

import type { GenerateImageRequest, GenerateImageResponse } from "@huancai/shared";

import { generatedResultsRepository } from "../repositories/generated-results-repository.js";
import { imageOrchestrator } from "../services/image-orchestrator.js";
import { GatewayInputError } from "../services/ai-gateway-service.js";

export const generateImageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: GenerateImageRequest }>(
    "/api/generate-image",
    async (request, reply): Promise<GenerateImageResponse> => {
      const existing = await generatedResultsRepository.getById(request.body.resultId);

      if (!existing) {
        reply.code(404);
        throw new Error(`No processing record found for resultId=${request.body.resultId}`);
      }

      try {
        const generatedImageUrl = await imageOrchestrator.process(request.body);

        const result = await generatedResultsRepository.update(request.body.resultId, {
          status: "completed",
          categoryId: request.body.categoryId,
          originalPhotoId: request.body.originalPhotoId,
          originalImageUrl: request.body.originalImageUrl ?? request.body.imageUrl,
          generatedImageUrl,
          prompt: request.body.instruction
        });

        if (!result) {
          reply.code(500);
          throw new Error("Failed to persist generated result record.");
        }

        return {
          accepted: true,
          result
        };
      } catch (error) {
        await generatedResultsRepository.update(request.body.resultId, {
          status: "failed",
          prompt: request.body.instruction
        });

        reply.code(error instanceof GatewayInputError ? error.statusCode : 500);
        throw error;
      }
    }
  );
};
