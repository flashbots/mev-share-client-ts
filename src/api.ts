/// interfaces =================================================================

/**
 * Hints specify which data is shared with searchers on mev-share.
 */
export interface HintPreferences {
    calldata?: boolean,
    contractAddress?: boolean,
    functionSelector?: boolean,
    logs?: boolean,
}

/**
 * Parameters sent to eth_sendPrivateTransaction.
 */
export interface PrivateTransactionParams {
    tx: string,
    maxBlockNumber?: number,
    preferences?: HintPreferences,
}

/**
 * Parameters accepted by the `sendShareTransaction` function.
 */
export interface ShareTransactionOptions {
    hints?: HintPreferences,
    maxBlockNumber?: number,
}

/**
 * Parameters sent to eth_sendShareBundle.
 */
export interface ShareBundleParams {
    version?: number, // smart bundle spec version
    replacementUuid?: string, // uuidv4
    targetBlock: number, // bundle will be assumed correct only for targetBlockNumber or until cancelled
    backrun: string[], // array of signed txs
    shareTxs: string[] // array of mev-share tx hashes for the backrun to follow (currently only one tx hash is supported)
}

/**
 * Data received from Flashbots when a new mev-share transaction is detected.
 */
export interface PendingShareTransaction {
    txHash: string, // H256
    to?: string, // address
    functionSelector?: string, // H32; 4byte function selector
    logs?: string, // Bytes; logs emitted by the tx
    callData?: string, // Bytes; calldata of the tx
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
