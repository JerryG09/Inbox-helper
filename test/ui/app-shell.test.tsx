import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/page";

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

const section = (id: string) => document.getElementById(id)!;

describe("AppShell navigation", () => {
  it("starts on Import with only the import section visible", () => {
    render(<Page />);
    expect(document.getElementById("nav-import")!.className).toBe("active");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Import candidate messages");
    expect(section("import-view").className).toBe("");
    expect(section("inbox-view").className).toBe("hidden");
    expect(section("results-view").className).toBe("hidden");
  });

  it("switches between exactly three views and updates the header", () => {
    render(<Page />);
    fireEvent.click(document.getElementById("nav-inbox")!);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Inbox & human review");
    expect(document.getElementById("breadcrumb")!.textContent).toBe("02 / Work queue");
    expect(section("inbox-view").className).toBe("");
    expect(section("import-view").className).toBe("hidden");

    fireEvent.click(document.getElementById("nav-results")!);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Batch results & export");
    expect(document.querySelectorAll(".nav button.active")).toHaveLength(1);
    expect(document.querySelectorAll(".nav button")).toHaveLength(3);
  });

  it("empty-state buttons return to Import", () => {
    render(<Page />);
    fireEvent.click(document.getElementById("nav-results")!);
    fireEvent.click(screen.getByText("Start with Import →"));
    expect(section("import-view").className).toBe("");
  });

  it("contains no send path and states that nothing is sent", () => {
    render(<Page />);
    expect(screen.getByText("No messages sent")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /send/i })).toBeNull();
  });
});
