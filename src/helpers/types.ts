import { Wallet, providers } from "ethers";

import {
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
  logLevel: number;
}

export interface InternalConnectOptions {
  signer: string;
  publicIdentifier: string;
  ethProviderUrl: string;
  nodeUrl: string;
  messagingUrl?: string;
}

export interface ConnectOptions {
  ethProviderUrl: string;
  nodeUrl: string;
  messagingUrl?: string;
  publicIdentifier?: string;
}

export interface InternalWalletOptions {
  index: number;
}

export interface PersistedData {
  mnemonic: string | undefined;
  subscriptions: EventSubscription[] | undefined;
  clients: InternalConnectOptions[] | undefined;
  wallets: InternalWalletOptions[] | undefined;
}

export type WalletSummary = {
  address: string;
  publicIdentifier: string;
};

export type GenericErrorResponse = {
  message: string;
};
export type GenericSuccessResponse = {
  success: true;
};

export type MultiClientRequestParams = { publicIdentifier?: string };

export type BatchSubscriptionResponse = {
  subscriptions: EventSubscription[];
};
export type SubscriptionResponse = {
  id: string;
};

export type EventSubscription = {
  id: string;
  publicIdentifier: string;
  params: EventSubscriptionParams;
};
export type EventSubscriptionParams = { event: string; webhook: string };

export type ClientSummary = {
  publicIdentifier: string;
  multisigAddress: string;
  signerAddress: string;
  chainId: number;
  token: string | undefined;
  tokenBalance: string | undefined;
  channelNonce: number | undefined;
  proposedApps: number | undefined;
  installedApps: number | undefined;
};

export interface TransferOnChainParams {
  wallet: Wallet;
  ethProvider: providers.Provider;
  assetId: string;
  amount: string;
  recipient: string;
}

export namespace RouteMethods {
  export type GetFundingWalletResponse = WalletSummary;

  export type GetFundingBalanceRequestParams = {
    assetId: string;
  };
  export type GetFundingBalanceResponse = {
    freeBalanceOffChain?: string;
    freeBalanceOnChain: string;
  };

  export type GetBalanceRequestParams = MultiClientRequestParams & {
    assetId: string;
  };
  export type GetBalanceResponse = {
    freeBalanceOffChain?: string;
    nodeFreeBalanceOffChain?: string;
    freeBalanceOnChain: string;
  };

  export type GetConfigRequestParams = MultiClientRequestParams;

  export type GetVersionResponse = {
    version: string;
  };

  export type GetWalletsResponse = WalletSummary[];

  export type GetClientsResponse = ClientSummary[];

  export type GetAppInstanceDetailsParams = MultiClientRequestParams & { appIdentityHash: string };
  export type GetAppInstanceDetailsResponse = MethodResults.GetAppInstanceDetails;

  export type GetConfigResponse = Partial<ChannelProviderConfig>;

  export type GetHashLockStatusRequestParams = MultiClientRequestParams & {
    lockHash: string;
    assetId: string;
  };
  export type GetHashLockStatusResponse = NodeResponses.GetHashLockTransfer & { paymentId: string };

  export type GetLinkedStatusRequestParams = MultiClientRequestParams & { paymentId: string };
  export type GetLinkedStatusResponse = NodeResponses.GetLinkedTransfer;

  export type GetTransferHistoryRequestParams = MultiClientRequestParams;
  export type GetTransferHistoryResponse = MultiClientRequestParams &
    NodeResponses.GetTransferHistory;

  export type PostCreateResponse = WalletSummary;

  export type PostFundRequestParams = MultiClientRequestParams & {
    amount: string;
    assetId: string;
  };
  export type PostFundResponse = { txhash: string };

  export type PostDepositRequestParams = MultiClientRequestParams & PublicParams.Deposit;
  export type PostDepositResponse = { txhash: string };

  export type PostRequestDepositRightsRequestParams = MultiClientRequestParams &
    PublicParams.RequestDepositRights;
  export type PostRequestDepositRightsResponse = PublicResults.RequestDepositRights;

  export type PostRescindDepositRightsRequestParams = MultiClientRequestParams &
    PublicParams.RescindDepositRights;
  export type PostRescindDepositRightsResponse = { freeBalance: string };

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
    ethProviderUrl?: string;
  };
  export interface PostTransactionResponse {
    txhash: string;
  }

  export type PostWithdrawRequestParams = MultiClientRequestParams & PublicParams.Withdraw;
  export type PostWithdrawResponse = { txhash: string };

  export type PostRejectInstallRequestParams = MultiClientRequestParams & {
    appIdentityHash: string;
    reason?: string;
  };
  export type PostRejectInstallResponse = MethodResults.Uninstall;

  export type PostRequestCollateralRequestParams = MultiClientRequestParams & { assetId: string };

  export type PostSwapRequestParams = MultiClientRequestParams & PublicParams.Swap;
  export type PostSwapResponse = { fromAssetIdBalance: string; toAssetIdBalance: string };

  export type PostSubscribeRequestParams = MultiClientRequestParams & EventSubscriptionParams;
}
