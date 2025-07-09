// src/utils/asset.ts
export const asset = (relativePath: string): string => {
  return `/images/${relativePath.replace(/^\/+/, '')}`;
};