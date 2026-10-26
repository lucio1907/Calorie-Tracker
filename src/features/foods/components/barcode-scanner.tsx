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
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label={t.cameraPreview}
          className="aspect-video w-full rounded-cards bg-surface-alt object-cover"
        />
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
