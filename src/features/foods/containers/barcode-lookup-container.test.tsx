import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupBarcode } from "../actions/off-actions";
import { foodsStrings } from "../strings";
import { BarcodeLookupContainer } from "./barcode-lookup-container";

const detect = vi.fn();
vi.mock("barcode-detector/ponyfill", () => ({
  prepareZXingModule: vi.fn(),
  BarcodeDetector: class {
    detect = detect;
  },
}));
vi.mock("../actions/off-actions", () => ({ lookupBarcode: vi.fn() }));

const t = foodsStrings.barcode;
const stopTrack = vi.fn();
const getUserMedia = vi.fn();

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  vi.mocked(lookupBarcode).mockResolvedValue({ status: "found", foodId: 7, error: null, barcode: "7790580000000" });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("BarcodeLookupContainer camera scanning", () => {
  it("looks up the first scanned code, opens the food and turns the camera off", async () => {
    detect.mockResolvedValueOnce([]).mockResolvedValue([{ rawValue: "7790580000000" }]);
    const onFound = vi.fn();
    render(<BarcodeLookupContainer onFound={onFound} />);

    await userEvent.click(screen.getByRole("button", { name: t.scan }));

    await waitFor(() => expect(onFound).toHaveBeenCalledWith(7));
    const formData = vi.mocked(lookupBarcode).mock.calls[0][1];
    expect(formData.get("barcode")).toBe("7790580000000");
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.queryByLabelText(t.cameraPreview)).not.toBeInTheDocument();
  });

  it("explains a denied camera and keeps typing available", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    render(<BarcodeLookupContainer onFound={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: t.scan }));

    expect(await screen.findByText(t.cameraDenied)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.scan })).toBeEnabled();
    expect(screen.getByLabelText(t.label)).toBeEnabled();
    expect(lookupBarcode).not.toHaveBeenCalled();
  });
});
