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
  mnemonic?: string;
  store: IStoreService;
}
export interface InitOptions extends ClientOptions {
  mnemonic: string;
  network?: string;
}

export interface GenericErrorResponse {
  message: string;
}
export interface GenericSuccessResponse {
  success: true;
}

export interface GetBalanceRequestParams {
  assetId: string;
}
export interface GetBalanceResponse {
  freeBalanceOffChain: string;
  freeBalanceOnChain: string;
}

export interface GetVersionReponse {
  version: string;
}

export interface BatchSubscriptionReponse {
  subscriptions: EventSubscription[];
}
export interface SubscriptionResponse {
  id: string;
}

export type EventSubscription = { id: string; params: EventSubscriptionParams };
export type EventSubscriptionParams = { event: string; webhook: string };

export type GetAppInstanceDetailsParams = { appIdentityHash: string };
export type GetAppInstanceDetailsResponse = MethodResults.GetAppInstanceDetails;

export type GetConfigResponse = Partial<ChannelProviderConfig>;

export type GetHashLockStatusRequestParams = { lockHash: string; assetId: string };
export type GetHashLockStatusResponse = NodeResponses.GetHashLockTransfer;

export type PostDepositRequestBody = PublicParams.Deposit;

export type PostHashLockTransferRequestBody = PublicParams.HashLockTransfer;
export interface PostHashLockTransferResponse
  extends PublicResults.ConditionalTransfer,
    MethodResults.GetAppInstanceDetails {}

export type PostHashLockResolveRequestBody = PublicParams.ResolveHashLockTransfer;
export type PostHashLockResolveResponse = PublicResults.ResolveHashLockTransfer;

export type PostMnemonicRequestBody = { mnemonic: string };

export type PostTransactionRequestBody = { amount: string; assetId: string; recipient: string };
export interface PostTransactionResponse {
  txhash: string;
}

export type PostWithdrawReponse = PublicResults.Withdraw;
export type PostWithdrawRequestBody = PublicParams.Withdraw;
