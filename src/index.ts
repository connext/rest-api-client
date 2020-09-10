import fastify, { RequestGenericInterface } from "fastify";
import fastifyAuth from "fastify-auth";
import fastifySwagger from "fastify-swagger";
import fastifyHelmet from "fastify-helmet";
import { constants, Contract, BigNumber } from "ethers";
import { AddressZero } from "@ethersproject/constants";

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
  tokenAbi,
} from "./helpers";
import Client from "./client";
import Funder from "./funder";

const app = fastify({
  logger: { prettyPrint: config.debug } as any,
  disableRequestLogging: true,
  pluginTimeout: 120_000,
});

let multiClient: MultiClient;
let funder: Funder;

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
  const store = await getStore(config.storeDir, "shared");
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
    config.messagingUrl,
    config.legacyMode,
    config.storeDir,
    config.logLevel,
    persisted.clients,
    persisted.wallets,
  );
  funder = new Funder(config.fundingMnemonic, config.ethProviderUrl);
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

  app.get(Routes.get.fundingWallet.url, Routes.get.fundingWallet.opts, (req, res) => {
    try {
      res.status(200).send<RouteMethods.GetFundingWalletResponse>(funder.getSummary());
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface GetFundingBalanceRequest extends RequestGenericInterface {
    Params: RouteMethods.GetFundingBalanceRequestParams;
  }

  app.get<GetFundingBalanceRequest>(
    Routes.get.fundingBalance.url,
    Routes.get.fundingBalance.opts,
    async (req, res) => {
      try {
        requireParam(req.params, "assetId");

        res
          .status(200)
          .send<RouteMethods.GetFundingBalanceResponse>(
            await funder.getBalance(req.params.assetId),
          );
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface GetBalanceRequest extends RequestGenericInterface {
    Params: RouteMethods.GetBalanceRequestParams;
  }

  app.get<GetBalanceRequest>(Routes.get.balance.url, Routes.get.balance.opts, async (req, res) => {
    try {
      requireParam(req.params, "assetId");
      if (!config.legacyMode) {
        requireParam(req.params, "publicIdentifier");
      }
      let client: Client | undefined;
      try {
        client = multiClient.getClient(req.params.publicIdentifier);
      } catch (e) {
        // do nothing
      }
      const balances =
        typeof client !== "undefined"
          ? await client.balance(req.params.assetId)
          : await multiClient.keyring.balance(req.params.assetId, req.params.publicIdentifier);
      res.status(200).send<RouteMethods.GetBalanceResponse>(balances);
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  app.get(Routes.get.wallets.url, Routes.get.wallets.opts, (req, res) => {
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

  interface GetConfigRequest extends RequestGenericInterface {
    Params: RouteMethods.GetConfigRequestParams;
  }

  app.get<GetConfigRequest>(Routes.get.config.url, Routes.get.config.opts, (req, res) => {
    try {
      if (!config.legacyMode) {
        requireParam(req.params, "publicIdentifier");
      }
      const client = multiClient.getClient(req.params.publicIdentifier);
      res.status(200).send<RouteMethods.GetConfigResponse>(client.getConfig());
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
        requireParam(req.params, "lockHash");
        requireParam(req.params, "assetId");
        const { lockHash, assetId } = req.params;
        if (!config.legacyMode) {
          requireParam(req.params, "publicIdentifier");
        }
        const client = multiClient.getClient(req.params.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.GetHashLockStatusResponse>(
            await client.hashLockStatus(lockHash, assetId),
          );
      } catch (error) {
        app.log.error(error);
        let statusCode = 500;
        if ((error.message as string).includes(`No HashLock Transfer found for lockHash`)) {
          statusCode = 404;
        }
        res.status(statusCode).send<GenericErrorResponse>({ message: error.message });
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
        requireParam(req.params, "paymentId");
        const { paymentId } = req.params;
        if (!config.legacyMode) {
          requireParam(req.params, "publicIdentifier");
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
        requireParam(req.params, "appIdentityHash");
        if (!config.legacyMode) {
          requireParam(req.params, "publicIdentifier");
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
          requireParam(req.params, "publicIdentifier");
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
      requireParam(req.body, "index", "number");
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

  interface PostMnemonicRequest extends RequestGenericInterface {
    Body: RouteMethods.PostMnemonicRequestParams;
  }

  app.post<PostMnemonicRequest>(
    Routes.post.mnemonic.url,
    Routes.post.mnemonic.opts,
    async (req, res) => {
      try {
        requireParam(req.body, "mnemonic");
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
        requireParam(req.body, "amount");
        requireParam(req.body, "assetId");
        requireParam(req.body, "recipient");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        res
          .status(200)
          .send<RouteMethods.PostTransactionResponse>(await multiClient.keyring.transfer(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostConnectRequest extends RequestGenericInterface {
    Body: Partial<ConnectOptions>;
  }

  app.post<PostConnectRequest>(
    Routes.post.connect.url,
    Routes.post.connect.opts,
    async (req, res) => {
      try {
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = await multiClient.connectClient(req.body);
        res.status(200).send<RouteMethods.GetConfigResponse>(client.getConfig());
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
          requireParam(req.body, "publicIdentifier");
        }
        await multiClient.disconnectClient(req.body?.publicIdentifier);
        res.status(200).send<GenericSuccessResponse>({ success: true });
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
        requireParam(req.body, "amount");
        requireParam(req.body, "assetId");
        requireParam(req.body, "lockHash");
        requireParam(req.body, "timelock");
        requireParam(req.body, "recipient");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "preImage");
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "assetId");
        requireParam(req.body, "amount");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "preImage");
        requireParam(req.body, "paymentId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
  interface PostFundRequest extends RequestGenericInterface {
    Body: RouteMethods.PostFundRequestParams;
  }

  app.post<PostFundRequest>(Routes.post.fund.url, Routes.post.fund.opts, async (req, res) => {
    try {
      requireParam(req.body, "amount");
      requireParam(req.body, "assetId");
      if (!config.legacyMode) {
        requireParam(req.body, "publicIdentifier");
      }
      const client = multiClient.getClient(req.body.publicIdentifier);
      res
        .status(200)
        .send<RouteMethods.PostFundResponse>(
          await client.fund(req.body.amount, req.body.assetId, funder),
        );
    } catch (error) {
      app.log.error(error);
      res.status(500).send<GenericErrorResponse>({ message: error.message });
    }
  });

  interface PostDepositRequest extends RequestGenericInterface {
    Body: RouteMethods.PostDepositRequestParams;
  }

  app.post<PostDepositRequest>(
    Routes.post.deposit.url,
    Routes.post.deposit.opts,
    async (req, res) => {
      try {
        requireParam(req.body, "amount");
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        const balances = await client.balance(constants.AddressZero);
        let gas: BigNumber | undefined;
        const gasPrice = await client.client?.ethProvider.getGasPrice();
        if (req.body.assetId === constants.AddressZero) {
          gas = await client.client?.ethProvider.estimateGas({
            to: client.client.multisigAddress,
            value: req.body.amount,
          });
        } else {
          const contract = new Contract(req.body.assetId!, tokenAbi, client.client?.ethProvider);
          gas = await contract.estimateGas.transfer(
            client.client!.multisigAddress,
            req.body.amount,
          );
        }
        if (!gas || !gasPrice) {
          return res.status(400).send<GenericErrorResponse>({ message: "Could not estimate gas." });
        }
        const totalEthRequired = gas!
          .mul(gasPrice)
          .add(req.body.assetId === AddressZero ? req.body.amount : 0);
        if (BigNumber.from(balances.freeBalanceOnChain).lt(totalEthRequired)) {
          return res.status(400).send<GenericErrorResponse>({
            message: `Signer address balance ${balances.freeBalanceOnChain} is less than required amount ${totalEthRequired}`,
          });
        }
        return res
          .status(200)
          .send<RouteMethods.PostDepositResponse>(await client.deposit(req.body));
      } catch (error) {
        app.log.error(error);
        return res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostRequestDepositRightsRequest extends RequestGenericInterface {
    Body: RouteMethods.PostRequestDepositRightsRequestParams;
  }

  app.post<PostRequestDepositRightsRequest>(
    Routes.post.requestDepositRights.url,
    Routes.post.requestDepositRights.opts,
    async (req, res) => {
      try {
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostRequestDepositRightsResponse>(
            await client.requestDepositRights(req.body),
          );
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostRescindDepositRightsRequest extends RequestGenericInterface {
    Body: RouteMethods.PostRescindDepositRightsRequestParams;
  }

  app.post<PostRescindDepositRightsRequest>(
    Routes.post.rescindDepositRights.url,
    Routes.post.rescindDepositRights.opts,
    async (req, res) => {
      try {
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostRescindDepositRightsResponse>(
            await client.rescindDepositRights(req.body),
          );
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostRequestCollateralRequest extends RequestGenericInterface {
    Body: RouteMethods.PostRequestCollateralRequestParams;
  }

  app.post<PostRequestCollateralRequest>(
    Routes.post.requestCollateral.url,
    { ...Routes.post.requestCollateral.opts, preHandler: app.auth([app.verifyApiKey]) },
    async (req, res) => {
      try {
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        await client.requestCollateral(req.body);
        res.status(200).send<GenericSuccessResponse>({ success: true });
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
      requireParam(req.body, "amount");
      requireParam(req.body, "fromAssetId");
      requireParam(req.body, "swapRate");
      requireParam(req.body, "toAssetId");
      if (!config.legacyMode) {
        requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "amount");
        requireParam(req.body, "assetId");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res.status(200).send<RouteMethods.PostWithdrawResponse>(await client.withdraw(req.body));
      } catch (error) {
        app.log.error(error);
        res.status(500).send<GenericErrorResponse>({ message: error.message });
      }
    },
  );

  interface PostRejectInstallRequest extends RequestGenericInterface {
    Body: RouteMethods.PostRejectInstallRequestParams;
  }

  app.post<PostRejectInstallRequest>(
    Routes.post.rejectInstall.url,
    Routes.post.rejectInstall.opts,
    async (req, res) => {
      try {
        requireParam(req.body, "appIdentityHash");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
        }
        const client = multiClient.getClient(req.body.publicIdentifier);
        res
          .status(200)
          .send<RouteMethods.PostRejectInstallResponse>(
            await client.rejectInstallApp(req.body.appIdentityHash, req.body.reason),
          );
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
        requireParam(req.body, "event");
        requireParam(req.body, "webhook");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "params", "array");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "id");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
        requireParam(req.body, "ids", "array");
        if (!config.legacyMode) {
          requireParam(req.body, "publicIdentifier");
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
          requireParam(req.body, "publicIdentifier");
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
