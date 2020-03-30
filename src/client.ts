import { EventEmitter } from "events";
import axios from "axios";
import * as connext from "@connext/client";
import { ConnextStore } from "@connext/store";
import {
  IConnextClient,
  ClientOptions,
  ChannelProviderConfig,
  HashLockTransferParameters,
  ResolveHashLockTransferParameters,
  DepositParameters,
  ConditionalTransferResponse,
  ResolveConditionResponse,
} from "@connext/types";

import config from "./config";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";
import { saveMnemonic, saveSubscriptions } from "./utilities";
import { EventSubscriptionParams } from "./types";

interface InitOptions extends ClientOptions {
  network?: string;
}

interface InitClientManagerOptions {
  mnemonic?: string;
  subscriptions?: EventSubscriptionParams[];
}

export default class ClientManager extends EventEmitter {
  private _client: IConnextClient | undefined;
  private _mnemonic: string | undefined;
  private _subscriptions: EventSubscriptionParams[] = [];

  constructor(opts: InitClientManagerOptions) {
    super();
    this._mnemonic = opts.mnemonic;
    this.initSubscriptions(opts.subscriptions);
  }

  get config(): Partial<ChannelProviderConfig> {
    return {
      ...EMPTY_CHANNEL_PROVIDER_CONFIG,
      ...this._client?.channelProvider.config,
    };
  }

  get mnemonic(): string {
    return this._mnemonic || config.mnemonic;
  }

  set mnemonic(value: string) {
    this._mnemonic = value;
  }

  // -- PUBLIC ---------------------------------------------------------------- //

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
    return client;
  }

  public async getClient(): Promise<IConnextClient> {
    let client = this._client;
    if (!client) {
      client = await this.initClient();
    }
    return client;
  }

  public async hashLockTransfer(
    opts: HashLockTransferParameters,
  ): Promise<ConditionalTransferResponse> {
    if (!opts.assetId) {
      throw new Error("Cannot transfer without assetId defined");
    }
    const client = await this.getClient();
    const response = await client.conditionalTransfer({
      amount: opts.amount,
      conditionType: "HashLockTransfer",
      lockHash: opts.lockHash,
      assetId: opts.assetId,
      meta: opts.meta,
      timelock: opts.timelock,
    } as HashLockTransferParameters);
    return response;
  }

  public async hashLockResolve(preImage: string): Promise<ResolveConditionResponse> {
    const client = await this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HashLockTransfer",
      preImage,
    } as ResolveHashLockTransferParameters);
    return response;
  }

  public async hashLockStatus(lockHash: string) {
    const client = await this.getClient();
    const response = await client.getHashLockTransfer(lockHash);
    if (!response) {
      throw new Error(`No HashLock Transfer found for lockHash: ${lockHash}`);
    }
    return response;
  }

  public async balance(assetId: string) {
    const client = await this.getClient();
    const freeBalance = await client.getFreeBalance(assetId);
    return { freeBalance: freeBalance[client.freeBalanceAddress].toString() };
  }

  public async setMnemonic(mnemonic: string) {
    await saveMnemonic(mnemonic, config.storeDir);
    this._mnemonic = mnemonic;
  }

  public async deposit(params: DepositParameters) {
    const client = await this.getClient();
    const response = await client.deposit(params);
    return { freeBalance: response.freeBalance[client.freeBalanceAddress].toString() };
  }

  public async subscribe(subscription: EventSubscriptionParams) {
    await this.updateSubscriptions(subscription);
    const client = await this.getClient();
    this.subscribeOnClient(client, subscription);
  }

  // -- PRIVATE ---------------------------------------------------------------- //

  private async updateSubscriptions(subscription) {
    const subscriptions = this._subscriptions;
    subscriptions.push(subscription);
    this._subscriptions = subscriptions;
    await saveSubscriptions(subscriptions, config.storeDir);
  }

  private getSubscription(event: string) {
    const matches = this._subscriptions.filter(x => x.event === event);
    if (matches && matches.length) {
      return matches[0];
    }
    return null;
  }

  private async onSubscription(event: string, data: any) {
    const subscription = this.getSubscription(event);
    if (subscription) {
      await axios.post(subscription.webhook, data);
    }
  }

  private subscribeOnClient(client: IConnextClient, subscription: EventSubscriptionParams) {
    client.on(subscription.event as any, data => this.onSubscription(subscription.event, data));
  }

  private async initSubscriptions(subscriptions?: EventSubscriptionParams[]) {
    if (subscriptions) {
      const client = await this.getClient();
      subscriptions.forEach(subscription => this.subscribeOnClient(client, subscription));
    }
  }
}
