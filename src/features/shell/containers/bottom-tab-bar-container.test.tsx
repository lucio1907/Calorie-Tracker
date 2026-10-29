import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOG_FOOD_EVENT } from "../nav-items";
import { shellStrings } from "../strings";
import { BottomTabBarContainer } from "./bottom-tab-bar-container";

vi.mock("next/navigation", () => ({ usePathname: () => "/diary" }));

describe("BottomTabBarContainer", () => {
  const listener = vi.fn();

  afterEach(() => {
    window.removeEventListener(LOG_FOOD_EVENT, listener);
    listener.mockClear();
  });

  it("opens the diary's add-food sheet when the log action is tapped on the diary", () => {
    window.addEventListener(LOG_FOOD_EVENT, listener);
    render(<BottomTabBarContainer />);

    fireEvent.click(screen.getByRole("link", { name: shellStrings.logAccessible }));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
