import { BundleParams, HintPreferences, TransactionOptions } from './interfaces'

/**
 * Convert name format of user-specified hints for Matchmaker API requests.
 * @param hints Hints specified by the user.
 */
const mungeHintPreferences = (hints: HintPreferences) => {
    return {
        contract_address: hints.contractAddress,
        function_selector: hints.functionSelector,
        calldata: hints.calldata,
        logs: hints.logs,
        hash: true, // tx hash is always shared on Flashbots Matchmaker; abstract away from user
        // setting all hints except hash to false will enable full privacy
    }
}

/**
 * Converts user-specified hints into the array format accepted by the API.
 * @param hints Hints specified by the user.
 */
const extractSpecifiedHints = (hints: HintPreferences): string[] => {
    return Object.entries(mungeHintPreferences(hints))
        .map((kv: [string, any]) => kv[1] ? kv[0] : undefined)
        .filter(v => !!v) as string[]
}

/**
 * Converts user-specified parameters into parameters for a sendPrivateTransaction call to the Matchmaker API.
 * @param signedTx Signed transaction to send.
 * @param options Privacy/execution settings for the transaction.
 * @returns Single-element array containing params object for sendPrivateTransaction call.
 */
export function mungePrivateTxParams(signedTx: string, options?: TransactionOptions) {
    return [{
        tx: signedTx,
        maxBlockNumber: options?.maxBlockNumber && `0x${options.maxBlockNumber.toString(16)}`,
        preferences: {
            fast: true, // deprecated but required; setting has no effect
            // auction uses default (Stable) config if no hints specified
            auction: options?.hints && {
                hint: extractSpecifiedHints(options.hints),
            },
        },
    }]
}

/**
 * Converts user-specified parameters into parameters for a mev_sendBundle call to the Matchmaker API.
 * @param params Privacy/execution parameters for the bundle
 * @returns Single-element array containing params object for sendPrivateTransaction call.
 */
export function mungeSendBundleParams(params: BundleParams) {
    const mungedBundle: any[] = params.body.map((i: {hash?: string, tx?: string, bundle?: any, canRevert?: boolean}) => i.bundle ? mungeSendBundleParams(i.bundle) : i)
    return [{
        ...params,
        body: mungedBundle,
        version: params.version || "beta-1", // default latest
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
    }]
}
