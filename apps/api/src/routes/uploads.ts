import type { FastifyPluginAsync } from "fastify";

import { uploadAssetService } from "../services/upload-asset-service.js";

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/api/generated-results/upload-image", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      reply.code(400);
      throw new Error("未收到上传文件。");
    }

    const buffer = await file.toBuffer();
    const imageUrl = await uploadAssetService.saveBuffer({
      buffer,
      filename: file.filename,
      mimeType: file.mimetype,
      subdirectory: "originals"
    });

    return {
      imageUrl
    };
  });
};
