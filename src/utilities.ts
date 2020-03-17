export function requireParam(obj: any, param: string, type = "string") {
  if (!obj[param] || typeof obj[param] !== type) {
    throw new Error(`Invalid or missing ${param}`);
  }
}
