// Port of emberphys/flame_temp.py (BS1, BS2).
import { fuel, v, type Atm } from "./data";
import { cpMassMix, moleToMass, stoichS } from "./thermo";

export const zSt = (yO: number, s: number, yF0 = 1) => yO / (s * yF0 + yO);

export function flameTemperature(fuelName: string, x: Atm, Tinf: number, Tv?: number, fT = 1, dHc?: number): number {
  const f = fuel(fuelName);
  const s = stoichS(f.formula);
  const q = dHc ?? v(f, "dHc");
  const tv = Tv ?? Number((f.T_boil ?? f.T_v).value);
  const z = zSt(moleToMass(x).O2, s);
  let Tf = Tinf + 1500;
  for (let i = 0; i < 30; i++) {
    const cp = cpMassMix(x, 0.5 * (Tinf + Tf));
    const nw = Tinf + z * (tv - Tinf) + (z * q) / cp;
    if (Math.abs(nw - Tf) < 1e-10) { Tf = nw; break; }
    Tf = nw;
  }
  return Tinf + fT * (Tf - Tinf);
}
