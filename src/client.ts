import * as connext from "@connext/client";
import { ConnextStore, FileStorage } from "@connext/store";
import {
  IConnextClient,
  ClientOptions,
  ChannelProviderConfig,
  HashLockTransferParameters,
} from "@connext/types";

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
  const network = opts?.network || "rinkeby";
  const baseUrl = connext.utils.isMainnet(network)
    ? "indra.connext.network/api"
    : connext.utils.isRinkeby(network)
    ? "rinkeby.indra.connext.network/api"
    : null;
  const ethProviderUrl = opts?.ethProviderUrl || `https://${baseUrl}/ethprovider`;
  const nodeUrl = opts?.nodeUrl || `nats://${baseUrl}/messaging`;
  const store = new ConnextStore(new FileStorage());
  _client = await connext.connect({ ethProviderUrl, nodeUrl, mnemonic, store });
  const config = { ...EMPTY_CHANNEL_PROVIDER_CONFIG, ..._client.channelProvider.config };
  return config;
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
