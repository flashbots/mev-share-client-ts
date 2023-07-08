import { getProvider, initExample } from './lib/helpers'

const main = async () => {
    const provider = getProvider()
    const { mevshare } = await initExample(provider)
    const info = await mevshare.getEventHistoryInfo()
    console.log(info)

    let i = 0
    let done = false
    while (!done) {
        const resHistory = await mevshare.getEventHistory({
            limit: info.maxLimit,
            offset: i * info.maxLimit,
            blockStart: info.minBlock,
        })
        for (const event of resHistory) {
            if (event.hint.txs) {
                console.log("event", event)
                console.log("txs", event.hint.txs)
                break
            }
        }
        for (const event of resHistory) {
            if (event.hint.logs) {
                console.log("logs", event.hint.logs)
                done = true
                break
            }
        }
        i++
    }
}

main()
