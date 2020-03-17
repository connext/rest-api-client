import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";
const debug = env !== "production";
const port = process.env.PORT || (debug ? 5040 : 5000);
const host = process.env.HOST || `0.0.0.0:${port}`;

const network = process.env.CONNEXT_NETWORK || `rinkeby`;
const ethProviderUrl = process.env.CONNEXT_ETH_PROVIDER_URL || undefined;
const nodeUrl = process.env.CONNEXT_NODE_URL || undefined;
const mnemonic = process.env.CONNEXT_MNEMONIC || "";

export default {
  env: env,
  debug: debug,
  port,
  host,
  network,
  ethProviderUrl,
  nodeUrl,
  mnemonic,
};
