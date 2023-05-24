import { LogParams } from 'ethers';
import { IMatchmakerEvent, IPendingBundle, IPendingTransaction } from './interfaces';

export class PendingTransaction implements IPendingTransaction {
    hash: string
    logs?: LogParams[]
    to?: string
    functionSelector?: string
    callData?: string
    mevGasPrice?: bigint
    gasUsed?: bigint

    constructor(event: IMatchmakerEvent) {
        this.hash = event.hash
        this.logs = event.logs || undefined
        this.to = event.txs && event.txs[0].to
        this.functionSelector = event.txs && event.txs[0].functionSelector
        this.callData = event.txs && event.txs[0].callData
        this.gasUsed = event.gasUsed ? BigInt(event.gasUsed) : undefined
        this.mevGasPrice = event.mevGasPrice ? BigInt(event.mevGasPrice) : undefined
    }
}

export class PendingBundle implements IPendingBundle {
    hash: string
    logs?: LogParams[]
    txs?: { to?: string, functionSelector?: string, callData?: string }[]
    mevGasPrice?: bigint
    gasUsed?: bigint

    constructor(event: IMatchmakerEvent) {
        this.hash = event.hash
        this.logs = event.logs || undefined
        this.txs = event.txs
        this.gasUsed = event.gasUsed ? BigInt(event.gasUsed) : undefined
        this.mevGasPrice = event.mevGasPrice ? BigInt(event.mevGasPrice) : undefined
    }
}
