import { describe } from "mocha"
import assert from "assert"
import MevShareClient, { BundleParams, HintPreferences } from '..'
import { JsonRpcProvider, Wallet } from 'ethers'
import { mungeBundleParams } from '../api/mungers'

const checkEnv = (names: string[]) => {
    for (const name of names) {
        if (!process.env[name]) {
            throw new Error(`Missing environment variable ${name}`)
        }
    }
}

describe("interfaces", () => {
    checkEnv(["RPC_URL"])
    const authSigner = new Wallet("0x0123456789012345678901234567890123456789012345678901234567890123")
    const mevshare = MevShareClient.useEthereumMainnet(authSigner)
    const eth = new JsonRpcProvider(process.env.RPC_URL)

    it("should encode hints in snake_case", async () => {
        const hints: HintPreferences = {
            calldata: true,
            contractAddress: true,
            defaultLogs: true,
            functionSelector: true,
            logs: true,
            txHash: true,
        }
        const bundleParams: BundleParams = {
            body: [],
            inclusion: {
                block: 13333337,
            },
            privacy: {
                hints,
            }
        }
        const encodedParams = mungeBundleParams(bundleParams)
        const expectedHints = [
            'contract_address',
            'function_selector',
            'calldata',
            'logs',
            'default_logs',
            'tx_hash',
            'hash'
        ]
        for (const hint of expectedHints) {
            assert(encodedParams.privacy?.hints?.includes(hint))
        }
    })
})
