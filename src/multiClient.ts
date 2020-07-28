import { IStoreService } from "@connext/types";

import Client from "./client";
import {
  ConnectOptions,
  fetchPersistedData,
  getRandomMnemonic,
  storeMnemonic,
  PersistedClientSettings,
  updateInitiatedClients,
  deleteInitiatedClients,
  GetConfigResponse,
} from "./helpers";

export interface ClientSettings extends PersistedClientSettings {
  client: Client;
}

class MultiClient {
  static async init(
    logger: any,
    store: IStoreService,
    singleClientMode: boolean,
  ): Promise<MultiClient> {
    const persisted = await fetchPersistedData(store);
    const mnemonic = persisted.mnemonic || getRandomMnemonic();
    await storeMnemonic(mnemonic, store);
    const multiClient = new MultiClient(mnemonic, logger, store, singleClientMode);
    if (persisted.initiatedClients && persisted.initiatedClients.length) {
      if (singleClientMode) {
        logger.info(`Connecting a single persisted client`);
        multiClient.connectClient(persisted.initiatedClients[0].opts);
      } else {
        logger.info(`Connecting all persisted clients`);
        await Promise.all(
          persisted.initiatedClients.map((initiatedClient) =>
            multiClient.connectClient(initiatedClient.opts),
          ),
        );
      }
    }
    return multiClient;
  }

  public clients: ClientSettings[] = [];
  public pending: number[] = [];

  constructor(
    public mnemonic: string,
    public logger: any,
    public store: IStoreService,
    public singleClientMode: boolean,
  ) {
    this.mnemonic = mnemonic;
    this.logger = logger;
    this.store = store;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (this.mnemonic && mnemonic !== this.mnemonic) {
      this.removeAllClients();
    }
    this.shouldConnectClient();
    await this.setMnemonic(mnemonic);
    const index = this.getNextIndex();
    this.logger.info(`Connecting client with mnemonic: ${mnemonic}`);
    this.logger.info(`Connecting client with index: ${index}`);
    this.setPendingIndex(index);
    const client = await this.createClient(mnemonic, index, opts);
    this.removePendingIndex(index);
    await this.setClient(client, index, opts);
    return client;
  }

  public getClient(pubId?: string): Client {
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    this.logger.info(`Getting client for publicIdentifier: ${publicIdentifier}`);
    if (!publicIdentifier) throw new Error("No client initialized");
    const matches = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    );
    if (matches && matches.length) {
      return matches[0].client;
    }
    throw new Error(`No client found matching publicIdentifier: ${publicIdentifier}`);
  }

  public getAllClientIds(): string[] {
    return this.clients.map(({ client }) => client.getClient().publicIdentifier);
  }

  public async setMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, this.store);
    this.logger.info("Mnemonic set successfully");
  }

  // -- Private ---------------------------------------------------------------- //

  private getLastIndex(): number {
    return this.pending.length ? Math.max(...this.pending) : this.clients.length - 1;
  }

  private getNextIndex(): number {
    return this.getLastIndex() + 1;
  }

  private setPendingIndex(index: number): void {
    this.pending.push(index);
  }

  private removePendingIndex(index: number): void {
    this.pending = this.pending.filter((idx) => idx === index);
  }

  private shouldConnectClient() {
    if (this.singleClientMode && this.getNextIndex() !== 0) {
      throw new Error("Cannot connect more than one client in single-client mode");
    }
  }

  private async createClient(
    mnemonic: string,
    index: number,
    opts?: Partial<ConnectOptions>,
  ): Promise<Client> {
    const client = new Client({ logger: this.logger, store: this.store });
    await client.connect({ ...opts, mnemonic, index });
    return client;
  }

  private async setClient(
    client: Client,
    index: number,
    opts?: Partial<ConnectOptions>,
  ): Promise<void> {
    if (!client.client) return;
    const initiatedClient: PersistedClientSettings = {
      index,
      publicIdentifier: client.client.publicIdentifier,
      opts,
    };
    this.clients.push({ ...initiatedClient, client });
    await updateInitiatedClients(initiatedClient, this.store);
  }

  private async removeAllClients() {
    this.logger.info(`Removing all initiated clients`);
    await Promise.all(
      this.clients.map(async ({ client }) => {
        await client.unsubscribeAll();
      }),
    );
    this.clients = [];
    await deleteInitiatedClients(this.store);
  }
}

export default MultiClient;
