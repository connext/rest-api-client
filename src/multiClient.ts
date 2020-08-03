import { BigNumber } from "ethers";
import { IStoreService, StateChannelJSON } from "@connext/types";

import Client from "./client";
import {
  ConnectOptions,
  storeMnemonic,
  PersistedClientSettings,
  updateInitiatedClients,
  deleteInitiatedClients,
  storeIntiatedClients,
  ClientSummary,
  fetchInitiatedClients,
} from "./helpers";

export interface ClientSettings extends PersistedClientSettings {
  client: Client;
}

class MultiClient {
  static async init(
    mnemonic: string | undefined,
    ethProviderUrl: string | undefined,
    nodeUrl: string | undefined,
    logger: any,
    store: IStoreService,
    singleClientMode: boolean,
    rootStoreDir: string,
    logLevel: number,
    persistedClients?: PersistedClientSettings[],
  ): Promise<MultiClient> {
    const multiClient = new MultiClient(
      mnemonic,
      ethProviderUrl,
      nodeUrl,
      logger,
      store,
      singleClientMode,
      rootStoreDir,
      logLevel,
    );
    if (singleClientMode && persistedClients && persistedClients.length) {
      logger.info(`Connecting a single persisted client`);
      multiClient.connectClient(persistedClients[0].opts);
    }
    return multiClient;
  }

  public clients: ClientSettings[] = [];

  constructor(
    public mnemonic: string | undefined,
    public ethProviderUrl: string | undefined,
    public nodeUrl: string | undefined,
    public logger: any,
    public store: IStoreService,
    public singleClientMode: boolean,
    public rootStoreDir: string,
    public logLevel: number,
  ) {
    this.mnemonic = mnemonic;
    this.ethProviderUrl = ethProviderUrl;
    this.nodeUrl = nodeUrl;
    this.logger = logger;
    this.store = store;
    this.singleClientMode = singleClientMode;
    this.rootStoreDir = rootStoreDir;
    this.logLevel = logLevel;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (typeof mnemonic === "undefined") {
      throw new Error("Cannot connect Connext client without mnemonic");
    }
    if (mnemonic !== this.mnemonic) {
      await this.setMnemonic(mnemonic);
    }

    if (typeof opts?.index !== "undefined") {
      const match = this.getClientByIndex(opts?.index);
      if (match) return match.client;
    }

    if (this.singleClientMode && this.clients.length !== 0) {
      return this.clients[0].client;
    }

    const index = this.getNewIndex(opts?.index);
    this.logger.info(`Connecting client with mnemonic: ${mnemonic}`);
    this.logger.info(`Connecting client with index: ${index}`);

    const persistedOpts = await this.getPersistedClientOptions(index);

    const ethProviderUrl =
      opts?.ethProviderUrl || persistedOpts?.ethProviderUrl || this.ethProviderUrl;
    if (typeof ethProviderUrl === "undefined") {
      throw new Error("Cannot connect Connext client without ethProviderUrl");
    }

    const nodeUrl = opts?.nodeUrl || persistedOpts?.nodeUrl || this.nodeUrl;
    if (typeof nodeUrl === "undefined") {
      throw new Error("Cannot connect Connext client without nodeUrl");
    }

    const connectOpts = { mnemonic, index, ethProviderUrl, nodeUrl };
    const client = await this.createClient(connectOpts);
    await this.setClient(client, connectOpts);

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
    if (this.mnemonic && mnemonic !== this.mnemonic) {
      this.removeAllClients();
    }
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, this.store);
    this.logger.info("Mnemonic set successfully");
  }

  public async getClientsStats() {
    const stats = await Promise.all(
      this.clients.map(async ({ client }) => {
        const channel = client.getClient();
        const basicInfo = {
          publicIdentifier: channel.publicIdentifier,
          multisig: channel.multisigAddress,
          signer: channel.signerAddress,
          chainId: channel.chainId,
          token: channel.config.contractAddresses[channel.chainId].Token,
        };
        let tokenBalance: BigNumber | undefined;
        try {
          const freeBalance = await channel.getFreeBalance(basicInfo.token);
          tokenBalance = freeBalance[basicInfo.signer];
        } catch (e) {
          this.logger.warn(`Failed to fetch free balance for ${basicInfo.token}: ${e.message}`);
        }
        let stateChannel: StateChannelJSON | undefined;
        try {
          stateChannel = (await channel.getStateChannel()).data;
        } catch (e) {
          this.logger.warn(`Failed to fetch state channel for ${basicInfo.multisig}: ${e.message}`);
        }
        return {
          ...basicInfo,
          tokenBalance: tokenBalance?.toString(),
          channelNonce: stateChannel?.monotonicNumProposedApps,
          proposedApps: stateChannel?.proposedAppInstances.length,
          installedApps: stateChannel?.appInstances.length,
        };
      }),
    );
    const deduped: ClientSummary[] = [];
    stats.forEach((stat) => {
      if (deduped.find((info) => info.publicIdentifier === stat.publicIdentifier)) {
        return;
      }
      deduped.push(stat);
    });
    return deduped;
  }

  // -- Private ---------------------------------------------------------------- //

  private getNewIndex(index?: number): number {
    if (typeof index !== "undefined") {
      const match = this.getClientByIndex(index);
      console.log("[getNewIndex]", "match", match);
      if (typeof match !== "undefined") {
        throw new Error(`Client already connected with index: ${index}`);
      }
      return Number(index);
    }
    let result = 0;
    console.log("[getNewIndex]", "this.clients.length", this.clients.length);
    if (this.clients.length === 0) return result;
    const indexes = this.clients.map((c) => c.opts.index);
    console.log("[getNewIndex]", "indexes", indexes);
    const maxIndex = Math.max(...indexes);
    console.log("[getNewIndex]", "maxIndex", maxIndex);
    for (let i = 0; i <= maxIndex; i++) {
      if (!indexes.includes(i)) {
        result = i;
        break;
      } else if (i === maxIndex) {
        result = i + 1;
      }
    }
    console.log("[getNewIndex]", "result", result);

    return result;
  }

  private getClientByIndex(index: number) {
    return this.clients.find((c) => c.opts.index === index);
  }

  private async getPersistedClientOptions(index: number): Promise<ConnectOptions | undefined> {
    let result: ConnectOptions | undefined;
    const persistedClients = await fetchInitiatedClients(this.store);
    const match = persistedClients?.find((c) => c.opts.index === index);
    if (match) {
      result = match.opts;
    }
    return result;
  }

  private async createClient(opts: ConnectOptions): Promise<Client> {
    const client = new Client({ logger: this.logger, store: this.store, logLevel: this.logLevel });
    await client.connect(this.rootStoreDir, opts);
    return client;
  }

  private async setClient(client: Client, opts: ConnectOptions): Promise<void> {
    if (!client.client) return;
    const initiatedClient: PersistedClientSettings = {
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
