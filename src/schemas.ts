import { cleanDeep } from "./helpers";

export function getSwaggerOptions(docsHost: string, version: string) {
  return {
    urlPrefix: "/documentation",
    swagger: {
      info: {
        title: "Connext Rest API Client",
        description: "testing the fastify swagger api",
        version: version,
      },
      externalDocs: {
        url: "https://docs.connext.network/",
        description: "Find more documentation here",
      },
      host: docsHost,
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
      // tags: [
      // ],
    },
    exposeRoute: true,
  };
}

export const ChannelConfigResponseSchema = {
  type: "object",
  properties: {
    signerAddress: { type: "string" },
    multisigAddress: { type: "string" },
    nodeUrl: { type: "string" },
    userIdentifier: { type: "string" },
  },
};

export const BalanceResponseSchema = {
  type: "object",
  properties: {
    freeBalanceOffChain: { type: "string" },
    freeBalanceOnChain: { type: "string" },
  },
};

export const AppInstanceDetailsSchema = {
  type: "object",
  properties: {
    abiEncodings: {
      type: "object",
      properties: {
        actionEncoding: { type: "string" },
        stateEncoding: { type: "string" },
      },
    },
    appDefinition: { type: "string" },
    appSeqNo: { type: "string" },
    bytecode: { type: "string" },
    defaultTimeout: { type: "string" },
    identityHash: { type: "string" },
    initiatorDeposit: { type: "string" },
    initiatorDepositAssetId: { type: "string" },
    initiatorIdentifier: { type: "string" },
    latestAction: { type: "object" },
    latestState: { type: "object" },
    latestVersionNumber: { type: "string" },
    multisigAddress: { type: "string" },
    outcomeInterpreterParameters: { type: "string" },
    outcomeType: { type: "string" },
    responderDeposit: { type: "string" },
    responderDepositAssetId: { type: "string" },
    responderIdentifier: { type: "string" },
    stateTimeout: { type: "string" },
  },
};

export const EventSubscriptionParamsSchema = {
  type: "object",
  properties: {
    event: { type: "string" },
    webhook: { type: "string" },
  },
};

export const EventSubscriptionResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
};

export const GenericSuccessResponseSchema = {
  type: "object",
  description: "Successful Response",
  properties: {
    success: { type: "boolean" },
  },
};

export const GenericErrorResponseSchema = {
  type: "object",
  description: "Server Error Message",
  properties: {
    message: { type: "string" },
  },
};

export const getRoutes = (authHandler: any, singleClientMode: boolean): any =>
  cleanDeep({
    get: {
      health: {
        url: "/health",
        description: "Attest server health",
        opts: {
          schema: {
            response: {
              204: {},
            },
          },
        },
      },
      hello: {
        url: "/hello",
        description: "Get test message response",
        opts: {
          schema: {
            response: {
              200: { type: "string" },
            },
          },
        },
      },
      version: {
        url: "/version",
        description: "Get client version number",
        opts: {
          schema: {
            response: {
              200: {
                type: "object",
                properties: {
                  version: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      clients: {
        url: "/clients",
        description: "Get array of initialized clients' public identifiers",
        opts: {
          preHandler: authHandler,
          schema: {
            response: {
              200: {
                type: "object",
                properties: {
                  publicIdentifiers: { type: "array", items: { type: "string" } },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      clientStats: {
        url: "/client-stats",
        description: "Get summary of running clients",
        opts: {
          preHandler: authHandler,
          schema: {
            response: {
              200: {
                type: "array",
                items: {
                  typeof: "object",
                  properties: {
                    publicIdentifier: { type: "string" },
                    multisig: { type: "string" },
                    signer: { type: "string" },
                    chainId: { type: "number" },
                    token: { type: "string" },
                    tokenBalance: { type: "string" },
                    channelNonce: { type: "number" },
                    proposedApps: { type: "number" },
                    installedApps: { type: "number" },
                  },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      balance: {
        url: !singleClientMode ? "/balance/:assetId/:publicIdentifier" : "/balance/:assetId",
        description: "Get on-chain and off-chain balances for specific asset",
        opts: {
          preHandler: authHandler,
          schema: {
            params: {
              type: "object",
              properties: {
                assetId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: BalanceResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      config: {
        url: !singleClientMode ? "/config/:publicIdentifier" : "/config",
        description: "Get channel configuration if client is initialized",
        opts: {
          preHandler: authHandler,
          params: !singleClientMode
            ? {
                type: "object",
                properties: {
                  publicIdentifier: { type: "string" },
                },
              }
            : undefined,
          schema: {
            response: {
              200: ChannelConfigResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      hashLockStatus: {
        url: !singleClientMode
          ? "/hashlock-status/:lockHash/:assetId/:publicIdentifier"
          : "/hashlock-status/:lockHash/:assetId",
        description: "Get hash lock transfer status and details",
        opts: {
          preHandler: authHandler,
          schema: {
            params: {
              type: "object",
              properties: {
                lockHash: { type: "string" },
                assetId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  senderIdentifier: { type: "string" },
                  receiverIdentifier: { type: "string" },
                  assetId: { type: "string" },
                  amount: { type: "string" },
                  lockHash: { type: "string" },
                  status: { type: "string" },
                  preImage: { type: "string" },
                  expiry: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      linkedStatus: {
        url: !singleClientMode
          ? "/linked-status/:paymentId/:publicIdentifier"
          : "/linked-status/:paymentId",
        description: "Get linked transfer status and details",
        opts: {
          preHandler: authHandler,
          schema: {
            params: {
              type: "object",
              properties: {
                paymentId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  paymentId: { type: "string" },
                  createdAt: { type: "string" },
                  amount: { type: "string" },
                  assetId: { type: "string" },
                  senderIdentifier: { type: "string" },
                  receiverIdentifier: { type: "string" },
                  status: { type: "string" },
                  encryptedPreImage: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      appinstanceDetails: {
        url: !singleClientMode
          ? "/appinstance-details/:appIdentityHash/:publicIdentifier"
          : "/appinstance-details/:appIdentityHash",
        description: "Get app instance details",
        opts: {
          preHandler: authHandler,
          schema: {
            params: {
              type: "object",
              properties: {
                appIdentityHash: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: AppInstanceDetailsSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      transferHistory: {
        url: !singleClientMode ? "/transfer-history/:publicIdentifier" : "/transfer-history",
        description: "Get all channel transfer history",
        opts: {
          preHandler: authHandler,
          schema: {
            params: !singleClientMode
              ? {
                  type: "object",
                  properties: {
                    publicIdentifier: { type: "string" },
                  },
                }
              : undefined,
            response: {
              200: {
                type: "array",
                items: {
                  typeof: "object",
                  properties: {
                    paymentId: { type: "string" },
                    amount: { type: "string" },
                    assetId: { type: "string" },
                    senderIdentifier: { type: "string" },
                    receiverIdentifier: { type: "string" },
                  },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
    },
    post: {
      connect: {
        url: "/connect",
        description: "Connect client channel for provided or persisted mnemonic",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                mnemonic: { type: "string", nullable: true },
                network: { type: "string", nullable: true },
                nodeUrl: { type: "string", nullable: true },
                ethProviderUrl: { type: "string", nullable: true },
                messagingUrl: { type: "string", nullable: true },
                logLevel: { type: "number", nullable: true },
                skipSync: { type: "boolean", nullable: true },
                skipInitStore: { type: "boolean", nullable: true },
              },
              nullable: true,
            },
            response: {
              200: ChannelConfigResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      disconnect: {
        url: "/disconnect",
        description: "Disconnect client channel for provided public identifier",
        opts: {
          preHandler: authHandler,
          schema: {
            body: !singleClientMode
              ? {
                  type: "object",
                  properties: {
                    publicIdentifier: { type: "string" },
                  },
                }
              : undefined,
            response: {
              200: ChannelConfigResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },

      mnemonic: {
        url: "/mnemonic",
        description: "Provide or update client's mnemonic",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                mnemonic: { type: "string" },
              },
            },
            response: {
              200: GenericSuccessResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      onchainTransfer: {
        url: "/onchain-transfer",
        description: "Submit on-chain transaction",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                assetId: { type: "string" },
                recipient: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  txhash: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      hashLockTransfer: {
        url: "/hashlock-transfer",
        description: "Create hash lock transfer",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                assetId: { type: "string" },
                lockHash: { type: "string" },
                timelock: { type: "string" },
                recipient: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  appInstance: AppInstanceDetailsSchema,
                  amount: { type: "string" },
                  appIdentityHash: { type: "string" },
                  assetId: { type: "string" },
                  paymentId: { type: "string" },
                  preImage: { type: "string" },
                  sender: { type: "string" },
                  recipient: { type: "string" },
                  transferMeta: { type: "object" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      hashLockResolve: {
        url: "/hashlock-resolve",
        description: "Resolve hash lock transfer",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                preImage: { type: "string" },
                assetId: { type: "string" },
                paymentId: { type: "string", nullable: true },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  appIdentityHash: { type: "string" },
                  sender: { type: "string" },
                  amount: { type: "string" },
                  assetId: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      linkedTransfer: {
        url: "/linked-transfer",
        description: "Create linked transfer",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                assetId: { type: "string" },
                preImage: { type: "string", nullable: true },
                paymentId: { type: "string", nullable: true },
                recipient: { type: "string", nullable: true },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  appInstance: AppInstanceDetailsSchema,
                  amount: { type: "string" },
                  appIdentityHash: { type: "string" },
                  assetId: { type: "string" },
                  paymentId: { type: "string" },
                  preImage: { type: "string" },
                  sender: { type: "string" },
                  recipient: { type: "string" },
                  transferMeta: { type: "object" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      linkedResolve: {
        url: "/linked-resolve",
        description: "Resolve linked transfer",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                preImage: { type: "string" },
                paymentId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  appIdentityHash: { type: "string" },
                  sender: { type: "string" },
                  paymentId: { type: "string" },
                  amount: { type: "string" },
                  assetId: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      deposit: {
        url: "/deposit",
        description: "Deposit asset on channel",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                assetId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: BalanceResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      swap: {
        url: "/swap",
        description: "Swap asset on channel",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                fromAssetId: { type: "string" },
                swapRate: { type: "string" },
                toAssetId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                fromAssetIdBalance: { type: "string" },
                toAssetIdBalance: { type: "string" },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      withdraw: {
        url: "/withdraw",
        description: "Withdraw asset from channel",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "string" },
                assetId: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  txhash: { type: "string" },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      subscribe: {
        url: "/subscribe",
        description: "Subscribe to client event",
        opts: {
          preHandler: authHandler,
          schema: {
            body: singleClientMode
              ? EventSubscriptionParamsSchema
              : {
                  type: "object",
                  propertiers: {
                    ...EventSubscriptionParamsSchema.properties,
                    publicIdentifier: { type: "string" },
                  },
                },
            response: {
              200: EventSubscriptionResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      batchSubscribe: {
        url: "/subscribe/batch",
        description: "Batch subscribe to client events",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                params: { type: "array", items: EventSubscriptionParamsSchema },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  subscriptions: { type: "array", items: EventSubscriptionResponseSchema },
                },
              },
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
    },
    delete: {
      subscribe: {
        url: "/subscribe",
        description: "Unsubscribe to client event",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                id: { type: "string" },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: GenericSuccessResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      batchSubscribe: {
        url: "/subscribe/batch",
        description: "Batch unsubscribe to client events",
        opts: {
          preHandler: authHandler,
          schema: {
            body: {
              type: "object",
              properties: {
                ids: { type: "array", items: { type: "string" } },
                publicIdentifier: !singleClientMode ? { type: "string" } : undefined,
              },
            },
            response: {
              200: GenericSuccessResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
      subscribeAll: {
        url: "/subscribe/all",
        description: "Unsuscribe all client events",
        opts: {
          preHandler: authHandler,
          schema: {
            body: !singleClientMode
              ? {
                  type: "object",
                  properties: {
                    publicIdentifier: { type: "string" },
                  },
                }
              : undefined,
            response: {
              200: GenericSuccessResponseSchema,
              500: GenericErrorResponseSchema,
            },
          },
        },
      },
    },
  });
