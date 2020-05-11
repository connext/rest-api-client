import * as connext from "@connext/client";
import { ConnextStore } from "@connext/store";
import { IConnextClient, ChannelProviderConfig, PublicParams } from "@connext/types";
import { Wallet } from "ethers";

import config from "./config";

import {
  storeMnemonic,
  storeInitOptions,
  getClientBalance,
  getFreeBalanceOnChain,
  EventSubscriptionParams,
  InitClientManagerOptions,
  InitOptions,
  EventSubscription,
} from "./helpers";
import Subscriber from "./subscriber";
import { AddressZero } from "ethers/constants";

export default class ClientManager {
  private _client: IConnextClient | undefined;
  private _logger: any;
  private _mnemonic: string | undefined;
  private _subscriber: Subscriber;
  private _store: ConnextStore;

  constructor(opts: InitClientManagerOptions) {
    this._logger = opts.logger;
    this._mnemonic = opts.mnemonic;
    this._subscriber = new Subscriber(opts.logger, opts.store);
    this._store = opts.store;
  }

  get mnemonic(): string {
    return this._mnemonic || config.mnemonic;
  }

  set mnemonic(value: string) {
    this._mnemonic = value;
  }

  public async initClient(
    opts?: Partial<InitOptions>,
    subscriptions?: EventSubscription[],
  ): Promise<IConnextClient> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (!mnemonic) {
      throw new Error("Cannot init Connext client without mnemonic");
    }
    if (this._client) {
      this._logger.info("Client is already connected - skipping initClient logic");
      return this._client;
    }
    this.setMnemonic(mnemonic);
    const network = opts?.network || config.network;
    const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || config.nodeUrl;
    const logLevel = opts?.logLevel || config.logLevel;
    const signer = Wallet.fromMnemonic(mnemonic).privateKey;
    const clientOpts = { signer, store: this._store, ethProviderUrl, nodeUrl, logLevel };
    const client = await connext.connect(network, clientOpts);
    this._client = client;
    this._logger.info("Client initialized successfully");
    return client;
  }

  public async getConfig(): Promise<Partial<ChannelProviderConfig>> {
    const client = this.getClient();
    const config = {
      multisigAddress: undefined,
      ...client.channelProvider.config,
    };
    if (!config.multisigAddress) {
      throw new Error("Connext Client Not Yet Initialized");
    }
    return config;
  }

  public async getAppInstanceDetails(appIdentityHash: string) {
    const client = this.getClient();
    const appDetails = await client.getAppInstance(appIdentityHash);
    const data = appDetails;
    return data;
  }

  public async hashLockTransfer(params: PublicParams.HashLockTransfer) {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.conditionalTransfer({
      amount: params.amount,
      recipient: params.recipient,
      conditionType: "HashLockTransfer",
      lockHash: params.lockHash,
      assetId: params.assetId,
      meta: params.meta,
      timelock: params.timelock,
    } as PublicParams.HashLockTransfer);
    const appDetails = await client.getAppInstance(response.appIdentityHash);
    const data = { ...response, ...appDetails };
    return data;
  }

  public async hashLockResolve(params: PublicParams.ResolveHashLockTransfer) {
    const client = this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HashLockTransfer",
      preImage: params.preImage,
      assetId: params.assetId,
    } as PublicParams.ResolveHashLockTransfer);
    const data = response;
    return data;
  }

  public async hashLockStatus(lockHash: string, assetId: string) {
    const client = this.getClient();
    const response = await client.getHashLockTransfer(lockHash, assetId);
    if (!response) {
      throw new Error(
        `No HashLock Transfer found for lockHash: ${lockHash} and assetId: ${assetId}`,
      );
    }
    const data = response;
    return data;
  }

  public async balance(assetId: string) {
    const client = this.getClient();
    return getClientBalance(client, assetId);
  }

  public async setMnemonic(mnemonic: string) {
    await storeMnemonic(mnemonic, this._store);
    this._mnemonic = mnemonic;
    this._logger.info("Mnemonic set successfully");
  }

  public async deposit(params: PublicParams.Deposit) {
    const client = this.getClient();
    const assetId = params.assetId || AddressZero;
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.deposit(params);
    return {
      freeBalanceOffChain: response.freeBalance[client.signerAddress].toString(),
      freeBalanceOnChain: await getFreeBalanceOnChain(client, assetId),
    };
  }

  public async subscribe(params: EventSubscriptionParams): Promise<{ id: string }> {
    const client = this.getClient();
    const subscription = await this._subscriber.subscribe(client, params);
    return { id: subscription.id };
  }

  public async subscribeBatch(
    paramsArr: EventSubscriptionParams[],
  ): Promise<{ subscriptions: EventSubscription[] }> {
    const client = this.getClient();
    const subscriptions = await this._subscriber.batchSubscribe(client, paramsArr);
    return { subscriptions };
  }

  public async unsubscribe(id: string) {
    const client = this.getClient();
    await this._subscriber.unsubscribe(client, id);
    return { success: true };
  }

  public async unsubscribeBatch(idsArr: string[]) {
    const client = this.getClient();
    await this._subscriber.batchUnsubscribe(client, idsArr);
    return { success: true };
  }

  public async unsubscribeAll() {
    const client = this.getClient();
    await this._subscriber.clearAllSubscriptions(client);
    return { success: true };
  }

  // -- Private ---------------------------------------------------------------- //

  private getClient(): IConnextClient {
    if (!this._client) {
      throw new Error("Client is not initialized");
    }
    return this._client;
  }

  private async updateClient(
    client: IConnextClient,
    initOpts: Partial<InitOptions>,
    subscriptions?: EventSubscription[],
  ) {
    if (this._client) {
      await this._subscriber.clearAllSubscriptions(this._client);
    }
    this._client = client;
    await this.initSubscriptions(subscriptions);
    await storeInitOptions(initOpts, this._store);
  }

  private async initSubscriptions(subscriptions?: EventSubscription[]) {
    if (subscriptions && subscriptions.length) {
      const client = this.getClient();
      await this._subscriber.batchResubscribe(client, subscriptions);
    }
  }
}
