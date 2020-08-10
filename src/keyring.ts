import { Wallet, providers } from "ethers";
import { IStoreService } from "@connext/types";
import { getPublicIdentifierFromPublicKey } from "@connext/utils";

import {
  storeMnemonic,
  getPath,
  getIndexFromPath,
  WalletSummary,
  deleteWallets,
  InternalWalletOptions,
  updateWallets,
  RouteMethods,
  getPersistedClientOptions,
  transferOnChain,
  getFreeBalanceOnChain,
} from "./helpers";

class Keyring {
  public static async init(
    mnemonic: string | undefined,
    logger: any,
    store: IStoreService,
    ethProviderUrl: string | undefined,
    legacyMode: boolean,
    persistedWallets?: InternalWalletOptions[],
  ): Promise<Keyring> {
    const keyring = new Keyring(mnemonic, logger, store, ethProviderUrl, legacyMode);
    if (legacyMode) {
      await keyring.createWallet(0);
    } else if (persistedWallets && persistedWallets.length) {
      logger.info(`Creating ${persistedWallets.length} persisted wallets`);
      await Promise.all(persistedWallets.map((w) => keyring.createWallet(w.index)));
    }
    return keyring;
  }

  public wallets: Wallet[] = [];
  public pending: number[] = [];

  constructor(
    public mnemonic: string | undefined,
    public logger: any,
    public store: IStoreService,
    public ethProviderUrl: string | undefined,
    public legacyMode: boolean,
  ) {
    this.mnemonic = mnemonic;
    this.logger = logger;
    this.store = store;
    this.ethProviderUrl = ethProviderUrl;
    this.legacyMode = legacyMode;
  }

  public async createWallet(index: number): Promise<WalletSummary> {
    if (typeof this.mnemonic === "undefined") {
      throw new Error("Cannot create wallet without mnemonic");
    }
    if (this.pending.includes(index)) {
      throw new Error(`Wallet already being created for index: ${index}`);
    }
    let wallet: Wallet | undefined;
    try {
      wallet = this.getWalletByIndex(index);
    } catch (e) {
      // do nothing
    }
    if (typeof wallet === "undefined") {
      this.setPending(index);
      this.logger.info(`Creating wallet for index: ${index}`);
      wallet = Wallet.fromMnemonic(this.mnemonic, getPath(index));
      await this.setWallet(wallet, index);
      this.removePending(index);
    }
    return this.formatWalletSummary(wallet);
  }

  public getWalletByIndex(index: number): Wallet {
    return this.getWallet<number>(
      index,
      "index",
      (wallet, value) => getIndexFromPath(wallet.mnemonic.path) === value,
    );
  }

  public getWalletByAddress(address: string): Wallet {
    return this.getWallet<string>(address, "address", (wallet, value) => wallet.address === value);
  }

  public getWalletByPublicIdentifier(publicIdentifier: string): Wallet {
    return this.getWallet<string>(
      publicIdentifier,
      "publicIdentifier",
      (wallet, value) => getPublicIdentifierFromPublicKey(wallet.publicKey) === value,
    );
  }

  public getWallets(): WalletSummary[] {
    return this.wallets.map(this.formatWalletSummary);
  }

  public async balance(assetId: string, pubId?: string): Promise<RouteMethods.GetBalanceResponse> {
    const publicIdentifier = this.getPublicIdentifier(pubId);
    const wallet = this.getWalletByPublicIdentifier(publicIdentifier);
    const ethProvider = await this.getEthProvider(publicIdentifier);
    const freeBalanceOnChain = await getFreeBalanceOnChain(wallet.address, ethProvider, assetId);
    return { freeBalanceOnChain };
  }

  public async transfer(
    params: RouteMethods.PostTransactionRequestParams,
  ): Promise<RouteMethods.PostTransactionResponse> {
    const publicIdentifier = this.getPublicIdentifier(params.publicIdentifier);
    const txhash = await transferOnChain({
      wallet: this.getWalletByPublicIdentifier(publicIdentifier),
      ethProvider: await this.getEthProvider(publicIdentifier, params.ethProviderUrl),
      assetId: params.assetId,
      amount: params.amount,
      recipient: params.recipient,
    });
    return { txhash };
  }

  private getPublicIdentifier(pubId?: string): string {
    const publicIdentifier = this.legacyMode
      ? getPublicIdentifierFromPublicKey(this.getWalletByIndex(0).publicKey)
      : pubId;
    if (typeof publicIdentifier === "undefined") {
      throw new Error("Missing publicIdentifier required for on-chain transfer");
    }
    return publicIdentifier;
  }

  private async getEthProvider(
    publicIdentifier: string,
    url?: string,
  ): Promise<providers.Provider> {
    const ethProviderUrl =
      url ||
      (await getPersistedClientOptions(this.store, publicIdentifier))?.ethProviderUrl ||
      this.ethProviderUrl;
    if (typeof ethProviderUrl === "undefined") {
      throw new Error("Missing ethProviderUrl required for on-chain transfer");
    }
    return new providers.JsonRpcProvider(ethProviderUrl);
  }

  public async setMnemonic(mnemonic: string) {
    if (this.mnemonic !== mnemonic) {
      this.reset();
    }
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, this.store);
    this.logger.info("Mnemonic set successfully");
  }

  public async reset() {
    this.logger.info(`Removing all created wallets`);
    this.wallets = [];
    await deleteWallets(this.store);
  }

  // -- Private ---------------------------------------------------------------- //

  private async setWallet(wallet: Wallet, index: number): Promise<void> {
    this.wallets.push(wallet);
    await updateWallets({ index }, this.store);
  }

  private getWallet<T>(
    value: T,
    name: string,
    condition: (wallet: Wallet, value: T) => boolean,
  ): Wallet {
    const wallet = this.wallets.find((w) => condition(w, value));
    if (!wallet) {
      throw new Error(`No wallet found for ${name}: ${value}`);
    }
    this.logger.info(`Getting wallet for ${name}: ${value}`);
    return wallet;
  }

  private formatWalletSummary(wallet: Wallet): WalletSummary {
    const publicIdentifier = getPublicIdentifierFromPublicKey(wallet.publicKey);
    return { address: wallet.address, publicIdentifier };
  }

  private setPending(index: number) {
    this.pending.push(index);
  }

  private removePending(index: number) {
    this.pending = this.pending.filter((idx) => idx !== index);
  }
}

export default Keyring;
