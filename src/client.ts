import * as connext from "@connext/client";
import { getRandomBytes32 } from "@connext/utils";
import { IConnextClient, ConditionalTransferTypes, PublicParams } from "@connext/types";
import { Wallet, constants } from "ethers";

import {
  getClientBalance,
  getFreeBalanceOnChain,
  EventSubscriptionParams,
  InitClientManagerOptions,
  transferOnChain,
  SubscriptionResponse,
  BatchSubscriptionResponse,
  GenericSuccessResponse,
  RouteMethods,
  getStore,
  InternalConnectOptions,
} from "./helpers";
import Subscriber from "./subscriber";

const { AddressZero } = constants;

export default class Client {
  public wallet: Wallet | undefined;
  public client: IConnextClient | undefined;

  private logger: any;
  private subscriber: Subscriber;
  private connecting = false;
  private logLevel: number;

  constructor(opts: InitClientManagerOptions) {
    this.subscriber = new Subscriber(opts.logger, opts.store);
    this.logger = opts.logger;
    this.logLevel = opts.logLevel;
  }

  public async connect(
    rootStoreDir: string,
    opts: InternalConnectOptions,
  ): Promise<IConnextClient> {
    if (this.connecting) {
      throw new Error(`Client is connecting`);
    }

    if (this.client) {
      this.logger.info("Client is already connected - skipping connect logic");
      return this.client;
    }

    this.connecting = true;
    const clientOpts = {
      store: await getStore(rootStoreDir, this.wallet),
      signer: opts.signer,
      ethProviderUrl: opts.ethProviderUrl,
      nodeUrl: opts.nodeUrl,
      logLevel: this.logLevel,
    };
    try {
      const client = await connext.connect(clientOpts);
      this.client = client;
      this.logger.info("Client initialized successfully");
      return client;
    } finally {
      this.connecting = false;
    }
  }

  public async getConfig(): Promise<RouteMethods.GetConfigResponse> {
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

  public async getTransferHistory(): Promise<RouteMethods.GetTransferHistoryResponse> {
    const client = this.getClient();
    const transferHistory = await client.getTransferHistory();
    return transferHistory;
  }

  public async getAppInstanceDetails(
    appIdentityHash: string,
  ): Promise<RouteMethods.GetAppInstanceDetailsResponse> {
    const client = this.getClient();
    const appDetails = await client.getAppInstance(appIdentityHash);
    if (typeof appDetails === "undefined") {
      throw new Error(`No App Instance found with appIdentityHash: ${appIdentityHash}`);
    }
    const data = appDetails;
    return data;
  }

  public async hashLockTransfer(
    params: RouteMethods.PostHashLockTransferRequestParams,
  ): Promise<RouteMethods.PostHashLockTransferResponse> {
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
    params: RouteMethods.PostHashLockResolveRequestParams,
  ): Promise<RouteMethods.PostHashLockResolveResponse> {
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
  ): Promise<RouteMethods.GetHashLockStatusResponse> {
    const client = this.getClient();
    const response = await client.getHashLockTransfer(lockHash, assetId);
    if (!response) {
      throw new Error(
        `No HashLock Transfer found for lockHash: ${lockHash} and assetId: ${assetId}`,
      );
    }
    return response;
  }

  public async linkedStatus(paymentId: string): Promise<RouteMethods.GetLinkedStatusResponse> {
    const client = this.getClient();
    const response = await client.getLinkedTransfer(paymentId);
    if (!response) {
      throw new Error(`No Linked Transfer found for paymentId: ${paymentId}`);
    }
    const data = response;
    return data;
  }

  public async linkedTransfer(
    params: RouteMethods.PostLinkedTransferRequestParams,
  ): Promise<RouteMethods.PostLinkedTransferResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const paymentId = params.paymentId || getRandomBytes32();
    const preImage = params.preImage || getRandomBytes32();
    const response = await client.conditionalTransfer({
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      amount: params.amount,
      recipient: params.recipient,
      preImage,
      paymentId,
      assetId: params.assetId,
      meta: params.meta,
    } as PublicParams.ConditionalTransfer);
    const appDetails = await this.getAppInstanceDetails(response.appIdentityHash);
    const data = { ...response, ...appDetails };
    return data;
  }

  public async linkedResolve(
    params: RouteMethods.PostLinkedResolveRequestParams,
  ): Promise<RouteMethods.PostLinkedResolveResponse> {
    const client = this.getClient();
    const response = await client.resolveCondition({
      conditionType: ConditionalTransferTypes.LinkedTransfer,
      preImage: params.preImage,
      paymentId: params.paymentId,
    } as PublicParams.ResolveLinkedTransfer);
    const data = response;
    return data;
  }

  public async balance(assetId: string): Promise<RouteMethods.GetBalanceResponse> {
    const client = this.getClient();
    return getClientBalance(client, assetId);
  }

  public async deposit(
    params: RouteMethods.PostDepositRequestParams,
  ): Promise<RouteMethods.GetBalanceResponse> {
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

  public async swap(
    params: RouteMethods.PostSwapRequestParams,
  ): Promise<RouteMethods.PostSwapResponse> {
    const client = this.getClient();
    await client.swap(params);
    return {
      fromAssetIdBalance: await getFreeBalanceOnChain(client, params.fromAssetId),
      toAssetIdBalance: await getFreeBalanceOnChain(client, params.toAssetId),
    };
  }

  public async withdraw(
    params: RouteMethods.PostWithdrawRequestParams,
  ): Promise<RouteMethods.PostWithdrawResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.withdraw(params);
    return { txhash: response.transaction.hash };
  }

  public async transferOnChain(
    params: RouteMethods.PostTransactionRequestParams,
  ): Promise<RouteMethods.PostTransactionResponse> {
    const client = this.getClient();
    if (!this.wallet) {
      throw new Error("Client signer wallet is not initialized");
    }
    const txhash = await transferOnChain({
      wallet: this.wallet,
      ethProvider: client.ethProvider,
      assetId: params.assetId,
      amount: params.amount,
      recipient: params.recipient,
    });
    return { txhash };
  }

  public async subscribe(params: EventSubscriptionParams): Promise<SubscriptionResponse> {
    const client = this.getClient();
    const subscription = await this.subscriber.subscribe(client, params);
    return { id: subscription.id };
  }

  public async subscribeBatch(
    paramsArr: EventSubscriptionParams[],
  ): Promise<BatchSubscriptionResponse> {
    const client = this.getClient();
    const subscriptions = await this.subscriber.batchSubscribe(client, paramsArr);
    return { subscriptions };
  }

  public async unsubscribe(id: string): Promise<GenericSuccessResponse> {
    const client = this.getClient();
    await this.subscriber.unsubscribe(client, id);
    return { success: true };
  }

  public async unsubscribeBatch(idsArr: string[]): Promise<GenericSuccessResponse> {
    const client = this.getClient();
    await this.subscriber.batchUnsubscribe(client, idsArr);
    return { success: true };
  }

  public async unsubscribeAll(): Promise<GenericSuccessResponse> {
    const client = this.getClient();
    await this.subscriber.clearAllSubscriptions(client);
    return { success: true };
  }

  public getClient(): IConnextClient {
    if (!this.client) {
      throw new Error("Client is not initialized");
    }
    return this.client;
  }
}
