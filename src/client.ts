import axios from "axios";
import { v4 as uuid } from "uuid";
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
} from "@connext/types";

import config from "./config";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";
import { storeMnemonic, storeSubscriptions, storeInitOptions } from "./utilities";
import {
  EventSubscriptionParams,
  InitClientManagerOptions,
  InitOptions,
  EventSubscription,
} from "./types";

export default class ClientManager {
  private _client: IConnextClient | undefined;
  private _logger: any;
  private _mnemonic: string | undefined;
  private _subscriptions: EventSubscription[] = [];

  constructor(opts: InitClientManagerOptions) {
    this._logger = opts.logger;
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
    await storeInitOptions(
      {
        network,
        ...clientOpts,
      },
      config.storeDir,
    );
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
    const subscription = this.formatSubscription(params);
    await this.addSubscription(subscription);
    const client = await this.getClient();
    this.subscribeOnClient(client, subscription);
    return { id: subscription.id };
  }

  public async unsubscribe(id: string) {
    const client = await this.getClient();
    this.unsubscribeOnClient(client, id);
    await this.removeSubscription(id);
    return { success: true };
  }

  // -- PRIVATE ---------------------------------------------------------------- //

  private formatSubscription(params: EventSubscriptionParams): EventSubscription {
    return { id: uuid(), params };
  }

  private async persistSubscriptions(subscriptions: EventSubscription[]) {
    this._subscriptions = subscriptions;
    await storeSubscriptions(subscriptions, config.storeDir);
  }

  private async addSubscription(subscription: EventSubscription) {
    const subscriptions = this._subscriptions;
    subscriptions.push(subscription);
    await this.persistSubscriptions(subscriptions);
  }

  private async removeSubscription(id: string) {
    const subscriptions = this._subscriptions.filter(x => x.id !== id);
    await this.persistSubscriptions(subscriptions);
  }

  private getSubscriptionById(id: string) {
    const matches = this._subscriptions.filter(x => x.id === id);
    if (matches && matches.length) {
      return matches[0];
    }
    return null;
  }

  private getSubscriptionsByEvent(event: string) {
    return this._subscriptions.filter(x => x.params.event === event);
  }

  private async onSubscription(event: string, data: any) {
    const subscriptions = this.getSubscriptionsByEvent(event);
    await Promise.all(
      subscriptions.map(async subscription => {
        const { webhook } = subscription.params;
        try {
          await axios.post(webhook, {
            id: subscription.id,
            data,
          });
          this._logger.info(`Successfully pushed event ${event} to webhook: ${webhook}`);
        } catch (error) {
          this._logger.error(error);
        }
      }),
    );
  }

  private subscribeOnClient(client: IConnextClient, subscription: EventSubscription) {
    client.on(subscription.params.event as any, data =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  private unsubscribeOnClient(client: IConnextClient, id: string) {
    const subscription = this.getSubscriptionById(id);
    if (subscription) {
      client.removeListener(subscription.params.event as any, data =>
        this.onSubscription(subscription.params.event, data),
      );
    }
  }

  private async initSubscriptions(subscriptions?: EventSubscription[]) {
    if (subscriptions && subscriptions.length) {
      const client = await this.getClient();
      subscriptions.forEach(subscription => this.subscribeOnClient(client, subscription));
    }
  }
}
