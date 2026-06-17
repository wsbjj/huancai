import { defaultPoints, type PointsSnapshot } from "@huancai/shared";

const pointsByUser = new Map<string, number>();

const resolveUserId = (userId?: string): string => {
  if (userId && userId.trim()) {
    return userId.trim();
  }
  return "demo-user";
};

const ensurePoints = (userId?: string): number => {
  const key = resolveUserId(userId);
  if (!pointsByUser.has(key)) {
    pointsByUser.set(key, defaultPoints);
  }
  return pointsByUser.get(key) ?? defaultPoints;
};

const normalizeConsumeAmount = (amount: number): number => {
  if (!Number.isFinite(amount)) {
    throw new Error("Point cost must be a valid number.");
  }

  const normalized = Math.ceil(amount);
  if (normalized <= 0) {
    throw new Error("Point cost must be greater than 0.");
  }

  return normalized;
};

export const pointsService = {
  getSnapshot(userId?: string): PointsSnapshot {
    const key = resolveUserId(userId);
    return {
      userId: key,
      points: ensurePoints(key)
    };
  },

  consume(userId: string | undefined, amount: number): PointsSnapshot {
    const key = resolveUserId(userId);
    const current = ensurePoints(key);
    const normalizedAmount = normalizeConsumeAmount(amount);

    if (normalizedAmount > current) {
      throw new Error(
        `Insufficient points. Current balance=${current}, required=${normalizedAmount}.`
      );
    }

    const next = current - normalizedAmount;
    pointsByUser.set(key, next);

    return {
      userId: key,
      points: next
    };
  }
};
