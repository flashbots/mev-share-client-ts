import MevShareClient from "../index"
import { JsonRpcProvider, Wallet } from "ethers"
import env from './lib/env'

async function main() {
    const provider = new JsonRpcProvider(env.providerUrl, {chainId: 1, name: "mainnet"})
    const block = await provider.getBlockNumber()
    const { gasPrice } = await provider.getFeeData()
    const authSigner = new Wallet(env.authKey)
    const wallet = new Wallet(env.senderKey)
    const client = MevShareClient.useEthereumMainnet(authSigner)
    const tx = {
        to: "0x0000000000000000000000000000000000000000",
        data: '0x42',
        chainId: 1,
        gasPrice,
        gasLimit: 42000,
    }
    const bundle = [
        {tx: await wallet.signTransaction(tx), canRevert: false},
    ]
    const bundleParams = {
        inclusion: {
            block: block + 1,
            maxBlock: block + 10,
        },
        body: bundle,
    }
    const simResult = await client.simulateBundle(bundleParams)
    console.log('simResult', simResult)
}

main()
