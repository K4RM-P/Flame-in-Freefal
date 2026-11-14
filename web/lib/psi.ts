// Live NASA PSI catalog (physics/pipeline/fetch_psi.py → physics/validate/export.py). Read-only metadata from the PSI API.
import cat from "@/data/psi_catalog.json";

export interface PsiFile { accession: string; file: string; category: string; bytes: number; sha256: string; url: string; fetched_at: string }
export interface PsiEntry {
  accession: string; accession_id: number; group: string; short_name: string; title: string | null; objective: string | null;
  public_release_date: string | null; doi: string | null; psi_url: string; file_count: number; files_listed: boolean; manifest: PsiFile[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = cat as any;
export const PSI_FETCHED_AT: string = C.fetched_at;
export const PSI_API: string = C.api;
export const PSI: Record<string, PsiEntry> = C.investigations;
export const PSI_LIST: PsiEntry[] = Object.values(PSI);
export const psiEntries = (accessions: string[] | undefined): PsiEntry[] => (accessions ?? []).map((a) => PSI[a]).filter(Boolean);
