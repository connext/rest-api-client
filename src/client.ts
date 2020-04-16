import * as connext from "@connext/client";
import { ConnextStore } from "@connext/store";
import { IConnextClient, ChannelProviderConfig, PublicParams, StoreTypes } from "@connext/types";
import { Wallet } from "ethers";

import config from "./config";

import {
  storeMnemonic,
  storeInitOptions,
  getClientBalance,
  getFreeBalanceOnChain,
  deBigNumberifyJson,
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

  constructor(opts: InitClientManagerOptions) {
    this._logger = opts.logger;
    this._mnemonic = opts.mnemonic;
    this._subscriber = new Subscriber(opts.logger);
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
    this.setMnemonic(mnemonic);
    const network = opts?.network || config.network;
    const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || config.nodeUrl;
    const store = new ConnextStore(StoreTypes.File, { fileDir: config.storeDir });
    const signer = Wallet.fromMnemonic(mnemonic).privateKey;
    const clientOpts = { signer, store, ethProviderUrl, nodeUrl };
    const client = await connext.connect(network, clientOpts);
    const initOpts = { network, ...clientOpts };
    await this.updateClient(client, initOpts, subscriptions);
    this._logger.info("Client initialized successfully");
    return client;
  }

  public async getClient(): Promise<IConnextClient> {
    let client = this._client;
    if (!client) {
      client = await this.initClient();
    }
    return client;
  }

  public async getConfig(): Promise<Partial<ChannelProviderConfig>> {
    const client = await this.getClient();
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
    const client = await this.getClient();
    const appDetails = await client.getAppInstance(appIdentityHash);
    const data = deBigNumberifyJson(appDetails);
    return data;
  }

  public async hashLockTransfer(params: PublicParams.HashLockTransfer) {
    const client = await this.getClient();
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
    const data = deBigNumberifyJson({ ...response, ...appDetails });
    return data;
  }

  public async hashLockResolve(preImage: string) {
    const client = await this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HashLockTransfer",
      preImage,
    } as PublicParams.ResolveHashLockTransfer);
    const data = deBigNumberifyJson(response);
    return data;
  }

  public async hashLockStatus(lockHash: string) {
    const client = await this.getClient();
    const response = await client.getHashLockTransfer(lockHash);
    if (!response) {
      throw new Error(`No HashLock Transfer found for lockHash: ${lockHash}`);
    }
    const data = deBigNumberifyJson(response);
    return data;
  }

  public async balance(assetId: string) {
    const client = await this.getClient();
    return getClientBalance(client, assetId);
  }

  public async setMnemonic(mnemonic: string) {
    await storeMnemonic(mnemonic, config.storeDir);
    this._mnemonic = mnemonic;
    this._logger.info("Mnemonic set successfully");
  }

  public async deposit(params: PublicParams.Deposit) {
    const client = await this.getClient();
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
    const client = await this.getClient();
    const subscription = await this._subscriber.subscribe(client, params);
    return { id: subscription.id };
  }

  public async subscribeBatch(
    paramsArr: EventSubscriptionParams[],
  ): Promise<{ subscriptions: EventSubscription[] }> {
    const client = await this.getClient();
    const subscriptions = await this._subscriber.batchSubscribe(client, paramsArr);
    return { subscriptions };
  }

  public async unsubscribe(id: string) {
    const client = await this.getClient();
    await this._subscriber.unsubscribe(client, id);
    return { success: true };
  }

  public async unsubscribeBatch(idsArr: string[]) {
    const client = await this.getClient();
    await this._subscriber.batchUnsubscribe(client, idsArr);
    return { success: true };
  }

  public async unsubscribeAll() {
    const client = await this.getClient();
    await this._subscriber.clearAllSubscriptions(client);
    return { success: true };
  }

  private async updateClient(
    client: IConnextClient,
    initOpts: Partial<InitOptions>,
    subscriptions?: EventSubscription[],
  ) {
    console.log("updateClient", "subscriptions.length", subscriptions?.length);
    if (this._client) {
      await this._subscriber.clearAllSubscriptions(this._client);
    }
    this._client = client;
    await this.initSubscriptions(subscriptions);
    await await storeInitOptions(initOpts, config.storeDir);
  }

  private async initSubscriptions(subscriptions?: EventSubscription[]) {
    if (subscriptions && subscriptions.length) {
      const client = await this.getClient();
      console.log("initSubscriptions", "subscriptions.length", subscriptions.length);
      await this._subscriber.batchResubscribe(client, subscriptions);
    }
  }
}
