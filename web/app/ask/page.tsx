import { AskPanel } from "@/components/AskPanel";

export default function Ask() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold">Ask EmberAtlas</h1>
      <p className="text-sm text-mute">A Claude agent whose tools are the physics models, the verified PSI database and the validation results. Every number is checked against tool outputs before it is shown.</p>
      <AskPanel />
    </div>
  );
}
