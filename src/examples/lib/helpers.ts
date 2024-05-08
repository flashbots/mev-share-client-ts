import { JsonRpcProvider, Network, Wallet } from 'ethers'
import MevShareClient from '../..'
import Env from './env'
import networks from '../../api/networks'

export function getProvider() {
    return new JsonRpcProvider(Env.providerUrl, networks.sepolia)
}

/** Initializes wallet and provider for examples, using Sepolia. */
export async function initExample(provider: JsonRpcProvider) {
    const authSigner = new Wallet(Env.authKey).connect(provider)

    return {
        provider,
        wallet: new Wallet(Env.senderKey).connect(provider),
        authSigner,
        mevshare: MevShareClient.useEthereumSepolia(authSigner),
        feeData: await provider.getFeeData(),
    }
}
