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
  storeIntiatedClients,
} from "./helpers";

export interface ClientSettings extends PersistedClientSettings {
  client: Client;
}

class MultiClient {
  static async init(
    logger: any,
    store: IStoreService,
    singleClientMode: boolean,
    rootStoreDir: string,
  ): Promise<MultiClient> {
    const persisted = await fetchPersistedData(store);
    const mnemonic = persisted.mnemonic || getRandomMnemonic();
    await storeMnemonic(mnemonic, store);
    const multiClient = new MultiClient(mnemonic, logger, store, singleClientMode, rootStoreDir);
    if (persisted.initiatedClients && persisted.initiatedClients.length) {
      if (singleClientMode) {
        logger.info(`Connecting a single persisted client`);
        multiClient.connectClient(persisted.initiatedClients[0].opts);
      } else {
        // TODO: this is a hack because rest client is having trouble starting up with too many clients
        const max = Math.max(3, persisted.initiatedClients.length);
        logger.info(
          `Connecting ${max} persisted clients out of ${persisted.initiatedClients.length}`,
        );
        for (let i = 0; i < max; i++) {
          logger.info(`Connecting client at index ${persisted.initiatedClients[i].index}`);
          await multiClient.connectClient(
            persisted.initiatedClients[i].opts,
            persisted.initiatedClients[i].index,
          );
          logger.info(`Connected client at index ${persisted.initiatedClients[i].index}!`);
        }
      }
    }
    return multiClient;
  }

  public clients: ClientSettings[] = [];
  public lastIndex: number | undefined;

  constructor(
    public mnemonic: string,
    public logger: any,
    public store: IStoreService,
    public singleClientMode: boolean,
    public rootStoreDir: string,
  ) {
    this.mnemonic = mnemonic;
    this.logger = logger;
    this.store = store;
    this.rootStoreDir = rootStoreDir;
  }

  public async connectClient(
    opts?: Partial<ConnectOptions>,
    overrideIndex?: number,
  ): Promise<Client> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (this.mnemonic && mnemonic !== this.mnemonic) {
      this.removeAllClients();
    }
    if (!this.shouldConnectClient()) {
      return this.clients[0].client;
    }
    await this.setMnemonic(mnemonic);
    const index =
      typeof overrideIndex !== "undefined" && overrideIndex >= (this.lastIndex || 0)
        ? overrideIndex
        : typeof this.lastIndex !== "undefined"
        ? this.lastIndex + 1
        : 0;
    this.lastIndex = index;
    this.logger.info(`Connecting client with mnemonic: ${mnemonic}`);
    this.logger.info(`Connecting client with index: ${index}`);
    const client = await this.createClient(mnemonic, index, opts);
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

  public async disconnectClient(pubId?: string) {
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    const client = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    )[0];
    await client.client.unsubscribeAll();
    this.removeClient(publicIdentifier);
  }

  public async setMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, this.store);
    this.logger.info("Mnemonic set successfully");
  }

  // -- Private ---------------------------------------------------------------- //

  private shouldConnectClient(): boolean {
    return (
      !this.singleClientMode || (this.singleClientMode && typeof this.lastIndex === "undefined")
    );
  }

  private async createClient(
    mnemonic: string,
    index: number,
    opts?: Partial<ConnectOptions>,
  ): Promise<Client> {
    const client = new Client({ logger: this.logger, store: this.store });
    await client.connect(this.rootStoreDir, { ...opts, mnemonic, index });
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

  private async removeClient(publicIdentifier: string) {
    this.clients = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier !== publicIdentifier,
    );
    await storeIntiatedClients(
      this.clients.map((x) => {
        const _client = { ...x };
        delete _client.client;
        return _client;
      }),
      this.store,
    );
    if (!this.clients.length) {
      this.lastIndex = undefined;
    }
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
    this.lastIndex = undefined;
  }
}

export default MultiClient;
