import type { GenerateImageRequest } from "@huancai/shared";

import { aiGatewayService } from "./ai-gateway-service.js";

export const imageOrchestrator = {
  async process(request: GenerateImageRequest): Promise<string> {
    return aiGatewayService.generate(request);
  }
};
