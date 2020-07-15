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
      //   { name: "assetId", description: "Asset Id" },
      //   { name: "lockHash", description: "Lock Hash" },
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
            // description: "Get 204 health response",
            response: {
              204: {
                // description: "Successful response",
              },
            },
          },
        },
      },
      hello: {
        url: "/hello",
        opts: {
          schema: {
            // description: "Hello world test endpoint",
            response: {
              200: {
                // description: "Successful response",
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
            // description: "Get client version number",
            response: {
              200: {
                // description: "Successful response",
                type: "object",
                properties: {
                  id: {
                    version: "string",
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
            // description: "Get balances for specific asset",
            params: {
              type: "object",
              properties: {
                assetId: {
                  type: "string",
                  // description: "Asset Identifier",
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
            // description: "post some data",
            params: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  // description: "user id",
                },
              },
            },
            body: {
              type: "object",
              properties: {
                hello: { type: "string" },
                obj: {
                  type: "object",
                  properties: {
                    some: { type: "string" },
                  },
                },
              },
            },
            response: {
              200: {
                // description: "Successful response",
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
