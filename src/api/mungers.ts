import { LogParams } from 'ethers'
import { BundleParams, HintPreferences, IEventHistoryEntry, SimBundleOptions, TransactionOptions } from './interfaces'

/**
 * Convert name format of user-specified hints for Matchmaker API requests.
 * @param hints - Hints specified by the user.
 */
const mungeHintPreferences = (hints: HintPreferences) => {
    return {
        contract_address: hints.contractAddress,
        function_selector: hints.functionSelector,
        calldata: hints.calldata,
        logs: hints.logs,
        tx_hash: hints.txHash,
        hash: true, // tx hash is always shared on Flashbots Matchmaker; abstract away from user
        // setting all hints except hash to false will enable full privacy
    }
}

/**
 * Converts user-specified hints into the array format accepted by the API.
 * @param hints - Hints specified by the user.
 */
const extractSpecifiedHints = (hints: HintPreferences): string[] => {
    return Object.entries(mungeHintPreferences(hints))
        .map((kv: [string, any]) => kv[1] ? kv[0] : undefined)
        .filter(v => !!v) as string[]
}

/**
 * Converts user-specified parameters into parameters for a sendPrivateTransaction call to the Matchmaker API.
 * @param signedTx - Signed transaction to send.
 * @param options - Privacy/execution settings for the transaction.
 * @returns Single-element array containing params object for sendPrivateTransaction call.
 */
export function mungePrivateTxParams(signedTx: string, options?: TransactionOptions) {
    return [{
        tx: signedTx,
        maxBlockNumber: options?.maxBlockNumber && `0x${options.maxBlockNumber.toString(16)}`,
        preferences: {
            fast: true, // deprecated but required; setting has no effect
            // privacy uses default (Stable) config if no hints specified
            privacy: options?.hints && {
                hints: extractSpecifiedHints(options.hints),
            },
            builders: options?.builders,
        },
    }]
}

/**
 * Converts user-specified parameters into parameters for a mev_sendBundle call to the Matchmaker API.
 * @param params - Privacy/execution parameters for the bundle
 * @returns Single-element array containing params object for sendPrivateTransaction call.
 */
export function mungeBundleParams(params: BundleParams) {
    type AnyBundleItem = {hash?: string, tx?: string, bundle?: any, canRevert?: boolean}
    // recursively munge nested bundle params
    const mungedBundle: any[] = params.body.map((i: AnyBundleItem) => i.bundle ? mungeBundleParams(i.bundle) : i)
    return {
        ...params,
        body: mungedBundle,
        version: params.version || "v0.1",
        inclusion: {
            ...params.inclusion,
            block: `0x${params.inclusion.block.toString(16)}`,
            maxBlock: params.inclusion.maxBlock ? `0x${params.inclusion.maxBlock.toString(16)}` : undefined,
        },
        validity: params.validity ? params.validity : {
            refund: [],
            refundConfig: [],
        },
        privacy: params.privacy && {
            ...params.privacy,
            hints: params.privacy.hints && extractSpecifiedHints(params.privacy.hints),
        }
    }
}

/** Convert SimBundleOptions into format required by eth_simBundle.  */
export function mungeSimBundleOptions(params: SimBundleOptions) {
    return {
        ...params,
        // coinbase & timeout can be left as they are
        parentBlock: params.parentBlock && `0x${BigInt(params.parentBlock).toString(16)}`,
        blockNumber: params.blockNumber && `0x${BigInt(params.blockNumber).toString(16)}`,
        timestamp: params.timestamp && `0x${BigInt(params.timestamp).toString(16)}`,
        gasLimit: params.gasLimit && `0x${BigInt(params.gasLimit).toString(16)}`,
        baseFee: params.baseFee && `0x${params.baseFee.toString(16)}`,
    }
}
