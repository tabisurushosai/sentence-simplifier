/**
 * Typed wrapper for chrome.storage.local
 */

export interface StorageData {
  enabled: boolean;
  furiganaEnabled: boolean;
  kanjiReplaceEnabled: boolean;
  longSplitEnabled: boolean;
  readabilityScoreEnabled: boolean;
  trial_start_ts?: number;
  premium_unlocked: boolean;
}

const DEFAULT_STORAGE: StorageData = {
  enabled: true,
  furiganaEnabled: true,
  kanjiReplaceEnabled: true,
  longSplitEnabled: true,
  readabilityScoreEnabled: true,
  premium_unlocked: false,
};

export const storage = {
  /**
   * Get specific keys from storage
   */
  get: <K extends keyof StorageData>(keys: K[]): Promise<Pick<StorageData, K>> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        const data = {} as Pick<StorageData, K>;
        keys.forEach((key) => {
          // @ts-ignore: key is keyof StorageData
          data[key] = result[key] ?? DEFAULT_STORAGE[key as keyof StorageData];
        });
        resolve(data);
      });
    });
  },

  /**
   * Get all data from storage
   */
  getAll: (): Promise<StorageData> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve({
          ...DEFAULT_STORAGE,
          ...result,
        } as StorageData);
      });
    });
  },

  /**
   * Set data in storage
   */
  set: (data: Partial<StorageData>): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  },
};
