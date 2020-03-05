import fastify from "fastify";
import Helmet from "fastify-helmet";
import config from "./config";
import pkg from "../package.json";

const app = fastify({ logger: config.debug });

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

const [host, port] = config.host.split(":");
app.listen(+port, host, (err, address) => {
  if (err) throw err;
  console.log(`Server listening on ${address}`);
  app.log.info(`Server listening on ${address}`);
});
