import fastify from "fastify";
import Helmet from "fastify-helmet";

import config from "./config";

import ClientManager from "./client";

const app = fastify({ logger: config.debug });

const clientManager = new ClientManager();

app.register(Helmet);

app.get("/health", (_, res) => {
  res.status(204).send();
});

app.get("/hello", (req, res) => {
  res.status(200).send(`Hello World, this is Connext client`);
});

app.get("/balance", async (req, res) => {
  try {
    res.status(200).send(await clientManager.balance(req.body.assetId));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.get("/config", async (req, res) => {
  const config = clientManager.config;
  if (!config.multisigAddress) {
    res.status(500).send({ message: "Connext Client Not Yet Initialized" });
  }
  res.status(200).send(config);
});

app.post("/connect", async (req, res) => {
  try {
    await clientManager.initClient(req.body);
    res.status(200).send(clientManager.config);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/mnemonic", async (req, res) => {
  try {
    if (!req.body.mnemonic || typeof req.body.mnemonic !== "string") {
      throw new Error("Invalid or missing mnemonic");
    }
    clientManager.mnemonic = req.body.mnemonic;
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/hashlock-transfer", async (req, res) => {
  try {
    res.status(200).send(await clientManager.hashLockTransfer(req.body));
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
