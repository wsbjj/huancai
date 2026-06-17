import type { FastifyPluginAsync } from "fastify";

import type {
  CreateGeneratedResultInput,
  CreateGeneratedResultResponse
} from "@huancai/shared";

import { generatedResultsRepository } from "../repositories/generated-results-repository.js";
import { pointsService } from "../services/points-service.js";

const resolvePointCost = (value: number | undefined): number => {
  if (value === undefined) {
    return 1;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("pointCost must be a positive number.");
  }

  return Math.ceil(value);
};

export const generatedResultRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: {
      categoryId?: string;
      userId?: string;
    };
  }>("/api/generated-results", async (request) => {
    return generatedResultsRepository.list({
      categoryId: request.query.categoryId,
      userId: request.query.userId
    });
  });

  fastify.post<{ Body: CreateGeneratedResultInput }>(
    "/api/generated-results",
    async (request, reply): Promise<CreateGeneratedResultResponse> => {
      try {
        const pointCost = resolvePointCost(request.body.pointCost);
        const snapshot = pointsService.consume(request.body.userId, pointCost);
        const result = await generatedResultsRepository.create(request.body);

        return {
          result,
          remainingPoints: snapshot.points
        };
      } catch (error) {
        reply.code(400);
        throw error;
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/api/generated-results/:id",
    async (request, reply) => {
      const deleted = await generatedResultsRepository.remove(request.params.id);
      if (!deleted) {
        reply.code(404);
        return {
          success: false
        };
      }

      return {
        success: true
      };
    }
  );
};
