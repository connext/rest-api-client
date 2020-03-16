import * as connext from "@connext/client";
import { ConnextStore, FileStorage } from "@connext/store";
import {
  IConnextClient,
  ClientOptions,
  ChannelProviderConfig,
  HashLockTransferParameters,
} from "@connext/types";

import config from "./config";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";

let _client: IConnextClient;

interface InitOptions extends ClientOptions {
  network?: string;
}

export async function init(opts?: Partial<InitOptions>): Promise<Partial<ChannelProviderConfig>> {
  const mnemonic = opts?.mnemonic || process.env.CONNEXT_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Cannot init Connext client without mnemonic");
  }
  const network = opts?.network || config.network;
  const ethProviderUrl = opts?.ethProviderUrl || config.ethProviderUrl;
  const nodeUrl = opts?.nodeUrl || config.ethProviderUrl;
  const store = new ConnextStore(new FileStorage());
  _client = await connext.connect(network, { ethProviderUrl, nodeUrl, mnemonic, store });
  const channelProviderConfig = {
    ...EMPTY_CHANNEL_PROVIDER_CONFIG,
    ..._client.channelProvider.config,
  };
  return channelProviderConfig;
}

export async function get(): Promise<IConnextClient> {
  if (!_client) {
    await init();
  }
  return _client;
}

export async function hashLockTransfer(opts: HashLockTransferParameters) {
  if (!opts.assetId) {
    throw new Error("Cannot transfer without assetId defined");
  }
  const client = await get();
  const response = await client.conditionalTransfer({
    amount: opts.amount,
    conditionType: "HASHLOCK_TRANSFER",
    preImage: opts.preImage,
    assetId: opts.assetId,
    meta: opts.meta,
  } as HashLockTransferParameters);
  return response;
}

export async function balance(assetId: string) {
  const client = await get();
  const freeBalance = await client.getFreeBalance(assetId);
  return freeBalance[client.multisigAddress].toString();
}
