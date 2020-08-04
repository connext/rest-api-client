import fastify, { RequestGenericInterface } from "fastify";
import fastifyAuth from "fastify-auth";
import fastifySwagger from "fastify-swagger";
import fastifyHelmet from "fastify-helmet";

import config from "./config";
import MultiClient from "./multiClient";
import { getSwaggerOptions, getRoutes } from "./schemas";
import {
  requireParam,
  isNotIncluded,
  ConnectOptions,
  GenericErrorResponse,
  GenericSuccessResponse,
  RouteMethods,
  getStore,
  fetchPersistedData,
  storeMnemonic,
  EventSubscriptionParams,
  BatchSubscriptionResponse,
  SubscriptionResponse,
} from "./helpers";

const app = fastify({
  logger: { prettyPrint: config.debug } as any,
  disableRequestLogging: true,
  pluginTimeout: 120_000,
});

let multiClient: MultiClient;

app
  .decorate("verifyApiKey", function (request, reply, done) {
    if (config.apiKey && (!request.body || !request.body.apiKey)) {
      return done(new Error("Missing apiKey in request body"));
    }
    return done();
  })
  .register(fastifyAuth);

app.register(fastifyHelmet);
app.register(fastifySwagger, getSwaggerOptions(config.docsHost, config.version) as any);

app.addHook("onReady", async () => {
  const store = await getStore(config.storeDir);
  const persisted = await fetchPersistedData(store);
  const mnemonic = persisted.mnemonic || config.mnemonic;
  if (mnemonic && persisted.mnemonic !== mnemonic) {
    await storeMnemonic(mnemonic, store);
  }
  multiClient = await MultiClient.init(
    mnemonic,
    app.log,
    store,
    config.ethProviderUrl,
    config.nodeUrl,
    config.legacyMode,
    config.storeDir,
    config.logLevel,
    persisted.clients,
    persisted.wallets,
  );
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

app.after(() => {
  const Routes = getRoutes(app.auth([app.verifyApiKey]), config.legacyMode);

  // -- GET ---------------------------------------------------------------- //

  app.get(Routes.get.health.url, Routes.get.health.opts, (req, res) => {
    res.status(204).send<void>();
  });

  app.get(Routes.get.hello.url, Routes.get.hello.opts, (req, res) => {
    res.status(200).send<string>(`Hello World, this is Connext client`);
  });

  app.get(Routes.get.version.url, Routes.get.version.opts, (req, res) => {
    try {
      res.status(200).send<RouteMethods.GetVersionResponse>({ version: config.version });
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  app.get(Routes.get.wallets.url, Routes.get.wallets.opts, async (req, res) => {
    try {
      res.status(200).send<RouteMethods.GetWalletsResponse>(multiClient.keyring.getWallets());
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  app.get(Routes.get.clients.url, Routes.get.clients.opts, async (req, res) => {
    try {
      res.status(200).send<RouteMethods.GetClientsResponse>(await multiClient.getClients());
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface GetBalanceRequest extends RequestGenericInterface {
    Params: RouteMethods.GetBalanceRequestParams;
  }

  app.get<GetBalanceRequest>(Routes.get.balance.url, Routes.get.balance.opts, async (req, res) => {
    try {
      await requireParam(req.params, "assetId");
      if (!config.legacyMode) {
        await requireParam(req.params, "publicIdentifier");
      }
      const client = multiClient.getClient(req.params.publicIdentifier);
      res
        .status(200)
        .send<RouteMethods.GetBalanceResponse>(await client.balance(req.params.assetId));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface GetConfigRequest extends RequestGenericInterface {
    Params: RouteMethods.GetConfigRequestParams;
  }

  app.get<GetConfigRequest>(Routes.get.config.url, Routes.get.config.opts, async (req, res) => {
    try {
      if (!config.legacyMode) {
        await requireParam(req.params, "publicIdentifier");
      }
      const client = multiClient.getClient(req.params.publicIdentifier);
      res.status(200).send<RouteMethods.GetConfigResponse>(await client.getConfig());
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface GetHashLockStatusRequest extends RequestGenericInterface {
    Params: RouteMethods.GetHashLockStatusRequestParams;
  }

  app.get<GetHashLockStatusRequest>(
    Routes.get.hashLockStatus.url,
    Routes.get.hashLockStatus.opts,
    async (req, res) => {
      try {
        await requireParam(req.params, "lockHash");
        await requireParam(req.params, "assetId");
        const { lockHash, assetId } = req.params;
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.params.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.GetHashLockStatusResponse>(
            await client.hashLockStatus(lockHash, assetId),
          );
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface GetLinkedStatusRequest extends RequestGenericInterface {
    Params: RouteMethods.GetLinkedStatusRequestParams;
  }

  app.get<GetLinkedStatusRequest>(
    Routes.get.linkedStatus.url,
    Routes.get.linkedStatus.opts,
    async (req, res) => {
      try {
        await requireParam(req.params, "paymentId");
        const { paymentId } = req.params;
        if (!config.legacyMode) {
          await requireParam(req.params, "publicIdentifier");
        }
        const client = multiClient.getClient(req.params.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.GetLinkedStatusResponse>(await client.linkedStatus(paymentId));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface GetAppInstanceDetailsRequest extends RequestGenericInterface {
    Params: RouteMethods.GetAppInstanceDetailsParams;
  }

  app.get<GetAppInstanceDetailsRequest>(
    Routes.get.appinstanceDetails.url,
    Routes.get.appinstanceDetails.opts,
    async (req, res) => {
      try {
        await requireParam(req.params, "appIdentityHash");
        if (!config.legacyMode) {
          await requireParam(req.params, "publicIdentifier");
        }
        const client = multiClient.getClient(req.params.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.GetAppInstanceDetailsResponse>(
            await client.getAppInstanceDetails(req.params.appIdentityHash),
          );
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface GetTransferHistoryRequest extends RequestGenericInterface {
    Params: RouteMethods.GetTransferHistoryRequestParams;
  }

  app.get<GetTransferHistoryRequest>(
    Routes.get.transferHistory.url,
    Routes.get.transferHistory.opts,
    async (req, res) => {
      try {
        if (!config.legacyMode) {
          await requireParam(req.params, "publicIdentifier");
        }
        const client = multiClient.getClient(req.params.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.GetTransferHistoryResponse>(await client.getTransferHistory());
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  // -- POST ---------------------------------------------------------------- //

  interface PostCreateRequest extends RequestGenericInterface {
    Body: { index: number };
  }

  app.post<PostCreateRequest>(Routes.post.create.url, Routes.post.create.opts, async (req, res) => {
    try {
      await requireParam(req.body, "index", "number");
      res
        .status(200)
        .send<RouteMethods.PostCreateResponse>(
          await multiClient.keyring.createWallet(req.body.index),
        );
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
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = await multiClient.connectClient(req.body);
        res.status(200).send<RouteMethods.GetConfigResponse>(await client.getConfig());
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostDisconnectRequest extends RequestGenericInterface {
    Body: { publicIdentifier?: string };
  }

  app.post<PostDisconnectRequest>(
    Routes.post.disconnect.url,
    Routes.post.disconnect.opts,
    async (req, res) => {
      try {
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        await multiClient.disconnectClient(req.body?.publicIdentifier);
        res.status(200).send<GenericSuccessResponse>({ success: true });
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostMnemonicRequest extends RequestGenericInterface {
    Body: RouteMethods.PostMnemonicRequestParams;
  }

  app.post<PostMnemonicRequest>(
    Routes.post.mnemonic.url,
    Routes.post.mnemonic.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "mnemonic");
        if (multiClient.keyring.mnemonic !== req.body.mnemonic) {
          await multiClient.reset();
        }
        await multiClient.keyring.setMnemonic(req.body.mnemonic);
        res.status(200).send<GenericSuccessResponse>({ success: true });
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostTransactionRequest extends RequestGenericInterface {
    Body: RouteMethods.PostTransactionRequestParams;
  }

  app.post<PostTransactionRequest>(
    Routes.post.onchainTransfer.url,
    Routes.post.onchainTransfer.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "amount");
        await requireParam(req.body, "assetId");
        await requireParam(req.body, "recipient");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostTransactionResponse>(await client.transferOnChain(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostHashLockTransferRequest extends RequestGenericInterface {
    Body: RouteMethods.PostHashLockTransferRequestParams;
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
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostHashLockTransferResponse>(await client.hashLockTransfer(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostHashLockResolveRequest extends RequestGenericInterface {
    Body: RouteMethods.PostHashLockResolveRequestParams;
  }

  app.post<PostHashLockResolveRequest>(
    Routes.post.hashLockResolve.url,
    Routes.post.hashLockResolve.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "preImage");
        await requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostHashLockResolveResponse>(await client.hashLockResolve(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostLinkedTransferRequest extends RequestGenericInterface {
    Body: RouteMethods.PostLinkedTransferRequestParams;
  }

  app.post<PostLinkedTransferRequest>(
    Routes.post.linkedTransfer.url,
    Routes.post.linkedTransfer.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "amount");
        await requireParam(req.body, "assetId");
        await requireParam(req.body, "preImage");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostLinkedTransferResponse>(await client.linkedTransfer(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostLinkedResolveRequest extends RequestGenericInterface {
    Body: RouteMethods.PostLinkedResolveRequestParams;
  }

  app.post<PostLinkedResolveRequest>(
    Routes.post.linkedResolve.url,
    Routes.post.linkedResolve.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "preImage");
        await requireParam(req.body, "paymentId");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostLinkedResolveResponse>(await client.linkedResolve(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostDepositRequest extends RequestGenericInterface {
    Body: RouteMethods.PostDepositRequestParams;
  }

  app.post<PostDepositRequest>(
    Routes.post.deposit.url,
    Routes.post.deposit.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "amount");
        await requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<RouteMethods.GetBalanceResponse>(await client.deposit(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostSwapRequest extends RequestGenericInterface {
    Body: RouteMethods.PostSwapRequestParams;
  }

  app.post<PostSwapRequest>(Routes.post.swap.url, Routes.post.swap.opts, async (req, res) => {
    try {
      await requireParam(req.body, "amount");
      await requireParam(req.body, "fromAssetId");
      await requireParam(req.body, "swapRate");
      await requireParam(req.body, "toAssetId");
      if (!config.legacyMode) {
        await requireParam(req.body, "publicIdentifier");
      }
      const client = multiClient.getClient(req.body.publicIdentifier);
      res.status(200).send<RouteMethods.PostSwapResponse>(await client.swap(req.body));
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface PostWithdrawRequest extends RequestGenericInterface {
    Body: RouteMethods.PostWithdrawRequestParams;
  }

  app.post<PostWithdrawRequest>(
    Routes.post.withdraw.url,
    Routes.post.withdraw.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "amount");
        await requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<RouteMethods.PostWithdrawResponse>(await client.withdraw(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostSubscribeRequest extends RequestGenericInterface {
    Body: RouteMethods.PostSubscribeRequestParams;
  }

  app.post<PostSubscribeRequest>(
    Routes.post.subscribe.url,
    Routes.post.subscribe.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "event");
        await requireParam(req.body, "webhook");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<SubscriptionResponse>(await client.subscribe(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostBatchSubscribeRequest extends RequestGenericInterface {
    Body: {
      publicIdentifier?: string;
      params: EventSubscriptionParams[];
    };
  }

  app.post<PostBatchSubscribeRequest>(
    Routes.post.batchSubscribe.url,
    Routes.post.batchSubscribe.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "params", "array");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<BatchSubscriptionResponse>(await client.subscribeBatch(req.body.params));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  // -- DELETE ---------------------------------------------------------------- //

  interface DeleteSubscribeRequest extends RequestGenericInterface {
    Body: {
      publicIdentifier?: string;
      id: string;
    };
  }

  app.delete<DeleteSubscribeRequest>(
    Routes.delete.subscribe.url,
    Routes.delete.subscribe.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "id");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<GenericSuccessResponse>(await client.unsubscribe(req.body.id));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface DeleteBatchSubscribeRequest extends RequestGenericInterface {
    Body: {
      publicIdentifier?: string;
      ids: string[];
    };
  }

  app.delete<DeleteBatchSubscribeRequest>(
    Routes.delete.batchSubscribe.url,
    Routes.delete.batchSubscribe.opts,
    async (req, res) => {
      try {
        await requireParam(req.body, "ids", "array");
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<GenericSuccessResponse>(await client.unsubscribeBatch(req.body.ids));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface DeleteSubscribeAllRequest extends RequestGenericInterface {
    Body: {
      publicIdentifier?: string;
    };
  }

  app.delete<DeleteSubscribeAllRequest>(
    Routes.delete.subscribeAll.url,
    Routes.delete.subscribeAll.opts,
    async (req, res) => {
      try {
        if (!config.legacyMode) {
          await requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<GenericSuccessResponse>(await client.unsubscribeAll());
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );
});

// -- INIT ---------------------------------------------------------------- //

const [host, port] = config.host.split(":");
app.listen(+port, host, (err) => {
  if (err) throw err;
});

export default app;
