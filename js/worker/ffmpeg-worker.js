// Shim for ffmpeg.min.js which expects a browser environment
self.document = self.document || {
    currentScript: { src: 'js/vendor/ffmpeg.min.js' },
    createElement: () => ({})
};
self.location = self.location || { href: '' };

importScripts('../vendor/ffmpeg.min.js');

const { createFFmpeg } = FFmpeg;

// Provide absolute paths to avoid library path-resolution bugs
const BASE_URL = self.location.href.split('/js/worker/')[0];
const ffmpeg = createFFmpeg({
    log: true,
    corePath: `${BASE_URL}/js/vendor/ffmpeg-core.js`,
    workerPath: `${BASE_URL}/js/vendor/ffmpeg-core.worker.js`,
    wasmPath: `${BASE_URL}/js/vendor/ffmpeg-core.wasm`
});

/**
 * Global message handler
 */
self.onmessage = async (e) => {
    const { type, id, data } = e.data;

    try {
        switch (type) {
            case 'load':
                if (!ffmpeg.isLoaded()) {
                    await ffmpeg.load();
                }
                self.postMessage({ type: 'done', id });
                break;

            case 'run':
                // data should be the arguments array
                await ffmpeg.run(...data);
                self.postMessage({ type: 'done', id });
                break;

            case 'writeFile':
                // data: { name, buffer }
                ffmpeg.FS('writeFile', data.name, data.buffer);
                self.postMessage({ type: 'done', id });
                break;

            case 'readFile': {
                // data: name
                const result = ffmpeg.FS('readFile', data);
                self.postMessage({ type: 'done', id, data: result }, [result.buffer]);
                break;
            }

            case 'unlink':
                // data: name
                ffmpeg.FS('unlink', data);
                self.postMessage({ type: 'done', id });
                break;

            case 'readdir': {
                const files = ffmpeg.FS('readdir', data);
                self.postMessage({ type: 'done', id, data: files });
                break;
            }

            default:
                console.error('Unknown worker command:', type);
        }
    } catch (error) {
        console.error('Worker Error:', error);
        self.postMessage({ type: 'error', id, error: error.message });
    }
};

// Set up progress reporting
ffmpeg.setProgress(({ ratio }) => {
    self.postMessage({ type: 'progress', ratio });
});

// Set up logger
ffmpeg.setLogger(({ type, message }) => {
    self.postMessage({ type: 'log', logType: type, message });
});
