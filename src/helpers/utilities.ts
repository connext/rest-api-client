export function safeJsonParse(value: any): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function safeJsonStringify(value: any): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value, (key: string, value: any) =>
        typeof value === "undefined" ? null : value,
      );
}

export function isNotIncluded(val: string, arr: string[]): boolean {
  let res = true;
  for (const i in arr) {
    const matches = val.match(arr[i]);
    if (matches && matches.length) {
      res = false;
      break;
    }
  }
  return res;
}

export function verifyType(value: any, type: string): boolean {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "buffer":
      return Buffer.isBuffer(value);
    default:
      return typeof value === type;
  }
}

export async function requireParam(obj: any, param: string, type = "string"): Promise<void> {
  if (!obj[param] || !verifyType(obj[param], type)) {
    throw new Error(`Invalid or missing ${param}`);
  }
}
