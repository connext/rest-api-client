import * as connext from "@connext/client";
import { ConnextStore, FileStorage } from "@connext/store";
import {
  IConnextClient,
  ClientOptions,
  ChannelProviderConfig,
  TransferParameters,
} from "@connext/types";

import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";

let client: IConnextClient;

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
  client = await connext.connect({ ethProviderUrl, nodeUrl, mnemonic, store });
  const config = { ...EMPTY_CHANNEL_PROVIDER_CONFIG, ...client.channelProvider.config };
  return config;
}

export async function get(): Promise<IConnextClient> {
  if (!client) {
    await init();
  }
  return client;
}

export async function transfer(opts: TransferParameters) {
  const client = await get();
  const response = await client.transfer(opts);
  return response;
}
