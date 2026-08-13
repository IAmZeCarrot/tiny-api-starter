import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses safe defaults", () =>
    expect(loadConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3000,
      databasePath: "./data/tiny-api.sqlite",
      logLevel: "info",
      docsEnabled: true,
    }));
  it("can disable interactive documentation", () =>
    expect(loadConfig({ DOCS_ENABLED: "false" }).docsEnabled).toBe(false));
  it("rejects an invalid port", () =>
    expect(() => loadConfig({ PORT: "70000" })).toThrow(
      "Invalid environment configuration",
    ));
});
