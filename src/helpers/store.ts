import path from "path";
import { fsWrite, fsRead, checkFile, createDirectory, FILE_DOESNT_EXIST } from "@connext/store";

import {
  CONNEXT_MNEMONIC_KEY,
  CONNEXT_INIT_OPTIONS_KEY,
  CONNEXT_SUBSCRIPTIONS_KEY,
  CONNEXT_MNEMONIC_FILE_NAME,
  CONNEXT_SUBSCRIPTIONS_FILE_NAME,
  CONNEXT_INIT_OPTIONS_FILE_NAME,
} from "./constants";
import { EventSubscription, InitOptions } from "./types";
import { safeJsonStringify, safeJsonParse } from "./utilities";

export async function storeFile(
  key: string,
  data: any,
  fileDir: string,
  fileName: string,
): Promise<void> {
  await createDirectory(fileDir);
  await fsWrite(path.join(fileDir, fileName), safeJsonStringify({ [key]: data }));
}

export async function fetchFile(key: string, fileDir: string, fileName: string): Promise<any> {
  const filePath = path.join(fileDir, fileName);
  if ((await checkFile(filePath)) === FILE_DOESNT_EXIST) {
    return undefined;
  }
  const data = await fsRead(filePath);
  const json = safeJsonParse(data);
  if (typeof json !== "object" || !json[key]) {
    return undefined;
  }
  return json[key];
}

export async function storeMnemonic(mnemonic: string, fileDir: string): Promise<void> {
  await storeFile(CONNEXT_MNEMONIC_KEY, mnemonic, fileDir, CONNEXT_MNEMONIC_FILE_NAME);
}

export async function fetchMnemonic(fileDir: string): Promise<string | undefined> {
  return fetchFile(CONNEXT_MNEMONIC_KEY, fileDir, CONNEXT_MNEMONIC_FILE_NAME);
}

export async function storeSubscriptions(
  subscriptions: EventSubscription[],
  fileDir: string,
): Promise<void> {
  await storeFile(
    CONNEXT_SUBSCRIPTIONS_KEY,
    subscriptions,
    fileDir,
    CONNEXT_SUBSCRIPTIONS_FILE_NAME,
  );
}

export async function fetchSubscriptions(
  fileDir: string,
): Promise<EventSubscription[] | undefined> {
  return fetchFile(CONNEXT_SUBSCRIPTIONS_KEY, fileDir, CONNEXT_SUBSCRIPTIONS_FILE_NAME);
}

export async function storeInitOptions(
  initOptions: Partial<InitOptions>,
  fileDir: string,
): Promise<void> {
  await storeFile(CONNEXT_INIT_OPTIONS_KEY, initOptions, fileDir, CONNEXT_INIT_OPTIONS_FILE_NAME);
}

export async function fetchInitOptions(fileDir: string): Promise<Partial<InitOptions> | undefined> {
  return fetchFile(CONNEXT_INIT_OPTIONS_KEY, fileDir, CONNEXT_INIT_OPTIONS_FILE_NAME);
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
