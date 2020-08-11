import { IConnextClient } from "@connext/types";
import { Wallet, Contract, providers, constants, BigNumber } from "ethers";

import { RouteMethods, TransferOnChainParams } from "./types";

const ETH_STANDARD_PATH = "m/44'/60'/0'/0";

const tokenAbi = [
  "function mint(address _to, uint256 _value) returns (bool success)",
  "function transfer(address _to, uint256 _value) returns (bool success)",
  "function balanceOf(address account) view returns (uint256)",
];

function assertTxHash(tx: providers.TransactionResponse): void {
  if (typeof tx.hash === "undefined") {
    throw new Error("Transaction hash is undefined");
  }
}

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
  address: string,
  ethProvider: providers.Provider,
  assetId: string,
): Promise<string> {
  return assetId === constants.AddressZero
    ? getEthBalance(address, ethProvider)
    : getTokenBalance(address, ethProvider, assetId);
}

export async function getClientBalance(
  client: IConnextClient,
  assetId: string,
): Promise<RouteMethods.GetBalanceResponse> {
  const freeBalanceOffChain = await getFreeBalanceOffChain(client, assetId);
  const freeBalanceOnChain = await getFreeBalanceOnChain(
    client.signerAddress,
    client.ethProvider,
    assetId,
  );
  return { freeBalanceOffChain, freeBalanceOnChain };
}

export async function getEthBalance(
  address: string,
  ethProvider: providers.Provider,
): Promise<string> {
  return (await ethProvider.getBalance(address)).toString();
}

export async function getTokenBalance(
  address: string,
  ethProvider: providers.Provider,
  assetId: string,
): Promise<string> {
  return (
    await new Contract(assetId, tokenAbi, ethProvider).functions.balanceOf(address)
  ).toString();
}

export async function transferToken(
  wallet: Wallet,
  recipient: string,
  amount: string,
  tokenAddress: string,
): Promise<string> {
  const token = new Contract(tokenAddress, tokenAbi, wallet);
  const tx = await token.transfer(recipient, BigNumber.from(amount));
  assertTxHash(tx);
  return tx.hash;
}

export async function mintToken(
  wallet: Wallet,
  recipient: string,
  amount: string,
  tokenAddress: string,
): Promise<string> {
  const token = new Contract(tokenAddress, tokenAbi, wallet);
  const tx = await token.mint(recipient, BigNumber.from(amount));
  assertTxHash(tx);
  return tx.hash;
}

export async function transferEth(
  wallet: Wallet,
  recipient: string,
  amount: string,
): Promise<string> {
  const tx = await wallet.sendTransaction({
    to: recipient,
    value: BigNumber.from(amount),
  });
  assertTxHash(tx);
  return tx.hash;
}

export async function transferOnChain(params: TransferOnChainParams): Promise<string> {
  const wallet = params.wallet.connect(params.ethProvider);
  if (params.assetId === constants.AddressZero) {
    return transferEth(wallet, params.recipient, params.amount);
  }
  return transferToken(wallet, params.recipient, params.amount, params.assetId);
}
