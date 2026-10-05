import { useEffect, useRef, useState } from "react";

const DRAFT_PREFIX = "mobigest:draft:";

type StoredDraft<T> = {
  version: 1;
  savedAt: string;
  data: T;
};

export function clearAllFormDrafts() {
  if (typeof window === "undefined") return;

  const keys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
  }

  keys.forEach((key) => window.sessionStorage.removeItem(key));
}

export function useSessionDraft<T>({
  key,
  value,
  restore,
  enabled = true,
  isMeaningful,
  debounceMs = 300,
}: {
  key: string;
  value: T;
  restore: (draft: T) => void;
  enabled?: boolean;
  isMeaningful?: (draft: T) => boolean;
  debounceMs?: number;
}) {
  const storageKey = DRAFT_PREFIX + key;
  const restoreRef = useRef(restore);
  const meaningfulRef = useRef(isMeaningful);
  const hydratedRef = useRef(false);
  const skipNextWriteRef = useRef(false);
  const [restored, setRestored] = useState(false);
  const [hasStoredDraft, setHasStoredDraft] = useState(() =>
    typeof window !== "undefined"
      ? Boolean(window.sessionStorage.getItem(storageKey))
      : false,
  );

  restoreRef.current = restore;
  meaningfulRef.current = isMeaningful;

  const meaningful = isMeaningful
    ? isMeaningful(value)
    : defaultMeaningful(value);

  useEffect(() => {
    hydratedRef.current = false;
    skipNextWriteRef.current = false;

    if (!enabled || typeof window === "undefined") {
      hydratedRef.current = true;
      setHasStoredDraft(false);
      return;
    }

    const stored = window.sessionStorage.getItem(storageKey);
    setHasStoredDraft(Boolean(stored));

    try {
      const raw = stored;
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraft<T>;
        if (parsed?.version === 1 && parsed.data) {
          skipNextWriteRef.current = true;
          restoreRef.current(parsed.data);
          setRestored(true);
        }
      }
    } catch (error) {
      console.warn("Não foi possível recuperar o rascunho do formulário:", error);
      window.sessionStorage.removeItem(storageKey);
    } finally {
      hydratedRef.current = true;
    }
  }, [enabled, storageKey]);

  useEffect(() => {
    if (
      !enabled ||
      typeof window === "undefined" ||
      !hydratedRef.current
    ) {
      return;
    }

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }

    const shouldPersist = meaningfulRef.current
      ? meaningfulRef.current(value)
      : defaultMeaningful(value);

    if (!shouldPersist) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    const timer = window.setTimeout(() => {
      const payload: StoredDraft<T> = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: value,
      };
      window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      setHasStoredDraft(true);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, storageKey, value]);

  useEffect(() => {
    if (!enabled || !meaningful || typeof window === "undefined") return;

    const preventAccidentalRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventAccidentalRefresh);
    return () => {
      window.removeEventListener("beforeunload", preventAccidentalRefresh);
    };
  }, [enabled, meaningful]);

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
    setHasStoredDraft(false);
    setRestored(false);
  };

  return {
    restored,
    hasStoredDraft,
    clearDraft,
    dismissRestored: () => setRestored(false),
  };
}

function defaultMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.some((item) => defaultMeaningful(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) =>
      defaultMeaningful(item),
    );
  }

  return false;
}
