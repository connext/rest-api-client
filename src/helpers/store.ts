import fs from "fs";
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

export function createDir(path: string) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function exists(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          return resolve(false);
        } else {
          return reject(err);
        }
      }
      return resolve(true);
    });
  });
}

export async function getStore(storeDir: string, subDir?: string) {
  if (!exists(storeDir)) {
    await createDir(storeDir);
  }
  const dir = subDir ? `${storeDir}/${subDir}` : storeDir;
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

export function storeSubscriptions(
  subscriptions: EventSubscription[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_SUBSCRIPTIONS_KEY, subscriptions);
}

export function fetchSubscriptions(store: IStoreService): Promise<EventSubscription[] | undefined> {
  return (store as any).getItem(CONNEXT_SUBSCRIPTIONS_KEY);
}

export function storeClients(
  clients: InternalConnectOptions[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_CLIENTS_KEY, clients);
}

export function fetchClients(store: IStoreService): Promise<InternalConnectOptions[] | undefined> {
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

export function deleteClients(store: IStoreService): Promise<void> {
  return (store as any).removeItem(CONNEXT_CLIENTS_KEY);
}

export function storeWallets(
  clients: InternalWalletOptions[],
  store: IStoreService,
): Promise<void> {
  return (store as any).setItem(CONNEXT_WALLETS_KEY, clients);
}

export function fetchWallets(store: IStoreService): Promise<InternalWalletOptions[] | undefined> {
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

export function deleteWallets(store: IStoreService): Promise<void> {
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
