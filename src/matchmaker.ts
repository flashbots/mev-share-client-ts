import axios, { AxiosError } from "axios"
import { Wallet } from 'ethers'
import EventSource from "eventsource"
import { JsonRpcError, NetworkFailure, UnimplementedStreamEvent } from './error'

import { getRpcRequest, JsonRpcData } from './flashbots';
import { BundleParams, MatchmakerNetwork, TransactionOptions, StreamEvent, IMatchmakerEvent, IPendingTransaction, IPendingBundle } from './api/interfaces'
import { mungeBundleParams, mungePrivateTxParams } from "./api/mungers"
import { SupportedNetworks } from './api/networks'
import { PendingBundle, PendingTransaction } from './api/events';

export default class Matchmaker {
    constructor(
        private authSigner: Wallet,
        private network: MatchmakerNetwork,
    ) {
        this.authSigner = authSigner
        this.network = network
    }

    static useEthereumMainnet(authSigner: Wallet): Matchmaker {
        return new Matchmaker(authSigner, SupportedNetworks.mainnet)
    }

    static useEthereumGoerli(authSigner: Wallet): Matchmaker {
        return new Matchmaker(authSigner, SupportedNetworks.goerli)
    }

    static fromNetwork(authSigner: Wallet, {chainId}: {chainId: number}): Matchmaker {
        const network = SupportedNetworks.getNetwork(chainId)
        return new Matchmaker(authSigner, network)
    }

    /**
     * Sends a POST request to the Matchmaker API and returns the data.
     * @param params JSON-RPC params.
     * @param method JSON-RPC method.
     * @returns Response data from the API request.
     */
    private async handleApiRequest(params: any, method: any): Promise<any> {
        const {body, headers} = await getRpcRequest(params, method, this.authSigner)
        try {
            const res = await axios.post(this.network.apiUrl, body, {
                headers
            })
            const data = res.data as JsonRpcData
            if (data.error) {
                throw new JsonRpcError(data.error)
            }
            return data.result
        } catch (e) {
            if (e instanceof AxiosError) {
                throw new NetworkFailure(e)
            } else {
                throw e
            }
        }
    }

    /**
     * Registers the provided callback to be called when a new MEV-Share transaction is received.
     * @param event The event received from the event stream.
     * @param callback Async function to process pending tx.
     */
    private onTransaction(
        event: IMatchmakerEvent,
        callback: (data: IPendingTransaction) => void
    ) {
        if (event.txs && event.txs.length === 1) {
            callback(new PendingTransaction(event))
        }
    }

    /**
     * Registers the provided callback to be called when a new MEV-Share bundle is received.
     * @param event The event received from the event stream.
     * @param callback Async function to process pending tx.
     */
    private onBundle(
        event: IMatchmakerEvent,
        callback: (data: IPendingBundle) => void
    ) {
        if (event.txs && event.txs.length > 1) {
            callback(new PendingBundle(event))
        }
    }

    /**
     * Starts listening to the Matchmaker event stream and registers the given callback to be invoked when the given event type is received.
     * @param eventType The type of event to listen for. Options specified by StreamEvent enum.
     * @param callback The function to call when a new event is received.
     * @returns Stream handler. Call `.close()` on it before terminating your program.
     */
    public on(
        eventType: StreamEvent,
        callback: (data: IPendingBundle | IPendingTransaction) => void
    ): EventSource {
        const events = new EventSource(this.network.streamUrl)

        const eventHandler =
            eventType === StreamEvent.Transaction ? this.onTransaction :
            eventType === StreamEvent.Bundle ? this.onBundle :
            () => { throw new UnimplementedStreamEvent(eventType) }

        events.onmessage = (event) => {
            try {
                eventHandler(JSON.parse(event.data), callback)
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
        return await this.handleApiRequest(params, "eth_sendPrivateTransaction")
    }

    /** Sends a bundle to mev-share.
     * @param params Parameters for the bundle.
     * @returns Array of bundle hashes.
     */
    public async sendBundle(params: BundleParams): Promise<string[]> {
        const mungedParams = mungeBundleParams(params)
        return await this.handleApiRequest(mungedParams, "mev_sendBundle")
    }

    /** Simulates a matched bundle.
     *
     * Note: This may only be used on matched bundles.
     * Simulating unmatched bundles (i.e. bundles with a hash present) will throw an error.
     * @param params Parameters for the bundle.
     * @returns Simulation data object.
     */
    public async simulateBundle(params: BundleParams): Promise<any> {
        const mungedParams = mungeBundleParams(params)
        return await this.handleApiRequest(mungedParams, "mev_simBundle")
    }
}
