import { expect, it } from "vitest";
import { navigationRequest } from "@/lib/ai/asterNavigation";

it("resolves explicit navigation requests to known internal destinations", () => {
  expect(navigationRequest("Could you take me to the Methods tab?")?.href).toBe("/methods");
  expect(navigationRequest("Open Earth vs. orbit.")?.href).toBe("/evidence#earth-vs-orbit");
  expect(navigationRequest("Show me the test coverage please")?.href).toBe("/evidence#where-evidence-stops");
  expect(navigationRequest("Go to experiment match")?.href).toBe("/evidence#experiment-match");
});

it("leaves research questions and unknown URLs out of navigation", () => {
  expect(navigationRequest("What did NASA validate?")).toBeUndefined();
  expect(navigationRequest("Show me the methods NASA used to study FLEX")).toBeUndefined();
  expect(navigationRequest("Open https://example.com")).toBeUndefined();
});
