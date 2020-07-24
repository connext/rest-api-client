import { IStoreService } from "@connext/types";
import { getFileStore } from "@connext/store";

import { CONNEXT_MNEMONIC_KEY, CONNEXT_CLIENTS_KEY, CONNEXT_SUBSCRIPTIONS_KEY } from "./constants";
import { EventSubscription, PersistedData, PersistedClientSettings } from "./types";

export async function getStore(storeDir: string) {
  const store = getFileStore(storeDir);
  await store.init();
  return store;
}

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

export async function storeIntiatedClients(
  initiatedClients: PersistedClientSettings[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_CLIENTS_KEY, initiatedClients);
}

export async function fetchInitiatedClients(
  store: IStoreService,
): Promise<PersistedClientSettings[] | undefined> {
  return (store as any).getItem(CONNEXT_CLIENTS_KEY);
}

export async function updateInitiatedClients(
  initiatedClient: PersistedClientSettings,
  store: IStoreService,
): Promise<void> {
  const initiatedClients = (await fetchInitiatedClients(store)) || [];
  await storeIntiatedClients([...initiatedClients, initiatedClient], store);
}

export async function deleteInitiatedClients(store: IStoreService): Promise<void> {
  return (store as any).removeItem(CONNEXT_CLIENTS_KEY);
}

export async function fetchPersistedData(store: IStoreService): Promise<PersistedData> {
  const mnemonic = await fetchMnemonic(store);
  const subscriptions = await fetchSubscriptions(store);
  const initiatedClients = await fetchInitiatedClients(store);
  return {
    mnemonic,
    subscriptions,
    initiatedClients,
  };
}
