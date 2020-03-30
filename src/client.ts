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
import { saveMnemonic } from "./utilities";

interface InitOptions extends ClientOptions {
  network?: string;
}

export default class ClientManager {
  private _client: IConnextClient | undefined;
  private _mnemonic: string | undefined;

  constructor(mnemonic?: string) {
    this._mnemonic = mnemonic;
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

  async initClient(opts?: Partial<InitOptions>): Promise<IConnextClient> {
    const mnemonic = opts?.mnemonic || this.mnemonic;
    if (!mnemonic) {
      throw new Error("Cannot init Connext client without mnemonic");
    }
    this.setMnemonic(mnemonic);
    const network = opts?.network || config.network;
    const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || config.nodeUrl;
    const store = new ConnextStore("Memory");
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

  async getClient(): Promise<IConnextClient> {
    let client = this._client;
    if (!client) {
      client = await this.initClient();
    }
    return client;
  }

  async hashLockTransfer(opts: HashLockTransferParameters): Promise<ConditionalTransferResponse> {
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

  async hashLockResolve(preImage: string): Promise<ResolveConditionResponse> {
    const client = await this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HashLockTransfer",
      preImage,
    } as ResolveHashLockTransferParameters);
    return response;
  }

  async hashLockStatus(lockHash: string) {
    const client = await this.getClient();
    const response = await client.getHashLockTransfer(lockHash);
    if (!response) {
      throw new Error(`No HashLock Transfer found for lockHash: ${lockHash}`);
    }
    return response;
  }

  async balance(assetId: string) {
    const client = await this.getClient();
    const freeBalance = await client.getFreeBalance(assetId);
    return { freeBalance: freeBalance[client.freeBalanceAddress].toString() };
  }

  async setMnemonic(mnemonic: string) {
    await saveMnemonic(mnemonic, config.storeDir);
    this._mnemonic = mnemonic;
  }

  async deposit(params: DepositParameters) {
    const client = await this.getClient();
    const response = await client.deposit(params);
    return { freeBalance: response.freeBalance[client.freeBalanceAddress].toString() };
  }
}
