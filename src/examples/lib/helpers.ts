import { JsonRpcProvider, Network, Wallet } from 'ethers'
import Matchmaker from '../..'
import Env from './env'

export function getProvider() {
    return new JsonRpcProvider(Env.providerUrl, new Network("goerli", 5))
}

export async function initExample(provider: JsonRpcProvider) {
    const authSigner = new Wallet(Env.authKey).connect(provider)

    return {
        provider,
        wallet: new Wallet(Env.senderKey).connect(provider),
        authSigner,
        matchmaker: Matchmaker.useEthereumGoerli(authSigner),
        feeData: await provider.getFeeData(),
    }
}
