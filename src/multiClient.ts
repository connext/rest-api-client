import { getFileStore } from "@connext/store";

import Client from "./client";
import config from "./config";
import {
  ConnectOptions,
  fetchAll,
  getRandomMnemonic,
  storeMnemonic,
  PersistedClientSettings,
} from "./helpers";

export interface ClientSettings extends PersistedClientSettings {
  client: Client;
}

class MultiClient {
  static store = getFileStore(config.storeDir);

  static async init(logger: any): Promise<MultiClient> {
    const persisted = await fetchAll(this.store);
    const mnemonic = persisted.mnemonic || getRandomMnemonic();
    await storeMnemonic(mnemonic, this.store);
    const multiClient = new MultiClient(mnemonic, logger);
    return multiClient;
  }

  public clients: ClientSettings[] = [];
  public pending: number[] = [];

  constructor(public mnemonic: string, public logger: any) {
    this.mnemonic = mnemonic;
    this.logger = logger;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    const index = this.getNextIndex();
    this.setPendingIndex(index);
    const mnemonic = opts?.mnemonic || this.mnemonic;
    await this.setMnemonic(mnemonic);
    const client = new Client({
      mnemonic,
      logger: this.logger,
      store: MultiClient.store,
    });
    opts = { ...opts, index };
    await client.connect(opts);
    this.removePendingIndex(index);
    this.setClient(client, opts);
    return client;
  }

  public getClient(pubId?: string): Client {
    const publicIdentifier = pubId || this.clients[0].client.client?.publicIdentifier;
    if (!publicIdentifier) throw new Error("No client initialized");
    const matches = this.clients.filter(
      (c) => c.client.client?.publicIdentifier === publicIdentifier,
    );
    if (matches && matches.length) {
      return matches[0].client;
    }
    throw new Error(`No client found matching publicIdentifier: ${publicIdentifier}`);
  }

  public async setMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, MultiClient.store);
  }

  // -- Private ---------------------------------------------------------------- //

  private getNextIndex(): number {
    if (this.pending.length) {
      return Math.max(...this.pending) + 1;
    }
    return this.clients.length;
  }

  private setPendingIndex(index: number): void {
    this.pending.push(index);
  }

  private removePendingIndex(index: number): void {
    this.pending = this.pending.filter((idx) => idx === index);
  }

  private setClient(client: Client, opts: Partial<ConnectOptions>): void {
    if (!client.client) return;
    const settings: PersistedClientSettings = {
      index: 0,
      publicIdentifier: client.client.publicIdentifier,
      opts,
    };
    this.clients.push({ ...settings, client });
  }
}

export default MultiClient;
