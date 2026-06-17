import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { mkdir } from "node:fs/promises";

import { generateImageRoutes } from "./routes/generate-image.js";
import { generatedResultRoutes } from "./routes/generated-results.js";
import { uploadAssetService } from "./services/upload-asset-service.js";
import { systemRoutes } from "./routes/system.js";
import { uploadRoutes } from "./routes/uploads.js";
import { resolveUploadMaxFileSizeBytes } from "./config/upload-config.js";

const resolveHost = (): string => {
  const explicitHost = process.env.HOST?.trim();
  if (explicitHost) {
    return explicitHost;
  }

  return process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
};

const bootstrap = async (): Promise<void> => {
  const uploadMaxFileSizeBytes = resolveUploadMaxFileSizeBytes(process.env);
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });
  await app.register(multipart, {
    limits: {
      fileSize: uploadMaxFileSizeBytes
    }
  });
  await mkdir(uploadAssetService.uploadsRoot, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadAssetService.uploadsRoot,
    prefix: "/uploads/"
  });

  await app.register(systemRoutes);
  await app.register(uploadRoutes);
  await app.register(generatedResultRoutes);
  await app.register(generateImageRoutes);

  const port = Number(process.env.PORT ?? 3001);
  const host = resolveHost();

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void bootstrap();
