/**
 * Network connection presets supported by the Flashbots Matchmaker.
 */
const supportedNetworks = {
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
    },
}

export default supportedNetworks
