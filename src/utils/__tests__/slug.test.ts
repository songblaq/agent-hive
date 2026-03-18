import { describe, it, expect } from "vitest";
import { slugFromPath } from "../slug.js";

describe("slugFromPath", () => {
  it("generates correct slug for standard path", () => {
    const result = slugFromPath("/Users/alice/projects/my-app");
    expect(result.parentSlug).toBe("Users--alice--projects");
    expect(result.projectName).toBe("my-app");
    expect(result.fullSlug).toBe("Users--alice--projects/my-app");
  });

  it("preserves underscore in directory names", () => {
    const result = slugFromPath("/home/alice/dev/my-project");
    expect(result.parentSlug).toBe("home--alice--dev");
    expect(result.projectName).toBe("my-project");
  });

  it("handles deeply nested paths", () => {
    const result = slugFromPath("/home/alice/work/client/dashboard");
    expect(result.parentSlug).toBe("home--alice--work--client");
    expect(result.projectName).toBe("dashboard");
  });

  it("handles root-level project", () => {
    const result = slugFromPath("/myproject");
    expect(result.parentSlug).toBe("");
    expect(result.projectName).toBe("myproject");
  });
});
