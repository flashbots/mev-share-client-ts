import { HintPreferences } from '../api'
import { getProvider } from './lib/helpers'
import { sendTx } from './lib/sendTx'

const main = async () => {
    const provider = getProvider()
    const hints: HintPreferences = {
        calldata: true,
        logs: true,
        contractAddress: true,
        functionSelector: true,
    }
    console.log("sending tx to Flashbots Bundle API...")
    await sendTx(provider, hints)
}

main()
