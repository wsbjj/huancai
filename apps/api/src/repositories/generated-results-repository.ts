import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  seedGeneratedResults,
  type CreateGeneratedResultInput,
  type GeneratedResult
} from "@huancai/shared";

type GeneratedResultStore = {
  results: GeneratedResult[];
};

type ResultFilters = {
  categoryId?: string;
  userId?: string;
};

const apiRoot = fileURLToPath(new URL("../../", import.meta.url));
const storePath = resolve(apiRoot, "data/generated-results.json");

class GeneratedResultsRepository {
  private async ensureStore(): Promise<void> {
    await mkdir(dirname(storePath), { recursive: true });

    try {
      await readFile(storePath, "utf8");
    } catch {
      const initialStore: GeneratedResultStore = {
        results: seedGeneratedResults
      };
      await writeFile(storePath, JSON.stringify(initialStore, null, 2), "utf8");
    }
  }

  private async readStore(): Promise<GeneratedResultStore> {
    await this.ensureStore();
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as GeneratedResultStore;
  }

  private async writeStore(store: GeneratedResultStore): Promise<void> {
    await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  }

  async list(filters: ResultFilters = {}): Promise<GeneratedResult[]> {
    const store = await this.readStore();
    return store.results
      .filter((result) => {
        if (filters.categoryId && result.categoryId !== filters.categoryId) {
          return false;
        }
        if (filters.userId && result.userId !== filters.userId) {
          return false;
        }
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getById(id: string): Promise<GeneratedResult | undefined> {
    const store = await this.readStore();
    return store.results.find((result) => result.id === id);
  }

  async create(input: CreateGeneratedResultInput): Promise<GeneratedResult> {
    const store = await this.readStore();
    const now = new Date().toISOString();
    const result: GeneratedResult = {
      id: randomUUID(),
      originalPhotoId: input.originalPhotoId,
      originalImageUrl: input.originalImageUrl,
      generatedImageUrl: input.generatedImageUrl,
      prompt: input.prompt,
      categoryId: input.categoryId,
      modelId: input.modelId ?? "",
      styleId: input.styleId ?? "",
      status: input.status ?? "processing",
      userId: input.userId ?? "demo-user",
      createdAt: now,
      updatedAt: now
    };

    store.results.unshift(result);
    await this.writeStore(store);
    return result;
  }

  async update(
    id: string,
    patch: Partial<Omit<GeneratedResult, "id" | "createdAt">>
  ): Promise<GeneratedResult | undefined> {
    const store = await this.readStore();
    const index = store.results.findIndex((result) => result.id === id);

    if (index === -1) {
      return undefined;
    }

    const current = store.results[index];
    const updated: GeneratedResult = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    store.results[index] = updated;
    await this.writeStore(store);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const store = await this.readStore();
    const nextResults = store.results.filter((result) => result.id !== id);

    if (nextResults.length === store.results.length) {
      return false;
    }

    store.results = nextResults;
    await this.writeStore(store);
    return true;
  }
}

export const generatedResultsRepository = new GeneratedResultsRepository();
