/// interfaces =================================================================
import { LogParams } from "ethers"
/**
 * Hints specify which data is shared with searchers on mev-share.
 */
export interface HintPreferences {
    /** Share the calldata of the transaction. (default=false) */
    calldata?: boolean,
    /** Share the contract address of the transaction. (default=true) */
    contractAddress?: boolean,
    /** Share the 4byte function selector of the transaction. (default=true) */
    functionSelector?: boolean,
    /** Share the logs emitted by the transaction. (default=true) */
    logs?: boolean,
}

/**
 * Parameters accepted by the `sendShareTransaction` function.
 */
export interface ShareTransactionOptions {
    /** Hints define what data about a transaction is shared with searchers. */
    hints?: HintPreferences,
    /** Maximum block number for the transaction to be included in. */
    maxBlockNumber?: number,
}

/**
 * Parameters sent to eth_sendShareBundle.
 */
export interface ShareBundleParams {
    /** Smart bundle spec version. */
    version?: number,
    /** uuidv4. */
    replacementUuid?: string,
    /** Bundle will be assumed correct only for targetBlockNumber or until cancelled. */
    targetBlock: number,
    /** Array of signed txs that backrun each transaction in `shareTxs`. */
    backrun: string[],
    /** Array of mev-share tx hashes for the backrun to follow (currently only one tx hash is supported). */
    shareTxs: string[]
}

/**
 * Data received from Flashbots when a new mev-share transaction is detected.
 */
export interface PendingShareTransaction {
    /** Transaction hash */
    txHash: string,
    /** address */
    to?: string,
    /** 4byte function selector */
    functionSelector?: string,
    /** bytes; logs emitted by the tx */
    logs?: LogParams[],
    /** bytes; calldata of the tx */
    callData?: string,
}

/// helper functions ===========================================================

const mungeHints = (hints: HintPreferences) => {
    return {
        contract_address: hints.contractAddress,
        function_selector: hints.functionSelector,
        calldata: hints.calldata,
        logs: hints.logs,
    }
}

const extractSpecifiedHints = (hints: HintPreferences) => {
    return Object.entries(mungeHints(hints))
        .map((kv: [string, any]) => kv[1] ? kv[0] : undefined)
        .filter(v => !!v) as string[]
}

const allHintsDisabled = (hints?: HintPreferences): boolean => {
    return hints ? Object.values(hints).reduce((prv, curr) => !prv && !curr) : false
}

/// API mungers ================================================================

export function mungePrivateTxParams(signedTx: string, options?: ShareTransactionOptions) {
    const enable = !allHintsDisabled(options?.hints)
    return [{
        tx: signedTx,
        maxBlockNumber: options?.maxBlockNumber && `0x${options.maxBlockNumber.toString(16)}`,
        preferences: {
            fast: true, // deprecated but required; setting has no effect
            auction: options?.hints && !allHintsDisabled(options.hints) ? {
                enable,
                hint: options?.hints ? extractSpecifiedHints(options.hints) : undefined,
            } : undefined,
        },
    }]
}

export function mungeShareBundleParams(params: ShareBundleParams) {
    return [{
        ...params,
        targetBlock: `0x${params.targetBlock.toString(16)}`,
    }]
}
