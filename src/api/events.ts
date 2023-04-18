import { LogParams } from 'ethers';
import { IMatchmakerEvent, IPendingBundle, IPendingTransaction } from './interfaces';
import { StreamEvent } from './interfaces';

export class PendingTransaction implements IPendingTransaction {
    hash: string
    logs?: LogParams[]
    to?: string
    functionSelector?: string
    callData?: string

    constructor(event: IMatchmakerEvent) {
        this.hash = event.hash
        this.logs = event.logs || undefined
        this.to = event.txs && event.txs[0].to
        this.functionSelector = event.txs && event.txs[0].functionSelector
        this.callData = event.txs && event.txs[0].callData
    }
}

export class PendingBundle implements IPendingBundle {
    hash: string
    logs?: LogParams[]
    txs?: { to?: string, functionSelector?: string, callData?: string }[]

    constructor(event: IMatchmakerEvent) {
        this.hash = event.hash
        this.logs = event.logs || undefined
        this.txs = event.txs
    }
}

export {StreamEvent}
