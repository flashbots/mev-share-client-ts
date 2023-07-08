# Flashbots MEV-Share Client

Client library for MEV-Share written in Typescript.

Based on [prospective API docs](https://flashbots.notion.site/PUBLIC-Prospective-MEV-Share-API-docs-28610c583e5b485d92b62daf6e0cc874).

## quickstart

Install from npm:

```sh
yarn add @flashbots/mev-share-client
# or
npm i @flashbots/mev-share-client
```

Alternatively, clone the library & build from source:

```sh
git clone https://github.com/flashbots/mev-share-client-ts
cd mev-share-client-ts
yarn install && yarn build
```

```sh
# in your project, assuming it has the same parent directory as mev-share-client-ts
yarn add ../mev-share-client-ts
```

### use mev-share-client in your project

> :warning: Variables denoted in `ALL_CAPS` are placeholders; the code does not compile. [examples/](#examples) contains compilable demos.

In your project:

```typescript
import { Wallet, JsonRpcProvider } from "ethers"
import MevShareClient, {
    BundleParams,
    HintPreferences,
    IPendingBundle,
    IPendingTransaction,
    TransactionOptions
} from "@flashbots/mev-share-client"

const provider = new JsonRpcProvider(RPC_URL)
const authSigner = new Wallet(FB_REPUTATION_PRIVATE_KEY, provider)
```

The `MevShareClient` class has built-in initializers for networks supported by Flashbots.

#### Connect to Ethereum Mainnet

```typescript
const mevshare = MevShareClient.useEthereumMainnet(authSigner)
```

#### Connect to Ethereum Goerli

```typescript
const mevshare = MevShareClient.useEthereumGoerli(authSigner)
```

#### Connect with an Ethers Provider or Chain ID

Networks supported by Flashbots have presets built-in. If it's more convenient, you can instantiate a MevShareClient using a `chainId` (or a ethers.js `Network` object, which has a `chainId` param).

```typescript
import { JsonRpcProvider, Wallet } from "ethers" // ethers v6

/** connects to Flashbots MEV-Share node on goerli */
const provider = new JsonRpcProvider("http://localhost:8545", {chainId: 5, name: "goerli"})
const authSigner = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    .connect(provider)

const mevshare = MevShareClient.fromNetwork(authSigner, provider._network)

// manually with a chainId:
const mevshare = MevShareClient.fromNetwork(authSigner, {chainId: 5})
```

#### Connect to a custom network

To use custom network parameters, you can instantiate a new `MevShareClient` instance directly. This example is what the client uses to connect to mainnet:

```typescript
const mevshare = new MevShareClient(authSigner, {
    name: "mainnet",
    chainId: 1,
    streamUrl: "https://mev-share.flashbots.net",
    apiUrl: "https://relay.flashbots.net"
})
```

See `MevShareNetwork` in [src/api/interfaces](/src/api/interfaces.ts) for more details.

### examples

_[Source code](./src/examples/)_

> :information_source: Examples require a `.env` file (or that you populate your environment directly with the appropriate variables).

```sh
cd src/examples
cp .env.example .env
vim .env
```

#### send a tx with hints

This example sends a transaction to the Flashbots MEV-Share node on Goerli from the account specified by SENDER_PRIVATE_KEY with a hex-encoded string as calldata.

```sh
yarn example.tx
```

#### backrun a pending tx

This example watches the mev-share streaming endpoint for pending mev-share transactions and attempts to backrun them all. The example runs until a backrun has been included on-chain.

```sh
yarn example.backrun
```

#### query event history

This example queries event history, starting from the beginning, until it finds events that share transactions and logs.

```sh
yarn example.history
```

## Usage

See [src/api/interfaces.ts](src/api/interfaces.ts) for interface definitions.

### `on`

Use `on` to start listening for events on mev-share. The function registers the provided callback to be called when a new event is detected.

```typescript
const handler = mevshare.on("transaction", (tx: IPendingTransaction) => {
    // handle pending tx
})

// ... before terminating program
handler.close()
```

### `sendTransaction`

Sends a private transaction to the Flashbots MEV-Share node with specified hint parameters.

```typescript
const wallet = new Wallet(PRIVATE_KEY)
const tx = {
    to: "0xfb000000387627910184cc42fc92995913806333",
    value: BigInt(1e13 * 275), // price of a beer if ETH is $2000
    data: "0x646f637320626179626565652121",
    gasLimit: 42000,
    maxFeePerGas: BigInt(1e9) * BigInt(42), // 42 gwei / gas
    maxPriorityFeePerGas: BigInt(1e9) * BigInt(2), // 2 gwei / gas
    chainId: 5,
    type: 2,
}

// privacy & inclusion settings
const shareTxParams: TransactionOptions = {
    hints: {
        logs: true,
        calldata: false,
        functionSelector: true,
        contractAddress: true,
    },
    maxBlockNumber: undefined,
    builders: ["flashbots"]
}

const signedTx = await wallet.signTransaction(tx)
await mevshare.sendTransaction(SIGNED_TX, shareTxParams)
```

### `sendBundle`

Sends a bundle; an array of transactions with parameters to specify conditions for inclusion and MEV kickbacks. Transactions are placed in the `body` parameter with wrappers to indicate whether they're a new signed transaction or a pending transaction from the event stream.

See [MEV-Share Docs](https://github.com/flashbots/mev-share/blob/main/src/mev_sendBundle.md) for detailed descriptions of these parameters.

```typescript
const targetBlock = 1 + await provider.getBlockNumber()
const bundleParams: BundleParams = {
    inclusion: {
        block: targetBlock,
    },
    body: [
        {hash: TX_HASH_FROM_EVENT_STREAM},
        {tx: SIGNED_TX, canRevert: false},
    ],
}
await mevshare.sendBundle(bundleParams)
```

Bundles that _only_ contain signed transactions can share hints about the transactions in their bundle by setting the `privacy` parameter:

```typescript
const targetBlock = 1 + await provider.getBlockNumber()
const bundleParams: BundleParams = {
    inclusion: {
        block: targetBlock,
        maxBlock: targetBlock + 5, // allow bundle to land in next 5 blocks
    },
    body: [
        {tx: await wallet.signTransaction(TX1), canRevert: false},
        {tx: await wallet.signTransaction(TX2), canRevert: false},
    ],
    privacy: {
        hints: {
            txHash: true,
            calldata: true,
            logs: true,
            functionSelector: true,
            contractAddress: true,
        },
    }
}
const backrunResult = await mevshare.sendBundle(bundleParams)
```

### `simulateBundle`

Simulates a bundle. Accepts options to modify block header for simulation.

```typescript
const bundle: BundleParams = {
    inclusion: {
        block: TARGET_BLOCK,
        maxBlock: TARGET_BLOCK + 3,
    },
    body: [
        {hash: "0xTARGET_TX_HASH"},
        {tx: "0xSIGNED_BACKRUN_TX", canRevert: false}
    ],
    // ...
}

// ...
// assume you sent the bundle and it didn't land, and you want to see if it would have landed in the previous block, but need the tx to think it's in the target block

const simBundleOptions: SimBundleOptions = {
    parentBlock: TARGET_BLOCK - 1,
    blockNumber: TARGET_BLOCK,
    /*
    Set any of these (block header) fields to override their respective values in the simulation context: 
    */
    // coinbase: string,
    // timestamp: number,
    // gasLimit: number,
    // baseFee: bigint,
    // timeout: number,
}

const simResult = await mevshare.simulateBundle(bundle, simBundleOptions)
```

This example uses the state of `parentBlock`, but overrides the state's `blockNumber` value. Setting more fields in `SimBundleOptions` is useful when testing smart contracts which have specific criteria that must be met, like the block being a certain number, or a specific timestamp having passed.

### `getEventHistoryInfo`

Get information about the event history endpoint for use in [`getEventHistory`](#geteventhistory).

Example:

```typescript
const info = await mevshare.getEventHistoryInfo()
console.log(info)
```

returns something like this:

```txt
{
  count: 56934,
  minBlock: 9091377,
  maxBlock: 9190024,
  minTimestamp: 1685452445,
  maxTimestamp: 1686943324,
  maxLimit: 500
}
```

### `getEventHistory`

Get historical event stream data.

Using the data from our [`getEventHistoryInfo`](#geteventhistoryinfo) call, we can read events starting from the beginning. The data is paginated, so to read all of it, you'll have to make multiple calls to iterate through the it.

```typescript
const info = await mevshare.getEventHistoryInfo()

// read every event
for (let i = 0; i < Math.ceil(info.count / info.maxLimit); i++) {
    const events = await mevshare.getEventHistory({
        limit: info.maxLimit,
        offset: i * info.maxLimit,
        blockStart: info.minBlock,
    })
    console.log(events)
}
```

You can also filter events by timestamp:

```typescript
const events = await mevshare.getEventHistory({
    limit: info.maxLimit,
    offset: i * info.maxLimit,
    timestampStart: 1686942023,
})
```
