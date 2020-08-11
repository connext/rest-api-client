import dotenv from "dotenv";

import pkg from "../../package.json";

dotenv.config();

const env = process.env.NODE_ENV || "development";
const debug = env !== "production";
const port = process.env.PORT || (debug ? 5040 : 5000);
const host = process.env.HOST || `0.0.0.0:${port}`;
const apiKey = process.env.API_KEY;

const legacyMode =
  typeof process.env.LEGACY_MODE !== "undefined" ? JSON.parse(process.env.LEGACY_MODE) : false;
const version = pkg.version;

const ethProviderUrl = process.env.CONNEXT_ETH_PROVIDER_URL || undefined;
const nodeUrl = process.env.CONNEXT_NODE_URL || undefined;
const mnemonic = process.env.CONNEXT_MNEMONIC || undefined;
const fundingMnemonic =
  process.env.CONNEXT_FUNDING_MNEMONIC ||
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const storeDir = process.env.CONNEXT_STORE_DIR || "./connext-store";
const logLevel = parseInt(process.env.CONNEXT_LOG_LEVEL || "3", 10);

const docsHost = process.env.DOCS_HOST || "localhost";

export default {
  env,
  debug,
  port,
  host,
  legacyMode,
  version,
  apiKey,
  ethProviderUrl,
  nodeUrl,
  mnemonic,
  fundingMnemonic,
  storeDir,
  logLevel,
  docsHost,
};
