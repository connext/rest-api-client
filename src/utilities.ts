export function requireBodyParam(body: any, param: string, type: string) {
  if (!body[param] || typeof body[param] !== type) {
    throw new Error(`Invalid or missing ${param}`);
  }
}
