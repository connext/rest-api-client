import { BigNumber, Wallet, providers, constants } from "ethers";
import { getPublicIdentifierFromPublicKey } from "@connext/utils";

import {
  getFreeBalanceOnChain,
  mintToken,
  transferEth,
  transferToken,
  WalletSummary,
  RouteMethods,
} from "./helpers";

class Funder {
  public wallet: Wallet;
  constructor(mnemonic: string, provider?: string | providers.Provider) {
    this.wallet = Wallet.fromMnemonic(mnemonic);
    this.setProvider(provider);
  }

  public setProvider(provider?: string | providers.Provider): void {
    if (!provider) return;
    this.wallet = this.wallet.connect(
      typeof provider === "string" ? new providers.JsonRpcProvider(provider) : provider,
    );
  }

  public getSummary(): WalletSummary {
    const publicIdentifier = getPublicIdentifierFromPublicKey(this.wallet.publicKey);
    return { address: this.wallet.address, publicIdentifier };
  }

  public async getBalance(assetId: string): Promise<RouteMethods.GetBalanceResponse> {
    const freeBalanceOnChain = await getFreeBalanceOnChain(
      this.wallet.address,
      this.wallet,
      assetId,
    );
    return { freeBalanceOnChain };
  }

  public async fund(recipient: string, amount: string, assetId: string): Promise<string> {
    let txhash: string;
    const balance = await getFreeBalanceOnChain(this.wallet.address, this.wallet, assetId);
    if (assetId !== constants.AddressZero) {
      if (BigNumber.from(balance).lte(BigNumber.from(amount))) {
        try {
          txhash = await mintToken(this.wallet, recipient, amount, assetId);
        } catch (e) {
          throw new Error(`Failed to mint token for assetId: ${assetId}`);
        }
      } else {
        txhash = await transferToken(this.wallet, recipient, amount, assetId);
      }
    } else {
      if (BigNumber.from(balance).lte(BigNumber.from(amount))) {
        throw new Error(`Insufficient ETH balance to fund channel`);
      }
      txhash = await transferEth(this.wallet, recipient, amount);
    }
    return txhash;
  }
}

export default Funder;
