import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("renders the mark as a decorative svg", () => {
    const { container } = render(<Logo />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("");
  });

  it("renders the wordmark text when asked", () => {
    render(<Logo wordmark="Contador de calorías" />);

    expect(screen.getByText("Contador de calorías")).toBeInTheDocument();
  });

  it("sizes the mark through className", () => {
    const { container } = render(<Logo markClassName="size-40" />);

    expect(container.querySelector("svg")).toHaveClass("size-40");
  });
});
