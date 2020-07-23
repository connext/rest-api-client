import {
  ClientOptions,
  IStoreService,
  PublicResults,
  MethodResults,
  ChannelProviderConfig,
  NodeResponses,
  PublicParams,
} from "@connext/types";

export interface InitClientManagerOptions {
  logger: any;
  store: IStoreService;
  mnemonic: string;
  index?: number;
}
export interface ConnectOptions extends ClientOptions {
  mnemonic: string;
  index?: number;
  network?: string;
}

export interface PersistedData {
  mnemonic: string | undefined;
  subscriptions: EventSubscription[] | undefined;
  initiatedClients: Partial<ConnectOptions> | undefined;
}

export interface PersistedClientSettings {
  index: 0;
  publicIdentifier: string;
  opts?: Partial<ConnectOptions>;
}

export type GenericErrorResponse = {
  message: string;
};
export type GenericSuccessResponse = {
  success: true;
};

export type MultiClientRequestParams = { publicIdentifier?: string };

export type GetBalanceRequestParams = MultiClientRequestParams & {
  assetId: string;
};
export type GetBalanceResponse = {
  freeBalanceOffChain: string;
  freeBalanceOnChain: string;
};

export type GetConfigRequestParams = MultiClientRequestParams;

export type GetVersionResponse = {
  version: string;
};

export type BatchSubscriptionResponse = {
  subscriptions: EventSubscription[];
};
export type SubscriptionResponse = {
  id: string;
};

export type EventSubscription = { id: string; params: EventSubscriptionParams };
export type EventSubscriptionParams = { event: string; webhook: string };

export type GetAppInstanceDetailsParams = MultiClientRequestParams & { appIdentityHash: string };
export type GetAppInstanceDetailsResponse = MethodResults.GetAppInstanceDetails;

export type GetConfigResponse = Partial<ChannelProviderConfig>;

export type GetHashLockStatusRequestParams = MultiClientRequestParams & {
  lockHash: string;
  assetId: string;
};
export type GetHashLockStatusResponse = NodeResponses.GetHashLockTransfer;

export type GetLinkedStatusRequestParams = MultiClientRequestParams & { paymentId: string };
export type GetLinkedStatusResponse = NodeResponses.GetLinkedTransfer;

export type GetTransferHistoryRequestParams = MultiClientRequestParams;
export type GetTransferHistoryResponse = MultiClientRequestParams &
  NodeResponses.GetTransferHistory;

export type PostDepositRequestParams = MultiClientRequestParams & PublicParams.Deposit;

export type PostHashLockTransferRequestParams = MultiClientRequestParams &
  PublicParams.HashLockTransfer;
export type PostHashLockTransferResponse = PublicResults.ConditionalTransfer &
  MethodResults.GetAppInstanceDetails;

export type PostHashLockResolveRequestParams = MultiClientRequestParams &
  PublicParams.ResolveHashLockTransfer;
export type PostHashLockResolveResponse = PublicResults.ResolveHashLockTransfer;

export type PostLinkedTransferRequestParams = MultiClientRequestParams &
  PublicParams.LinkedTransfer;
export type PostLinkedTransferResponse = PublicResults.ConditionalTransfer &
  MethodResults.GetAppInstanceDetails;

export type PostLinkedResolveRequestParams = MultiClientRequestParams &
  PublicParams.ResolveLinkedTransfer;
export type PostLinkedResolveResponse = PublicResults.ResolveLinkedTransfer;

export type PostMnemonicRequestParams = { mnemonic: string };

export type PostTransactionRequestParams = MultiClientRequestParams & {
  amount: string;
  assetId: string;
  recipient: string;
};
export interface PostTransactionResponse {
  txhash: string;
}

export type PostWithdrawRequestParams = MultiClientRequestParams & PublicParams.Withdraw;
export type PostWithdrawResponse = { txhash: string };

export type PostSwapRequestParams = MultiClientRequestParams & PublicParams.Swap;
export type PostSwapResponse = { fromAssetIdBalance: string; toAssetIdBalance: string };

export type PostSubscribeRequestParams = MultiClientRequestParams & EventSubscriptionParams;
