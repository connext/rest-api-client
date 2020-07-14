import {
  CONNEXT_MNEMONIC_KEY,
  CONNEXT_INIT_OPTIONS_KEY,
  CONNEXT_SUBSCRIPTIONS_KEY,
} from "./constants";
import { EventSubscription, InitOptions } from "./types";
import { IStoreService } from "@connext/types";

export function storeMnemonic(mnemonic: string, store: IStoreService): Promise<void> {
  return (store as any).setItem(CONNEXT_MNEMONIC_KEY, mnemonic);
}

export function fetchMnemonic(store: IStoreService): Promise<string | undefined> {
  return (store as any).getItem(CONNEXT_MNEMONIC_KEY);
}

export async function storeSubscriptions(
  subscriptions: EventSubscription[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_SUBSCRIPTIONS_KEY, subscriptions);
}

export async function fetchSubscriptions(
  store: IStoreService,
): Promise<EventSubscription[] | undefined> {
  return (store as any).getItem(CONNEXT_SUBSCRIPTIONS_KEY);
}

export async function storeInitOptions(
  initOptions: Partial<InitOptions>,
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_INIT_OPTIONS_KEY, initOptions);
}

export async function fetchInitOptions(
  store: IStoreService,
): Promise<Partial<InitOptions> | undefined> {
  return (store as any).getItem(CONNEXT_INIT_OPTIONS_KEY);
}

export async function fetchAll(store: IStoreService) {
  const mnemonic = await fetchMnemonic(store);
  const subscriptions = await fetchSubscriptions(store);
  const initOptions = await fetchInitOptions(store);
  return {
    mnemonic,
    subscriptions,
    initOptions,
  };
}
