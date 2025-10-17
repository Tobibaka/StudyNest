export {};

declare global {
  interface Window {
    studynest: {
      platform: NodeJS.Platform;
    };
  }
}
