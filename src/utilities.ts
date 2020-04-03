import {
  WrappedPostgresStorage,
  DEFAULT_STORE_PREFIX,
  DEFAULT_STORE_SEPARATOR,
  DEFAULT_DATABASE_STORAGE_TABLE_NAME,
} from "@connext/store";

import {
  CONNEXT_INIT_OPTIONS_STORE_KEY,
  CONNEXT_SUBSCRIPTIONS_STORE_KEY,
  SUBSCRIPTION_MESSAGING_PREFIX,
  CONNEXT_WALLET_STORE_KEY,
} from "./constants";
import { EventSubscription, InitOptions } from "./types";
import config from "./config";

export function verifyType(value: any, type: string) {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "buffer":
      return Buffer.isBuffer(value);
    default:
      return typeof value === type;
  }
}

export async function requireParam(obj: any, param: string, type = "string") {
  if (!obj[param] || !verifyType(obj[param], type)) {
    throw new Error(`Invalid or missing ${param}`);
  }
}

export let postgresStore: WrappedPostgresStorage;
export async function initPostgresStore(): Promise<WrappedPostgresStorage> {
  postgresStore = new WrappedPostgresStorage(
    DEFAULT_STORE_PREFIX,
    DEFAULT_STORE_SEPARATOR,
    DEFAULT_DATABASE_STORAGE_TABLE_NAME,
    undefined,
    `postgres://${config.dbUsername}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbDatabase}`,
  );
  await postgresStore.sequelize.authenticate();
  console.log("DB INITIALIZED");
  await postgresStore.syncModels();
  return postgresStore;
}

const assertPostgresStore = () => {
  if (!postgresStore) {
    throw new Error(`Store has not been initialized, use initPostgresStore first`);
  }
};

export async function storeMnemonic(mnemonic: string): Promise<void> {
  assertPostgresStore();
  await postgresStore.setItem(CONNEXT_WALLET_STORE_KEY, { mnemonic });
}

export async function fetchMnemonic(): Promise<string | undefined> {
  assertPostgresStore();
  const result = await postgresStore.getItem<{ mnemonic: string }>(CONNEXT_WALLET_STORE_KEY);
  if (typeof result !== "object" || !result?.mnemonic) {
    return undefined;
  }
  return result.mnemonic;
}

export async function storeSubscriptions(subscriptions: EventSubscription[]): Promise<void> {
  assertPostgresStore();
  await postgresStore.setItem(CONNEXT_SUBSCRIPTIONS_STORE_KEY, subscriptions);
}

export async function fetchSubscriptions(): Promise<EventSubscription[] | undefined> {
  assertPostgresStore();
  const result = await postgresStore.getItem(CONNEXT_SUBSCRIPTIONS_STORE_KEY);
  if (!Array.isArray(result)) {
    return undefined;
  }
  return result;
}

export async function storeInitOptions(
  initOptions: Partial<InitOptions>,
): Promise<void> {
  assertPostgresStore();
  await postgresStore.setItem(CONNEXT_INIT_OPTIONS_STORE_KEY, initOptions);
}

export async function fetchInitOptions(): Promise<Partial<InitOptions> | undefined> {
  assertPostgresStore();
  const result = await postgresStore.getItem(CONNEXT_INIT_OPTIONS_STORE_KEY);
  if (typeof result !== "object" || !result) {
    return undefined;
  }
  return result;
}

export async function fetchAll() {
  const mnemonic = await fetchMnemonic();
  const subscriptions = await fetchSubscriptions();
  const initOptions = await fetchInitOptions();
  return {
    mnemonic,
    subscriptions,
    initOptions,
  };
}

export function isMessagingSubscription(subscription: EventSubscription) {
  return subscription.params.event.startsWith(SUBSCRIPTION_MESSAGING_PREFIX);
}
