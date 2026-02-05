export interface DiagnosticInfo {
  isElectron: boolean;
  platform: string;
  userAgent: string;
  currentUrl: string;
  baseUrl: string;
  nodeEnv: string;
  electronVersion: string;
  chromeVersion: string;
  appPath: string;
  distPath: string;
  errors: string[];
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  error: string | null;
  version: string | null;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getDiagnostics?: () => Promise<DiagnosticInfo>;
  // Auto-update APIs
  checkForUpdates?: () => Promise<UpdateStatus>;
  downloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
  installUpdate?: () => Promise<{ success: boolean; error?: string }>;
  getUpdateStatus?: () => Promise<UpdateStatus>;
  getAppVersion?: () => Promise<string>;
  onUpdateStatus?: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
