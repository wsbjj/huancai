import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDefaultSystemPromptConfig,
  modulePromptFieldSpecs,
  systemPromptModuleIds,
  type SystemPromptConfig,
  type SystemPromptModuleId
} from "@huancai/shared";

type SystemPromptStore = {
  prompts: SystemPromptConfig;
};

type PromptFieldMap = Record<string, string>;

const apiRoot = fileURLToPath(new URL("../../", import.meta.url));
const storePath = resolve(apiRoot, "data/system-prompts.json");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeWithDefaults = (input: unknown): SystemPromptConfig => {
  const nextConfig = createDefaultSystemPromptConfig();
  const nextConfigMap = nextConfig as Record<SystemPromptModuleId, PromptFieldMap>;
  if (!isPlainObject(input)) {
    return nextConfig;
  }

  for (const moduleId of systemPromptModuleIds) {
    const moduleValue = input[moduleId];
    if (!isPlainObject(moduleValue)) {
      continue;
    }

    for (const field of modulePromptFieldSpecs[moduleId]) {
      const rawValue = moduleValue[field.key];
      if (typeof rawValue === "string") {
        nextConfigMap[moduleId][field.key] = rawValue;
      }
    }
  }

  return nextConfig;
};

class SystemPromptsRepository {
  private async ensureStore(): Promise<void> {
    await mkdir(dirname(storePath), { recursive: true });

    try {
      await readFile(storePath, "utf8");
    } catch {
      const initialStore: SystemPromptStore = {
        prompts: createDefaultSystemPromptConfig()
      };
      await writeFile(storePath, JSON.stringify(initialStore, null, 2), "utf8");
    }
  }

  private async readStore(): Promise<SystemPromptStore> {
    await this.ensureStore();
    const raw = await readFile(storePath, "utf8");

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isPlainObject(parsed) && "prompts" in parsed) {
        return {
          prompts: mergeWithDefaults((parsed as { prompts?: unknown }).prompts)
        };
      }
    } catch {
      // Fall through to rewrite with defaults below.
    }

    const fallbackStore: SystemPromptStore = {
      prompts: createDefaultSystemPromptConfig()
    };
    await this.writeStore(fallbackStore);
    return fallbackStore;
  }

  private async writeStore(store: SystemPromptStore): Promise<void> {
    await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  }

  async get(): Promise<SystemPromptConfig> {
    const store = await this.readStore();
    return store.prompts;
  }

  async save(prompts: SystemPromptConfig): Promise<SystemPromptConfig> {
    const normalized = mergeWithDefaults(prompts);
    await this.writeStore({
      prompts: normalized
    });
    return normalized;
  }

  async reset(moduleId?: SystemPromptModuleId): Promise<SystemPromptConfig> {
    if (!moduleId) {
      const prompts = createDefaultSystemPromptConfig();
      await this.writeStore({ prompts });
      return prompts;
    }

    const store = await this.readStore();
    const promptMap = store.prompts as Record<SystemPromptModuleId, PromptFieldMap>;
    const defaultPromptMap = createDefaultSystemPromptConfig() as Record<
      SystemPromptModuleId,
      PromptFieldMap
    >;
    promptMap[moduleId] = {
      ...defaultPromptMap[moduleId]
    };
    await this.writeStore(store);
    return store.prompts;
  }
}

export const systemPromptsRepository = new SystemPromptsRepository();
