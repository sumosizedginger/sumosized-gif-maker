/**
 * ffmpeg-client.js — High-level FFmpeg Worker Bridge
 */
export class FFmpegWorkerClient {
    constructor() {
        this.worker = new Worker('js/worker/ffmpeg-worker.js');
        this.promises = new Map();
        this.messageId = 0;
        this._isLoaded = false;
        this._loadPromise = null;
        this.onProgress = null;
        this.onLog = null;

        this.worker.onmessage = (e) => {
            const { type, id, data, ratio, logType, message, error } = e.data;

            if (type === 'done') {
                const handlers = this.promises.get(id);
                if (handlers) {
                    handlers.resolve(data);
                    this.promises.delete(id);
                }
            } else if (type === 'error') {
                const handlers = this.promises.get(id);
                if (handlers) {
                    handlers.reject(new Error(error));
                    this.promises.delete(id);
                }
            } else if (type === 'progress') {
                if (this.onProgress) this.onProgress({ ratio });
            } else if (type === 'log') {
                if (this.onLog) this.onLog({ type: logType, message });
            }
        };
    }

    _send(type, data = null, transfer = [], timeoutMs = 5 * 60 * 1000) {
        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.promises.set(id, { resolve, reject });
            this.worker.postMessage({ type, id, data }, transfer);

            // Timeout guard
            const timer = setTimeout(() => {
                if (this.promises.has(id)) {
                    this.promises.delete(id);
                    reject(new Error(`FFmpeg operation timed out after ${Math.round(timeoutMs / 1000)}s`));
                }
            }, timeoutMs);

            const entry = this.promises.get(id);
            this.promises.set(id, {
                resolve: (v) => {
                    clearTimeout(timer);
                    entry.resolve(v);
                },
                reject: (e) => {
                    clearTimeout(timer);
                    entry.reject(e);
                }
            });
        });
    }

    async load() {
        if (this._isLoaded) return;
        if (this._loadPromise) return this._loadPromise;
        this._loadPromise = this._send('load', null, [], 60 * 1000)
            .then(() => {
                this._isLoaded = true;
            })
            .catch((err) => {
                this._loadPromise = null;
                throw err;
            });
        return this._loadPromise;
    }

    isLoaded() {
        return this._isLoaded;
    }

    async run(...args) {
        return this._send('run', args);
    }

    async FS(method, ...args) {
        if (method === 'writeFile') {
            const name = args[0];
            const buffer = args[1];
            const copy = new Uint8Array(buffer.buffer || buffer).slice(0);
            return this._send('writeFile', { name, buffer: copy }, [copy.buffer]);
        } else if (method === 'readFile') {
            return this._send('readFile', args[0]);
        } else if (method === 'unlink') {
            return this._send('unlink', args[0]);
        } else if (method === 'readdir') {
            return this._send('readdir', args[0]);
        }
    }

    setProgress(fn) {
        this.onProgress = fn;
    }

    setLogger(fn) {
        this.onLog = fn;
    }
}

// Create singleton instance
export const ffmpeg = new FFmpegWorkerClient();
// Lazy lookup for fetchFile to avoid race condition on module load
export const fetchFile = (data) => {
    if (typeof window.FFmpeg === 'undefined' || !window.FFmpeg.fetchFile) {
        throw new Error('FFmpeg.wasm not loaded yet.');
    }
    return window.FFmpeg.fetchFile(data);
};
