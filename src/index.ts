import fastify from "fastify";
import Helmet from "fastify-helmet";

import config from "./config";

import * as client from "./client";

const app = fastify({ logger: config.debug });

app.register(Helmet);

app.get("/health", (_, res) => {
  res.status(204).send();
});

app.get("/hello", (req, res) => {
  res.status(200).send(`Hello World, this is Connext client`);
});

app.post("/connect", async (req, res) => {
  try {
    res.status(200).send(await client.init(req.body));
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/transfer", async (req, res) => {
  try {
    res.status(200).send(await client.transfer(req.body));
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
