import { UnimplementedNetwork } from '../error'

/**
 * Network connection presets supported by Flashbots.
 */
const networks = {
    supportedNetworks: {
        mainnet: {
            name: "mainnet",
            chainId: 1,
            streamUrl: "https://mev-share.flashbots.net",
            apiUrl: "https://relay.flashbots.net",
        },
        sepolia: {
            name: "sepolia",
            chainId: 11155111,
            streamUrl: "https://mev-share-sepolia.flashbots.net",
            apiUrl: "https://relay-sepolia.flashbots.net",
        },
        holesky: {
            name: "holesky",
            chainId: 17000,
            streamUrl: "https://mev-share-holesky.flashbots.net",
            apiUrl: "https://relay-holesky.flashbots.net",
        }
    } as const,
}

/** 
 * Gets the network preset matching the provided chainId,
 * throws an UnimplementedNetwork error if not found.
 */
function getNetwork (chainId: number) {
    const net = Object.values(networks.supportedNetworks).find(net => net.chainId === chainId)
    if (net) {
        return net
    }
    throw new UnimplementedNetwork({chainId})
}

export default {
    ...networks.supportedNetworks,
    getNetwork,
}
