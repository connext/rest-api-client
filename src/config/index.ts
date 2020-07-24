import dotenv from "dotenv";

import pkg from "../../package.json";

dotenv.config();

const env = process.env.NODE_ENV || "development";
const debug = env !== "production";
const port = process.env.PORT || (debug ? 5040 : 5000);
const host = process.env.HOST || `0.0.0.0:${port}`;
const apiKey = process.env.API_KEY;

const singleClient = process.env.SINGLE_CLIENT_MODE || true;
const version = pkg.version;

const network = process.env.CONNEXT_NETWORK || `rinkeby`;
const ethProviderUrl = process.env.CONNEXT_ETH_PROVIDER_URL || undefined;
const nodeUrl = process.env.CONNEXT_NODE_URL || undefined;
const mnemonic = process.env.CONNEXT_MNEMONIC || "";
const storeDir = process.env.CONNEXT_STORE_DIR || "./connext-store";
const logLevel = parseInt(process.env.CONNEXT_LOG_LEVEL || "3", 10);
const docsHost = process.env.DOCS_HOST || "localhost";

export default {
  env,
  debug,
  port,
  host,
  singleClient,
  version,
  apiKey,
  network,
  ethProviderUrl,
  nodeUrl,
  mnemonic,
  storeDir,
  logLevel,
  docsHost,
};
