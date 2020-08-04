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
} from "./helpers";
import { Wallet } from "ethers";

class Keyring {
  public static init(
    mnemonic: string | undefined,
    logger: any,
    store: IStoreService,
    persistedWallets?: InternalWalletOptions[],
  ): Keyring {
    const keyring = new Keyring(mnemonic, logger, store);
    if (persistedWallets && persistedWallets.length) {
      persistedWallets.forEach((w) => keyring.createWallet(w.index));
    }
    return keyring;
  }

  public wallets: Wallet[] = [];

  constructor(
    public mnemonic: string | undefined,
    public logger: any,
    public store: IStoreService,
  ) {
    this.mnemonic = mnemonic;
    this.logger = logger;
    this.store = store;
  }

  public async createWallet(index: number): Promise<WalletSummary> {
    if (typeof this.mnemonic === "undefined") {
      throw new Error("Cannot create wallet without mnemonic");
    }
    let wallet: Wallet | undefined;
    try {
      wallet = this.getWalletByIndex(index);
    } catch (e) {
      // do nothing
    }
    if (typeof wallet === "undefined") {
      wallet = Wallet.fromMnemonic(this.mnemonic, getPath(index));
      await this.setWallet(wallet, index);
    }
    return this.formatWalletSummary(wallet);
  }

  public getWalletByIndex(index: number): Wallet {
    const wallet = this.wallets.find((w) => getIndexFromPath(w.mnemonic.path) === index);
    if (!wallet) {
      throw new Error(`No wallet found for index: ${index}`);
    }
    return wallet;
  }

  public getWalletByPublicIdentifier(publicIdentifier: string): Wallet {
    const wallet = this.wallets.find(
      (w) => getPublicIdentifierFromPublicKey(w.publicKey) === publicIdentifier,
    );
    if (!wallet) {
      throw new Error(`No wallet found for publicIdentifier: ${publicIdentifier}`);
    }
    return wallet;
  }

  public getWallets(): WalletSummary[] {
    return this.wallets.map(this.formatWalletSummary);
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

  private formatWalletSummary(wallet: Wallet): WalletSummary {
    const publicIdentifier = getPublicIdentifierFromPublicKey(wallet.publicKey);
    return { address: wallet.address, publicIdentifier };
  }
}

export default Keyring;
