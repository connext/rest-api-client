import { getFileStore } from "@connext/store";
import fastify, { RequestGenericInterface } from "fastify";
import Helmet from "fastify-helmet";
// import Swagger from "fastify-swagger";

import pkg from "../package.json";

import config from "./config";
import ClientManager from "./client";
import {
  requireParam,
  fetchAll,
  isNotIncluded,
  getRandomMnemonic,
  InitOptions,
  GenericErrorResponse,
  GetBalanceResponse,
  GenericSuccessResponse,
  GetBalanceRequestParams,
  GetHashLockStatusRequestParams,
  GetHashLockStatusResponse,
  PostMnemonicRequestParams,
  PostTransactionRequestParams,
  PostTransactionResponse,
  PostHashLockTransferRequestParams,
  PostHashLockTransferResponse,
  PostHashLockResolveResponse,
  PostHashLockResolveRequestParams,
  PostDepositRequestParams,
  PostWithdrawRequestParams,
  EventSubscriptionParams,
  SubscriptionResponse,
  GetAppInstanceDetailsParams,
  GetAppInstanceDetailsResponse,
  GetConfigResponse,
  GetVersionResponse,
  PostWithdrawResponse,
  BatchSubscriptionResponse,
  GetLinkedStatusRequestParams,
  GetLinkedStatusResponse,
  GetTransferHistory,
  PostLinkedTransferRequestParams,
  PostLinkedTransferResponse,
  PostLinkedResolveRequestParams,
  PostLinkedResolveResponse,
  PostSwapRequestParams,
  PostSwapResponse,
} from "./helpers";

const app = fastify({
  logger: { prettyPrint: config.debug } as any,
  disableRequestLogging: true,
});

let clientManager: ClientManager;

app.register(Helmet);

// app.register(Swagger);

const loggingBlacklist = ["/balance"];

app.addHook("onRequest", (req, reply, done) => {
  if (config.debug && req.url) {
    if (isNotIncluded(req.url, loggingBlacklist)) {
      req.log.info({ url: req.url, id: req.id }, "received request");
    }
  }
  done();
});

app.addHook("onResponse", (req, reply, done) => {
  if (config.debug && req.url) {
    if (isNotIncluded(req.url, loggingBlacklist)) {
      req.log.info({ url: req.url, statusCode: reply.statusCode }, "request completed");
    }
  }
  done();
});

// -- GET ---------------------------------------------------------------- //

app.get("/health", (req, res) => {
  res.status(204).send<void>();
});

app.get("/hello", (req, res) => {
  res.status(200).send<string>(`Hello World, this is Connext client`);
});

app.get("/version", (req, res) => {
  try {
    res.status(200).send<GetVersionResponse>({ version: pkg.version });
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface GetBalanceRequest extends RequestGenericInterface {
  Params: GetBalanceRequestParams;
}

app.get<GetBalanceRequest>("/balance/:assetId", async (req, res) => {
  try {
    await requireParam(req.params, "assetId");
    res.status(200).send<GetBalanceResponse>(await clientManager.balance(req.params.assetId));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

app.get("/config", async (req, res) => {
  try {
    res.status(200).send<GetConfigResponse>(await clientManager.getConfig());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface GetHashLockStatusRequest extends RequestGenericInterface {
  Params: GetHashLockStatusRequestParams;
}

app.get<GetHashLockStatusRequest>("/hashlock-status/:lockHash/:assetId", async (req, res) => {
  try {
    await requireParam(req.params, "lockHash");
    await requireParam(req.params, "assetId");
    const { lockHash, assetId } = req.params;
    res
      .status(200)
      .send<GetHashLockStatusResponse>(await clientManager.hashLockStatus(lockHash, assetId));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface GetLinkedStatusRequest extends RequestGenericInterface {
  Params: GetLinkedStatusRequestParams;
}

app.get<GetLinkedStatusRequest>("/linked-status/:paymentId", async (req, res) => {
  try {
    await requireParam(req.params, "paymentId");
    const { paymentId } = req.params;
    res.status(200).send<GetLinkedStatusResponse>(await clientManager.linkedStatus(paymentId));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface GetAppInstanceDetailsRequest extends RequestGenericInterface {
  Params: GetAppInstanceDetailsParams;
}

app.get<GetAppInstanceDetailsRequest>("/appinstance-details/:appIdentityHash", async (req, res) => {
  try {
    await requireParam(req.params, "appIdentityHash");
    res
      .status(200)
      .send<GetAppInstanceDetailsResponse>(
        await clientManager.getAppInstanceDetails(req.params.appIdentityHash),
      );
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

app.get("/transfer-history", async (req, res) => {
  try {
    res.status(200).send<GetTransferHistory>(await clientManager.getTransferHistory());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

// -- POST ---------------------------------------------------------------- //

interface PostCreateRequest extends RequestGenericInterface {
  Body: Partial<InitOptions>;
}

app.post<PostCreateRequest>("/create", async (req, res) => {
  try {
    const opts = { ...req.body };
    if (!clientManager.mnemonic && !opts.mnemonic) {
      opts.mnemonic = getRandomMnemonic();
    }
    await clientManager.initClient(opts);
    res.status(200).send<GetConfigResponse>(await clientManager.getConfig());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostConnectRequest extends RequestGenericInterface {
  Body: Partial<InitOptions>;
}

app.post<PostConnectRequest>("/connect", async (req, res) => {
  try {
    if (!clientManager.mnemonic) {
      await requireParam(req.body, "mnemonic");
    }
    await clientManager.initClient(req.body);
    const config = await clientManager.getConfig();
    res.status(200).send<GetConfigResponse>(config);
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostMnemonicRequest extends RequestGenericInterface {
  Body: PostMnemonicRequestParams;
}

app.post<PostMnemonicRequest>("/mnemonic", async (req, res) => {
  try {
    await requireParam(req.body, "mnemonic");
    await clientManager.setMnemonic(req.body.mnemonic);
    res.status(200).send<GenericSuccessResponse>({ success: true });
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostTransactionRequest extends RequestGenericInterface {
  Body: PostTransactionRequestParams;
}

app.post<PostTransactionRequest>("/onchain-transfer", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "assetId");
    await requireParam(req.body, "recipient");
    res.status(200).send<PostTransactionResponse>(await clientManager.transferOnChain(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostHashLockTransferRequest extends RequestGenericInterface {
  Body: PostHashLockTransferRequestParams;
}

app.post<PostHashLockTransferRequest>("/hashlock-transfer", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "assetId");
    await requireParam(req.body, "lockHash");
    await requireParam(req.body, "timelock");
    await requireParam(req.body, "recipient");
    res
      .status(200)
      .send<PostHashLockTransferResponse>(await clientManager.hashLockTransfer(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostHashLockResolveRequest extends RequestGenericInterface {
  Body: PostHashLockResolveRequestParams;
}

app.post<PostHashLockResolveRequest>("/hashlock-resolve", async (req, res) => {
  try {
    await requireParam(req.body, "preImage");
    await requireParam(req.body, "assetId");
    res
      .status(200)
      .send<PostHashLockResolveResponse>(await clientManager.hashLockResolve(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostLinkedTransferRequest extends RequestGenericInterface {
  Body: PostLinkedTransferRequestParams;
}

app.post<PostLinkedTransferRequest>("/linked-transfer", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "assetId");
    await requireParam(req.body, "preImage");
    res.status(200).send<PostLinkedTransferResponse>(await clientManager.linkedTransfer(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostLinkedResolveRequest extends RequestGenericInterface {
  Body: PostLinkedResolveRequestParams;
}

app.post<PostLinkedResolveRequest>("/linked-resolve", async (req, res) => {
  try {
    await requireParam(req.body, "preImage");
    await requireParam(req.body, "paymentId");
    res.status(200).send<PostLinkedResolveResponse>(await clientManager.linkedResolve(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostDepositRequest extends RequestGenericInterface {
  Body: PostDepositRequestParams;
}

app.post<PostDepositRequest>("/deposit", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "assetId");
    res.status(200).send<GetBalanceResponse>(await clientManager.deposit(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostSwapRequest extends RequestGenericInterface {
  Body: PostSwapRequestParams;
}

app.post<PostSwapRequest>("/swap", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "fromAssetId");
    await requireParam(req.body, "swapRate");
    await requireParam(req.body, "toAssetId");
    res.status(200).send<PostSwapResponse>(await clientManager.swap(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostWithdrawRequest extends RequestGenericInterface {
  Body: PostWithdrawRequestParams;
}

app.post<PostWithdrawRequest>("/withdraw", async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    res.status(200).send<PostWithdrawResponse>(await clientManager.withdraw(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostSubscribeRequest extends RequestGenericInterface {
  Body: EventSubscriptionParams;
}

app.post<PostSubscribeRequest>("/subscribe", async (req, res) => {
  try {
    await requireParam(req.body, "event");
    await requireParam(req.body, "webhook");
    res.status(200).send<SubscriptionResponse>(await clientManager.subscribe(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostBatchSubscribeRequest extends RequestGenericInterface {
  Body: {
    params: EventSubscriptionParams[];
  };
}

app.post<PostBatchSubscribeRequest>("/subscribe/batch", async (req, res) => {
  try {
    await requireParam(req.body, "params", "array");
    res
      .status(200)
      .send<BatchSubscriptionResponse>(await clientManager.subscribeBatch(req.body.params));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

// -- DELETE ---------------------------------------------------------------- //

interface DeleteSubscribeRequest extends RequestGenericInterface {
  Body: {
    id: string;
  };
}

app.delete<DeleteSubscribeRequest>("/subscribe", async (req, res) => {
  try {
    await requireParam(req.body, "id");
    res.status(200).send<GenericSuccessResponse>(await clientManager.unsubscribe(req.body.id));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface DeleteBatchSubscribeRequest extends RequestGenericInterface {
  Body: {
    ids: string[];
  };
}

app.delete<DeleteBatchSubscribeRequest>("/subscribe/batch", async (req, res) => {
  try {
    await requireParam(req.body, "ids", "array");
    res
      .status(200)
      .send<GenericSuccessResponse>(await clientManager.unsubscribeBatch(req.body.ids));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

app.delete("/subscribe/all", async (req, res) => {
  try {
    res.status(200).send<GenericSuccessResponse>(await clientManager.unsubscribeAll());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

// -- INIT ---------------------------------------------------------------- //

app.ready(async () => {
  const store = getFileStore(config.storeDir);
  await store.init();
  const { mnemonic, initOptions } = await fetchAll(store);
  clientManager = new ClientManager({ mnemonic, logger: app.log, store });
  if (initOptions && Object.keys(initOptions).length) {
    await clientManager.initClient(initOptions);
  }
});

const [host, port] = config.host.split(":");
app.listen(+port, host, (err) => {
  if (err) throw err;
});
