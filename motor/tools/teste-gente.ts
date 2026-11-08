import { poseGente, posicaoGente } from "../src/v3d/gente";
const g: any = { acao: "explicando", pose: [[0.4, {}], [1, { "ombroE.x": -1.1, "cotoveloE.x": -0.4, "maos": 0.2 }]], ant: { acao: "comemorando", pose: {}, x: 0, rot: 0, dur: 3.4, mover: true } };
const dur = 4.8;
const rows: string[] = [];
for (let f = 0; f <= 150; f += 6) {
  const t = f / 30, p = t / dur;
  const r = poseGente(g, { p, t, tAbs: 10 + t });
  const q = posicaoGente({ ...g, ant: { ...g.ant, x: 1 } }, t, { x: 2, y: 0, z: 0, rot: 1 });
  rows.push(`t=${t.toFixed(2)} p=${p.toFixed(2)} ombroE.x=${r.pose["ombroE.x"]!.toFixed(2)} ombroD.z=${r.pose["ombroD.z"]!.toFixed(2)} cotE.x=${r.pose["cotoveloE.x"]!.toFixed(2)} maos=${r.pose["maos"]!.toFixed(2)} x=${q.x.toFixed(2)}`);
}
console.log(rows.join("\n"));
