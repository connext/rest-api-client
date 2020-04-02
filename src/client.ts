import * as connext from "@connext/client";
import { ConnextStore } from "@connext/store";
import {
  IConnextClient,
  ChannelProviderConfig,
  HashLockTransferParameters,
  ResolveHashLockTransferParameters,
  DepositParameters,
  ConditionalTransferResponse,
  ResolveConditionResponse,
  deBigNumberifyJson,
} from "@connext/types";

import config from "./config";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";
import { storeMnemonic, storeInitOptions } from "./utilities";
import {
  EventSubscriptionParams,
  InitClientManagerOptions,
  InitOptions,
  EventSubscription,
} from "./types";
import Subscriber from "./subscriber";

export default class ClientManager {
  private _client: IConnextClient | undefined;
  private _logger: any;
  private _mnemonic: string | undefined;
  private _subscriber: Subscriber;

  constructor(opts: InitClientManagerOptions) {
    this._logger = opts.logger;
    this._mnemonic = opts.mnemonic;
    this._subscriber = new Subscriber(opts.logger);
    this.initSubscriptions(opts.subscriptions);
  }

  get mnemonic(): string {
    return this._mnemonic || config.mnemonic;
  }

  set mnemonic(value: string) {
    this._mnemonic = value;
  }

  public async initClient(opts?: Partial<InitOptions>): Promise<IConnextClient> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (!mnemonic) {
      throw new Error("Cannot init Connext client without mnemonic");
    }
    this.setMnemonic(mnemonic);
    const network = opts?.network || config.network;
    const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || config.nodeUrl;
    const store = new ConnextStore("File", { fileDir: config.storeDir });
    const clientOpts: any = { mnemonic, store };
    if (ethProviderUrl) {
      clientOpts.ethProviderUrl = ethProviderUrl;
    }
    if (nodeUrl) {
      clientOpts.nodeUrl = nodeUrl;
    }
    const client = await connext.connect(network, clientOpts);
    this._client = client;
    await storeInitOptions(
      {
        network,
        ...clientOpts,
      },
      config.storeDir,
    );
    this._logger.info("Client initialized successfully");
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
      ...EMPTY_CHANNEL_PROVIDER_CONFIG,
      ...client.channelProvider.config,
    };
    if (!config.multisigAddress) {
      throw new Error("Connext Client Not Yet Initialized");
    }
    return config;
  }

  public async getAppInstanceDetails(appInstanceId: string) {
    const client = await this.getClient();
    const response = client.getAppInstanceDetails(appInstanceId);
    const data = deBigNumberifyJson(response);
    return data;
  }

  public async hashLockTransfer(
    opts: HashLockTransferParameters,
  ): Promise<ConditionalTransferResponse> {
    const client = await this.getClient();
    const response = await client.conditionalTransfer({
      amount: opts.amount,
      recipient: opts.recipient,
      conditionType: "HashLockTransfer",
      lockHash: opts.lockHash,
      assetId: opts.assetId,
      meta: opts.meta,
      timelock: opts.timelock,
    });
    // TODO: To be removed once https://github.com/ConnextProject/indra/pull/953 is merged
    // @ts-ignore
    const appId = response.transferAppInstanceId || response.appId;
    const appDetails = await client.getAppInstanceDetails(appId);
    const data = deBigNumberifyJson({ ...response, ...appDetails });
    return data;
  }

  public async hashLockResolve(preImage: string): Promise<ResolveConditionResponse> {
    const client = await this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HashLockTransfer",
      preImage,
    } as ResolveHashLockTransferParameters);
    const appDetails = await client.getAppInstanceDetails(response.appId);
    const data = deBigNumberifyJson({ ...response, ...appDetails });
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
    const freeBalance = await client.getFreeBalance(assetId);
    return { freeBalance: freeBalance[client.freeBalanceAddress].toString() };
  }

  public async setMnemonic(mnemonic: string) {
    await storeMnemonic(mnemonic, config.storeDir);
    this._mnemonic = mnemonic;
    this._logger.info("Mnemonic set successfully");
  }

  public async deposit(params: DepositParameters) {
    const client = await this.getClient();
    const response = await client.deposit(params);
    return { freeBalance: response.freeBalance[client.freeBalanceAddress].toString() };
  }

  public async subscribe(params: EventSubscriptionParams): Promise<{ id: string }> {
    const client = await this.getClient();
    const subscription = await this._subscriber.subscribe(client, params);
    return { id: subscription.id };
  }

  public async unsubscribe(id: string) {
    const client = await this.getClient();
    await this._subscriber.unsubscribe(client, id);
    return { success: true };
  }

  private async initSubscriptions(subscriptions?: EventSubscription[]) {
    if (subscriptions && subscriptions.length) {
      const client = await this.getClient();
      this._subscriber.batchResubscribe(client, subscriptions);
    }
  }
}
