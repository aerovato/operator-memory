import { describe, expect, it, vi } from "vitest";
import { register } from "../src/register";

describe("register", () => {
  it("exports a callable scaffold without registering hooks", () => {
    const on = vi.fn();

    expect(register(on)).toBeUndefined();
    expect(on).not.toHaveBeenCalled();
  });
});
