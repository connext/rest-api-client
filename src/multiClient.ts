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
  storeLastIndex,
  removeLastIndex,
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
    const lastIndex = persisted.lastIndex;
    const multiClient = new MultiClient(
      mnemonic,
      logger,
      store,
      singleClientMode,
      rootStoreDir,
      lastIndex,
    );
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

  public active: ClientSettings[] = [];

  constructor(
    public mnemonic: string,
    public logger: any,
    public store: IStoreService,
    public singleClientMode: boolean,
    public rootStoreDir: string,
    public lastIndex: number | undefined,
  ) {
    this.mnemonic = mnemonic;
    this.logger = logger;
    this.store = store;
    this.rootStoreDir = rootStoreDir;
    this.lastIndex = lastIndex;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (this.mnemonic && mnemonic !== this.mnemonic) {
      this.removeAllClients();
    }
    if (!this.shouldConnectClient()) {
      return this.active[0].client;
    }
    await this.setMnemonic(mnemonic);
    const index = this.lastIndex ? this.lastIndex + 1 : 0;
    this.setLastIndex(index);
    this.logger.info(`Connecting client with mnemonic: ${mnemonic}`);
    this.logger.info(`Connecting client with index: ${index}`);
    const client = await this.createClient(mnemonic, index, opts);
    await this.setClient(client, index, opts);
    return client;
  }

  public getClient(pubId?: string): Client {
    const publicIdentifier = pubId || this.active[0].client.getClient().publicIdentifier;
    this.logger.info(`Getting client for publicIdentifier: ${publicIdentifier}`);
    if (!publicIdentifier) throw new Error("No client initialized");
    const matches = this.active.filter(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    );
    if (matches && matches.length) {
      return matches[0].client;
    }
    throw new Error(`No client found matching publicIdentifier: ${publicIdentifier}`);
  }

  public getAllClientIds(): string[] {
    return this.active.map(({ client }) => client.getClient().publicIdentifier);
  }

  public async disconnectClient(pubId?: string) {
    const publicIdentifier = pubId || this.active[0].client.getClient().publicIdentifier;
    const client = this.active.filter(
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

  private async setLastIndex(index: number) {
    this.lastIndex = index;
    await storeLastIndex(index, this.store);
  }

  private async removeLastIndex() {
    this.lastIndex = undefined;
    await removeLastIndex(this.store);
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
    this.active.push({ ...initiatedClient, client });
    await updateInitiatedClients(initiatedClient, this.store);
  }

  private async removeClient(publicIdentifier: string) {
    this.active = this.active.filter(
      (c) => c.client.getClient().publicIdentifier !== publicIdentifier,
    );
    await storeIntiatedClients(this.active, this.store);
    if (!this.active.length) {
      this.removeLastIndex();
    }
  }

  private async removeAllClients() {
    this.logger.info(`Removing all initiated clients`);
    await Promise.all(
      this.active.map(async ({ client }) => {
        await client.unsubscribeAll();
      }),
    );
    this.active = [];
    await deleteInitiatedClients(this.store);
    this.removeLastIndex();
  }
}

export default MultiClient;
