import { IStoreService } from "@connext/types";
import { getFileStore } from "@connext/store";

import { CONNEXT_MNEMONIC_KEY, CONNEXT_CLIENTS_KEY, CONNEXT_SUBSCRIPTIONS_KEY } from "./constants";
import { EventSubscription, PersistedData, InternalConnectOptions } from "./types";
import { Wallet } from "ethers";

export async function getStore(storeDir: string, wallet?: Wallet) {
  const dir = wallet ? `${storeDir}-${wallet.address}` : storeDir;
  const store = getFileStore(dir);
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
  initiatedClients: InternalConnectOptions[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_CLIENTS_KEY, initiatedClients);
}

export async function fetchInitiatedClients(
  store: IStoreService,
): Promise<InternalConnectOptions[] | undefined> {
  return (store as any).getItem(CONNEXT_CLIENTS_KEY);
}

export async function updateInitiatedClients(
  initiatedClient: InternalConnectOptions,
  store: IStoreService,
): Promise<void> {
  let initiatedClients = (await fetchInitiatedClients(store)) || [];
  initiatedClients = initiatedClients.filter(
    (c) => c.publicIdentifier === initiatedClient.publicIdentifier,
  );
  initiatedClients.push(initiatedClient);
  await storeIntiatedClients(initiatedClients, store);
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
