export const MNEMONIC_OPTS = {
  mnemonic: "access fiscal fruit engage tourist card stay viable wise write omit unfair",
};

export const STAGING_URLS = {
  ethProviderUrl: "https://staging.indra.connext.network/api/ethprovider",
  nodeUrl: "https://staging.indra.connext.network/api",
};

export const CREATE_OPTS = {
  ...STAGING_URLS,
};

export const CONNECT_OPTS = {
  ...MNEMONIC_OPTS,
  ...STAGING_URLS,
};
