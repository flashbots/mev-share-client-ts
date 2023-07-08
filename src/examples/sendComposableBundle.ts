import { JsonRpcProvider, TransactionRequest, Wallet, hexlify, toBigInt, toUtf8Bytes } from 'ethers'

// lib
import MevShareClient, { BundleParams } from '..'
import { getProvider, initExample } from './lib/helpers'
import env from './lib/env'

const NUM_TARGET_BLOCKS = 3

/** Send a bundle that shares as much data as possible by setting the `privacy` param. */
const sendTestBundle = async (provider: JsonRpcProvider, mevshare: MevShareClient, wallet: Wallet, targetBlock: number) => {
    const feeData = await provider.getFeeData()
    const tip = BigInt(1e9) * BigInt(2e7) // 0.02 eth
    const tx: TransactionRequest = {
        type: 2,
        chainId: provider._network.chainId,
        to: wallet.address,
        nonce: await wallet.getNonce(),
        value: 0,
        gasLimit: 22000,
        data: hexlify(toUtf8Bytes("im shariiiiiing")),
        maxFeePerGas: toBigInt(feeData.maxFeePerGas || 42) + tip,
        maxPriorityFeePerGas: toBigInt(feeData.maxPriorityFeePerGas || 2) + tip,
    }
    /*
        NOTE: only bundles comprised solely of signed transactions are supported at the moment.
        Bundles containing `hash` cannot set `privacy` settings.
    */
    const bundle = [
        {tx: await wallet.signTransaction(tx), canRevert: false},
    ]
    console.log(`sending backrun bundles targeting next ${NUM_TARGET_BLOCKS} blocks...`)
    const bundleParams: BundleParams = {
        inclusion: {
            block: targetBlock,
            maxBlock: targetBlock + NUM_TARGET_BLOCKS,
        },
        body: bundle,
        privacy: {
            hints: {
                txHash: true,
                calldata: true,
                logs: true,
                functionSelector: true,
                contractAddress: true,
            },
            builders: ["flashbots"]
        }
    }
    const backrunResult = await mevshare.sendBundle(bundleParams)
    return {
        bundleParams,
        backrunResult,
    }
}

const main = async () => {
    const provider = getProvider()
    const {mevshare} = await initExample(provider)

    const targetBlock = (await provider.getBlockNumber()) + 1
    const wallet = new Wallet(env.senderKey, provider)
    const {bundleParams, backrunResult} = await sendTestBundle(provider, mevshare, wallet, targetBlock)
    console.log("bundleParams", bundleParams)
    console.log("backrunResult", backrunResult)
}

main().then(() => {
    process.exit(0)
})
