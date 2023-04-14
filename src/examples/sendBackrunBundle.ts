import { JsonRpcProvider, keccak256 } from 'ethers'
import { Mutex } from "async-mutex"

// lib
import Matchmaker, { BundleParams, PendingTransaction, StreamEvent } from '..'
import { getProvider, initExample } from './lib/helpers'
import { sendTx, setupTxExample } from './lib/sendTx'

const NUM_TARGET_BLOCKS = 5

/**
 * Generate a transaction to backrun a pending mev-share transaction and send it to mev-share.
 */
const sendTestBackrunBundle = async (provider: JsonRpcProvider, pendingTx: PendingTransaction, matchmaker: Matchmaker, targetBlock: number) => {
    // send bundle w/ (basefee + 100)gwei gas fee
    const {tx, wallet} = await setupTxExample(provider, BigInt(1e9) * BigInt(1e2), "im backrunniiiiing")
    const backrunTx = {
        ...tx,
        nonce: tx.nonce ? tx.nonce + 1 : undefined,
    }
    const bundle = [
        {hash: pendingTx.txHash},
        {tx: await wallet.signTransaction(backrunTx), canRevert: false}
    ]
    const backrunResults = []
    console.log(`sending backrun bundles targeting next ${NUM_TARGET_BLOCKS} blocks...`)
    for (let i = 0; i < NUM_TARGET_BLOCKS; i++) {
        const params: BundleParams = {
            inclusion: {
                block: targetBlock + i,
            },
            body: bundle,
            validity: {
                refund: [
                    {address: wallet.address, percent: 10}
                ]
            },
            privacy: {
                hints: {calldata: false, logs: true, functionSelector: true, contractAddress: true},
            }
        }
        const backrunRes = matchmaker.sendBundle(params)
        console.debug("sent bundle", JSON.stringify(params))
        backrunResults.push(backrunRes)
    }
    return {
        bundle,
        backrunResults: await Promise.all(backrunResults),
    }
}

/** Async handler which backruns an mev-share tx with another basic example tx. */
const handleBackrun = async (
    pendingTx: PendingTransaction,
    provider: JsonRpcProvider,
    matchmaker: Matchmaker,
    pendingMutex: Mutex,
) => {
    console.log("pending tx", pendingTx)
    const targetBlock = await provider.getBlockNumber() + 2
    const { bundle, backrunResults } = await sendTestBackrunBundle(provider, pendingTx, matchmaker, targetBlock)
    console.log("backrun results", backrunResults)

    // watch future blocks for backrun tx inclusion
    for (let i = 0; i < NUM_TARGET_BLOCKS; i++) {
        if (!pendingMutex.isLocked()) {
            // mutex was released by another handler, so we can exit
            break
        }
        console.log(`tx ${pendingTx.txHash} waiting for block`, targetBlock + i)
        // poll until block is available
        while (await provider.getBlockNumber() < targetBlock + i) {
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // check for inclusion of backrun tx in target block
        const checkTxHash = keccak256(bundle[1].tx!)
        const receipt = await provider.getTransactionReceipt(checkTxHash)
        if (receipt?.status === 1) {
            console.log("bundle included!")
            // release mutex so the main thread can exit
            pendingMutex.release()
            break
        } else {
            console.warn(`backrun tx ${checkTxHash} not included in block ${targetBlock}`)
        }
    }
}

/**
 * Sends a tx on every block and backruns it with a simple example tx.
 *
 * Continues until we land a backrun, then exits.
 */
const main = async () => {
    const provider = getProvider()
    const {matchmaker} = await initExample(provider)

    // used for blocking this thread until the handler is done processing
    const pendingMutex = new Mutex()
    
    // listen for txs
    const txHandler = matchmaker.on(StreamEvent.Transaction, pendingTx => handleBackrun(pendingTx, provider, matchmaker, pendingMutex))
    console.log("listening for transactions...")

    await pendingMutex.acquire()
    // send a tx that we can backrun on every block
    // tx will be backrun independently by the `handleBackrun` callback
    const blockHandler = await provider.on("block", async () => {
        await sendTx(provider, {logs: true, contractAddress: true, calldata: true, functionSelector: true})
    })

    // will block until the handler releases the mutex
    await pendingMutex.acquire()
    pendingMutex.release()

    // stop listening for txs
    txHandler.close()
    await blockHandler.removeAllListeners()
    console.log("block listener relieved of duty. waiting for handler threads to finish...")
}

main()
