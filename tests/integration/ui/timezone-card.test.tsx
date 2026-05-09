import { buildTimezoneData } from "@domain/workspace/operations";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimezoneCard } from "@ui/features/timezone-card";
import { describe, expect, it, vi } from "vitest";

const tokyo = buildTimezoneData({
  id: "tokyo-1",
  city: "Tokyo",
  country: "Japan",
  timezone: "Asia/Tokyo",
});

describe("TimezoneCard", () => {
  it("renders city, country, and time in the target zone", () => {
    render(
      <TimezoneCard
        timezone={tokyo}
        instantUtc="2025-07-04T16:00:00.000Z"
        isReference
      />,
    );
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    // 16:00 UTC + 9h = 01:00 next day Tokyo
    expect(screen.getByText("1:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
  });

  it("truncates long city names on non-reference cards", () => {
    const long = buildTimezoneData({
      id: "long",
      city: "New South Wales Capital",
      country: "Australia",
      timezone: "Australia/Sydney",
    });
    render(<TimezoneCard timezone={long} instantUtc="2025-07-04T00:00:00.000Z" />);
    expect(screen.getByText(/New South\s?…/)).toBeInTheDocument();
  });

  it("calls onSetAsReference when the home button is clicked", async () => {
    const onSetRef = vi.fn();
    const onRemove = vi.fn();
    render(
      <TimezoneCard
        timezone={tokyo}
        instantUtc="2025-07-04T16:00:00.000Z"
        onSetAsReference={onSetRef}
        onRemove={onRemove}
      />,
    );
    const button = screen.getByRole("button", { name: /Set Tokyo as reference/i });
    await userEvent.click(button);
    expect(onSetRef).toHaveBeenCalledOnce();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("opens a confirmation dialog before removing", async () => {
    const onRemove = vi.fn();
    render(
      <TimezoneCard
        timezone={tokyo}
        instantUtc="2025-07-04T16:00:00.000Z"
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Remove Tokyo/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Tokyo, Japan/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /^Remove$/ }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("shows the abbreviation TZ pill for abbreviation kind", () => {
    const pst = buildTimezoneData({
      city: "PST",
      country: "US West Coast",
      timezone: "America/Los_Angeles",
      kind: "abbreviation",
      abbreviation: "PST",
      region: "US West Coast",
    });
    render(<TimezoneCard timezone={pst} instantUtc="2025-01-15T20:00:00.000Z" />);
    expect(screen.getByText("TZ")).toBeInTheDocument();
  });

  it("renders without action buttons when no callbacks are provided", () => {
    render(<TimezoneCard timezone={tokyo} instantUtc="2025-07-04T16:00:00.000Z" isReference />);
    expect(screen.queryByRole("button", { name: /Remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Set .* as reference/i })).not.toBeInTheDocument();
  });
});
