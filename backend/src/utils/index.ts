export const parseBoolean = (v: unknown): boolean =>
  String(v).toLowerCase() === "true" || String(v) === "1";
