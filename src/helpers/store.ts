import { IStoreService } from "@connext/types";
import { getFileStore } from "@connext/store";

import {
  CONNEXT_MNEMONIC_KEY,
  CONNEXT_CLIENTS_KEY,
  CONNEXT_SUBSCRIPTIONS_KEY,
  CONNEXT_WALLETS_KEY,
} from "./constants";
import {
  EventSubscription,
  PersistedData,
  InternalConnectOptions,
  InternalWalletOptions,
  ConnectOptions,
} from "./types";

export async function getStore(storeDir: string, address?: string) {
  const dir = address ? `${storeDir}-${address}` : storeDir;
  const store = getFileStore(dir);
  await store.init();
  return store;
}

export async function getPersistedClientOptions(
  store: IStoreService,
  publicIdentifier: string,
): Promise<ConnectOptions | undefined> {
  let result: ConnectOptions | undefined;
  const persistedClients = await fetchClients(store);
  const match = persistedClients?.find((c) => c.publicIdentifier === publicIdentifier);
  if (match) {
    result = match;
  }
  return result;
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

export async function storeClients(
  clients: InternalConnectOptions[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_CLIENTS_KEY, clients);
}

export async function fetchClients(
  store: IStoreService,
): Promise<InternalConnectOptions[] | undefined> {
  return (store as any).getItem(CONNEXT_CLIENTS_KEY);
}

export async function updateClients(
  opts: InternalConnectOptions,
  store: IStoreService,
): Promise<void> {
  let clients = (await fetchClients(store)) || [];
  clients = clients.filter((c) => c.publicIdentifier !== opts.publicIdentifier);
  clients.push(opts);
  await storeClients(clients, store);
}

export async function deleteClients(store: IStoreService): Promise<void> {
  return (store as any).removeItem(CONNEXT_CLIENTS_KEY);
}

export async function storeWallets(
  clients: InternalWalletOptions[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_WALLETS_KEY, clients);
}

export async function fetchWallets(
  store: IStoreService,
): Promise<InternalWalletOptions[] | undefined> {
  return (store as any).getItem(CONNEXT_WALLETS_KEY);
}

export async function updateWallets(
  opts: InternalWalletOptions,
  store: IStoreService,
): Promise<void> {
  let wallets = (await fetchWallets(store)) || [];
  wallets = wallets.filter((c) => c.index !== opts.index);
  wallets.push(opts);
  await storeWallets(wallets, store);
}

export async function deleteWallets(store: IStoreService): Promise<void> {
  return (store as any).removeItem(CONNEXT_WALLETS_KEY);
}

export async function fetchPersistedData(store: IStoreService): Promise<PersistedData> {
  const mnemonic = await fetchMnemonic(store);
  const subscriptions = await fetchSubscriptions(store);
  const clients = await fetchClients(store);
  const wallets = await fetchWallets(store);
  return {
    mnemonic,
    subscriptions,
    clients,
    wallets,
  };
}
