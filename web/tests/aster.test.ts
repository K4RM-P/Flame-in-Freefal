import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/aster/route";
import { openaiClient } from "@/lib/ai/client";

vi.mock("@/lib/ai/client", () => ({ model: () => "test-model", openaiClient: vi.fn() }));

const request = () => new Request("http://localhost/api/aster", {
  method: "POST",
  body: JSON.stringify({ question: "What was FLEX?" }),
});
const mockResponse = (sourceIds: string[]) => {
  const create = vi.fn().mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({ answer: "FLEX studies liquid-fuel flammability [PSI-69].", sourceIds }),
  });
  vi.mocked(openaiClient).mockReturnValue({ responses: { create } } as unknown as ReturnType<typeof openaiClient>);
  return create;
};

afterEach(() => vi.resetAllMocks());

describe("Aster research answers", () => {
  it("returns the NASA catalog result without a key", async () => {
    vi.mocked(openaiClient).mockReturnValue(null);
    const result = await (await POST(request())).json();
    expect(result.mode).toBe("catalog");
    expect(result.sources[0].id).toBe("PSI-69");
  });

  it("uses OpenAI with retrieved context and returns canonical source links", async () => {
    const create = mockResponse(["PSI-69"]);
    const result = await (await POST(request())).json();
    expect(result.mode).toBe("openai");
    expect(result.sources.map(({ id }: { id: string }) => id)).toEqual(["PSI-69"]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      store: false,
      input: expect.stringContaining("PSI-69"),
    }), expect.anything());
  });

  it("falls back for an unavailable API or a source outside the retrieved records", async () => {
    mockResponse(["PSI-999"]);
    expect((await (await POST(request())).json()).mode).toBe("catalog");
    mockResponse(["PSI-69"]).mockRejectedValueOnce(new Error("API unavailable"));
    expect((await (await POST(request())).json()).mode).toBe("catalog");
  });
});

it("explains selected website context without requiring a NASA keyword match", async () => {
  const create = vi.fn().mockResolvedValue({ status: "completed", output_text: "This is the cabin energy balance." });
  vi.mocked(openaiClient).mockReturnValue({ responses: { create } } as unknown as ReturnType<typeof openaiClient>);
  const response = await POST(new Request("http://localhost/api/aster", {
    method: "POST",
    body: JSON.stringify({ question: "Explain this formula", context: {
      kind: "formula", label: "HA1", facts: "Cabin energy balance", question: "Explain this formula",
    } }),
  }));
  expect(await response.json()).toEqual({ mode: "openai", answer: "This is the cabin energy balance." });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ input: expect.stringContaining("HA1"), store: false }), expect.anything());
});
