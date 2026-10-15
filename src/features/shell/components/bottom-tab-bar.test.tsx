import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOG_HREF, TAB_BAR_LEADING, TAB_BAR_TRAILING } from "../nav-items";
import { shellStrings } from "../strings";
import { BottomTabBar } from "./bottom-tab-bar";

describe("BottomTabBar", () => {
  function renderAt(pathname: string) {
    render(<BottomTabBar leading={TAB_BAR_LEADING} trailing={TAB_BAR_TRAILING} logHref={LOG_HREF} pathname={pathname} />);
    return within(screen.getByRole("navigation", { name: shellStrings.tabBarNav }));
  }

  it("shows five targets with the log action in the center", () => {
    const nav = renderAt("/today");
    const links = nav.getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/today", "/diary", "/diary", "/progress", "/settings"]);
    expect(links[2]).toHaveAccessibleName(shellStrings.logAccessible);
  });

  it("marks only the current route", () => {
    const nav = renderAt("/diary");

    expect(nav.getByRole("link", { name: shellStrings.nav.diary })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: shellStrings.nav.today })).not.toHaveAttribute("aria-current");
  });
});
