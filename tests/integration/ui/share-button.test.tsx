import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareButton } from "@ui/features/share-button";
import { describe, expect, it, vi } from "vitest";

describe("ShareButton", () => {
  it("copies the URL on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareButton onShare={() => "https://timegrid.app/?v=2&payload=abc"} />);
    const btn = screen.getByRole("button", { name: /Share current view/i });
    await userEvent.click(btn);
    expect(writeText).toHaveBeenCalledWith("https://timegrid.app/?v=2&payload=abc");
    expect(await screen.findByLabelText(/Share current view/i)).toBeInTheDocument();
  });

  it("does nothing when onShare returns null", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareButton onShare={() => null} />);
    await userEvent.click(screen.getByRole("button", { name: /Share/i }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to prompt() when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    const prompt = vi.spyOn(window, "prompt").mockImplementation(() => "");
    render(<ShareButton onShare={() => "https://x.test/?v=2"} />);
    await userEvent.click(screen.getByRole("button", { name: /Share/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining("Copy"), "https://x.test/?v=2");
    prompt.mockRestore();
  });
});
