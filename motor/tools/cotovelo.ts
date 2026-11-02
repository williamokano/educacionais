// Teste do rig: o cotovelo não pode "teletransportar" entre quadros seguidos (cinemática inversa que troca de solução).
// Uso (a partir de motor/): npm run teste-rig   → lista, por ação e vista, o maior salto do cotovelo em 20 s a 30 fps.
// Falha (exit 1) se algum salto passar de 40 px; o susto tem um pulo real de ~20 px e passa.
import { NOMES_ACOES, poseDe } from "../src/rig/acoes";

const L = 62; // braço (igual a acoes.ts / Boneco.tsx)
const rad = (a: number) => (a * Math.PI) / 180;
const LIMITE = 40;
let falhou = false;

for (const vista of ["frente", "perfil"] as const) {
  for (const nome of NOMES_ACOES) {
    let ant: number[] | null = null;
    let max = 0;
    for (let i = 0; i < 600; i++) {
      const p = poseDe(nome, i / 30, vista);
      if (!p.bracoFrente || !p.bracoTras) continue;
      // x do cotovelo de cada braço no espaço do boneco
      const xs = vista === "frente"
        ? [47 + Math.sin(rad(p.bracoFrente[0])) * L, -47 - Math.sin(rad(p.bracoTras[0])) * L]
        : [2 + Math.sin(rad(p.bracoFrente[0])) * L, 2 + Math.sin(rad(p.bracoTras[0])) * L];
      if (ant) max = Math.max(max, Math.abs(xs[0] - ant[0]), Math.abs(xs[1] - ant[1]));
      ant = xs;
    }
    const ruim = max > LIMITE;
    falhou ||= ruim;
    if (ruim || process.argv.includes("--tudo")) console.log(`${ruim ? "FALHA" : "ok   "} ${vista.padEnd(6)} ${nome.padEnd(22)} salto máx ${max.toFixed(1)} px`);
  }
}
console.log(falhou ? "\nrig: há ação com salto de cotovelo (veja acima)" : "rig: nenhum salto de cotovelo acima de 40 px (use --tudo para a lista completa)");
process.exit(falhou ? 1 : 0);
