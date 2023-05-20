import { LogParams } from 'ethers'

/**
 * Used to specify which type of event to listen for.
 */
export enum StreamEvent {
    Bundle = 'bundle',
    Transaction = 'transaction',
}

/**
 * Configuration used to connect to the Matchmaker.
 *
 * Use [supportedNetworks](./networks.ts) for presets.
 */
export type MatchmakerNetwork = {
    /** Chain ID of the network. e.g. `1` */
    chainId: number,
    /** Lowercase name of network. e.g. "mainnet" */
    name: string,
    /** Matchmaker event stream URL. */
    streamUrl: string,
    /** Matchmaker bundle & transaction API URL. */
    apiUrl: string,
}

/**
 * Hints specify which data is shared with searchers on mev-share.
 */
export interface HintPreferences {
    /** Share the calldata of the transaction. */
    calldata?: boolean,
    /** Share the contract address of the transaction. */
    contractAddress?: boolean,
    /** Share the 4byte function selector of the transaction. */
    functionSelector?: boolean,
    /** Share the logs emitted by the transaction. */
    logs?: boolean,
}

/**
 * Parameters accepted by the `sendTransaction` function.
 */
export interface TransactionOptions {
    /** Hints define what data about a transaction is shared with searchers. */
    hints?: HintPreferences,
    /** Maximum block number for the transaction to be included in. */
    maxBlockNumber?: number,
    builders?: string[],
}

/**
 * Parameters sent to mev_sendBundle.
 */
export interface BundleParams {
    /** Smart bundle spec version. */
    version?: string,
    /** Conditions for the bundle to be considered for inclusion in a block, evaluated _before_ the bundle is placed in a block. */
    inclusion: {
        /** Target block number in which to include the bundle. */
        block: number,
        /** Maximum block height in which the bundle can be included. */
        maxBlock?: number,
    },
    /** Transactions that make up the bundle. `hash` refers to a transaction hash from the Matchmaker event stream. */
    body: Array<
        { hash: string } |
        { tx: string, canRevert: boolean } |
        { bundle: BundleParams }
    >,
    /** Conditions for bundle to be considered for inclusion in a block, evaluated _after_ the bundle is placed in the block. */
    validity?: {
        /** Conditions for receiving refunds (MEV kickbacks). */
        refund?: Array<{
            /** Index of entry in `body` to which the refund percentage applies. */
            bodyIdx: number,
            /** Minimum refund percentage required for this bundle to be eligible for use by another searcher. */
            percent: number,
        }>,
        /** Specifies how refund should be paid if bundle is used by another searcher. */
        refundConfig?: Array<{
            /** The address that receives this portion of the refund. */
            address: string,
            /** Percentage of refund to be paid to `address`. Set this to `100` unless splitting refunds between multiple recipients. */
            percent: number,
        }>,
    },
    /** Bundle privacy parameters. */
    privacy?: {
        /** Data fields from bundle transactions to be shared with searchers on MEV-Share. */
        hints?: HintPreferences,
        /** Builders that are allowed to receive this bundle. See [mev-share spec](https://github.com/flashbots/mev-share/blob/main/builders/registration.json) for supported builders. */
        builders?: Array<string>,
    },
    metadata?: {
        originId?: string,
    }
}

export interface SimBundleOptions {
    /** Block used for simulation state. Defaults to latest block.
     *
     * Block header data will be derived from parent block by default.
     * Specify other params in this interface to override the default values.
     *
     * Can be a block number or block hash.
    */
    parentBlock?: number | string,

    // override the default values for the parentBlock header
    /** default = parentBlock.number + 1 */
    blockNumber?: number,
    /** default = parentBlock.coinbase */
    coinbase?: string,
    /** default = parentBlock.timestamp + 12 */
    timestamp?: number,
    /** default = parentBlock.gasLimit */
    gasLimit?: number,
    /** default = parentBlock.baseFeePerGas */
    baseFee?: BigInt,
    /** default = 5 seconds */
    timeout?: number,
}

/**
 * General API wrapper for events received by the SSE stream (via `matchmaker.on(...)`).
*/
export interface IMatchmakerEvent {
    /** Transaction or Bundle hash. */
    hash: string,
    /** Logs emitted by the transaction or bundle. */
    logs?: LogParams[],
    txs?: Array<{
        /** Transaction recipient address. */
        to?: string,
        /** 4byte function selector */
        functionSelector?: string,
        /** Calldata of the tx */
        callData?: string,
    }>,
    mevGasPrice?: string,   // hex string
    gasUsed?: string,       // hex string
}

export interface IPendingTransaction extends Omit<Omit<Omit<IMatchmakerEvent, 'txs'>, 'mevGasPrice'>, 'gasUsed'> {
    to?: string,
    functionSelector?: string,
    callData?: string,
    mevGasPrice?: BigInt,
    gasUsed?: BigInt,
}

export interface IPendingBundle extends Omit<Omit<IMatchmakerEvent, 'mevGasPrice'>, 'gasUsed'> {
    mevGasPrice?: BigInt,
    gasUsed?: BigInt,
}
