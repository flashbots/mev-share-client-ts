import { JsonRpcProvider, keccak256 } from 'ethers'
import { Mutex } from "async-mutex"

// lib
import Matchmaker, { BundleParams, IPendingTransaction, StreamEvent } from '..'
import { getProvider, initExample } from './lib/helpers'
import { sendTx, setupTxExample } from './lib/sendTx'

const NUM_TARGET_BLOCKS = 3

/**
 * Generate a transaction to backrun a pending mev-share transaction and send it to mev-share.
 */
const sendTestBackrunBundle = async (provider: JsonRpcProvider, pendingTx: IPendingTransaction, matchmaker: Matchmaker, targetBlock: number) => {
    // send bundle w/ (basefee + 100)gwei gas fee
    const {tx, wallet} = await setupTxExample(provider, BigInt(1e9) * BigInt(1e3), "im backrunniiiiing")
    const backrunTx = {
        ...tx,
        nonce: tx.nonce ? tx.nonce + 1 : undefined,
    }
    const bundle = [
        {hash: pendingTx.hash},
        {tx: await wallet.signTransaction(backrunTx), canRevert: false},
    ]
    console.log(`sending backrun bundles targeting next ${NUM_TARGET_BLOCKS} blocks...`)
    const bundleParams: BundleParams = {
        inclusion: {
            block: targetBlock,
            maxBlock: targetBlock + NUM_TARGET_BLOCKS,
        },
        body: bundle,
    }
    const backrunResult = await matchmaker.sendBundle(bundleParams)
    return {
        bundleParams,
        backrunResult,
    }
}

/** Async handler which backruns an mev-share tx with another basic example tx. */
const handleBackrun = async (
    pendingTx: IPendingTransaction,
    provider: JsonRpcProvider,
    matchmaker: Matchmaker,
    pendingMutex: Mutex,
    pendingTxHashes: string[],
): Promise<string[]> => {
    if (!pendingTxHashes.includes(pendingTx.hash)) {
        // ignore txs we didn't send. they break the bundle (nonce error) bc we're using one account to do everything
        return pendingTxHashes
    } else {
        console.log("pending tx", pendingTx)
    }
    const targetBlock = await provider.getBlockNumber() + 1
    const {
        bundleParams,
        backrunResult,
    } = await sendTestBackrunBundle(provider, pendingTx, matchmaker, targetBlock)
    console.log("backrun result", backrunResult)

    // watch future blocks for backrun tx inclusion
    for (let i = 0; i < NUM_TARGET_BLOCKS; i++) {
        const currentBlock = targetBlock + i
        if (!pendingMutex.isLocked()) {
            // mutex was released by another handler, so we can exit
            break
        }
        console.log(`tx ${pendingTx.hash} waiting for block`, currentBlock)
        // stall until target block is available
        while (await provider.getBlockNumber() < currentBlock) {
            await new Promise(resolve => setTimeout(resolve, 6000))
        }

        // check for inclusion of backrun tx in target block
        const backrunTx = (bundleParams.body[1] as any).tx
        if (backrunTx) {
            const checkTxHash = keccak256(backrunTx)
            const receipt = await provider.getTransactionReceipt(checkTxHash)
            if (receipt?.status === 1) {
                console.log(`bundle included! (found tx ${receipt.hash})`)

                // simulate for funzies
                const simOptions = {
                    parentBlock: receipt.blockNumber - 1,
                }
                const simResult = await matchmaker.simulateBundle(bundleParams, simOptions)
                console.log(`simResult (simOptions=${JSON.stringify(simOptions, null, 2)})`, simResult)
                
                // release mutex so the main thread can exit
                pendingMutex.release()
                break
            } else {
                console.warn(`backrun tx ${checkTxHash} not included in block ${currentBlock}`)
            }
        }
    }
    pendingTxHashes = pendingTxHashes.filter(hash => hash !== pendingTx.hash)
    return pendingTxHashes
}

/**
 * Sends a tx on every block and backruns it with a simple example tx.
 *
 * Continues until we land a backrun, then exits.
 */
const main = async () => {
    const provider = getProvider()
    const {matchmaker} = await initExample(provider)
    let pendingTxHashes: string[] = []

    // used for blocking this thread until the handler is done processing
    const pendingMutex = new Mutex()
    
    // listen for txs
    const txHandler = matchmaker.on(StreamEvent.Transaction, async (pendingTx: IPendingTransaction) => {
        pendingTxHashes = await handleBackrun(pendingTx, provider, matchmaker, pendingMutex, pendingTxHashes)
    })
    console.log("listening for transactions...")

    await pendingMutex.acquire()
    // send a tx that we can backrun on every block
    // tx will be backrun independently by the `handleBackrun` callback
    const blockHandler = await provider.on("block", async (blockNum) => {
        if (pendingTxHashes.length === 0) {
            const res = await sendTx(provider, {logs: true, contractAddress: true, calldata: true, functionSelector: true}, blockNum + NUM_TARGET_BLOCKS)
            console.log("sent tx", res)
            pendingTxHashes.push(res)
        }
    })

    // will block until one of the handlers releases the mutex
    await pendingMutex.acquire()
    pendingMutex.release()

    // stop listening for txs
    txHandler.close()
    await blockHandler.removeAllListeners()
    console.log("block listener relieved of duty. waiting for handler threads to finish...")
}

main().then(() => {
    process.exit(0)
})
