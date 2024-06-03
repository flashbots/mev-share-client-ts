import axios, { AxiosError } from "axios"
import { Transaction, Wallet } from 'ethers'
import EventSource from "eventsource"
import { JsonRpcError, NetworkFailure, UnimplementedStreamEvent } from './error'
import { getRpcRequest, JsonRpcData } from './flashbots';
import {
    BundleParams,
    MevShareNetwork,
    TransactionOptions,
    IMevShareEvent,
    StreamEventType,
    IPendingTransaction,
    IPendingBundle,
    SimBundleOptions,
    SimBundleResult,
    ISimBundleResult,
    ISendBundleResult,
    SendBundleResult,
    StreamEventName,
    EventHistoryInfo,
    EventHistoryParams,
    IEventHistoryEntry,
    EventHistoryEntry
} from './api/interfaces'
import { mungeBundleParams, mungePrivateTxParams, mungeSimBundleOptions } from "./api/mungers"
import SupportedNetworks from './api/networks'
import { PendingBundle, PendingTransaction } from './api/events';
import { URLSearchParams } from 'url';

// when calling mev_simBundle on a {tx} specified bundle, how long to wait for target to appear onchain
const TIMEOUT_QUERY_TX_MS = 5 * 60 * 1000

export default class MevShareClient {
    private requestId: number
    constructor(
        private authSigner: Wallet,
        private network: MevShareNetwork,
    ) {
        this.authSigner = authSigner
        this.network = network
        this.requestId = 0
    }

    /** Connect to Flashbots MEV-Share node on Mainnet. */
    static useEthereumMainnet(authSigner: Wallet): MevShareClient {
        return new MevShareClient(authSigner, SupportedNetworks.mainnet)
    }

    /** Connect to Flashbots MEV-Share node on Sepolia. */
    static useEthereumSepolia(authSigner: Wallet): MevShareClient {
        return new MevShareClient(authSigner, SupportedNetworks.sepolia)
    }

    /** Connect to Flashbots MEV-Share node on Holesky. */
    static useEthereumHolesky(authSigner: Wallet): MevShareClient {
        return new MevShareClient(authSigner, SupportedNetworks.holesky)
    }

    /** Connect to supported networks by specifying a network with a `chainId`. */
    static fromNetwork(authSigner: Wallet, {chainId}: {chainId: number | bigint}): MevShareClient {
        const chainNum = typeof chainId === "bigint" ? Number(chainId) : chainId
        const network = SupportedNetworks.getNetwork(chainNum)
        return new MevShareClient(authSigner, network)
    }

    /** Make an HTTP POST request to a JSON-RPC endpoint.
     * @param url - URL to send the request to.
     * @param payload - body & headers.
     * @returns Response data.
    */
    private async postRpc(url: string, payload: {body?: any, headers?: any}): Promise<any> {
        const res = await axios.post(url, payload.body, {
            headers: {...this.network.apiHeaders, ...payload.headers }
        })
        const data = res.data as JsonRpcData
        if (data.error) {
            throw new JsonRpcError(data.error)
        }
        return data.result
    }

    /** Make an HTTP GET request.
     * @param urlSuffix - URL to send the request to.
     */
    private async streamGet(urlSuffix: string): Promise<any> {
        let url = this.network.streamUrl
        url = url.endsWith("/") ? url : url + "/"
        const res = await axios.get(url + "api/v1/" + urlSuffix)
        return res.data
    }

    /**
     * Sends a POST request to the MEV-Share API and returns the data.
     * @param params - JSON-RPC params.
     * @param method - JSON-RPC method.
     * @returns Response data from the API request.
     */
    private async handleApiRequest(params: Array<any>, method: any): Promise<any> {
        try {
            return this.postRpc(this.network.apiUrl, await getRpcRequest(params, method, this.requestId++, this.authSigner))
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
     * @param event - The event received from the event stream.
     * @param callback - Async function to process pending tx.
     */
    private onTransaction(
        event: IMevShareEvent,
        callback: (data: IPendingTransaction) => void
    ) {
        if (!event.txs || (event.txs && event.txs.length === 1)) {
            callback(new PendingTransaction(event))
        }
    }

    /**
     * Registers the provided callback to be called when a new MEV-Share bundle is received.
     * @param event - The event received from the event stream.
     * @param callback - Async function to process pending tx.
     */
    private onBundle(
        event: IMevShareEvent,
        callback: (data: IPendingBundle) => void
    ) {
        if (event.txs && event.txs.length > 1) {
            callback(new PendingBundle(event))
        }
    }


    /**
     * Starts listening to the MEV-Share event stream and registers the given callback to be invoked when the given event type is received.
     * @param eventType - The type of event to listen for. Options specified by StreamEvent enum.
     * @param callback - The function to call when a new event is received.
     * @returns Stream handler. Call `.close()` on it before terminating your program.
     */
    public on(
        eventType: StreamEventType | StreamEventName,
        callback: (data: IPendingBundle | IPendingTransaction) => void
    ): EventSource {
        const events = new EventSource(this.network.streamUrl)

        const eventHandler =
            eventType === StreamEventType.Transaction ? this.onTransaction :
            eventType === StreamEventType.Bundle ? this.onBundle :
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

    /** Sends a private transaction with MEV hints to the Flashbots MEV-Share node.
     * @param signedTx - Signed transaction to send.
     * @param options - Tx preferences; hints & block range.
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
     * @param params - Parameters for the bundle.
     * @returns Array of bundle hashes.
     */
    public async sendBundle(params: BundleParams): Promise<ISendBundleResult> {
        return SendBundleResult(await this.handleApiRequest([mungeBundleParams(params)], "mev_sendBundle"))
    }

    /**
     * Internal mev_simBundle call.
     *
     * Note: This may only be used on matched bundles.
     * Simulating unmatched bundles (i.e. bundles with a hash present) will throw an error.
     * @param params - Parameters for the bundle.
     * @param simOptions - Simulation options; override block header data for simulation.
     * @returns Simulation result.
     */
    private async simBundle(params: BundleParams, simOptions?: SimBundleOptions): Promise<ISimBundleResult> {
        return SimBundleResult(await this.handleApiRequest([
            mungeBundleParams(params),
            simOptions ? mungeSimBundleOptions(simOptions) : {}
        ], "mev_simBundle"))
    }

    /** Simulates a bundle specified by `params`.
     * 
     * Bundles containing pending transactions (specified by `{hash}` instead of `{tx}` in `params.body`) may 
     * only be simulated after those transactions have landed on chain. If the bundle contains
     * pending transactions, this method will wait for the transactions to land before simulating.
     * @param params - Parameters for the bundle.
     * @param simOptions - Simulation options; override block header data for simulation.
     * @returns Simulation result.
     */
    public async simulateBundle(params: BundleParams, simOptions?: SimBundleOptions): Promise<ISimBundleResult> {
        const firstTx = params.body[0]
        if ('hash' in firstTx) {
            console.log("Transaction hash: " + firstTx.hash + " must appear onchain before simulation is possible, waiting")
            return new Promise(async (resolve, reject) => {
                const provider = this.authSigner.provider
                if (provider == null) {
                    throw new Error("Need to wait for hash, but we don't have a provider. Attach one to signer wallet")
                }
                const waitForTx = async () => {
                    const tx = await provider.getTransaction(firstTx.hash)
                    if (tx) {
                        provider.removeListener('block', waitForTx)
                        const signedTx = Transaction.from(tx).serialized
                        console.log(`Found transaction hash: ${ firstTx.hash } onchain at block number: ${ tx.blockNumber }`)
                        if (!tx.blockNumber) {
                            return reject(new Error("Transaction hash: " + firstTx.hash + " does not have blockNumber"))
                        }
                        const simBlock = simOptions?.parentBlock || tx.blockNumber - 1
                        const paramsWithSignedTx = {
                            ...params,
                            body: [
                                {
                                    tx: signedTx, canRevert: false
                                },
                                ...params.body.slice(1),
                            ],
                        }
                        resolve(this.simBundle(paramsWithSignedTx, {...simOptions, parentBlock: simBlock}))
                        return true
                    }
                    return false
                }
                // manually call once in case tx is already landed
                if (await waitForTx()) {
                    return
                }
                provider.on('block', waitForTx)
                setTimeout(() => {
                    provider.removeListener('block', waitForTx)
                    console.error("Gave up waiting for " + firstTx.hash)
                    reject(new Error("Target transaction did not appear onchain before TIMEOUT_QUERY_TX_MS"))
                }, TIMEOUT_QUERY_TX_MS)

            })

        }
        return await this.simBundle(params, simOptions)
    }

    /** Gets information about query parameters for the event history endpoint. */
    public async getEventHistoryInfo(): Promise<EventHistoryInfo> {
        return await this.streamGet("history/info")
    }

    /** Gets past events that were broadcast via the SSE event stream. */
    public async getEventHistory(params?: EventHistoryParams): Promise<Array<EventHistoryEntry>> {
        const _params = params || {}
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(_params)) {
            query.set(key, value.toString())
        }
        const res: Array<IEventHistoryEntry> = await this.streamGet("history" + `?${query.toString()}`)
        return res.map((entry) => new EventHistoryEntry(entry))
    }
}
