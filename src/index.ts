import * as connext from "@connext/client";
import { ConnextStore, FileStorage } from "@connext/store";
import { IConnextClient } from "@connext/types";

import fastify from "fastify";
import Helmet from "fastify-helmet";
import config from "./config";
import pkg from "../package.json";
import { EMPTY_CHANNEL_PROVIDER_CONFIG } from "./constants";

const app = fastify({ logger: config.debug });

let client: IConnextClient;

app.register(Helmet);

app.get("/health", (_, res) => {
  res.status(204).send();
});

app.get("/hello", (req, res) => {
  res.status(200).send(`Hello World, this is Connext client v${pkg.version}`);
});

app.get("/info", (req, res) => {
  res.status(200).send({
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
  });
});

app.post("/connect", async (req, res) => {
  const { network, mnemonic } = req.body;
  try {
    const baseUrl = connext.utils.isMainnet(network)
      ? "indra.connext.network/api"
      : connext.utils.isRinkeby(network)
      ? "rinkeby.indra.connext.network/api"
      : null;
    const ethProviderUrl = req.body.ethProviderUrl || `https://${baseUrl}/ethprovider`;
    const nodeUrl = req.body.nodeUrl || `nats://${baseUrl}/messaging`;
    const store = new ConnextStore(new FileStorage());
    client = await connext.connect({ ethProviderUrl, nodeUrl, mnemonic, store });
    const config = { ...EMPTY_CHANNEL_PROVIDER_CONFIG, ...client.channelProvider.config };
    res.status(200).send({
      connected: true,
      freeBalanceAddress: config.freeBalanceAddress,
      multisigAddress: config.multisigAddress,
      natsClusterId: config.natsClusterId,
      natsToken: config.natsToken,
      nodeUrl: config.nodeUrl,
      signerAddress: config.signerAddress,
      userPublicIdentifier: config.userPublicIdentifier,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

const [host, port] = config.host.split(":");
app.listen(+port, host, (err, address) => {
  if (err) throw err;
  console.log(`Server listening on ${address}`);
  app.log.info(`Server listening on ${address}`);
});
