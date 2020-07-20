import { getFileStore } from "@connext/store";
import * as connext from "@connext/client";

import {
  IConnextClient,
  IStoreService,
  ConditionalTransferTypes,
  PublicParams,
} from "@connext/types";
import { Wallet, constants } from "ethers";

import {
  fetchAll,
  storeMnemonic,
  storeInitOptions,
  getClientBalance,
  getFreeBalanceOnChain,
  EventSubscriptionParams,
  InitClientOptions,
  ConnectOptions,
  EventSubscription,
  transferOnChain,
  GetBalanceResponse,
  PostTransactionResponse,
  PostHashLockTransferResponse,
  SubscriptionResponse,
  BatchSubscriptionResponse,
  GenericSuccessResponse,
  GetAppInstanceDetailsResponse,
  GetConfigResponse,
  GetHashLockStatusResponse,
  PostHashLockResolveResponse,
  PostWithdrawResponse,
  PostWithdrawRequestParams,
  PostHashLockTransferRequestParams,
  PostDepositRequestParams,
  PostHashLockResolveRequestParams,
  PostTransactionRequestParams,
  PostSwapRequestParams,
  PostSwapResponse,
  PostLinkedTransferRequestParams,
  PostLinkedTransferResponse,
  GetLinkedStatusResponse,
  PostLinkedResolveRequestParams,
  PostLinkedResolveResponse,
  GetTransferHistory,
  AppConfig,
} from "./helpers";
import Subscriber from "./subscriber";

const { AddressZero } = constants;

export default class Client {
  public static async init(logger: any, appConfig: AppConfig): Promise<Client> {
    const store = getFileStore(appConfig.storeDir);
    await store.init();
    const { mnemonic, initOptions } = await fetchAll(store);
    const client = new Client({ mnemonic, logger, store }, appConfig);
    if (initOptions && Object.keys(initOptions).length) {
      await client.connect(initOptions);
    }
    return client;
  }

  private _client: IConnextClient | undefined;
  private _logger: any;
  private _mnemonic: string | undefined;
  private _subscriber: Subscriber;
  private _store: IStoreService;
  private _initializing = false;
  private _appConfig: AppConfig;

  constructor(opts: InitClientOptions, appConfig: AppConfig) {
    this._logger = opts.logger;
    this._mnemonic = opts.mnemonic;
    this._subscriber = new Subscriber(opts.logger, opts.store);
    this._store = opts.store;
    this._appConfig = appConfig;
  }

  get mnemonic(): string {
    return this._mnemonic || this._appConfig.mnemonic;
  }

  set mnemonic(value: string) {
    this._mnemonic = value;
  }

  public async connect(opts?: Partial<ConnectOptions>): Promise<IConnextClient> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (!mnemonic) {
      throw new Error("Cannot init Connext client without mnemonic");
    }

    if (this._initializing) {
      throw new Error(`Client is initializing`);
    }

    if (this._client) {
      this._logger.info("Client is already connected - skipping connect logic");
      return this._client;
    }

    this._initializing = true;
    this.setMnemonic(mnemonic);
    const network = opts?.network || this._appConfig.network;
    const ethProviderUrl = opts?.ethProviderUrl || this._appConfig.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || this._appConfig.nodeUrl;
    const logLevel = opts?.logLevel || this._appConfig.logLevel;
    const signer = Wallet.fromMnemonic(mnemonic).privateKey;
    const clientOpts = { signer, store: this._store, ethProviderUrl, nodeUrl, logLevel };
    try {
      const client = await connext.connect(network, clientOpts);
      this._client = client;
      this._logger.info("Client initialized successfully");
      return client;
    } finally {
      this._initializing = false;
    }
  }

  public async getConfig(): Promise<GetConfigResponse> {
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

  public async getTransferHistory(): Promise<GetTransferHistory> {
    const client = this.getClient();
    const transferHistory = await client.getTransferHistory();
    return transferHistory;
  }

  public async getAppInstanceDetails(
    appIdentityHash: string,
  ): Promise<GetAppInstanceDetailsResponse> {
    const client = this.getClient();
    const appDetails = await client.getAppInstance(appIdentityHash);
    if (typeof appDetails === "undefined") {
      throw new Error(`No App Instance found with appIdentityHash: ${appIdentityHash}`);
    }
    const data = appDetails;
    return data;
  }

  public async hashLockTransfer(
    params: PostHashLockTransferRequestParams,
  ): Promise<PostHashLockTransferResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.conditionalTransfer({
      conditionType: ConditionalTransferTypes.HashLockTransfer,
      amount: params.amount,
      recipient: params.recipient,
      lockHash: params.lockHash,
      assetId: params.assetId,
      meta: params.meta,
      timelock: params.timelock,
    } as PublicParams.ConditionalTransfer);
    const appDetails = await this.getAppInstanceDetails(response.appIdentityHash);
    const data = { ...response, ...appDetails };
    return data;
  }

  public async hashLockResolve(
    params: PostHashLockResolveRequestParams,
  ): Promise<PostHashLockResolveResponse> {
    const client = this.getClient();
    const response = await client.resolveCondition({
      conditionType: ConditionalTransferTypes.HashLockTransfer,
      preImage: params.preImage,
      assetId: params.assetId,
    } as PublicParams.ResolveHashLockTransfer);
    return response;
  }

  public async hashLockStatus(
    lockHash: string,
    assetId: string,
  ): Promise<GetHashLockStatusResponse> {
    const client = this.getClient();
    const response = await client.getHashLockTransfer(lockHash, assetId);
    if (!response) {
      throw new Error(
        `No HashLock Transfer found for lockHash: ${lockHash} and assetId: ${assetId}`,
      );
    }
    return response;
  }

  public async linkedStatus(paymentId: string): Promise<GetLinkedStatusResponse> {
    const client = this.getClient();
    const response = await client.getLinkedTransfer(paymentId);
    if (!response) {
      throw new Error(`No Linked Transfer found for paymentId: ${paymentId}`);
    }
    const data = response;
    return data;
  }

  public async linkedTransfer(
    params: PostLinkedTransferRequestParams,
  ): Promise<PostLinkedTransferResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.conditionalTransfer({
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      amount: params.amount,
      recipient: params.recipient,
      preImage: params.preImage,
      assetId: params.assetId,
      meta: params.meta,
    } as PublicParams.ConditionalTransfer);
    const appDetails = await this.getAppInstanceDetails(response.appIdentityHash);
    const data = { ...response, ...appDetails };
    return data;
  }

  public async linkedResolve(
    params: PostLinkedResolveRequestParams,
  ): Promise<PostLinkedResolveResponse> {
    const client = this.getClient();
    const response = await client.resolveCondition({
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      preImage: params.preImage,
      paymentId: params.paymentId,
    } as PublicParams.ResolveLinkedTransfer);
    const data = response;
    return data;
  }

  public async balance(assetId: string): Promise<GetBalanceResponse> {
    const client = this.getClient();
    return getClientBalance(client, assetId);
  }

  public async setMnemonic(mnemonic: string): Promise<void> {
    await storeMnemonic(mnemonic, this._store);
    this._mnemonic = mnemonic;
    this._logger.info("Mnemonic set successfully");
  }

  public async deposit(params: PostDepositRequestParams): Promise<GetBalanceResponse> {
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

  public async swap(params: PostSwapRequestParams): Promise<PostSwapResponse> {
    const client = this.getClient();
    await client.swap(params);
    return {
      fromAssetIdBalance: await getFreeBalanceOnChain(client, params.fromAssetId),
      toAssetIdBalance: await getFreeBalanceOnChain(client, params.toAssetId),
    };
  }

  public async withdraw(params: PostWithdrawRequestParams): Promise<PostWithdrawResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.withdraw(params);
    return { txhash: response.transaction.hash };
  }

  public async transferOnChain(
    params: PostTransactionRequestParams,
  ): Promise<PostTransactionResponse> {
    const client = this.getClient();
    const txhash = await transferOnChain({
      mnemonic: this.mnemonic,
      ethProvider: client.ethProvider,
      assetId: params.assetId,
      amount: params.amount,
      recipient: params.recipient,
    });
    return { txhash };
  }

  public async subscribe(params: EventSubscriptionParams): Promise<SubscriptionResponse> {
    const client = this.getClient();
    const subscription = await this._subscriber.subscribe(client, params);
    return { id: subscription.id };
  }

  public async subscribeBatch(
    paramsArr: EventSubscriptionParams[],
  ): Promise<BatchSubscriptionResponse> {
    const client = this.getClient();
    const subscriptions = await this._subscriber.batchSubscribe(client, paramsArr);
    return { subscriptions };
  }

  public async unsubscribe(id: string): Promise<GenericSuccessResponse> {
    const client = this.getClient();
    await this._subscriber.unsubscribe(client, id);
    return { success: true };
  }

  public async unsubscribeBatch(idsArr: string[]): Promise<GenericSuccessResponse> {
    const client = this.getClient();
    await this._subscriber.batchUnsubscribe(client, idsArr);
    return { success: true };
  }

  public async unsubscribeAll(): Promise<GenericSuccessResponse> {
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
    initOpts: Partial<ConnectOptions>,
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
