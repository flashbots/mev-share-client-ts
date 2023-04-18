import { AxiosError } from 'axios'
import { StreamEvent } from './api/interfaces'

class MatchmakerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MatchmakerError";
    }
}

export class JsonRpcError extends MatchmakerError {
    constructor(error: {code: number, message: string}) {
        super(`${error.code}: ${error.message}`)
        this.name = `JsonRpcError: ${error.code}`
        this.message = error.message
    }
}

export class NetworkFailure extends MatchmakerError {
    constructor(e: AxiosError) {
        const err = e as AxiosError
        super(`${err.response?.status}: ${JSON.stringify(err.response?.data)}\n${err.stack}`)
        this.name = "NetworkFailure"
    }
}

export class UnimplementedNetwork extends MatchmakerError {
    constructor({chainId}: {chainId: number}) {
        super(`Cannot infer network params from chainId: ${chainId}`)
        this.name = "UnimplementedNetwork"
    }
}

export class UnimplementedStreamEvent extends MatchmakerError {
    constructor(eventType: StreamEvent) {
        super(`Unimplemented stream event type: ${eventType.toString()}`)
        this.name = "UnimplementedStreamEvent"
    }
}

export default MatchmakerError
