import { AxiosError } from 'axios'
import { StreamEvent } from './api/interfaces'

class MevShareError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MevShareError";
    }
}

export class JsonRpcError extends MevShareError {
    constructor(error: {code: number, message: string}) {
        super(`${error.code}: ${error.message}`)
        this.name = `JsonRpcError: ${error.code}`
        this.message = error.message
    }
}

export class NetworkFailure extends MevShareError {
    constructor(e: AxiosError) {
        const err = e as AxiosError
        super(`${err.response?.status}: ${JSON.stringify(err.response?.data)}\n${err.stack}`)
        this.name = "NetworkFailure"
    }
}

export class UnimplementedNetwork extends MevShareError {
    constructor({chainId}: {chainId: number}) {
        super(`Cannot infer network params from chainId: ${chainId}`)
        this.name = "UnimplementedNetwork"
    }
}

export class UnimplementedStreamEvent extends MevShareError {
    constructor(eventType: StreamEvent) {
        super(`Unimplemented stream event type: ${eventType.toString()}`)
        this.name = "UnimplementedStreamEvent"
    }
}

export default MevShareError
