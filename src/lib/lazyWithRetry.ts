import { lazy as reactLazy, type ComponentType } from "react";

const KEY = "jinbao-chunk-reload";

// Reloads the page once when a page chunk fails to load (stale version after an update).
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return reactLazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(KEY);
      throw err;
    }
  });
}
