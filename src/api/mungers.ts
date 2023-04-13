import { BundleParams, HintPreferences, TransactionOptions } from './interfaces'

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

export function mungePrivateTxParams(signedTx: string, options?: TransactionOptions) {
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

export function mungeSendBundleParams(params: BundleParams) {
    return [{
        ...params,
        targetBlock: `0x${params.targetBlock.toString(16)}`,
    }]
}
