# @connext/rest-api

REST API client for Connext

## Introduction

REST API client manages multiple channels for Connext network using a single mnemonic to create accounts for each index on the Ethereum standard derivation path.

## Setup
To get started you will need to setup an environment file (`.env`) with the following three variables:

```sh
CONNEXT_ETH_PROVIDER_URL=""
CONNEXT_NODE_URL=""
CONNEXT_MNEMONIC=""
```

## Start

There are two ways to get running with the REST API client using either Docker or NodeJS. 

### With Docker

Make sure you have Docker installed globally then run using the environment file we created and expose port 5040 using our published image on DockerHub
```sh
docker run --env-file .env -p 5040:5040 connextproject/rest-api-client
```

## With NodeJS

Make sure you have NodeJS installed globally and install the required dependencies with the following command:
```sh
npm install
```

Then run the following command from the root directory of this repository and ensure the environment file should also be available in the root directory.
```sh
npm run start
```

## Example

In this example we will demonstrate how to create two Wallet accounts, connect them to the Connext node and then deposit to one account and make a transfer to the other.

We will be using the following environment variables for this example:

```sh
CONNEXT_MNEMONIC=rich awful vocal decade chaos horse cheese sadness just equip equip dismiss
CONNEXT_ETH_PROVIDER_URL=https://staging.indra.connext.network/api/ethprovider
CONNEXT_NODE_URL=https://staging.indra.connext.network/
```
1. Create account A

```sh
POST http://localhost:5040/create
Content-Type: application/json

{
  "index": 0
}

### publicIdentifier: indra53QJ6exujj3pQQ8BPuTDfQqBXvpyzkz8uS4fwbNMtMZKQZWuUS
### address: 0x44A0ac8eEaCa8D3B51CD3c6a2C23C618d3a2eB63
```

2. Create account B

```sh
POST http://localhost:5040/create
Content-Type: application/json

{
  "index": 1
}

### publicIdentifier: indra6FHtEpVbRgT221fN95REhxXHqeZrV4fJiv9TbG5FuwjrhUfcZ9
### address: 0x098158D8B59327C5EcA50A299151D69182b36A4b
```

3. Connect account A

```sh
POST http://localhost:5040/connect
Content-Type: application/json

{
  "publicIdentifier": "indra53QJ6exujj3pQQ8BPuTDfQqBXvpyzkz8uS4fwbNMtMZKQZWuUS"
}
```

4. Connect account B

```sh
POST http://localhost:5040/connect
Content-Type: application/json

{
  "publicIdentifier": "indra6FHtEpVbRgT221fN95REhxXHqeZrV4fJiv9TbG5FuwjrhUfcZ9"
}
```

5. Send some ETH to account A's address (on Rinkeby for this example)

6. Deposit ETH on channel for account A 
```sh
POST http://localhost:5040/deposit
Content-Type: application/json

{
  "amount": "10000000000000000",
  "assetId": "0x0000000000000000000000000000000000000000",
  "publicIdentifier": "indra53QJ6exujj3pQQ8BPuTDfQqBXvpyzkz8uS4fwbNMtMZKQZWuUS"
}
```

7. Create linked transfer with account B as recipient
```sh
POST http://localhost:5040/linked-transfer
Content-Type: application/json

{
  "amount": "10000000000000000",
  "assetId": "0x0000000000000000000000000000000000000000",
  "recipient": "indra6FHtEpVbRgT221fN95REhxXHqeZrV4fJiv9TbG5FuwjrhUfcZ9",
  "publicIdentifier": "indra53QJ6exujj3pQQ8BPuTDfQqBXvpyzkz8uS4fwbNMtMZKQZWuUS"
}

```

8. Check ETH balance for account B
```sh
GET http://localhost:5040/balance/0x0000000000000000000000000000000000000000/indra6FHtEpVbRgT221fN95REhxXHqeZrV4fJiv9TbG5FuwjrhUfcZ9
```

There are more example requests on the `examples` directory in the format of `.http` files which can be executed using a VSCode Extension if you would like: [Rest Client Extension for VSCode](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

