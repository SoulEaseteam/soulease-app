// src/utils/query.ts
export const parseQuery = () =>
  Object.fromEntries(new URLSearchParams(window.location.search).entries());

export const buildQuery = (obj: Record<string, string | number | boolean | null | undefined>) =>
  new URLSearchParams(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();