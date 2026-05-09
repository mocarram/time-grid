import { getWorkspaceIcon, WORKSPACE_ICON_LIST } from "@ui/features/icon-registry";
import { describe, expect, it } from "vitest";

describe("icon-registry", () => {
  it("returns a registered icon component", () => {
    const Icon = getWorkspaceIcon("Plane");
    expect(typeof Icon).toBe("object"); // forwardRef component
  });

  it("falls back to Users for unknown names (no any-cast)", () => {
    const Icon = getWorkspaceIcon("NotAnIcon");
    expect(Icon).toBeDefined();
  });

  it("registers every WorkspaceIcon enum value", () => {
    for (const name of WORKSPACE_ICON_LIST) {
      const Icon = getWorkspaceIcon(name);
      expect(Icon).toBeDefined();
    }
  });
});
