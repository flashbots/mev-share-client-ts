import { UnimplementedNetwork } from '../error'

/**
 * Network connection presets supported by Flashbots.
 */
export class SupportedNetworks {
    private static supportedNetworks = {
        mainnet: {
            name: "mainnet",
            chainId: 1,
            streamUrl: "https://mev-share.flashbots.net",
            apiUrl: "https://relay.flashbots.net"
        },
        goerli: {
            name: "goerli",
            chainId: 5,
            streamUrl: "https://mev-share-goerli.flashbots.net",
            apiUrl: "https://relay-goerli.flashbots.net"
        }
    }

    // expose networks individually as class properties
    public static mainnet = this.supportedNetworks.mainnet
    public static goerli = this.supportedNetworks.goerli

    /**
     * Returns true if the given chainId is supported by the client.
     */
    static supportsChainId(chainId: number) {
        return Object.values(this.supportedNetworks).map(n => n.chainId).includes(chainId)
    }

    /** Gets the network preset matching the provided chainId, throws an error if not found. */
    static getNetwork(chainId: number) {
        if (this.supportsChainId(chainId)) {
            const net = Object.values(this.supportedNetworks).find(net => net.chainId === chainId)
            if (net) {
                return net
            }
        }
        throw new UnimplementedNetwork({chainId})
    }
}
