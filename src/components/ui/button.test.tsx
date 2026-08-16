import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders as a button with its label", () => {
    render(<Button>Pedir demonstração</Button>);

    expect(
      screen.getByRole("button", { name: "Pedir demonstração" }),
    ).toBeInTheDocument();
  });

  it("calls the click handler", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire the handler while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps every size at or above the 44px touch target", () => {
    const { rerender } = render(<Button size="sm">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");

    rerender(<Button size="md">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");

    rerender(<Button size="lg">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-14");

    rerender(<Button size="icon">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("size-11");
  });

  it("uses semantic tokens instead of raw colour values", () => {
    render(<Button variant="destructive">Eliminar</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-destructive");
    expect(button.className).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
