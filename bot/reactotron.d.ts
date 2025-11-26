/**
 * Type definitions for Reactotron
 */

declare global {
  interface Console {
    tron?: {
      log: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
      display: (config: any) => void;
      image: (config: any) => void;
      clear?: () => void;
    };
  }
}

export {};
