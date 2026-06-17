import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("../../", import.meta.url));
const uploadsRoot = resolve(apiRoot, "uploads");

const mimeExtensionMap: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg"
};

const sanitizeName = (input: string): string =>
  input.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");

const ensureDirectory = async (subdirectory: string): Promise<string> => {
  const targetDirectory = join(uploadsRoot, subdirectory);
  await mkdir(targetDirectory, { recursive: true });
  return targetDirectory;
};

const resolveExtension = (
  filename: string | undefined,
  mimeType: string | undefined,
  fallback = ".bin"
): string => {
  const fromName = filename ? extname(filename) : "";
  if (fromName) {
    return fromName;
  }
  if (mimeType && mimeExtensionMap[mimeType]) {
    return mimeExtensionMap[mimeType];
  }
  return fallback;
};

export const uploadAssetService = {
  uploadsRoot,

  async saveBuffer(options: {
    buffer: Buffer;
    filename?: string;
    mimeType?: string;
    subdirectory?: "originals" | "processed";
  }): Promise<string> {
    const subdirectory = options.subdirectory ?? "originals";
    const directory = await ensureDirectory(subdirectory);
    const extension = resolveExtension(options.filename, options.mimeType);
    const basename = sanitizeName(options.filename?.replace(/\.[^/.]+$/, "") ?? "asset");
    const finalFilename = `${Date.now()}-${basename}-${randomUUID().slice(0, 8)}${extension}`;
    const filePath = join(directory, finalFilename);

    await writeFile(filePath, options.buffer);
    return `/uploads/${subdirectory}/${finalFilename}`;
  },

  async saveSvg(svg: string, basename: string): Promise<string> {
    const directory = await ensureDirectory("processed");
    const finalFilename = `${Date.now()}-${sanitizeName(basename)}-${randomUUID().slice(0, 8)}.svg`;
    const filePath = join(directory, finalFilename);
    await writeFile(filePath, svg, "utf8");
    return `/uploads/processed/${finalFilename}`;
  }
};
