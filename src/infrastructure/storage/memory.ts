import type { LocalStorageLike } from "./local";

export class InMemoryStorage implements LocalStorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  clear(): void {
    this.store.clear();
  }
}

export class QuotaExceededStorage implements LocalStorageLike {
  getItem(_key: string): string | null {
    return null;
  }

  setItem(_key: string, _value: string): void {
    const e = new Error("quota");
    e.name = "QuotaExceededError";
    throw e;
  }

  removeItem(_key: string): void {
    /* noop */
  }
}

export class DenyingStorage implements LocalStorageLike {
  getItem(_key: string): string | null {
    const e = new Error("denied");
    e.name = "SecurityError";
    throw e;
  }
  setItem(_key: string, _value: string): void {
    const e = new Error("denied");
    e.name = "SecurityError";
    throw e;
  }
  removeItem(_key: string): void {
    /* noop */
  }
}
