# Flashbots Matchmaker

Client library for Flashbots `MEV-share` Matchmaker.

Based on [prospective API docs](https://flashbots.notion.site/PUBLIC-Prospective-MEV-Share-API-docs-28610c583e5b485d92b62daf6e0cc874).

## quickstart

Install from npm:

```sh
yarn add @flashbots/matchmaker-ts
# or
npm i @flashbots/matchmaker-ts
```

Alternatively, clone the library & build from source:

```sh
git clone https://github.com/flashbots/matchmaker-ts
cd matchmaker-ts
yarn install && yarn build
```

### use matchmaker in your project

> :warning: Variables denoted in `ALL_CAPS` are placeholders; the code does not compile. [examples/](#examples) contains compilable demos.

In your project:

```typescript
import { Wallet, JsonRpcProvider } from "ethers"
import Matchmaker, { ShareBundleParams, PendingShareTransaction, ShareTransactionOptions } from "@flashbots/matchmaker-ts"

const provider = new JsonRpcProvider(GOERLI_RPC_URL)
const authSigner = new Wallet(FB_REPUTATION_PRIVATE_KEY, provider)
const matchmaker = new Matchmaker(authSigner, {chainId: 5, name: "goerli"})
```

### examples

_[Source code](./src/examples/)_

> :information_source: Examples require a `.env` file (or that you populate your environment directly with the appropriate variables).

```sh
cd src/examples
cp .env.example .env
vim .env
```

#### send a tx with hints

This example sends a transaction to mev-share from the account specified by SENDER_PRIVATE_KEY with a hex-encoded string as data.

```sh
yarn example.tx
```

#### backrun a pending tx

This example watches the mev-share streaming endpoint for pending mev-share transactions and attempts to backrun them. The example runs until a backrun has been included on-chain.

```sh
yarn example.backrun
```

## API

### `listenForShareTransactions`

Starts listening for transactions on mev-share, registers the provided callback to be called when a new transaction is detected.

```typescript
const callback = (tx: PendingShareTransaction) => {/* handle pending tx */}
const handler = matchmaker.listenForShareTransactions(callback)
// do some stuff...
handler.close()
```

### `sendShareTransaction`

Sends a private transaction to Flashbots with specified hint parameters.

```typescript
const shareTxParams: ShareTransactionOptions = {
    hints: {
        logs: true,
        calldata: false,
        functionSelector: true,
        contractAddress: true
    },
    maxBlockNumber: undefined,
}
await matchmaker.sendShareTransaction(SIGNED_TX, shareTxParams)
```

### `sendShareBundle`

Sends a bundle; an array of transactions; which tries to backrun a pending mev-share transaction. Currently only one share transaction in `shareTxs` is supported.

```typescript
const bundleParams: ShareBundleParams = {
    targetBlock: TARGET_BLOCK,
    shareTxs: [PENDING_TX_HASH],
    backrun: [SIGNED_BACKRUN_TX1, SIGNED_BACKRUN_TX2],
}
await matchmaker.sendShareBundle(bundleParams)
```
