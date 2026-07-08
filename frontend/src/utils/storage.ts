import type { NodeItem, BreadItem, CanvasViewState, DisplayMode } from '@/types';

const STORAGE_KEY = 'linkmind_canvas_data';

export interface StorageData {
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
}

export const saveToStorage = (data: StorageData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromStorage = (): StorageData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};
