"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { foodsStrings } from "../strings";

const t = foodsStrings.barcode;

// Retail product codes; lookupBarcode accepts 8 to 14 digits.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;
const SCAN_INTERVAL_MS = 200;

/**
 * Rear camera + ZXing decoder (loaded on first scan, .wasm served from /public).
 * Calls onDetected once with the first code read, then turns the camera off.
 */
export function useBarcodeScanner(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detected = useEffectEvent(onDetected);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let stream: MediaStream | undefined;

    async function run() {
      try {
        const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
        prepareZXingModule({
          overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/${path}` : prefix + path) },
        });
        const detector = new BarcodeDetector({ formats: [...FORMATS] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current;
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();

        while (!cancelled) {
          const [code] = await detector.detect(video);
          if (code && !cancelled) {
            setScanning(false);
            detected(code.rawValue);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL_MS));
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? t.cameraDenied : t.cameraUnavailable);
        setScanning(false);
      } finally {
        // Also covers a cleanup that ran while getUserMedia was still pending.
        stream?.getTracks().forEach((track) => track.stop());
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [scanning]);

  return {
    videoRef,
    scanning,
    error,
    start: () => {
      setError(null);
      setScanning(true);
    },
    stop: () => setScanning(false),
  };
}
