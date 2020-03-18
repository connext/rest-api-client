import path from "path";
import {
  fsWrite,
  fsRead,
  safeJsonStringify,
  safeJsonParse,
  checkFile,
  createDirectory,
  FILE_DOESNT_EXIST,
} from "@connext/store";
import { CONNEXT_WALLET_FILE_NAME } from "./constants";

export function requireParam(obj: any, param: string, type = "string") {
  if (!obj[param] || typeof obj[param] !== type) {
    throw new Error(`Invalid or missing ${param}`);
  }
}

export function getMnemonicFilePath(fileDir: string) {
  return path.join(fileDir, CONNEXT_WALLET_FILE_NAME);
}

export async function saveMnemonic(mnemonic: string, fileDir: string): Promise<void> {
  await createDirectory(fileDir);
  const filePath = getMnemonicFilePath(fileDir);
  const data = safeJsonStringify({ mnemonic });
  await fsWrite(filePath, data);
}

export async function getMnemonic(fileDir: string): Promise<string | undefined> {
  const filePath = getMnemonicFilePath(fileDir);
  if ((await checkFile(filePath)) === FILE_DOESNT_EXIST) {
    return undefined;
  }
  const data = await fsRead(filePath);
  const result = safeJsonParse(data);
  if (typeof result !== "object" || !result.mnemonic) {
    return undefined;
  }
  return result.mnemonic;
}
