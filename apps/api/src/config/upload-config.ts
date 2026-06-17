const DEFAULT_UPLOAD_MAX_FILE_SIZE_MB = 10;
const BYTES_PER_MEGABYTE = 1024 * 1024;

type UploadEnv = {
  UPLOAD_MAX_FILE_SIZE_MB?: string;
};

export const resolveUploadMaxFileSizeBytes = (env: UploadEnv): number => {
  const maxFileSizeMb = Number(
    env.UPLOAD_MAX_FILE_SIZE_MB ?? DEFAULT_UPLOAD_MAX_FILE_SIZE_MB
  );

  if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
    throw new Error("UPLOAD_MAX_FILE_SIZE_MB must be a positive number.");
  }

  return maxFileSizeMb * BYTES_PER_MEGABYTE;
};
