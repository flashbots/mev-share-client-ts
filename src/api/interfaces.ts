import { LogParams } from 'ethers'

/**
 * Used to specify which type of event to listen for.
 */
export enum StreamEventType {
    Bundle = 'bundle',
    Transaction = 'transaction',
}

export type StreamEventName = `${StreamEventType}`

/** Data about the event history endpoint. */
export type EventHistoryInfo = {
    count: number,
    minBlock: number,
    maxBlock: number,
    minTimestamp: number,
    maxTimestamp: number,
    maxLimit: number,
}

/** Arguments for the `getEventHistory` function. */
export type EventHistoryParams = {
    blockStart?: number,
    blockEnd?: number,
    timestampStart?: number,
    timestampEnd?: number,
    limit?: number,
    offset?: number,
}

/** Raw data about an event from the getEventHistory function. */
export type IEventHistoryEntry = {
    block: number,
    timestamp: number,
    hint: {
        txs?: Array<{
            to: string,
            callData: string,
            functionSelector: string,
        }>,
        hash: string,
        logs?: Array<LogParams>,
        gasUsed: string,
        mevGasPrice: string,
    },
}

/**
 * Configuration used to connect to the MEV-Share node.
 *
 * Use [supportedNetworks](./networks.ts) for presets.
 */
export type MevShareNetwork = {
    /** Matchmaker event stream URL. */
    streamUrl: string,
    /** MEV-Share bundle & transaction API URL. */
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
    /** Share all logs emitted by the transaction. */
    logs?: boolean,
    /** Share specific subset of swap-adjacent logs of the transaction. */
    defaultLogs?: boolean,
    /** Share tx hashes of transactions in bundle. */
    txHash?: boolean,
}

/**
 * Parameters accepted by the `sendTransaction` function.
 */
export interface TransactionOptions {
    /** Hints define what data about a transaction is shared with searchers. */
    hints?: HintPreferences,
    /** Maximum block number for the transaction to be included in. */
    maxBlockNumber?: number,
    /** Builders that are allowed to receive this tx. See [flashbots docs](https://github.com/flashbots/dowg/blob/main/builder-registrations.json) for supported builders. */
    builders?: string[],
    /** Specifies how refund should be paid if tx is used by another searcher. */
    refund?: Array<{
         /** The address that receives this portion of the refund. */
         address: string,
         /** Percentage of refund to be paid to `address`. Set this to `100` unless splitting refunds between multiple recipients. */
         percent: number,
    }>,
    
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
    /** Transactions that make up the bundle. `hash` refers to a transaction hash from the MEV-Share event stream. */
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
        /** Builders that are allowed to receive this bundle. See [flashbots docs](https://github.com/flashbots/dowg/blob/main/builder-registrations.json) for supported builders. */
        builders?: Array<string>,
    },
    metadata?: {
        originId?: string,
    },
}

/** Response received from MEV-Share API */
interface ISendBundleResponse {
    /** Bundle hash. */
    bundleHash: string,
}

/** Bundle details. */
export interface ISendBundleResult {
    /** Bundle hash. */
    bundleHash: string,
}

/** Decodes a raw sendBundle response. */
export const SendBundleResult = (response: ISendBundleResponse): ISendBundleResult => ({
    bundleHash: response.bundleHash,
})

/** Optional fields to override simulation state. */
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
    baseFee?: bigint,
    /** default = 5 (defined in seconds) */
    timeout?: number,
}

/** Logs returned by mev_simBundle. */
export interface SimBundleLogs {
    txLogs?: LogParams[],
    bundleLogs?: SimBundleLogs[],
}

/** Response received from MEV-Share api. */
interface ISimBundleResponse {
    success: boolean,
    error?: string,
    stateBlock: string,
    mevGasPrice: string,
    profit: string,
    refundableValue: string,
    gasUsed: string,
    logs?: SimBundleLogs[],
}

/** Simulation details. */
export interface ISimBundleResult {
    success: boolean,
    error?: string,
    stateBlock: number,
    mevGasPrice: bigint,
    profit: bigint,
    refundableValue: bigint,
    gasUsed: bigint,
    logs?: SimBundleLogs[],
}

/** Decodes a raw simBundle response. */
export const SimBundleResult = (response: ISimBundleResponse): ISimBundleResult => ({
    success: response.success,
    error: response.error,
    stateBlock: parseInt(response.stateBlock, 16),
    mevGasPrice: BigInt(response.mevGasPrice),
    profit: BigInt(response.profit),
    refundableValue: BigInt(response.refundableValue),
    gasUsed: BigInt(response.gasUsed),
    logs: response.logs,
})

/**
 * General API wrapper for events received by the SSE stream (via `mevshare.on(...)`).
*/
export interface IMevShareEvent {
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
    /**
     * Hex string; change in coinbase value after inserting tx/bundle, divided by gas used.
     *
     * Can be used to determine the minimum payment to the builder to make your backrun look more profitable to builders.
     *
     * _Note: this only applies to builders like Flashbots who order bundles by MEV gas price._
     *
     * _Note: EXPERIMENTAL; only implemented on Goerli._
     */
    mevGasPrice?: string,
    /** Hex string; gas used by the tx/bundle, rounded up to 2 most significant digits.
     *
     * _Note: EXPERIMENTAL; only implemented on Goerli._
     */
    gasUsed?: string,
}

/**
 * Pending transaction from the MEV-Share event stream.
 */
export interface IPendingTransaction extends Omit<Omit<Omit<IMevShareEvent, 'txs'>, 'mevGasPrice'>, 'gasUsed'> {
    to?: string,
    functionSelector?: string,
    callData?: string,
    /**
     * {@link IMevShareEvent.mevGasPrice}
     */
    mevGasPrice?: bigint,
    /**
     * {@link IMevShareEvent.gasUsed}
     */
    gasUsed?: bigint,
}

/** Pending bundle from the MEV-Share event stream. */
export interface IPendingBundle extends Omit<Omit<IMevShareEvent, 'mevGasPrice'>, 'gasUsed'> {
    /**
     * {@link IMevShareEvent.mevGasPrice}
     */
    mevGasPrice?: bigint,
    /**
     * {@link IMevShareEvent.gasUsed}
     */
    gasUsed?: bigint,
}

/** A past event from the MEV-Share event stream. */
export class EventHistoryEntry {
    public block: number
    public timestamp: number
    public hint: {
        txs?: Array<{
            to: string,
            callData: string,
            functionSelector: string,
        }>,
        hash: string,
        logs?: Array<LogParams>,
        gasUsed: bigint,
        mevGasPrice: bigint,
    }
    constructor(entry: IEventHistoryEntry) {
        this.block = entry.block
        this.timestamp = entry.timestamp
        this.hint = {
            ...entry.hint,
            gasUsed: entry.hint.gasUsed ? BigInt(entry.hint.gasUsed) : BigInt(0),
            mevGasPrice: entry.hint.mevGasPrice ? BigInt(entry.hint.mevGasPrice) : BigInt(0),
        }
    }
}
