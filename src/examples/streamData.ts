import { getProvider, initExample } from './lib/helpers'

const main = async () => {
    const provider = getProvider()
    const { matchmaker } = await initExample(provider)
    const res = await matchmaker.getEventHistoryInfo()
    console.log(res)
}

main()
