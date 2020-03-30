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

import { CONNEXT_WALLET_FILE_NAME, CONNEXT_SUBSCRIPTIONS_FILE_NAME } from "./constants";
import { EventSubscription } from "./types";

export async function requireParam(obj: any, param: string, type = "string") {
  if (!obj[param] || typeof obj[param] !== type) {
    throw new Error(`Invalid or missing ${param}`);
  }
}

export async function saveFile(data: any, fileDir: string, fileName: string): Promise<void> {
  await createDirectory(fileDir);
  await fsWrite(path.join(fileDir, fileName), safeJsonStringify(data));
}

export async function getFile(fileDir: string, fileName: string): Promise<any> {
  const filePath = path.join(fileDir, fileName);
  if ((await checkFile(filePath)) === FILE_DOESNT_EXIST) {
    return undefined;
  }
  const data = await fsRead(filePath);
  return safeJsonParse(data);
}

export async function saveMnemonic(mnemonic: string, fileDir: string): Promise<void> {
  await saveFile({ mnemonic }, fileDir, CONNEXT_WALLET_FILE_NAME);
}

export async function getMnemonic(fileDir: string): Promise<string | undefined> {
  const result = await getFile(fileDir, CONNEXT_WALLET_FILE_NAME);
  if (typeof result !== "object" || !result.mnemonic) {
    return undefined;
  }
  return result.mnemonic;
}

export async function saveSubscriptions(
  subscriptions: EventSubscription[],
  fileDir: string,
): Promise<void> {
  await saveFile(subscriptions, fileDir, CONNEXT_SUBSCRIPTIONS_FILE_NAME);
}

export async function getSubscriptions(fileDir: string): Promise<EventSubscription[] | undefined> {
  const result = await getFile(fileDir, CONNEXT_SUBSCRIPTIONS_FILE_NAME);
  if (Array.isArray(result)) {
    return undefined;
  }
  return result;
}
