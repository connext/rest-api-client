import { IStoreService } from "@connext/types";
import { getPublicIdentifierFromPublicKey } from "@connext/utils";

import { storeMnemonic, getPath, getIndex, RouteMethods } from "./helpers";
import { Wallet } from "ethers";

class Keyring {
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

  public createWallet(index: number): RouteMethods.PostCreateResponse {
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
      this.wallets.push(wallet);
    }
    const publicIdentifier = getPublicIdentifierFromPublicKey(wallet.publicKey);
    return { address: wallet.address, publicIdentifier };
  }

  public getWalletByIndex(index: number): Wallet {
    const wallet = this.wallets.find((w) => getIndex(w.mnemonic.path) === index);
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

  public async setMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    await storeMnemonic(this.mnemonic, this.store);
    this.logger.info("Mnemonic set successfully");
  }
}

export default Keyring;
