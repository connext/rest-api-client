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

import {
  CONNEXT_WALLET_FILE_NAME,
  CONNEXT_SUBSCRIPTIONS_FILE_NAME,
  CONNEXT_INIT_OPTIONS_FILE_NAME,
  SUBSCRIPTION_MESSAGING_PREFIX,
} from "./constants";
import { EventSubscription, InitOptions } from "./types";

export async function requireParam(obj: any, param: string, type = "string") {
  if (!obj[param] || typeof obj[param] !== type) {
    throw new Error(`Invalid or missing ${param}`);
  }
}

export async function storeFile(data: any, fileDir: string, fileName: string): Promise<void> {
  await createDirectory(fileDir);
  await fsWrite(path.join(fileDir, fileName), safeJsonStringify(data));
}

export async function fetchFile(fileDir: string, fileName: string): Promise<any> {
  const filePath = path.join(fileDir, fileName);
  if ((await checkFile(filePath)) === FILE_DOESNT_EXIST) {
    return undefined;
  }
  const data = await fsRead(filePath);
  return safeJsonParse(data);
}

export async function storeMnemonic(mnemonic: string, fileDir: string): Promise<void> {
  await storeFile({ mnemonic }, fileDir, CONNEXT_WALLET_FILE_NAME);
}

export async function fetchMnemonic(fileDir: string): Promise<string | undefined> {
  const result = await fetchFile(fileDir, CONNEXT_WALLET_FILE_NAME);
  if (typeof result !== "object" || !result.mnemonic) {
    return undefined;
  }
  return result.mnemonic;
}

export async function storeSubscriptions(
  subscriptions: EventSubscription[],
  fileDir: string,
): Promise<void> {
  await storeFile(subscriptions, fileDir, CONNEXT_SUBSCRIPTIONS_FILE_NAME);
}

export async function fetchSubscriptions(
  fileDir: string,
): Promise<EventSubscription[] | undefined> {
  const result = await fetchFile(fileDir, CONNEXT_SUBSCRIPTIONS_FILE_NAME);
  if (!Array.isArray(result)) {
    return undefined;
  }
  return result;
}

export async function storeInitOptions(
  initOptions: Partial<InitOptions>,
  fileDir: string,
): Promise<void> {
  await storeFile(initOptions, fileDir, CONNEXT_INIT_OPTIONS_FILE_NAME);
}

export async function fetchInitOptions(fileDir: string): Promise<Partial<InitOptions> | undefined> {
  const result = await fetchFile(fileDir, CONNEXT_INIT_OPTIONS_FILE_NAME);
  if (typeof result !== "object" || !result) {
    return undefined;
  }
  return result;
}

export async function fetchAll(fileDir: string) {
  const mnemonic = await fetchMnemonic(fileDir);
  const subscriptions = await fetchSubscriptions(fileDir);
  const initOptions = await fetchInitOptions(fileDir);
  return {
    mnemonic,
    subscriptions,
    initOptions,
  };
}

export function isMessagingSubscription(subscription: EventSubscription) {
  return subscription.params.event.startsWith(SUBSCRIPTION_MESSAGING_PREFIX);
}
