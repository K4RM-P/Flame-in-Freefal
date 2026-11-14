import sourcesJson from "@/data/sources.json";

export interface Source { id: string; type: string; title: string; url?: string; year?: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const S = sourcesJson as any;
export const SOURCES: Record<string, Source> = Object.fromEntries(Object.entries(S).map(([id, s]: [string, any]) => [id, { id, ...s }]));
export const source = (id: string): Source => SOURCES[id] ?? { id, type: "unknown", title: id };
