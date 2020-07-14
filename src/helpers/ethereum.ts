import { GetBalanceResponse } from "./types";
import { IConnextClient } from "@connext/types";
import { ERC20 } from "@connext/contracts";
import { Wallet, Contract, providers, constants } from "ethers";

export async function getFreeBalanceOffChain(
  client: IConnextClient,
  assetId: string,
): Promise<string> {
  return (await client.getFreeBalance(assetId !== constants.AddressZero ? assetId : undefined))[
    client.signerAddress
  ].toString();
}

export async function getFreeBalanceOnChain(
  client: IConnextClient,
  assetId: string,
): Promise<string> {
  return assetId === constants.AddressZero
    ? (await client.ethProvider.getBalance(client.signerAddress)).toString()
    : (
        await new Contract(assetId, ERC20.abi, client.ethProvider).functions.balanceOf(
          client.signerAddress,
        )
      ).toString();
}

export async function getClientBalance(
  client: IConnextClient,
  assetId: string,
): Promise<GetBalanceResponse> {
  const freeBalanceOffChain = await getFreeBalanceOffChain(client, assetId);
  const freeBalanceOnChain = await getFreeBalanceOnChain(client, assetId);
  return { freeBalanceOffChain, freeBalanceOnChain };
}

export async function transferOnChain(params: {
  mnemonic: string;
  ethProvider: providers.Provider;
  assetId: string;
  amount: string;
  recipient: string;
}): Promise<string> {
  let tx: providers.TransactionResponse;
  const wallet = Wallet.fromMnemonic(params.mnemonic).connect(params.ethProvider);
  if (params.assetId === constants.AddressZero) {
    tx = await wallet.sendTransaction({
      to: params.recipient,
      value: params.amount,
    });
  } else {
    const token = new Contract(params.assetId, ERC20.abi, params.ethProvider);
    tx = await token.transfer([params.recipient, params.amount]);
  }
  if (typeof tx.hash === "undefined") {
    throw new Error("Transaction hash is undefined");
  }
  return tx.hash;
}
