import pkg from "../package.json";

import { SwaggerDefinition } from "./helpers";

const swagger: SwaggerDefinition = {
  options: {
    urlPrefix: "/docs",
    swagger: {
      info: {
        title: "Connext Rest API Client",
        description: "testing the fastify swagger api",
        version: pkg.version,
      },
      externalDocs: {
        url: "https://docs.connext.network/",
        description: "Find more documentation here",
      },
      host: "localhost",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
      // tags: [
      // ],
    },
    exposeRoute: true,
  },
  routes: {
    get: {
      health: {
        url: "/health",
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
        opts: {
          schema: {
            response: {
              200: {
                type: "string",
              },
            },
          },
        },
      },
      version: {
        url: "/version",
        opts: {
          schema: {
            response: {
              200: {
                type: "object",
                properties: {
                  version: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
      balance: {
        url: "/balance/:assetId",
        opts: {
          schema: {
            params: {
              type: "object",
              properties: {
                assetId: {
                  type: "string",
                },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  freeBalanceOffChain: { type: "string" },
                  freeBalanceOnChain: { type: "string" },
                },
              },
            },
          },
        },
      },
      config: {
        url: "/config",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      hashLockStatus: {
        url: "/hashlock-status/:lockHash/:assetId",
        opts: {
          schema: {
            params: {
              type: "object",
              properties: {
                lockHash: {
                  type: "string",
                },
                assetId: {
                  type: "string",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      linkedStatus: {
        url: "/linked-status/:paymentId",
        opts: {
          schema: {
            params: {
              type: "object",
              properties: {
                paymentId: {
                  type: "string",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      appinstanceDetails: {
        url: "/appinstance-details/:appIdentityHash",
        opts: {
          schema: {
            params: {
              type: "object",
              properties: {
                appIdentityHash: {
                  type: "string",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      transferHistory: {
        url: "/transfer-history",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    post: {
      create: {
        url: "/create",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      connect: {
        url: "/connect",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      mnemonic: {
        url: "/mnemonic",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      onchainTransfer: {
        url: "/onchain-transfer",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      hashLockTransfer: {
        url: "/hashlock-transfer",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      hashLockResolve: {
        url: "/hashlock-resolve",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      linkedTransfer: {
        url: "/linked-transfer",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      linkedResolve: {
        url: "/linked-resolve",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      deposit: {
        url: "/deposit",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      swap: {
        url: "/swap",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      withdraw: {
        url: "/withdraw",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      subscribe: {
        url: "/subscribe",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      batchSubscribe: {
        url: "/subscribe/batch",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      subscribe: {
        url: "/subscribe",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      batchSubscribe: {
        url: "/subscribe/batch",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
      subscribeAll: {
        url: "/subscribe/all",
        opts: {
          schema: {
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default swagger;
