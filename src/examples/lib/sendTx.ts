import { hexlify, toBigInt, toUtf8Bytes } from 'ethers'
import { JsonRpcProvider, TransactionRequest } from 'ethers/types/providers'
import { HintPreferences } from '../..'
import { initExample } from './helpers'

export const setupTxExample = async (provider: JsonRpcProvider, tip?: BigInt, flair?: string) => {
    const { wallet, feeData, matchmaker } = await initExample(provider)
    const tipActual = tip ? tip.valueOf() : BigInt(0)
    const tx: TransactionRequest = {
        type: 2,
        chainId: provider._network.chainId,
        to: wallet.address,
        nonce: await wallet.getNonce(),
        value: 0,
        gasLimit: 22000,
        data: hexlify(toUtf8Bytes(flair || "im shariiiiiing")),
        maxFeePerGas: toBigInt(feeData.maxFeePerGas || 42) + tipActual,
        maxPriorityFeePerGas: toBigInt(feeData.maxPriorityFeePerGas || 2) + tipActual,
    }

    return {
        wallet,
        provider,
        matchmaker,
        tx,
        signedTx: await wallet.signTransaction(tx),
    }
}

export const sendTx = async (
    provider: JsonRpcProvider,
    hints?: HintPreferences,
    maxBlockNumber?: number,
    tip?: BigInt,
) => {
    const {matchmaker, signedTx} = await setupTxExample(provider, tip)
    return await matchmaker.sendTransaction(signedTx,
        {hints, maxBlockNumber}
    )
}
