// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { loadReviewData } from "@/lib/contracts/server";
import { ReviewScreen } from "./ReviewScreen";

export const dynamic = "force-static";

export default function ReviewPage() {
  const data = loadReviewData();
  return <ReviewScreen data={data} />;
}
