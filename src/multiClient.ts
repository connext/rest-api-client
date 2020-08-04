import { IStoreService, StateChannelJSON } from "@connext/types";

import Client from "./client";
import Keyring from "./keyring";
import {
  InternalConnectOptions,
  ConnectOptions,
  updateInitiatedClients,
  deleteInitiatedClients,
  storeIntiatedClients,
  ClientSummary,
  fetchInitiatedClients,
} from "./helpers";

export interface ClientSettings extends InternalConnectOptions {
  client: Client;
}

class MultiClient {
  static async init(
    mnemonic: string | undefined,
    logger: any,
    store: IStoreService,
    ethProviderUrl: string | undefined,
    nodeUrl: string | undefined,
    legacyMode: boolean,
    rootStoreDir: string,
    logLevel: number,
    persistedClients?: InternalConnectOptions[],
  ): Promise<MultiClient> {
    const keyring = new Keyring(mnemonic, logger, store);
    const multiClient = new MultiClient(
      keyring,
      logger,
      store,
      ethProviderUrl,
      nodeUrl,
      legacyMode,
      rootStoreDir,
      logLevel,
    );
    if (legacyMode && persistedClients && persistedClients.length) {
      logger.info(`Connecting a single persisted client`);
      multiClient.connectClient(persistedClients[0]);
    }
    return multiClient;
  }

  public clients: ClientSettings[] = [];

  constructor(
    public keyring: Keyring,
    public logger: any,
    public store: IStoreService,
    public ethProviderUrl: string | undefined,
    public nodeUrl: string | undefined,
    public legacyMode: boolean,
    public rootStoreDir: string,
    public logLevel: number,
  ) {
    this.keyring = keyring;
    this.logger = logger;
    this.store = store;
    this.ethProviderUrl = ethProviderUrl;
    this.nodeUrl = nodeUrl;
    this.legacyMode = legacyMode;
    this.rootStoreDir = rootStoreDir;
    this.logLevel = logLevel;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    let publicIdentifier = opts?.publicIdentifier;

    if (this.legacyMode) {
      if (this.clients.length !== 0) {
        return this.clients[0].client;
      } else {
        const wallet = this.keyring.createWallet(0);
        publicIdentifier = wallet.publicIdentifier;
      }
    }

    if (typeof publicIdentifier === "undefined") {
      throw new Error("Cannot connect Connext client without publicIdentifier");
    }

    const signer = this.keyring.getWalletByPublicIdentifier(publicIdentifier).privateKey;
    this.logger.info(`Connecting client with publicIdentifier: ${publicIdentifier}`);

    const persistedOpts = await this.getPersistedClientOptions(publicIdentifier);

    const ethProviderUrl =
      opts?.ethProviderUrl || persistedOpts?.ethProviderUrl || this.ethProviderUrl;
    if (typeof ethProviderUrl === "undefined") {
      throw new Error("Cannot connect Connext client without ethProviderUrl");
    }

    const nodeUrl = opts?.nodeUrl || persistedOpts?.nodeUrl || this.nodeUrl;
    if (typeof nodeUrl === "undefined") {
      throw new Error("Cannot connect Connext client without nodeUrl");
    }

    const connectOpts: InternalConnectOptions = {
      publicIdentifier,
      signer,
      ethProviderUrl,
      nodeUrl,
    };
    const client = await this.createClient(connectOpts);

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

  public async disconnectClient(pubId?: string) {
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    const client = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    )[0];
    await client.client.unsubscribeAll();
    this.removeClient(publicIdentifier);
  }

  public async getClients() {
    const stats: ClientSummary[] = await Promise.all(
      this.clients.map(async ({ client }) => {
        const channel = client.getClient();
        const basicInfo = {
          publicIdentifier: channel.publicIdentifier,
          multisigAddress: channel.multisigAddress,
          signerAddress: channel.signerAddress,
          chainId: channel.chainId,
          token: channel.config.contractAddresses[channel.chainId].Token,
        };
        let tokenBalance: string | undefined;
        try {
          const freeBalance = await channel.getFreeBalance(basicInfo.token);
          tokenBalance = freeBalance[basicInfo.signerAddress].toString();
        } catch (e) {
          this.logger.warn(`Failed to fetch free balance for ${basicInfo.token}: ${e.message}`);
        }
        let stateChannel: StateChannelJSON | undefined;
        try {
          stateChannel = (await channel.getStateChannel()).data;
        } catch (e) {
          this.logger.warn(
            `Failed to fetch state channel for ${basicInfo.multisigAddress}: ${e.message}`,
          );
        }
        return {
          ...basicInfo,
          tokenBalance,
          channelNonce: stateChannel?.monotonicNumProposedApps,
          proposedApps: stateChannel?.proposedAppInstances.length,
          installedApps: stateChannel?.appInstances.length,
        };
      }),
    );
    return stats;
  }

  public async reset() {
    this.logger.info(`Removing all initiated clients`);
    await Promise.all(
      this.clients.map(async ({ client }) => {
        await client.unsubscribeAll();
      }),
    );
    this.clients = [];
    await deleteInitiatedClients(this.store);
  }

  // -- Private ---------------------------------------------------------------- //

  private async getPersistedClientOptions(pubId?: string): Promise<ConnectOptions | undefined> {
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    let result: ConnectOptions | undefined;
    const persistedClients = await fetchInitiatedClients(this.store);
    const match = persistedClients?.find((c) => c.publicIdentifier === publicIdentifier);
    if (match) {
      result = match;
    }
    return result;
  }

  private async createClient(opts: InternalConnectOptions): Promise<Client> {
    const client = new Client({ logger: this.logger, store: this.store, logLevel: this.logLevel });
    await client.connect(this.rootStoreDir, opts);
    await this.setClient(client, opts);
    return client;
  }

  private async setClient(client: Client, opts: InternalConnectOptions): Promise<void> {
    if (!client.client) return;

    this.clients.push({ ...opts, client });
    await updateInitiatedClients(opts, this.store);
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
}

export default MultiClient;
