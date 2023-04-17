import { AxiosError } from 'axios'
import { StreamEvent } from './api/interfaces'

class MatchmakerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MatchmakerError";
    }
}

export class NetworkFailure extends MatchmakerError {
    constructor(e: AxiosError) {
        const err = e as AxiosError
        super(`${err.response?.status}: ${JSON.stringify(err.response?.data)}\n${err.stack}`)
        this.name = "NetworkFailure"
    }
}

export class UnimplementedStreamEvent extends MatchmakerError {
    constructor(eventType: StreamEvent) {
        super(`Unimplemented stream event type: ${eventType.toString()}`)
        this.name = "UnimplementedStreamEvent"
    }
}

export default MatchmakerError
