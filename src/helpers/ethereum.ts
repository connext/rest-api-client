import { IConnextClient, Contract } from "@connext/types";
import { constants } from "ethers";
import tokenAbi from "human-standard-token-abi";

export async function getFreeBalanceOffChain(client: IConnextClient, assetId: string) {
  return (await client.getFreeBalance(assetId !== constants.AddressZero ? assetId : undefined))[
    client.signerAddress
  ].toString();
}

export async function getFreeBalanceOnChain(client: IConnextClient, assetId: string) {
  return assetId === constants.AddressZero
    ? (await client.ethProvider.getBalance(client.signerAddress)).toString()
    : (
        await new Contract(assetId, tokenAbi, client.ethProvider).functions.balanceOf(
          client.signerAddress,
        )
      ).toString();
}

export async function getClientBalance(client: IConnextClient, assetId) {
  const freeBalanceOffChain = await getFreeBalanceOffChain(client, assetId);
  const freeBalanceOnChain = await getFreeBalanceOnChain(client, assetId);
  return { freeBalanceOffChain, freeBalanceOnChain };
}
