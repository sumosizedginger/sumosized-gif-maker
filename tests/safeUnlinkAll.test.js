import { describe, it, expect, vi } from 'vitest';
import { safeUnlinkAll } from '../js/modules/utils.js';

function makeMockFfmpeg(existingFiles) {
    return {
        FS: vi.fn(async (method, path) => {
            if (method === 'readdir') return existingFiles;
            if (method === 'unlink') {
                const name = path.replace(/^\//, '');
                if (!existingFiles.includes(name)) {
                    throw new Error(`ENOENT: ${path}`);
                }
            }
        })
    };
}

describe('safeUnlinkAll', () => {
    it('calls unlink for each file that exists', async () => {
        const mock = makeMockFfmpeg(['a.mp4', 'b.png']);
        await safeUnlinkAll(mock, '/', ['a.mp4', 'b.png']);
        expect(mock.FS).toHaveBeenCalledWith('unlink', '/a.mp4');
        expect(mock.FS).toHaveBeenCalledWith('unlink', '/b.png');
    });

    it('does not throw when a file does not exist', async () => {
        const mock = makeMockFfmpeg([]);
        await expect(safeUnlinkAll(mock, '/', ['missing.gif'])).resolves.toBeUndefined();
    });

    it('continues unlinking after one failure', async () => {
        const mock = makeMockFfmpeg(['exists.gif']);
        await safeUnlinkAll(mock, '/', ['missing.mp4', 'exists.gif']);
        expect(mock.FS).toHaveBeenCalledWith('unlink', '/exists.gif');
    });

    it('handles an empty file list with no calls', async () => {
        const mock = makeMockFfmpeg([]);
        await safeUnlinkAll(mock, '/', []);
        expect(mock.FS).toHaveBeenCalledTimes(1);
        expect(mock.FS).toHaveBeenCalledWith('readdir', '/');
    });

    it('prepends the dir prefix when path does not start with /', async () => {
        const mock = { FS: vi.fn(async (m) => (m === 'readdir' ? ['out.gif'] : undefined)) };
        await safeUnlinkAll(mock, '/work', ['out.gif']);
        expect(mock.FS).toHaveBeenCalledWith('unlink', '/work/out.gif');
    });
});
