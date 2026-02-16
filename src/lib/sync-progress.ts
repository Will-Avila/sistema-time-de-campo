/**
 * Simple in-memory store for sync progress.
 * Using global to persist across HMR in development.
 */
export interface SyncProgress {
    total: number;
    current: number;
    status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
    message: string;
    lastUpdate: number;
}

const defaultProgress: SyncProgress = {
    total: 0,
    current: 0,
    status: 'IDLE',
    message: '',
    lastUpdate: Date.now()
};

const globalForProgress = global as unknown as { syncProgress: SyncProgress };

if (!globalForProgress.syncProgress) {
    globalForProgress.syncProgress = { ...defaultProgress };
}

export const syncProgressStore = {
    get: () => ({ ...globalForProgress.syncProgress }),
    update: (update: Partial<SyncProgress>) => {
        globalForProgress.syncProgress = {
            ...globalForProgress.syncProgress,
            ...update,
            lastUpdate: Date.now()
        };
    },
    reset: () => {
        globalForProgress.syncProgress = { ...defaultProgress, lastUpdate: Date.now() };
    }
};
