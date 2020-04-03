import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";
const debug = env !== "production";
const port = process.env.PORT || (debug ? 5040 : 5000);
const host = process.env.HOST || `0.0.0.0:${port}`;

const network = process.env.CONNEXT_NETWORK || `localhost`;
const ethProviderUrl = process.env.CONNEXT_ETH_PROVIDER_URL || undefined;
const nodeUrl = process.env.CONNEXT_NODE_URL || undefined;
const mnemonic = process.env.CONNEXT_MNEMONIC || "";
const storeDir = process.env.CONNEXT_STORE_DIR || "./connext-store";

const dbHost = process.env.POSTGRES_HOST || "localhost";
const dbPort = parseInt(process.env.POSTGRES_PORT || "5432");
const dbUsername = process.env.POSTGRES_USERNAME || "indra";
const dbPassword = process.env.POSTGRES_PASSWORD || "indra";
const dbDatabase = process.env.POSTGRES_DATABASE || "indra";

export default {
  env: env,
  debug: debug,
  port,
  host,
  network,
  ethProviderUrl,
  nodeUrl,
  mnemonic,
  storeDir,
  dbHost,
  dbPort,
  dbUsername,
  dbPassword,
  dbDatabase,
};
