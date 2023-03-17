import axios, { AxiosError } from "axios"
import { Wallet } from 'ethers'
import EventSource from "eventsource"
import { NetworkFailure, UnimplementedNetwork } from './error'

import { getRpcRequest, JsonRpcData } from './flashbots';
import { mungeShareBundleParams, mungePrivateTxParams, ShareBundleParams, PendingShareTransaction, ShareTransactionOptions } from './api'

const bundleApiUrls = {
    goerli: "https://relay-goerli.flashbots.net",
}

const streamingUrls = {
    goerli: "https://mev-share-goerli.flashbots.net",
}

class Matchmaker {
    private apiUrl?: string
    private streamUrl?: string
    constructor(
        private authSigner: Wallet,
        private network: {
            chainId: number,
            name: string,
        },
        mevShareOptions?: {
            apiUrl?: string,
            streamUrl?: string,
        }
    ) {
        if (network.chainId !== 5) {
            throw new UnimplementedNetwork(network)
        }
        this.authSigner = authSigner
        this.network = network
        this.apiUrl = mevShareOptions?.apiUrl || Object.entries(bundleApiUrls).find(kv => kv[0] === network.name.toLowerCase())?.[1]
        this.streamUrl = mevShareOptions?.streamUrl || Object.entries(streamingUrls).find(kv => kv[0] === network.name.toLowerCase())?.[1]
    }

    private async handleBundleApiRequest({ headers, body }: { headers: any, body: any}) {
        if (!this.apiUrl) throw new UnimplementedNetwork(this.network)
        try {
            const res = await axios.post(this.apiUrl, body, {
                headers
            })
            return (res.data as JsonRpcData).result
        } catch (e) {
            console.debug(JSON.stringify(body))
            throw new NetworkFailure(e as AxiosError)
        }
    }

    /**
     * Registers the provided callback to be called when a new mev-share transaction is received.
     * @param callback Async function to process pending tx.
     * @returns Event listener, which can be used to close the connection.
     *
     * @deprecated Use {@link onShareTransaction} instead.
     */
    public listenForShareTransactions(callback: (data: PendingShareTransaction) => Promise<EventSource>) {
        if (!this.streamUrl) throw new UnimplementedNetwork(this.network)
        const events = new EventSource(this.streamUrl)
        events.onmessage = (event) => {
            try {
                callback(JSON.parse(event.data) as PendingShareTransaction)
            } catch (e) {
                throw new NetworkFailure(e as AxiosError)
            }
        }
        return events
    }

    /**
     * Registers the provided callback to be called when a new mev-share transaction is received.
     * @param callback Async function to process pending tx.
     * @returns Event listener, which can be used to close the connection.
     */
    public onShareTransaction(callback: (data: PendingShareTransaction) => Promise<EventSource>) {
        return this.listenForShareTransactions(callback)
    }

    /** Sends a private transaction with MEV hints to mev-share.
     * 
     * - Calls `eth_sendPrivateTransaction` with hints.
     * @param signedTx Signed transaction to send.
     * @param options Tx preferences; hints & block range.
     * @returns Transaction hash.
     */
    public async sendShareTransaction(
        signedTx: string,
        options?: ShareTransactionOptions,
    ): Promise<string> {
        const params = mungePrivateTxParams(signedTx, options)
        const payload = await getRpcRequest(params, "eth_sendPrivateTransaction", this.authSigner)
        return await this.handleBundleApiRequest(payload)
    }

    /** Sends a Share bundle to mev-share.
     * @param bundleParams Parameters for the Share bundle.
     * @returns Array of bundle hashes.
     */
    public async sendShareBundle(bundleParams: ShareBundleParams): Promise<string[]> {
        const params = mungeShareBundleParams(bundleParams)
        const payload = await getRpcRequest(params, "eth_sendShareBundle", this.authSigner)
        return await this.handleBundleApiRequest(payload)
    }
}

export type { ShareBundleParams, PendingShareTransaction, ShareTransactionOptions }

export default Matchmaker
