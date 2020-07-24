import fastify, { RequestGenericInterface } from "fastify";

import pkg from "../package.json";

import config from "./config";
import { swaggerOptions, Routes } from "./schemas";
import Client from "./client";
import {
  requireParam,
  isNotIncluded,
  getRandomMnemonic,
  ConnectOptions,
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

let client: Client;

app.register(require("fastify-helmet"));
app.register(require("fastify-swagger"), swaggerOptions as any);

app.addHook("onReady", async () => {
  client = await Client.init(app.log);
});

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

app.get(Routes.get.health.url, Routes.get.health.opts, (req, res) => {
  res.status(204).send<void>();
});

app.get(Routes.get.hello.url, Routes.get.hello.opts, (req, res) => {
  res.status(200).send<string>(`Hello World, this is Connext client`);
});

app.get(Routes.get.version.url, Routes.get.version.opts, (req, res) => {
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

app.get<GetBalanceRequest>(Routes.get.balance.url, Routes.get.balance.opts, async (req, res) => {
  try {
    await requireParam(req.params, "assetId");
    res.status(200).send<GetBalanceResponse>(await client.balance(req.params.assetId));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

app.get(Routes.get.config.url, Routes.get.config.opts, async (req, res) => {
  try {
    res.status(200).send<GetConfigResponse>(await client.getConfig());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface GetHashLockStatusRequest extends RequestGenericInterface {
  Params: GetHashLockStatusRequestParams;
}

app.get<GetHashLockStatusRequest>(
  Routes.get.hashLockStatus.url,
  Routes.get.hashLockStatus.opts,
  async (req, res) => {
    try {
      await requireParam(req.params, "lockHash");
      await requireParam(req.params, "assetId");
      const { lockHash, assetId } = req.params;
      res
        .status(200)
        .send<GetHashLockStatusResponse>(await client.hashLockStatus(lockHash, assetId));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface GetLinkedStatusRequest extends RequestGenericInterface {
  Params: GetLinkedStatusRequestParams;
}

app.get<GetLinkedStatusRequest>(
  Routes.get.linkedStatus.url,
  Routes.get.linkedStatus.opts,
  async (req, res) => {
    try {
      await requireParam(req.params, "paymentId");
      const { paymentId } = req.params;
      res.status(200).send<GetLinkedStatusResponse>(await client.linkedStatus(paymentId));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface GetAppInstanceDetailsRequest extends RequestGenericInterface {
  Params: GetAppInstanceDetailsParams;
}

app.get<GetAppInstanceDetailsRequest>(
  Routes.get.appinstanceDetails.url,
  Routes.get.appinstanceDetails.opts,
  async (req, res) => {
    try {
      await requireParam(req.params, "appIdentityHash");
      res
        .status(200)
        .send<GetAppInstanceDetailsResponse>(
          await client.getAppInstanceDetails(req.params.appIdentityHash),
        );
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

app.get(Routes.get.transferHistory.url, Routes.get.transferHistory.opts, async (req, res) => {
  try {
    res.status(200).send<GetTransferHistory>(await client.getTransferHistory());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

// -- POST ---------------------------------------------------------------- //

interface PostCreateRequest extends RequestGenericInterface {
  Body: Partial<ConnectOptions>;
}

app.post<PostCreateRequest>(Routes.post.create.url, Routes.post.create.opts, async (req, res) => {
  try {
    const opts = { ...req.body };
    if (!client.mnemonic && !opts.mnemonic) {
      opts.mnemonic = getRandomMnemonic();
    }
    await client.connect(opts);
    res.status(200).send<GetConfigResponse>(await client.getConfig());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostConnectRequest extends RequestGenericInterface {
  Body: Partial<ConnectOptions>;
}

app.post<PostConnectRequest>(
  Routes.post.connect.url,
  Routes.post.connect.opts,
  async (req, res) => {
    try {
      if (!client.mnemonic) {
        await requireParam(req.body, "mnemonic");
      }
      await client.connect(req.body);
      const config = await client.getConfig();
      res.status(200).send<GetConfigResponse>(config);
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostMnemonicRequest extends RequestGenericInterface {
  Body: PostMnemonicRequestParams;
}

app.post<PostMnemonicRequest>(
  Routes.post.mnemonic.url,
  Routes.post.mnemonic.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "mnemonic");
      await client.setMnemonic(req.body.mnemonic);
      res.status(200).send<GenericSuccessResponse>({ success: true });
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostTransactionRequest extends RequestGenericInterface {
  Body: PostTransactionRequestParams;
}

app.post<PostTransactionRequest>(
  Routes.post.onchainTransfer.url,
  Routes.post.onchainTransfer.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "assetId");
      await requireParam(req.body, "recipient");
      res.status(200).send<PostTransactionResponse>(await client.transferOnChain(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostHashLockTransferRequest extends RequestGenericInterface {
  Body: PostHashLockTransferRequestParams;
}

app.post<PostHashLockTransferRequest>(
  Routes.post.hashLockTransfer.url,
  Routes.post.hashLockTransfer.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "assetId");
      await requireParam(req.body, "lockHash");
      await requireParam(req.body, "timelock");
      await requireParam(req.body, "recipient");
      res.status(200).send<PostHashLockTransferResponse>(await client.hashLockTransfer(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostHashLockResolveRequest extends RequestGenericInterface {
  Body: PostHashLockResolveRequestParams;
}

app.post<PostHashLockResolveRequest>(
  Routes.post.hashLockResolve.url,
  Routes.post.hashLockResolve.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "preImage");
      await requireParam(req.body, "assetId");
      res.status(200).send<PostHashLockResolveResponse>(await client.hashLockResolve(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostLinkedTransferRequest extends RequestGenericInterface {
  Body: PostLinkedTransferRequestParams;
}

app.post<PostLinkedTransferRequest>(
  Routes.post.linkedTransfer.url,
  Routes.post.linkedTransfer.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "assetId");
      // await requireParam(req.body, "preImage");
      res.status(200).send<PostLinkedTransferResponse>(await client.linkedTransfer(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostLinkedResolveRequest extends RequestGenericInterface {
  Body: PostLinkedResolveRequestParams;
}

app.post<PostLinkedResolveRequest>(
  Routes.post.linkedResolve.url,
  Routes.post.linkedResolve.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "preImage");
      await requireParam(req.body, "paymentId");
      res.status(200).send<PostLinkedResolveResponse>(await client.linkedResolve(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostDepositRequest extends RequestGenericInterface {
  Body: PostDepositRequestParams;
}

app.post<PostDepositRequest>(
  Routes.post.deposit.url,
  Routes.post.deposit.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "assetId");
      res.status(200).send<GetBalanceResponse>(await client.deposit(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostSwapRequest extends RequestGenericInterface {
  Body: PostSwapRequestParams;
}

app.post<PostSwapRequest>(Routes.post.swap.url, Routes.post.swap.opts, async (req, res) => {
  try {
    await requireParam(req.body, "amount");
    await requireParam(req.body, "fromAssetId");
    await requireParam(req.body, "swapRate");
    await requireParam(req.body, "toAssetId");
    res.status(200).send<PostSwapResponse>(await client.swap(req.body));
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

interface PostWithdrawRequest extends RequestGenericInterface {
  Body: PostWithdrawRequestParams;
}

app.post<PostWithdrawRequest>(
  Routes.post.withdraw.url,
  Routes.post.withdraw.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "assetId");
      res.status(200).send<PostWithdrawResponse>(await client.withdraw(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostSubscribeRequest extends RequestGenericInterface {
  Body: EventSubscriptionParams;
}

app.post<PostSubscribeRequest>(
  Routes.post.subscribe.url,
  Routes.post.subscribe.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "event");
      await requireParam(req.body, "webhook");
      res.status(200).send<SubscriptionResponse>(await client.subscribe(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface PostBatchSubscribeRequest extends RequestGenericInterface {
  Body: {
    params: EventSubscriptionParams[];
  };
}

app.post<PostBatchSubscribeRequest>(
  Routes.post.batchSubscribe.url,
  Routes.post.batchSubscribe.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "params", "array");
      res.status(200).send<BatchSubscriptionResponse>(await client.subscribeBatch(req.body.params));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

// -- DELETE ---------------------------------------------------------------- //

interface DeleteSubscribeRequest extends RequestGenericInterface {
  Body: {
    id: string;
  };
}

app.delete<DeleteSubscribeRequest>(
  Routes.delete.subscribe.url,
  Routes.delete.subscribe.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "id");
      res.status(200).send<GenericSuccessResponse>(await client.unsubscribe(req.body.id));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

interface DeleteBatchSubscribeRequest extends RequestGenericInterface {
  Body: {
    ids: string[];
  };
}

app.delete<DeleteBatchSubscribeRequest>(
  Routes.delete.batchSubscribe.url,
  Routes.delete.batchSubscribe.opts,
  async (req, res) => {
    try {
      await requireParam(req.body, "ids", "array");
      res.status(200).send<GenericSuccessResponse>(await client.unsubscribeBatch(req.body.ids));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  },
);

app.delete(Routes.delete.subscribeAll.url, Routes.delete.subscribeAll.opts, async (req, res) => {
  try {
    res.status(200).send<GenericSuccessResponse>(await client.unsubscribeAll());
  } catch (error) {
    app.log.error(error);
    res.status(500).send<GenericErrorResponse>({ message: error.message });
  }
});

// -- INIT ---------------------------------------------------------------- //

const [host, port] = config.host.split(":");
app.listen(+port, host, (err) => {
  if (err) throw err;
});

export default app;
