"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MISSIONS } from "@/lib/missions";
import { MATERIALS } from "@/lib/ui/materials";
import { lsSet, useMission } from "@/lib/store";
import { gravityName, psia, sig } from "@/lib/ui/format";
import { spring, press } from "@/lib/ui/motion";

export default function Start() {
  const s = useMission();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const finish = (material?: string) => {
    if (material) s.set({ material });
    const st = useMission.getState();
    lsSet("ea.mission", { preset: st.preset, x_o2: st.x_o2, P_kPa: st.P_kPa, gravity_g: st.gravity_g, flow_cm_s: st.flow_cm_s, V_m3: st.V_m3, material: st.material, role: st.role });
    router.push(`/review?${new URLSearchParams({ m: st.preset, mat: st.material }).toString()}`);
  };
  const skip = () => { s.applyPreset("LunarHabitat"); s.set({ material: "sibal" }); finish(); };
  const Card = ({ title, sub, onClick, testid }: { title: string; sub: string; onClick: () => void; testid?: string }) => (
    <motion.button {...press} onClick={onClick} data-testid={testid} className="w-full border border-line bg-panel p-5 text-left hover:border-mute" style={{ borderRadius: 8 }}>
      <div className="text-[20px] font-medium">{title}</div><div className="num mt-1 text-[13px] text-mute">{sub}</div>
    </motion.button>
  );
  const steps = [
    { q: "Choose a cabin", body: MISSIONS.map((m) => <Card key={m.id} title={m.name} testid={`start-env-${m.id}`} sub={`${Math.round(m.x_o2 * 100)}% O₂ · ${sig(psia(m.P_kPa), 2)} psia · ${gravityName(m.gravity_g)}`} onClick={() => { s.applyPreset(m.id); setStep(1); }} />) },
    { q: "Choose a material", body: MATERIALS.map((m) => <Card key={m.id} title={m.name} sub={m.detail} testid={`start-mat-${m.id}`} onClick={() => finish(m.id)} />) },
  ];
  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col px-6 py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="h-0.5 flex-1 bg-line"><motion.div className="h-0.5 origin-left bg-ink" animate={{ scaleX: (step + 1) / 2 }} transition={spring.default} /></div>
        <span className="num text-[12px] text-mute">{step + 1}/2</span>
        <button className="text-[13px] text-mute underline" onClick={skip} data-testid="skip">Skip (Lunar Habitat · SIBAL)</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring.default} className="space-y-3">
          <h1 className="display mb-6 text-[32px]">{steps[step].q}</h1>
          <div className={`grid gap-3 ${step === 0 ? "sm:grid-cols-2" : ""}`}>{steps[step].body}</div>
          {step > 0 && <button className="mt-4 text-[13px] text-mute underline" onClick={() => setStep(step - 1)}>← Back</button>}
        </motion.div>
      </AnimatePresence>
      <p className="mt-auto pt-10 text-[12px] text-faint">No account. Your choices stay in this browser and in the link.</p>
    </div>
  );
}
