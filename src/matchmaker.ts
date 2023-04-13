import axios, { AxiosError } from "axios"
import { Wallet } from 'ethers'
import EventSource from "eventsource"
import { NetworkFailure, UnimplementedNetwork, UnimplementedStreamEvent } from './error'

import { getRpcRequest, JsonRpcData } from './flashbots';
import { BundleParams, MatchmakerNetwork, PendingTransaction, TransactionOptions, StreamEvent } from './api/interfaces'
import { mungeSendBundleParams, mungePrivateTxParams } from "./api/mungers"
import supportedNetworks from './api/networks'

export default class Matchmaker {
    constructor(
        private authSigner: Wallet,
        private network: MatchmakerNetwork,
    ) {
        if (!Object.values(supportedNetworks).map(n => n.chainId).includes(network.chainId)) {
            throw new UnimplementedNetwork(network)
        }
        this.authSigner = authSigner
        this.network = network
    }

    private async handleBundleApiRequest(params: any, method: any) {
        const {body, headers} = await getRpcRequest(params, method, this.authSigner)
        try {
            const res = await axios.post(this.network.apiUrl, body, {
                headers
            })
            return (res.data as JsonRpcData).result
        } catch (e) {
            console.debug(JSON.stringify(body))
            throw new NetworkFailure(e as AxiosError)
        }
    }

    /**
     * Registers the provided callback to be called when a new MEV-Share transaction is received.
     * @param callback Async function to process pending tx.
     * @returns Event listener, which can be used to close the connection.
     */
    private onTransaction(
        event: MessageEvent<PendingTransaction>,
        callback: (data: PendingTransaction) => void
    ) {
        callback(event.data)
    }

    /**
     * Starts listening to the Matchmaker event stream and registers the given callback to be invoked when the given event type is received.
     * @param eventType The type of event to listen for. Options specified by StreamEvent enum.
     * @param callback The function to call when a new event is received.
     * @returns Stream handler. Call `.close()` on it before terminating your program.
     */
    public on(
        eventType: StreamEvent,
        callback: (data: PendingTransaction) => void
        // callback's `data` signature should be extended with additional types as they're created: `data: PendingTransaction | SomeOtherType | ...`
    ): EventSource {
        if (!this.network.streamUrl) throw new UnimplementedNetwork(this.network)
        const events = new EventSource(this.network.streamUrl)

        const eventHandler =
            eventType === StreamEvent.Transaction ? this.onTransaction :
            () => { throw new UnimplementedStreamEvent(eventType) }

        events.onmessage = (event) => {
            try {
                eventHandler(event, callback)
            } catch (e) {
                if (e instanceof AxiosError) {
                    throw new NetworkFailure(e)
                } else {
                    throw e
                }
            }
        }

        return events
    }

    /** Sends a private transaction with MEV hints to the Flashbots Matchmaker.
     * @param signedTx Signed transaction to send.
     * @param options Tx preferences; hints & block range.
     * @returns Transaction hash.
     */
    public async sendTransaction(
        signedTx: string,
        options?: TransactionOptions,
    ): Promise<string> {
        const params = mungePrivateTxParams(signedTx, options)
        return await this.handleBundleApiRequest(params, "eth_sendPrivateTransaction")
    }

    /** Sends a Share bundle to mev-share.
     * @param bundleParams Parameters for the Share bundle.
     * @returns Array of bundle hashes.
     */
    public async sendBundle(bundleParams: BundleParams): Promise<string[]> {
        const params = mungeSendBundleParams(bundleParams)
        return await this.handleBundleApiRequest(params, "mev_sendBundle")
    }
}
