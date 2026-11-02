import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { insightsStrings } from "@/features/insights/strings";
import { LOG_HREF, TAB_BAR_LEADING, TAB_BAR_MORE, TAB_BAR_TRAILING } from "../nav-items";
import { shellStrings } from "../strings";
import { BottomTabBar } from "./bottom-tab-bar";

// jsdom has no modal dialogs: open/close the <dialog> by toggling its attribute.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

describe("BottomTabBar", () => {
  function renderAt(pathname: string) {
    render(
      <BottomTabBar
        leading={TAB_BAR_LEADING}
        trailing={TAB_BAR_TRAILING}
        more={TAB_BAR_MORE}
        logHref={LOG_HREF}
        pathname={pathname}
      />,
    );
    return within(screen.getByRole("navigation", { name: shellStrings.tabBarNav }));
  }

  function moreButton(nav: ReturnType<typeof renderAt>) {
    return nav.getByRole("button", { name: shellStrings.more });
  }

  it("shows five targets: four tabs with the log action in the center, then More", () => {
    const nav = renderAt("/today");
    const links = nav.getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/today", "/diary", "/diary", "/progress"]);
    expect(links[2]).toHaveAccessibleName(shellStrings.logAccessible);
    expect(moreButton(nav)).toHaveAttribute("aria-expanded", "false");
  });

  it("marks only the current route", () => {
    const nav = renderAt("/diary");

    expect(nav.getByRole("link", { name: shellStrings.nav.diary })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: shellStrings.nav.today })).not.toHaveAttribute("aria-current");
    expect(moreButton(nav)).not.toHaveAttribute("aria-current");
  });

  it("opens a sheet with the remaining sections", () => {
    const nav = renderAt("/today");

    fireEvent.click(moreButton(nav));

    const sheet = screen.getByRole("dialog", { name: shellStrings.more });
    const hrefs = within(sheet)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/activity", "/foods", "/insights", "/settings"]);
    expect(within(sheet).getByRole("link", { name: insightsStrings.nav })).toBeVisible();
    expect(moreButton(nav)).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the sheet from its close button", () => {
    const nav = renderAt("/today");
    fireEvent.click(moreButton(nav));

    fireEvent.click(screen.getByRole("button", { name: shellStrings.close }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(moreButton(nav)).toHaveAttribute("aria-expanded", "false");
  });

  it("marks More as current on a section that lives in the sheet, and the section inside it", () => {
    const nav = renderAt("/settings");

    expect(moreButton(nav)).toHaveAttribute("aria-current", "true");
    fireEvent.click(moreButton(nav));
    const sheet = screen.getByRole("dialog", { name: shellStrings.more });
    expect(within(sheet).getByRole("link", { name: shellStrings.nav.settings })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: shellStrings.nav.foods })).not.toHaveAttribute("aria-current");
  });
});
