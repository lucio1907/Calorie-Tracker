import { Camera } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui";
import { foodsStrings } from "../strings";

const t = foodsStrings.barcode;

type BarcodeScannerProps = {
  videoRef: Ref<HTMLVideoElement>;
  scanning: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
};

/** Camera toggle and live preview; the detected code goes to the same lookup as typed codes. */
export function BarcodeScanner({ videoRef, scanning, error, onStart, onStop, disabled = false }: BarcodeScannerProps) {
  return (
    <div className="flex flex-col gap-8">
      {scanning ? (
        <div className="relative overflow-hidden rounded-cards bg-surface-alt">
          <video ref={videoRef} muted playsInline aria-label={t.cameraPreview} className="aspect-video w-full object-cover" />
          {/* Aiming guide: a barcode-shaped window, the rest of the preview dimmed by its shadow. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-2/5 w-4/5 max-w-320 rounded-buttons border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]">
              <div className="absolute inset-x-8 top-1/2 h-2 -translate-y-1/2 rounded-full bg-red-500/80 motion-safe:animate-pulse" />
            </div>
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-8 px-16 text-center text-caption font-medium text-white">
            {t.aimHint}
          </p>
        </div>
      ) : null}
      <div>
        <Button onClick={scanning ? onStop : onStart} disabled={disabled}>
          <Camera aria-hidden="true" size={18} />
          {scanning ? t.stopScan : t.scan}
        </Button>
      </div>
      <p role="alert" className="text-body text-danger-ink empty:hidden">
        {error ?? ""}
      </p>
    </div>
  );
}
