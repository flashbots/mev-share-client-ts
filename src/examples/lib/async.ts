import { Mutex } from 'async-mutex'

/* Simple thread-safe mutable vars.
It feels like these should exist in a library somewhere already but ¯\_(ツ)_/¯ */

/** async mutex-guarded variable */
export class AsyncVar<T> {
    private mutex: Mutex
    constructor(private value: T) {
        this.mutex = new Mutex()
    }

    public async get(): Promise<T> {
        const release = await this.mutex.acquire()
        const value = this.value
        release()
        return value
    }

    public async set(value: T): Promise<void> {
        const release = await this.mutex.acquire()
        this.value = value
        release()
    }
}

/** async mutex-guarded array */
export class AsyncArray<T> extends AsyncVar<Array<T>> {
    constructor(value?: Array<T>) {
        super(value || [])
    }

    public async push(value: T): Promise<void> {
        const arr = await this.get()
        arr.push(value)
        await this.set(arr)
    }

    public async filter(filterFn: (value: T) => boolean): Promise<void> {
        const arr = await this.get()
        const filtered = arr.filter(filterFn)
        await this.set(filtered)
    }

    public async includes(value: T): Promise<boolean> {
        const arr = await this.get()
        return arr.includes(value)
    }

    public async length(): Promise<number> {
        const arr = await this.get()
        return arr.length
    }
}
