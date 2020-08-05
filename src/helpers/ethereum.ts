import { IConnextClient } from "@connext/types";
import { ERC20 } from "@connext/contracts";
import { Wallet, Contract, providers, constants, BigNumber } from "ethers";

import { RouteMethods } from "./types";

export const ETH_STANDARD_PATH = "m/44'/60'/0'/0";

export function getPath(index = 0) {
  return `${ETH_STANDARD_PATH}/${(String(index).match(/.{1,9}/gi) || [index]).join("/")}`;
}

export function getIndexFromPath(path: string): number {
  return Number(path.replace(ETH_STANDARD_PATH, "").replace("/", ""));
}

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
): Promise<RouteMethods.GetBalanceResponse> {
  const freeBalanceOffChain = await getFreeBalanceOffChain(client, assetId);
  const freeBalanceOnChain = await getFreeBalanceOnChain(client, assetId);
  return { freeBalanceOffChain, freeBalanceOnChain };
}

export async function transferOnChain(params: {
  wallet: Wallet;
  ethProvider: providers.Provider;
  assetId: string;
  amount: string;
  recipient: string;
}): Promise<string> {
  let tx: providers.TransactionResponse;
  const wallet = params.wallet.connect(params.ethProvider);
  if (params.assetId === constants.AddressZero) {
    tx = await wallet.sendTransaction({
      to: params.recipient,
      value: BigNumber.from(params.amount),
    });
  } else {
    const token = new Contract(params.assetId, ERC20.abi, wallet);
    tx = await token.transfer(params.recipient, BigNumber.from(params.amount));
  }
  if (typeof tx.hash === "undefined") {
    throw new Error("Transaction hash is undefined");
  }
  return tx.hash;
}
