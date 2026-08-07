declare module '@zxing/browser' {
  export class BrowserMultiFormatReader {
    listVideoInputDevices(): Promise<MediaDeviceInfo[]>;
    decodeFromVideoDevice(
      deviceId: string | null,
      videoElement: HTMLVideoElement,
      callback: (result: { getText(): string } | undefined, error: Error | undefined) => void
    ): Promise<void>;
    reset(): void;
  }
}
