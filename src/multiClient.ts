import { IStoreService, StateChannelJSON } from "@connext/types";

import Client from "./client";
import Keyring from "./keyring";
import {
  InternalConnectOptions,
  ConnectOptions,
  updateClients,
  deleteClients,
  storeClients,
  ClientSummary,
  InternalWalletOptions,
  getPersistedClientOptions,
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
    messagingUrl: string | undefined,
    legacyMode: boolean,
    rootStoreDir: string,
    logLevel: number,
    persistedClients?: InternalConnectOptions[],
    persistedWallets?: InternalWalletOptions[],
  ): Promise<MultiClient> {
    const keyring = await Keyring.init(
      mnemonic,
      logger,
      store,
      ethProviderUrl,
      legacyMode,
      persistedWallets,
    );
    const multiClient = new MultiClient(
      keyring,
      logger,
      store,
      ethProviderUrl,
      nodeUrl,
      messagingUrl,
      legacyMode,
      rootStoreDir,
      logLevel,
    );
    if (legacyMode && persistedClients && persistedClients.length) {
      logger.info(`Connecting a single persisted client`);
      await multiClient.connectClient(persistedClients[0]);
    }
    return multiClient;
  }

  public clients: ClientSettings[] = [];
  public pending: string[] = [];
  public resetting = false;

  constructor(
    public keyring: Keyring,
    public logger: any,
    public store: IStoreService,
    public ethProviderUrl: string | undefined,
    public nodeUrl: string | undefined,
    public messagingUrl: string | undefined,
    public legacyMode: boolean,
    public rootStoreDir: string,
    public logLevel: number,
  ) {
    this.keyring = keyring;
    this.logger = logger;
    this.store = store;
    this.ethProviderUrl = ethProviderUrl;
    this.nodeUrl = nodeUrl;
    this.messagingUrl = messagingUrl;
    this.legacyMode = legacyMode;
    this.rootStoreDir = rootStoreDir;
    this.logLevel = logLevel;
  }

  public async connectClient(opts?: Partial<ConnectOptions>): Promise<Client> {
    if (this.resetting) throw new Error("Currently resetting clients");
    let publicIdentifier = opts?.publicIdentifier;
    if (this.legacyMode) {
      if (this.clients.length !== 0) {
        return this.clients[0].client;
      } else {
        const wallet = await this.keyring.createWallet(0);
        publicIdentifier = wallet.publicIdentifier;
      }
    }

    if (typeof publicIdentifier === "undefined") {
      throw new Error("Cannot connect Connext client without publicIdentifier");
    }

    if (this.pending.includes(publicIdentifier)) {
      throw new Error(`Client already initializating for publicIdentifier: ${publicIdentifier}`);
    }

    let client: Client;
    try {
      this.setPending(publicIdentifier);
      const signer = this.keyring.getWalletByPublicIdentifier(publicIdentifier).privateKey;

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

      const messagingUrl = opts?.messagingUrl || persistedOpts?.messagingUrl || this.messagingUrl;

      let match: ClientSettings | undefined;
      try {
        match = this.getClientSettings(publicIdentifier);
      } catch {
        // do nothing
      }

      if (typeof match !== "undefined") {
        if (ethProviderUrl === match.ethProviderUrl && nodeUrl === match.nodeUrl) {
          return match.client;
        } else {
          this.removeClient(publicIdentifier);
        }
      }
      this.logger.info(`Connecting client with publicIdentifier: ${publicIdentifier}`);

      const connectOpts: InternalConnectOptions = {
        publicIdentifier,
        signer,
        ethProviderUrl,
        nodeUrl,
        messagingUrl,
      };
      client = await this.createClient(connectOpts);
    } finally {
      this.removePending(publicIdentifier);
    }

    return client;
  }

  public getClient(pubId?: string): Client {
    return this.getClientSettings(pubId).client;
  }

  public getClientSettings(pubId?: string): ClientSettings {
    if (this.resetting) throw new Error("Currently resetting clients");
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    this.logger.info(`Getting client for publicIdentifier: ${publicIdentifier}`);
    if (!publicIdentifier) throw new Error("No client initialized");
    const match = this.clients.find(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    );
    if (!match) throw new Error(`No client found matching publicIdentifier: ${publicIdentifier}`);
    return match;
  }

  public async disconnectClient(pubId?: string) {
    if (this.resetting) throw new Error("Currently resetting clients");
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    this.logger.info(`Disconnecting client with publicIdentifier: ${publicIdentifier}`);
    const client = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier === publicIdentifier,
    )[0];
    await client.client.unsubscribeAll();
    this.removeClient(publicIdentifier);
  }

  public async getClients() {
    if (this.resetting) throw new Error("Currently resetting clients");
    this.logger.info(`Getting summary of all connected clients`);
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
    if (this.resetting) throw new Error("Currently resetting clients");
    this.resetting = true;
    try {
      this.logger.info(`Removing all connected clients`);
      await Promise.all(
        this.clients.map(async ({ client }) => {
          await client.unsubscribeAll();
        }),
      );
      this.clients = [];
      await deleteClients(this.store);
    } finally {
      this.resetting = false;
    }
  }

  // -- Private ---------------------------------------------------------------- //

  private async getPersistedClientOptions(pubId?: string): Promise<ConnectOptions | undefined> {
    const publicIdentifier = pubId || this.clients[0].client.getClient().publicIdentifier;
    const opts = await getPersistedClientOptions(this.store, publicIdentifier);
    return opts;
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
    await updateClients(opts, this.store);
  }

  private async removeClient(publicIdentifier: string) {
    this.clients = this.clients.filter(
      (c) => c.client.getClient().publicIdentifier !== publicIdentifier,
    );
    await storeClients(
      this.clients.map((x) => {
        const _client = { ...x };
        delete _client.client;
        return _client;
      }),
      this.store,
    );
  }

  private setPending(publicIdentifier: string) {
    if (this.pending.includes(publicIdentifier)) return;
    this.pending.push(publicIdentifier);
  }

  private removePending(publicIdentifier: string) {
    this.pending = this.pending.filter((pubId) => pubId !== publicIdentifier);
  }
}

export default MultiClient;
