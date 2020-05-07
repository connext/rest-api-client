import { ConnextStore } from "@connext/store";

import {
  CONNEXT_MNEMONIC_KEY,
  CONNEXT_INIT_OPTIONS_KEY,
  CONNEXT_SUBSCRIPTIONS_KEY,
} from "./constants";
import { EventSubscription, InitOptions } from "./types";

export function storeMnemonic(mnemonic: string, store: ConnextStore): Promise<void> {
  return store.internalStore.setItem(CONNEXT_MNEMONIC_KEY, mnemonic);
}

export function fetchMnemonic(store: ConnextStore): Promise<string | undefined> {
  return store.internalStore.getItem(CONNEXT_MNEMONIC_KEY);
}

export async function storeSubscriptions(
  subscriptions: EventSubscription[],
  store: ConnextStore,
): Promise<void> {
  return store.internalStore.setItem(CONNEXT_SUBSCRIPTIONS_KEY, subscriptions);
}

export async function fetchSubscriptions(
  store: ConnextStore,
): Promise<EventSubscription[] | undefined> {
  return store.internalStore.getItem(CONNEXT_SUBSCRIPTIONS_KEY);
}

export async function storeInitOptions(
  initOptions: Partial<InitOptions>,
  store: ConnextStore,
): Promise<void> {
  return store.internalStore.setItem(CONNEXT_INIT_OPTIONS_KEY, initOptions);
}

export async function fetchInitOptions(
  store: ConnextStore,
): Promise<Partial<InitOptions> | undefined> {
  return store.internalStore.getItem(CONNEXT_INIT_OPTIONS_KEY);
}

export async function fetchAll(store: ConnextStore) {
  const mnemonic = await fetchMnemonic(store);
  const subscriptions = await fetchSubscriptions(store);
  const initOptions = await fetchInitOptions(store);
  return {
    mnemonic,
    subscriptions,
    initOptions,
  };
}
