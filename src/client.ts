import * as connext from "@connext/client";
import {
  getRandomBytes32,
  getPublicIdentifierFromPublicKey,
  getPublicKeyFromPrivateKey,
} from "@connext/utils";
import { IConnextClient, ConditionalTransferTypes, PublicParams } from "@connext/types";
import { Wallet, constants, BigNumber } from "ethers";

import {
  getClientBalance,
  getFreeBalanceOnChain,
  EventSubscriptionParams,
  InitClientManagerOptions,
  SubscriptionResponse,
  BatchSubscriptionResponse,
  GenericSuccessResponse,
  RouteMethods,
  getStore,
  InternalConnectOptions,
  mintToken,
  transferEth,
  transferToken,
} from "./helpers";
import Subscriber from "./subscriber";

const { AddressZero, HashZero } = constants;

export default class Client {
  public client: IConnextClient | undefined;

  private logger: any;
  private subscriber: Subscriber;
  private connecting = false;
  private logLevel: number;
  private cleanUpInterval: NodeJS.Timeout | undefined;
  private cleanningUp = false;

  constructor(opts: InitClientManagerOptions) {
    this.subscriber = new Subscriber(opts.logger, opts.store);
    this.logger = opts.logger;
    this.logLevel = opts.logLevel;
  }

  public async connect(
    rootStoreDir: string,
    opts: InternalConnectOptions,
  ): Promise<IConnextClient> {
    if (this.cleanningUp) throw new Error(`Client is cleanning up`);

    if (this.connecting) {
      throw new Error(`Client is connecting`);
    }
    if (this.client) {
      this.logger.info("Client is already connected - skipping connect logic");
      return this.client;
    }

    this.connecting = true;
    const publicIdentifier = getPublicIdentifierFromPublicKey(
      getPublicKeyFromPrivateKey(opts.signer),
    );
    const store = await getStore(rootStoreDir, publicIdentifier);
    const clientOpts = {
      store,
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
      this.scheduleCleanup();
    }
  }

  public scheduleCleanup(): void {
    if (typeof this.cleanUpInterval !== "undefined") clearInterval(this.cleanUpInterval);
    this.cleanUpInterval = setInterval(
      this.cleanupRegistryApps,
      86_400_000, // 24 hours
    );
  }

  public async cleanupRegistryApps(): Promise<void> {
    const client = this.getClient();
    this.cleanningUp = true;
    // TODO: expose method in Connext client
    await client.cleanupRegistryApps();
    this.cleanningUp = false;
  }

  public getConfig(): RouteMethods.GetConfigResponse {
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

  public rejectInstallApp(
    appIdentityHash: string,
    reason?: string,
  ): Promise<RouteMethods.PostRejectInstallResponse> {
    const client = this.getClient();
    return client.rejectInstallApp(appIdentityHash, reason);
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
      preImage: params.preImage || HashZero,
      assetId: params.assetId,
      paymentId: params.paymentId,
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
    return { ...response, paymentId: response.meta.paymentId };
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

  public balance(assetId: string): Promise<RouteMethods.GetBalanceResponse> {
    const client = this.getClient();
    return getClientBalance(client, assetId);
  }

  public async fund(
    amount: string,
    assetId: string,
    fundingMnemonic: string,
  ): Promise<RouteMethods.PostFundResponse> {
    const client = this.getClient();
    const wallet = Wallet.fromMnemonic(fundingMnemonic).connect(client.ethProvider);
    await client.requestDepositRights({ assetId });
    let txhash: string;
    const balance = await getFreeBalanceOnChain(wallet.address, client.ethProvider, assetId);
    if (assetId !== constants.AddressZero) {
      if (BigNumber.from(balance).lte(BigNumber.from(amount))) {
        try {
          txhash = await mintToken(wallet, client.multisigAddress, amount, assetId);
        } catch (e) {
          throw new Error(`Failed to mint token for assetId: ${assetId}`);
        }
      } else {
        txhash = await transferToken(wallet, client.multisigAddress, amount, assetId);
      }
    } else {
      if (BigNumber.from(balance).lte(BigNumber.from(amount))) {
        throw new Error(`Insufficient ETH balance to fund channel`);
      }
      txhash = await transferEth(wallet, client.multisigAddress, amount);
    }
    await client.rescindDepositRights({ assetId });
    return { txhash };
  }

  public async deposit(
    params: RouteMethods.PostDepositRequestParams,
  ): Promise<RouteMethods.PostDepositResponse> {
    const client = this.getClient();
    if (params.assetId === AddressZero) {
      delete params.assetId;
    }
    const response = await client.deposit(params);
    return { txhash: response.transaction.hash };
  }

  public async requestCollateral(
    params: RouteMethods.PostRequestCollateralRequestParams,
  ): Promise<void> {
    const client = this.getClient();
    await client.requestCollateral(params.assetId);
  }

  public async swap(
    params: RouteMethods.PostSwapRequestParams,
  ): Promise<RouteMethods.PostSwapResponse> {
    const client = this.getClient();
    await client.swap(params);
    return {
      fromAssetIdBalance: await getFreeBalanceOnChain(
        client.signerAddress,
        client.ethProvider,
        params.fromAssetId,
      ),
      toAssetIdBalance: await getFreeBalanceOnChain(
        client.signerAddress,
        client.ethProvider,
        params.toAssetId,
      ),
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
    if (this.cleanningUp) throw new Error(`Client is cleanning up`);
    return this.client;
  }
}
