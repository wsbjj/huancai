const OPERATOR_SESSION_KEY = "huancai.operator.session";
const DEFAULT_OPERATOR_NAME = "云仲";
const DEFAULT_USER_ID = "demo-user";

export type OperatorSession = {
  displayName: string;
  userId: string;
};

const normalizeDisplayName = (displayName: string): string => {
  const normalized = displayName.trim();
  return normalized || DEFAULT_OPERATOR_NAME;
};

export const createOperatorSession = (
  displayName: string,
  storage: Storage = window.localStorage
): OperatorSession => {
  const session = {
    displayName: normalizeDisplayName(displayName),
    userId: DEFAULT_USER_ID
  };

  storage.setItem(OPERATOR_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const readOperatorSession = (
  storage: Storage = window.localStorage
): OperatorSession | undefined => {
  const raw = storage.getItem(OPERATOR_SESSION_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OperatorSession>;
    if (!parsed.displayName || !parsed.userId) {
      return undefined;
    }

    return {
      displayName: normalizeDisplayName(parsed.displayName),
      userId: parsed.userId
    };
  } catch {
    return undefined;
  }
};

export const clearOperatorSession = (storage: Storage = window.localStorage): void => {
  storage.removeItem(OPERATOR_SESSION_KEY);
};
