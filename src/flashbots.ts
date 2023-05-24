import { id as ethersId, Wallet } from "ethers"

export type JsonRpcData = {
    id: number,
    result?: any,
    error?: {code: number, message: string},
    jsonrpc: string,
}

/**
 * Standardized RPC request for talking to Bundle API (mev-geth/mev-share) directly.
 * @param params - JSON data params
 * @param method - JSON-RPC method
 * @param authSigner - Wallet used to sign Flashbots auth header; for reputation
 * @returns Parameters of payload to send to Bundle API
 */
export const getRpcRequest = async (params: any, method: string, authSigner: Wallet) => {
    const body = {
        params,
        method,
        id: 69,
        jsonrpc: "2.0"
    }
    const signature = `${authSigner.address}:${await authSigner.signMessage(ethersId(JSON.stringify(body)))}`
    const headers = {
        'Content-Type': 'application/json',
        'X-Flashbots-Signature': signature,
    }
    return {
        headers,
        signature,
        body,
    }
}
