import * as connext from "@connext/client";
import { ConnextStore, FileStorage } from "@connext/store";
import {
  IConnextClient,
  ClientOptions,
  ChannelProviderConfig,
  HashLockTransferParameters,
  ResolveHashLockTransferParameters,
} from "@connext/types";

import config from "./config";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";
import { requireBodyParam } from "./utilities";

interface InitOptions extends ClientOptions {
  network?: string;
}

export default class ClientManager {
  private _client: IConnextClient | undefined;
  private _mnemonic: string | undefined;

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
    const network = opts?.network || config.network;
    const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
    const nodeUrl = opts?.nodeUrl || config.ethProviderUrl;
    const store = new ConnextStore(new FileStorage());
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

  async hashLockTransfer(opts: HashLockTransferParameters) {
    if (!opts.assetId) {
      throw new Error("Cannot transfer without assetId defined");
    }
    const client = await this.getClient();
    const response = await client.conditionalTransfer({
      amount: opts.amount,
      conditionType: "HASHLOCK_TRANSFER",
      preImage: opts.preImage,
      assetId: opts.assetId,
      meta: opts.meta,
    } as HashLockTransferParameters);
    return response;
  }

  async resolveHashLock(preImage: string) {
    const client = await this.getClient();
    const response = await client.resolveCondition({
      conditionType: "HASHLOCK_TRANSFER",
      preImage,
    } as ResolveHashLockTransferParameters);
    return response;
  }

  async balance(assetId: string) {
    const client = await this.getClient();
    const freeBalance = await client.getFreeBalance(assetId);
    return { freeBalance: freeBalance[client.multisigAddress].toString() };
  }
}
