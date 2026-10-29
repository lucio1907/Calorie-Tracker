import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarNav } from "@/features/shell/components/sidebar-nav";
import { SIDEBAR_ITEMS } from "@/features/shell/nav-items";
import { shellStrings } from "@/features/shell/strings";
import { insightsStrings as t } from "./strings";

describe("AI section navigation", () => {
  it("is in the sidebar right after Progress and marks itself on /insights", () => {
    render(<SidebarNav items={SIDEBAR_ITEMS} pathname="/insights" />);
    const nav = within(screen.getByRole("navigation", { name: shellStrings.primaryNav }));

    const hrefs = nav.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs.indexOf("/insights")).toBe(hrefs.indexOf("/progress") + 1);
    expect(nav.getByRole("link", { name: t.nav })).toHaveAttribute("aria-current", "page");
  });
});
