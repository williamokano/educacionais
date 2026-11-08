import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, suave, valor } from "../../../src/v3d/anima";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Anterior, poseGente, posicaoGente } from "../../../src/v3d/gente";
import { Boneco3D, piscar } from "../../../src/v3d/personagem";
import { Caixa, rnd } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Expressao3D, Pose3D, V3, Valor } from "../../../src/v3d/tipos";
import { Etiqueta, Fumaca, Halo, Liga, mistura, Seta, Texto3D, V } from "./cozinha-base";
import { Ambiente, CY, Fogao, POT_POS, RelogioParede, XS, Z_FRENTE, Z_PAREDE } from "./cozinha-fogao";
import { Chama } from "./cozinha-forno";
import { LinhasZoom, Lupa } from "./microondas-pecas";
import { zeca } from "./zeca";

// Panela de pressão (episódio 13, "como montar uma panela que cozinha feijão em minutos"). Cozinha dos episódios 9–11 (fogão a gás, bancada) em escala real,
// com teto (que fura) e uma vinheta de 1679 em x = 40. REGRA: o nome "panela de pressão" só aparece na batida 15.
// A panela é desenhada num sistema local (origem = centro da base, raio 0,3, altura 0,4; a tampa sobe até 0,51) e posta na boca do fogão com a escala PE.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   fogo       gas 0..1,6 (chama azul) · botao não existe aqui
//   panela     panela 0..1 (aparece) · corte: true (meia-cana: vê a água e o feijão) · tampa 0..1 (1 = fechada; 0 = erguida ao lado) · treme 0..1 · estufa 0..1
//              boomP (progresso da batida em que a explosão começa) · boomOff (s já passados, para continuar na batida seguinte): tampa + jato de feijão da panela, teto fura, chuva · vapor 0..1 (setas de vapor pelas frestas) · fumaca 0..1 (vapor subindo) · raiox 0..1 (tampa transparente)
//   água       quente 0..1 · bolhas 0..1 · feijao 0..1 (0 duro e escuro; 1 mole e claro) · pressao 0..1 (setas de dentro para fora)
//   peças      borracha 0..1 (aro; cai na borda) · peso 0..1 (furo + peso) · pesoUp 0..1 (peso levanta) · chia 0..1 (vapor sai pelo peso) · entope 0..1 (grão no furo)
//              reserva 0..1 (plugue verde) · resUp 0..1 (abre) · trava 0..1 (pino) · travaUp 0..1 (pino sobe e prende) · destaque 0..1 (peças piscam, uma a uma)
//   medidores  termo 0..1 + temp (°C) · manOn 0..1 + manV 0..1 (ponteiro de pressão: verde, amarelo, vermelho) · relogio 0..1 + relogioV (voltas/s)
//   lupa       lupa 0..1 · lupaX, lupaY, lupaR · lupaModo "bolhas" | "feijao" | "tampa" · bolhaSobe 0..1 · colher 0..1
//   teto       (o buraco do teto vem da explosão) · prato 0..1 (feijão servido)
//   1679       epoca: true · bulge 0..1 (a panela de ferro estufa) · estoura 0..1 (a tampa e meia panela voam de lado)
//   fim        interroga 0..1 · geladeira 0..1
//   v2 (04/11/2026): vidro: true (panela translúcida inteira: água, feijão e bolhas em 3D) · nivel 0..1 (água, fração da altura) · nivelMax 0..1 (linha de 2/3) · espuma 0..1 · xis 0..1 (X vermelho)
//              semTampa: true (panela aberta) · semPeso: true (só o furo, sem o pesinho) · pTampa 0..1 (setas vermelhas de pressão na tampa) · janela 0..1 (luz da janela)
//              valvula 0..1 (válvula ampliada em corte) · valvUp (pesinho sobe; aceita lista de [progresso, valor]) · valvOsc · vpino 0..1 + vpinoUp (botão vermelho) · vres 0..1 + vresUp (reserva)
//              valvEntope 0..1 · relogioTxt: lista [progresso, texto]
//   gente      lista de { x, y, z, rot, acao, exp, pose, incl, coberto } (sempre o `zeca`) · etiq: "chave@ini-fim" · etiqS · etiqK · etiqYmax
//              chaves: borracha, pressao, peso, reserva, trava

const n0 = (v: unknown) => v as Valor;
/** Curva por pontos [progresso, valor], com suavização entre eles. */
const curva = (pts: [number, number][], p: number) => {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (p <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], suave(clamp01((p - pts[i - 1][0]) / Math.max(pts[i][0] - pts[i - 1][0], 1e-6))));
  }
  return pts[pts.length - 1][1];
};
const PE = 0.46; // escala da panela (raio 0,138 m)
const R = 0.3;
const H = 0.4;
const PX = POT_POS[0];
const PY = POT_POS[1];
const PZ = POT_POS[2];
const RS = 0.62; // raio da esfera da tampa
const TH = 0.559; // abertura da calota
const YC = H + 0.015 - RS * Math.cos(TH); // centro da esfera da tampa
const yTampa = (x: number) => YC + Math.sqrt(RS * RS - x * x); // altura da tampa em x (local)
const X_PESO = 0.08;
const X_RES = 0.2;
const X_TRAVA = -0.285;
const P = (x: number, y: number, z = 0): V => [PX + x * PE, PY + y * PE, PZ + z * PE]; // ponto local da panela no mundo
const FERRO = "#2c2c31";
const VPOS: V = [PX + 0.5, 1.4, PZ + 0.15]; // válvula ampliada ao lado da panela

/* ---------- peças da panela ---------- */

type Pote = {
  corte: boolean; tampa: number; treme: number; estufa: number; voo: number; borracha: number; peso: number; pesoUp: number; chia: number; entope: number;
  reserva: number; resUp: number; trava: number; travaUp: number; raiox: number; destaque: number; quente: number; bolhas: number; feijao: number;
  t: number; tAbs: number; colherPote: number;
  vidro: boolean; nivel: number; nivelMax: number; espuma: number; semTampa: boolean; semPeso: boolean;
};

const Feijoes: React.FC<{ feijao: number; sobre?: boolean; disco?: boolean }> = ({ feijao, disco }) => {
  const cor = mistura("#4a2c16", "#c9a26b", feijao);
  const r = lerp(0.02, 0.03, feijao);
  const ach = lerp(1, 0.6, feijao);
  return (
    <group>
      {Array.from({ length: disco ? 44 : 26 }).map((_, i) => {
        const x = (rnd(i + 2) - 0.5) * 0.46;
        const y = 0.025 + rnd(i + 30) * 0.075 * (1 - Math.abs(x) * 1.3);
        const zz = disco ? (rnd(i + 8) - 0.5) * 0.44 * Math.sqrt(Math.max(0, 1 - (x / 0.26) ** 2)) : 0.012 - rnd(i + 8) * 0.07;
        return (
          <mesh key={i} position={[x, y, zz]} scale={[1.25, ach, 0.9]} rotation={[rnd(i) * 3, rnd(i + 4) * 3, rnd(i + 9) * 3]}>
            <sphereGeometry args={[r * (0.85 + rnd(i + 12) * 0.3), 8, 6]} />
            <meshStandardMaterial color={cor} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

const Corpo: React.FC<{ o: Pote }> = ({ o }) => {
  const nivel = o.vidro ? o.nivel * H : 0.2;
  const agua = mistura("#7fb8e8", "#e9a070", o.quente * 0.6);
  const lado = (
    <>
      {[-1, 1].map((s) => <Caixa key={s} p={[s * (R + 0.1), H - 0.07, 0]} t={[0.24, 0.05, 0.08]} cor="#26282d" raio={0.02} sombra={false} />)}
    </>
  );
  if (o.vidro) {
    const hh = Math.max(nivel, 0.02);
    return (
      <group>
        <mesh position={[0, H / 2, 0]} renderOrder={4}><cylinderGeometry args={[R, R * 0.93, H, 36, 1, true]} /><meshStandardMaterial color="#d7ecf8" transparent opacity={0.2} roughness={0.08} metalness={0.15} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.93, 32]} /><meshStandardMaterial color="#8d949e" metalness={0.5} roughness={0.5} /></mesh>
        <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 40]} /><meshStandardMaterial color="#dfe3e8" metalness={0.8} roughness={0.25} /></mesh>
        {lado}
        <mesh position={[0, hh / 2 + 0.008, 0]} renderOrder={3}><cylinderGeometry args={[R * 0.97, R * 0.92, hh, 32]} /><meshStandardMaterial color={agua} roughness={0.15} transparent opacity={0.6} depthWrite={false} /></mesh>
        <mesh position={[0, hh + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.97, 32]} /><meshStandardMaterial color={mistura(agua, "#ffffff", 0.35)} roughness={0.1} transparent opacity={0.8} /></mesh>
        <Feijoes feijao={o.feijao} disco />
        {o.bolhas > 0.02 && Array.from({ length: 26 }).map((_, i) => {
          const u = (o.tAbs * (0.7 + rnd(i + 40) * 0.9) + rnd(i + 70)) % 1;
          const a = rnd(i + 5) * Math.PI * 2;
          const rr = Math.sqrt(rnd(i + 11)) * R * 0.8;
          const r = (0.016 + 0.026 * u) * (0.6 + 0.4 * o.bolhas);
          return <mesh key={i} position={[Math.cos(a) * rr, 0.06 + u * Math.max(hh - 0.05, 0.02), Math.sin(a) * rr]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color="#fffbe6" transparent opacity={0.8 * o.bolhas * Math.min(1, u * 4)} roughness={0.2} /></mesh>;
        })}
        {o.espuma > 0.02 && Array.from({ length: 22 }).map((_, i) => {
          const a = rnd(i + 3) * Math.PI * 2;
          const rr = Math.sqrt(rnd(i + 17)) * R * 0.85;
          const y = hh + o.espuma * (H - hh) * (0.55 + 0.45 * rnd(i + 9)) + 0.01 * Math.sin(o.tAbs * 5 + i);
          return <mesh key={i} position={[Math.cos(a) * rr, y, Math.sin(a) * rr]}><sphereGeometry args={[0.035 + 0.02 * rnd(i + 2), 8, 6]} /><meshStandardMaterial color="#f3ecd8" roughness={0.6} /></mesh>;
        })}
        {o.nivelMax > 0.02 && (
          <mesh position={[0, (2 / 3) * H, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={suave(o.nivelMax)}><torusGeometry args={[R * 0.99, 0.008, 6, 40]} /><meshBasicMaterial color="#3ed36f" /></mesh>
        )}
      </group>
    );
  }
  if (!o.corte) {
    return (
      <group>
        <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R, R * 0.93, H, 32]} /><meshStandardMaterial color="#c9ced6" metalness={0.75} roughness={0.3} /></mesh>
        <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 36]} /><meshStandardMaterial color="#dfe3e8" metalness={0.8} roughness={0.25} /></mesh>
        {lado}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R, R * 0.93, H, 32, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#b4bbc4" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[R * 0.93, 28, 0, Math.PI]} /><meshStandardMaterial color="#6d737d" metalness={0.6} roughness={0.45} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.02, 8, 36, Math.PI]} /><meshStandardMaterial color="#dfe3e8" metalness={0.8} roughness={0.25} /></mesh>
      {lado}
      {/* água: parede de trás, face do corte, superfície, feijão e bolhas */}
      <mesh position={[0, nivel / 2 + 0.01, 0]}><cylinderGeometry args={[R * 0.97, R * 0.91, nivel, 28, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color={agua} roughness={0.2} side={THREE.DoubleSide} /></mesh>
      <Feijoes feijao={o.feijao} />
      {o.colherPote > 0.02 && (
        <group position={[0.06, lerp(0.22, 0.075, suave(o.colherPote) * o.feijao + (1 - o.feijao) * 0.1 * suave(o.colherPote)), 0.03]} rotation={[0, 0, -0.18]}>
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.03, 0.2, 0.014]} /><meshStandardMaterial color="#cfd5dc" metalness={0.8} roughness={0.3} /></mesh>
          <mesh scale={[1, 0.6, 0.5]}><sphereGeometry args={[0.055, 14, 10]} /><meshStandardMaterial color="#e5e9ee" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      )}
      <mesh position={[0, nivel / 2 + 0.01, 0.002]} renderOrder={2}><planeGeometry args={[R * 1.9, nivel]} /><meshStandardMaterial color={agua} roughness={0.15} transparent opacity={0.5} depthWrite={false} /></mesh>
      <mesh position={[0, nivel + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R * 0.97, 28, 0, Math.PI]} /><meshStandardMaterial color={mistura(agua, "#ffffff", 0.35)} roughness={0.1} /></mesh>
      {o.bolhas > 0.02 && Array.from({ length: 18 }).map((_, i) => {
        const u = (o.tAbs * (0.8 + rnd(i + 40) * 0.8) + rnd(i + 70)) % 1;
        const x = (rnd(i + 11) - 0.5) * R * 1.4;
        const r = (0.018 + 0.03 * u) * (0.6 + 0.4 * o.bolhas);
        return <mesh key={i} position={[x, 0.08 + u * (nivel - 0.07), -0.02 - rnd(i + 3) * 0.12]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color="#fffbe6" transparent opacity={0.75 * o.bolhas * Math.min(1, u * 4)} roughness={0.2} /></mesh>;
      })}
    </group>
  );
};

/** Pesinho de verdade: sinetinha torneada (tronco de cone, topo abaulado, parede grossa, oca por baixo) com DOIS furos pequenos nas laterais opostas.
 *  Origem na borda de baixo. `corte` = meia casca (a cavidade aparece, aberta para +z). `vapor` 0..1 = puffs saindo pelos dois furos laterais. */
const PESO_H = 0.062;
const PESO_RB = 0.05;
const PESO_RT = 0.032;
const PESO_AL = 1.3; // azimute dos furos (rad, a partir do eixo z): quase nas laterais opostas, ainda visíveis de frente
const rPeso = (y: number) => lerp(PESO_RB, PESO_RT, Math.pow(clamp01(y / PESO_H), 0.85));
const PesoSino: React.FC<{ S?: number; corte?: boolean; vapor?: number; t: number; cor?: string; mat?: (c: string) => React.ReactNode }> = ({ S = 1, corte = false, vapor = 0, t, cor = "#2a2c32", mat }) => {
  const geo = useMemo(() => {
    const h = PESO_H;
    const pts: THREE.Vector2[] = [[0.038, 0], [PESO_RB, 0], [rPeso(h * 0.35), h * 0.35], [rPeso(h * 0.7), h * 0.7], [PESO_RT, h], [PESO_RT * 0.82, h + 0.004], [PESO_RT * 0.5, h + 0.0075], [0, h + 0.009],
      [0, h - 0.012], [0.02, h - 0.012], [0.027, h * 0.55], [0.038, 0]].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 28, corte ? Math.PI / 2 : 0, corte ? Math.PI : Math.PI * 2);
  }, [corte]);
  const yh = 0.03;
  const rh = rPeso(yh);
  const inc = Math.atan((PESO_RB - PESO_RT) / PESO_H);
  const lados = [1, -1].map((s) => (corte ? Math.PI - s * 0.9 : s * PESO_AL));
  return (
    <group scale={S}>
      <mesh geometry={geo}>{mat ? mat(cor) : <meshStandardMaterial color={cor} metalness={0.15} roughness={0.7} side={THREE.DoubleSide} />}</mesh>
      {lados.map((az, k) => (
        <group key={k} rotation={[0, az, 0]}>
          <group position={[0, yh, rh + 0.0008]} rotation={[-inc, 0, 0]}>
            <mesh><ringGeometry args={[0.0066, 0.0098, 20]} /><meshBasicMaterial color="#8d939c" side={THREE.DoubleSide} /></mesh>
            <mesh position={[0, 0, 0.0004]}><circleGeometry args={[0.0066, 20]} /><meshBasicMaterial color="#020203" side={THREE.DoubleSide} /></mesh>
          </group>
        </group>
      ))}
      {vapor > 0.02 && lados.map((az, k) => {
        const nx = Math.sin(az);
        const nz = Math.cos(az);
        return Array.from({ length: 5 }).map((_, i) => {
          const u = (t * 1.4 + rnd(i * 3 + k * 11 + 2)) % 1;
          const d = rh + 0.004 + u * 0.075;
          const alfa = vapor * (1 - u) * Math.min(1, u * 7);
          return <mesh key={`${k}-${i}`} position={[nx * d, yh + 0.004 + u * 0.04 + (rnd(i + k) - 0.5) * 0.006, nz * d]} scale={0.007 + u * 0.026}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9 * alfa} depthWrite={false} /></mesh>;
        });
      })}
    </group>
  );
};

/** Tampa com as peças: aro de borracha (na borda, fora da tampa), furo e peso, plugue de reserva, pino de trava. */
const Tampa: React.FC<{ o: Pote }> = ({ o }) => {
  if (o.semTampa) return null;
  const e = suave(o.tampa);
  const sac = Math.sin(o.tAbs * 46) * o.treme;
  const estufa = 1 + 0.16 * o.estufa;
  const op = 1 - 0.78 * o.raiox;
  const trans = op < 0.99;
  const voo = o.voo; // subida local da tampa (explosão)
  // tampa erguida e inclinada ao lado (tampa 0) · fechada (1) · dispara pelo teto (voo)
  const pos: V = [(1 - e) * 1.0 + sac * 0.012, (1 - e) * 0.75 + voo, sac * 0.006];
  const rz = (1 - e) * 0.45 + (voo > 0 ? Math.sin(o.tAbs * 23) * 0.12 : 0);
  const rx = voo > 0 ? Math.sin(o.tAbs * 17) * 0.1 : 0;
  const fatia = o.corte ? Math.PI : Math.PI * 2;
  const fase = o.corte ? Math.PI : 0;
  const yv = yTampa(X_PESO);
  const yr = yTampa(X_RES);
  const yt = yTampa(X_TRAVA);
  const destaque = (i: number) => {
    const k = o.destaque * 4 - i;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
  };
  const mat = (cor: string, met = 0.7, rug = 0.3) => <meshStandardMaterial color={cor} metalness={met} roughness={rug} transparent={trans} opacity={op} depthWrite={!trans} side={THREE.DoubleSide} />;
  return (
    <group>
      {/* aro de borracha: cai do alto e assenta na borda (fica na panela, não sobe com a tampa) */}
      {o.borracha > 0.02 && (
        <group position={[0, H + 0.004 + (1 - suave(o.borracha)) * 0.5, 0]} scale={[estufa, 1, estufa]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R + 0.004, 0.024, 10, 40, o.corte ? Math.PI : Math.PI * 2]} /><meshStandardMaterial color="#e8453a" roughness={0.55} /></mesh>
        </group>
      )}
      <group position={pos} rotation={[rx, 0, rz]} visible={voo < 6.5}>
        <group scale={[estufa, 1 + 0.1 * o.estufa, estufa]}>
          <mesh position={[0, YC, 0]}><sphereGeometry args={[RS, 40, 14, fase, fatia, 0, TH]} />{mat("#c0c6ce")}</mesh>
          <mesh position={[0, H + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[R + 0.03, 0.016, 8, 36, fatia]} />{mat("#e3e7ec", 0.8, 0.25)}</mesh>
        </group>
        {[-1, 1].map((s) => s < 0 ? <Caixa key={s} p={[s * (R + 0.2), H + 0.03, 0]} t={[0.2, 0.04, 0.08]} cor="#26282d" raio={0.015} sombra={false} /> : null)}
        {/* furo e peso */}
        {o.peso > 0.02 && (
          <group position={[X_PESO, yv, 0]} scale={suave(o.peso)}>
            <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.02, 0.028, 0.04, 14]} />{mat("#8b929c")}</mesh>
            <mesh position={[0, 0.0415, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.013, 14]} /><meshBasicMaterial color="#0d0e10" /></mesh>
            <group position={[Math.sin(o.tAbs * 40) * 0.004 * o.pesoUp, 0.004 + o.pesoUp * 0.05, 0]} rotation={[0, 0, Math.sin(o.tAbs * 31) * 0.07 * o.pesoUp]} visible={!o.semPeso}>
              <PesoSino corte={o.corte} t={o.tAbs} vapor={Math.max(o.chia, clamp01((o.pesoUp - 0.3) * 1.5))} />
            </group>
            {o.entope > 0.02 && <mesh position={[0, 0.04 + 0.1 * (1 - suave(o.entope)), 0.012]} scale={[1.2, 0.9, 1]}><sphereGeometry args={[0.016, 8, 6]} /><meshStandardMaterial color="#7d8087" roughness={0.7} /></mesh>}
          </group>
        )}
        {/* reserva (verde) */}
        {o.reserva > 0.02 && (
          <group position={[X_RES, yr, 0]} scale={suave(o.reserva)}>
            <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.03, 0.036, 0.03, 14]} />{mat("#8b929c")}</mesh>
            <mesh position={[0, 0.04 + o.resUp * 0.045, 0]}><cylinderGeometry args={[0.02, 0.02, 0.04, 14]} />{mat("#3ed36f", 0.3, 0.4)}</mesh>
            <mesh position={[0, 0.065 + o.resUp * 0.045, 0]}><sphereGeometry args={[0.026, 12, 8]} />{mat("#3ed36f", 0.3, 0.4)}</mesh>
          </group>
        )}
        {/* trava: o pino sobe pela luva e prende a tampa à borda */}
        {o.trava > 0.02 && (
          <group position={[X_TRAVA, yt, 0]} scale={suave(o.trava)}>
            <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.03, 0.036, 0.04, 14]} />{mat("#8b929c")}</mesh>
            <mesh position={[0, -0.01 + o.travaUp * 0.07, 0]}><cylinderGeometry args={[0.016, 0.016, 0.1, 12]} />{mat("#e0302a", 0.3, 0.35)}</mesh>
            <mesh position={[0, 0.045 + o.travaUp * 0.07, 0]}><sphereGeometry args={[0.024, 12, 8]} />{mat("#e0302a", 0.3, 0.35)}</mesh>
          </group>
        )}
      </group>
      {/* brilhos das peças, sem acompanhar o voo */}
      {o.destaque > 0.001 && (
        <group>
          <Halo p={[0, H, R + 0.02]} r={0.2} cor="#ff7a6a" op={0.95 * destaque(0)} />
          <Halo p={[X_PESO, yv + 0.07, 0.03]} r={0.18} cor="#ffe9a8" op={0.95 * destaque(1)} />
          <Halo p={[X_RES, yr + 0.06, 0.03]} r={0.16} cor="#7dffa8" op={0.95 * destaque(2)} />
          <Halo p={[X_TRAVA, yt + 0.06, 0.03]} r={0.16} cor="#ff8f84" op={0.95 * destaque(3)} />
        </group>
      )}
    </group>
  );
};

/* ---------- medidores ---------- */

const Termometro: React.FC<{ p: V; k: number; temp: number }> = ({ p, k, temp }) => {
  if (k <= 0.02) return null;
  const alt = 0.58;
  const f = clamp01((temp - 20) / 110);
  const marcas = [20, 40, 60, 80, 100, 120];
  const y100 = ((100 - 20) / 110) * alt;
  return (
    <group position={p} scale={suave(k)}>
      <mesh position={[0, alt / 2, 0]}><boxGeometry args={[0.06, alt + 0.04, 0.03]} /><meshStandardMaterial color="#f4f1ea" roughness={0.3} transparent opacity={0.92} /></mesh>
      <mesh position={[0, -0.02, 0]}><sphereGeometry args={[0.052, 16, 12]} /><meshStandardMaterial color="#e03a2a" roughness={0.3} emissive="#a01408" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, (alt * f) / 2, 0.018]}><boxGeometry args={[0.022, Math.max(alt * f, 0.01), 0.012]} /><meshStandardMaterial color="#e03a2a" emissive="#a01408" emissiveIntensity={0.5} /></mesh>
      {marcas.map((m) => {
        const y = ((m - 20) / 110) * alt;
        return <mesh key={m} position={[0.045, y, 0.016]}><boxGeometry args={[m === 100 ? 0.07 : 0.035, m === 100 ? 0.012 : 0.006, 0.01]} /><meshBasicMaterial color={m === 100 ? "#ffcf1f" : "#5a6270"} /></mesh>;
      })}
      <Texto3D texto="100" p={[0.17, y100, 0.05]} h={0.06} cor="#ffcf1f" />
    </group>
  );
};

const arcoAnel = (a: number, b: number, cor: string) => {
  // ponteiro: v = 0 aponta -120° (esquerda-baixo), v = 1 aponta +120° (direita-baixo); o ângulo cresce no sentido horário a partir de +y
  const fa = (-120 + 240 * a) * (Math.PI / 180);
  const fb = (-120 + 240 * b) * (Math.PI / 180);
  return (
    <mesh position={[0, 0, 0.026]}>
      <ringGeometry args={[0.075, 0.1, 20, 1, Math.PI / 2 - fb, fb - fa]} />
      <meshBasicMaterial color={cor} />
    </mesh>
  );
};

const Manometro: React.FC<{ p: V; k: number; v: number }> = ({ p, k, v }) => {
  if (k <= 0.02) return null;
  const ph = (-120 + 240 * v) * (Math.PI / 180);
  return (
    <group position={p} scale={suave(k) * 0.95}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.04, 28]} /><meshStandardMaterial color="#2a2d33" roughness={0.4} metalness={0.4} /></mesh>
      <mesh position={[0, 0, 0.022]}><circleGeometry args={[0.125, 28]} /><meshBasicMaterial color="#f4f1ea" /></mesh>
      {arcoAnel(0, 0.55, "#3ed36f")}
      {arcoAnel(0.55, 0.78, "#ffcf1f")}
      {arcoAnel(0.78, 1, "#e03a2a")}
      <group position={[0, 0, 0.03]} rotation={[0, 0, -ph]}>
        <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.012, 0.09, 0.006]} /><meshBasicMaterial color="#1a1c20" /></mesh>
      </group>
      <mesh position={[0, 0, 0.034]}><circleGeometry args={[0.014, 12]} /><meshBasicMaterial color="#1a1c20" /></mesh>
    </group>
  );
};

/* ---------- lupa ---------- */

const LupaBolhas: React.FC<{ r: number; sobe: number; t: number }> = ({ r, sobe, t }) => (
  <group>
    <mesh position={[0, -r * 0.42, 0.02]}><planeGeometry args={[r * 1.8, r * 0.84]} /><meshBasicMaterial color="#9fcdf2" /></mesh>
    <mesh position={[0, 0.0, 0.025]}><planeGeometry args={[r * 1.8, r * 0.025]} /><meshBasicMaterial color="#ffffff" /></mesh>
    {[-0.5, -0.17, 0.17, 0.5].map((dx, i) => <Seta key={i} a={[dx * r, r * 0.8, 0.05]} b={[dx * r, r * (0.2 + 0.05 * Math.sin(t * 6 + i)), 0.05]} cor="#ff8a2a" w={0.02} />)}
    {[-0.55, -0.28, 0, 0.28, 0.55].map((dx, i) => {
      const preso = sobe < 0.5;
      const u = (t * (0.7 + 0.1 * i) + i * 0.27) % 1;
      const y = preso ? -r * 0.62 + r * 0.06 * Math.sin(t * 9 + i * 2) : -r * 0.6 + u * r * 0.58;
      const raio = (preso ? 0.07 : 0.05 + 0.04 * u) * r;
      return <mesh key={i} position={[dx * r, y, 0.04]} scale={[1, preso ? 0.7 : 1, 1]}><sphereGeometry args={[raio, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>;
    })}
    <mesh position={[0, -r * 0.88, 0.04]} scale={[1, 0.6 + 0.9 * sobe, 1]}><coneGeometry args={[r * 0.24, r * 0.32, 8]} /><meshBasicMaterial color={mistura("#4a90e0", "#ff6a1a", sobe)} /></mesh>
  </group>
);

const LupaFeijao: React.FC<{ r: number; feijao: number; colher: number }> = ({ r, feijao, colher }) => {
  const cor = mistura("#4a2c16", "#c9a26b", feijao);
  const tam = lerp(0.1, 0.15, feijao) * r;
  const entra = suave(colher);
  return (
    <group>
      <mesh position={[0, -r * 0.55, 0.02]}><planeGeometry args={[r * 1.8, r * 0.7]} /><meshBasicMaterial color="#cfe5f7" /></mesh>
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (-0.8 + (i % 6) * 0.32 + (rnd(i) - 0.5) * 0.1) * r * 0.9;
        const lin = Math.floor(i / 6);
        const y = -r * 0.82 + lin * tam * 1.3 + (rnd(i + 5) - 0.5) * 0.03;
        return <mesh key={i} position={[x, y, 0.04]} scale={[1.25, lerp(1, 0.6, feijao), 0.8]} rotation={[0, 0, rnd(i + 9) * 3]}><sphereGeometry args={[tam, 10, 8]} /><meshBasicMaterial color={cor} /></mesh>;
      })}
      {/* colher: duro não deixa entrar; mole deixa afundar */}
      <group position={[r * 0.12, r * (0.55 - 0.78 * entra * feijao - 0.05 * entra * (1 - feijao)), 0.07]} rotation={[0, 0, -0.35]}>
        <mesh position={[0, r * 0.62, 0]}><boxGeometry args={[r * 0.07, r * 1.2, 0.02]} /><meshBasicMaterial color="#cfd5dc" /></mesh>
        <mesh scale={[1, 0.55, 0.5]}><sphereGeometry args={[r * 0.2, 14, 10]} /><meshBasicMaterial color="#e5e9ee" /></mesh>
        {feijao < 0.5 && [-0.08, 0, 0.08].map((dx, i) => <mesh key={i} position={[dx * r, r * 0.06, 0.03]} scale={[1.2, 0.9, 1]}><sphereGeometry args={[tam * 0.9, 8, 6]} /><meshBasicMaterial color={cor} /></mesh>)}
      </group>
    </group>
  );
};

const LupaTampa: React.FC<{ r: number; o: Pote; reserva: boolean; chia: number; t: number }> = ({ r, o, reserva, chia, t }) => {
  const xv = reserva ? -0.38 * r : 0;
  const xr = 0.4 * r;
  const lado = (x0: number, x1: number) => <mesh position={[(x0 + x1) / 2, -r * 0.12, 0.03]}><boxGeometry args={[Math.abs(x1 - x0), r * 0.2, 0.03]} /><meshBasicMaterial color="#9aa1ab" /></mesh>;
  const pesoY = r * 0.02 + o.pesoUp * r * 0.2;
  return (
    <group>
      <mesh position={[0, -r * 0.62, 0.02]}><planeGeometry args={[r * 1.8, r * 0.55]} /><meshBasicMaterial color="#cfe5f7" /></mesh>
      {/* tampa em corte, com o furo (e o plugue) */}
      {lado(-r * 0.9, xv - r * 0.1)}
      {reserva ? lado(xv + r * 0.1, xr - r * 0.1) : lado(xv + r * 0.1, r * 0.9)}
      {reserva && lado(xr + r * 0.1, r * 0.9)}
      {/* peso: sinetinha em meia casca (cavidade à mostra) com os furos laterais */}
      <group position={[xv + Math.sin(t * 40) * 0.004 * o.pesoUp, pesoY, 0.14]} rotation={[0, 0, Math.sin(t * 31) * 0.07 * o.pesoUp]}>
        <PesoSino S={r * 5} corte t={t} vapor={Math.max(chia, clamp01((o.pesoUp - 0.3) * 1.5))} />
      </group>
      {o.entope > 0.02 && <mesh position={[xv, -r * 0.1 + r * 0.4 * (1 - suave(o.entope)), 0.07]} scale={[1.2, 0.9, 1]}><sphereGeometry args={[r * 0.1, 10, 8]} /><meshBasicMaterial color="#7d8087" /></mesh>}
      {/* plugue de reserva */}
      {reserva && (
        <group position={[xr, r * 0.04 + o.resUp * r * 0.28, 0.05]}>
          <mesh position={[0, r * 0.1, 0]}><boxGeometry args={[r * 0.16, r * 0.26, 0.04]} /><meshBasicMaterial color="#3ed36f" /></mesh>
          <mesh position={[0, r * 0.26, 0]}><sphereGeometry args={[r * 0.12, 10, 8]} /><meshBasicMaterial color="#3ed36f" /></mesh>
        </group>
      )}
      {/* pressão por baixo e vapor que sai */}
      {(o.entope < 0.5 ? [xv] : []).concat(reserva && o.entope > 0.5 ? [xr] : []).map((x) => <Seta key={x} a={[x, -r * 0.62, 0.06]} b={[x, -r * 0.2, 0.06]} cor="#ff8a2a" w={0.022} />)}
      {reserva && o.entope > 0.5 && <Seta a={[xv, -r * 0.62, 0.06]} b={[xv, -r * 0.3, 0.06]} cor="#ff8a2a" w={0.022} op={0.5} />}
      {false && [-1, 1].map((s) => <Seta key={s} a={[xv + s * r * 0.24, r * 0.2 + o.pesoUp * r * 0.2, 0.06]} b={[xv + s * r * 0.7, r * 0.34 + o.pesoUp * r * 0.2, 0.06]} cor="#8fd0ff" w={0.02} op={chia} />)}
      {reserva && o.resUp > 0.3 && [-1, 1].map((s) => <Seta key={s} a={[xr + s * r * 0.15, r * 0.22 + o.resUp * r * 0.2, 0.06]} b={[xr + s * r * 0.4, r * 0.4 + o.resUp * r * 0.2, 0.06]} cor="#8fd0ff" w={0.02} op={o.resUp} />)}
    </group>
  );
};

/* ---------- pessoa, teto, feijão que cai, prato, geladeira, 1679 ---------- */

type GenteP = { x?: Valor; y?: Valor; z?: Valor; rot?: Valor; acao?: string | [number, string, string?][]; exp?: Expressao3D; pose?: Pose3D | [number, Pose3D][]; incl?: Valor; coberto?: Valor; olha?: V; ant?: Anterior; entradaDur?: number };

const Pessoa: React.FC<{ g: GenteP; p: number; t: number; tAbs: number }> = ({ g, p, t, tAbs }) => {
  const { exp, pose } = poseGente(g, { p, t, tAbs, incl: valor(g.incl, p, 0) });
  const { x, y, z, rot } = posicaoGente(g, t, { x: valor(g.x, p, 0), y: valor(g.y, p, 0), z: valor(g.z, p, 0), rot: valor(g.rot, p, 0) });
  const cob = valor(g.coberto, p, 0);
  const g0 = (j: string) => pose[j] ?? 0;
  const esc = 1.06;
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={esc}>
      <Boneco3D p={zeca} pose={pose} expressao={exp} pisca={piscar(tAbs + x)} boca={0} olhar={[0, 0]} t={tAbs} />
      {cob > 0.02 && (
        <group>
          <group position={[0, 0.635 + g0("quadril.y"), 0]} rotation={[g0("quadril.x"), 0, 0]}>
            <group rotation={[g0("tronco.x"), g0("tronco.y"), g0("tronco.z")]}>
              {Array.from({ length: 16 }).map((_, i) => {
                const e = clamp01(cob * 1.6 - i * 0.05);
                return e > 0 ? <mesh key={i} position={[(rnd(i + 1) - 0.5) * 0.3, 0.05 + rnd(i + 20) * 0.5, 0.09 + rnd(i + 50) * 0.03]} scale={[1.2 * e, e, e]} rotation={[0, 0, rnd(i) * 3]}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color={i % 3 ? "#c9a26b" : "#7a4a24"} roughness={0.6} /></mesh> : null;
              })}
            </group>
          </group>
          {[[-0.09, 1.6, 0.0], [0.08, 1.58, 0.05], [0.0, 1.62, -0.05], [0.14, 1.56, 0.0]].map(([bx, by, bz], i) => <mesh key={i} position={[bx, by, bz]} scale={cob}><sphereGeometry args={[0.028, 8, 6]} /><meshStandardMaterial color="#c9a26b" roughness={0.6} /></mesh>)}
        </group>
      )}
    </group>
  );
};

const YT = 2.43; // face de baixo do teto
const BOCA_Y = PY + H * PE; // boca da panela (mundo)
const TL = 0.4; // s entre o início da explosão e a tampa bater no teto
const SOBE_TAMPA = 2.76; // subida (unidades locais da panela) até o teto

/** Teto: laje inteira; quando a tampa bate (tt > 0) racha em estrela e abre o buraco. */
const Teto: React.FC<{ tt: number }> = ({ tt }) => {
  const Y = 2.5;
  const esp = 0.12;
  const z0 = Z_PAREDE - 0.1;
  const z1 = 4;
  const cor = "#f4ead6";
  const hw = 0.2 * suave(clamp01(tt / 0.12));
  const cx = PX;
  const cz = PZ;
  const rach = clamp01(tt / 0.25);
  return (
    <group>
      {tt <= 0 || hw < 0.012 ? (
        <Caixa p={[0, Y, (z0 + z1) / 2]} t={[14, esp, z1 - z0]} cor={cor} raio={0.01} sombra={false} />
      ) : (
        <group>
          <Caixa p={[(cx - hw - 7) / 2, Y, (z0 + z1) / 2]} t={[cx - hw + 7, esp, z1 - z0]} cor={cor} raio={0.01} sombra={false} />
          <Caixa p={[(cx + hw + 7) / 2, Y, (z0 + z1) / 2]} t={[7 - cx - hw, esp, z1 - z0]} cor={cor} raio={0.01} sombra={false} />
          <Caixa p={[cx, Y, (z0 + cz - hw) / 2]} t={[hw * 2, esp, cz - hw - z0]} cor={cor} raio={0.01} sombra={false} />
          <Caixa p={[cx, Y, (z1 + cz + hw) / 2]} t={[hw * 2, esp, z1 - cz - hw]} cor={cor} raio={0.01} sombra={false} />
          <mesh position={[cx, Y + 0.3, cz]}><boxGeometry args={[hw * 2 + 0.02, 0.4, hw * 2 + 0.02]} /><meshBasicMaterial color="#1a1612" side={THREE.BackSide} /></mesh>
        </group>
      )}
      {/* rachaduras em estrela na face de baixo */}
      {tt > 0 && Array.from({ length: 9 }).map((_, i) => {
        const ang = (i / 9) * Math.PI * 2 + rnd(i + 2) * 0.5;
        const L = (0.25 + rnd(i + 6) * 0.5) * rach;
        const r0 = 0.2 + L / 2;
        return (
          <group key={i} position={[cx + Math.cos(ang) * r0, Y - esp / 2 - 0.004, cz + Math.sin(ang) * r0]} rotation={[0, -ang, 0]}>
            <mesh><boxGeometry args={[L, 0.004, 0.014]} /><meshBasicMaterial color="#4a3f33" /></mesh>
            <mesh position={[L * 0.2, 0, 0.03 * (i % 2 ? 1 : -1)]} rotation={[0, 0.5 * (i % 2 ? 1 : -1), 0]}><boxGeometry args={[L * 0.5, 0.004, 0.01]} /><meshBasicMaterial color="#4a3f33" /></mesh>
          </group>
        );
      })}
      <Caixa p={[0, Y - 0.07, Z_PAREDE + 0.03]} t={[14, 0.06, 0.1]} cor="#e9dcc0" raio={0.01} sombra={false} />
    </group>
  );
};

/** posição de uma partícula de feijão/caldo: sobe da boca da panela, bate no teto, espalha e cai (de cima para baixo) até a bancada ou o chão. */
const EM = 2.4; // s de jato
const trajeto = (i: number, tau: number) => {
  const t0 = Math.pow(rnd(i + 3), 1.5) * EM;
  const ta = tau - t0;
  if (ta <= 0) return null;
  const vv = (5.0 + rnd(i + 5) * 2.6) * (1 - 0.3 * t0 / EM);
  const vx = (rnd(i + 7) - 0.5) * 3.2;
  const vz = (rnd(i + 9) - 0.4) * 2.4;
  const x0 = PX + (rnd(i + 11) - 0.5) * 0.1;
  const z0 = PZ + (rnd(i + 13) - 0.5) * 0.1;
  const y0 = BOCA_Y;
  const disc = vv * vv - 19.6 * (YT - y0);
  const tc = disc >= 0 ? (vv - Math.sqrt(disc)) / 9.8 : Infinity;
  const aterra = (ys: number, vys: number, ch: number) => (vys + Math.sqrt(vys * vys + 19.6 * (ys - ch))) / 9.8;
  const chaoDe = (z: number) => (z < Z_FRENTE && z > Z_PAREDE ? CY + 0.02 : 0.03);
  let xs = x0, zs = z0, ys = y0, vxs = vx, vzs = vz, vys = vv, tb = ta;
  if (ta >= tc) {
    const vh = vv - 9.8 * tc;
    xs = x0 + vx * tc; zs = z0 + vz * tc; ys = YT; vys = -0.25 * vh;
    vxs = vx * (0.5 + rnd(i + 15) * 1.5) + (rnd(i + 17) - 0.5) * 2.5;
    vzs = vz * (0.5 + rnd(i + 19)) + (rnd(i + 21) - 0.3) * 3;
    tb = ta - tc;
  }
  let ch = 0.03;
  let tL = 0;
  for (let k = 0; k < 3; k++) { tL = aterra(ys, vys, ch); ch = chaoDe(Math.max(Z_PAREDE + 0.03, zs + vzs * tL)); }
  const caiu = tb >= tL;
  const tq = Math.min(tb, tL);
  const z = Math.max(Z_PAREDE + 0.03, zs + vzs * tq);
  const y = caiu ? ch : ys + vys * tq - 4.9 * tq * tq;
  return { x: xs + vxs * tq, y, z, vy: caiu ? 0 : vys - 9.8 * tq, caiu, ang: tq * 5 + i };
};

/** A explosão: jato de feijão, caldo e vapor sai DA PANELA junto com a tampa; a tampa fura o teto; tudo cai como chuva. `tau` = s desde o início. */
const Explosao: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau <= 0) return null;
  const tt = tau - TL;
  const flash = 0.95 * Math.exp(-tau * 5);
  const flashT = tt > 0 ? 0.9 * Math.exp(-tt * 6) : 0;
  return (
    <group>
      <Halo p={[PX, BOCA_Y + 0.1, PZ + 0.2]} r={0.45 + tau * 3} cor="#fff6d8" op={flash} />
      {flashT > 0.02 && <Halo p={[PX, YT - 0.1, PZ + 0.3]} r={0.7 + tt * 3} cor="#ffe9a8" op={flashT} />}
      {/* vapor em coluna, abrindo no teto */}
      {Array.from({ length: 30 }).map((_, i) => {
        const t0 = rnd(i + 40) * 2.2;
        const ta = tau - t0;
        if (ta <= 0) return null;
        const u = ta / 1.9;
        if (u >= 1) return null;
        const vy = 2.4 + rnd(i + 44) * 1.8;
        const y = Math.min(YT - 0.12, BOCA_Y + vy * ta * (1 + 0.6 * (1 - u)));
        const sp = 1 + (y >= YT - 0.13 ? 3 * (ta - (YT - 0.12 - BOCA_Y) / (vy * 1.6)) : 0);
        const x = PX + (rnd(i + 46) - 0.5) * 0.35 * (0.3 + u * 2.5) * Math.max(1, sp);
        const z = PZ + (rnd(i + 48) - 0.3) * 0.35 * (0.3 + u * 2.5) * Math.max(1, sp);
        const r = 0.08 + u * 0.3;
        return <mesh key={i} position={[x, y, z]} scale={r}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8 * (1 - u) * Math.min(1, ta * 8)} depthWrite={false} /></mesh>;
      })}
      {/* feijão e caldo: 170 partículas */}
      {Array.from({ length: 170 }).map((_, i) => {
        const q = trajeto(i, tau);
        if (!q) return null;
        const caldo = i % 4 === 3;
        const veloz = Math.min(1.1, Math.abs(q.vy) / 6);
        const r = caldo ? 0.013 : 0.024;
        return <mesh key={i} position={[q.x, q.y, q.z]} rotation={[q.ang, q.ang * 0.7, 0]} scale={q.caiu ? [1.4, 0.55, 1.1] : [1.25, 0.9 + (caldo ? 1.6 : 0.9) * veloz, 0.9]}><sphereGeometry args={[r, 8, 6]} /><meshStandardMaterial color={caldo ? "#9a5f2e" : i % 3 ? "#c9a26b" : "#7a4a24"} roughness={0.6} /></mesh>;
      })}
      {/* pedaços do teto e poeira, a partir da batida da tampa */}
      {tt > 0 && Array.from({ length: 18 }).map((_, i) => {
        const a = rnd(i + 60) * Math.PI * 2;
        const rr = 0.12 + rnd(i + 62) * 0.16;
        const vyi = rnd(i + 64) * 1.8;
        const vh = 0.4 + rnd(i + 66) * 1.6;
        const sz = 0.03 + rnd(i + 68) * 0.06;
        const x0 = PX + Math.cos(a) * rr;
        const z0 = PZ + Math.sin(a) * rr;
        const ch = 0.03;
        const tL = (vyi + Math.sqrt(vyi * vyi + 19.6 * (YT - ch))) / 9.8;
        const tq = Math.min(tt, tL);
        let z = Math.max(Z_PAREDE + 0.03, z0 + Math.sin(a) * vh * tq);
        const y = tt >= tL ? (z < Z_FRENTE && z > Z_PAREDE ? CY + sz * 0.5 : sz * 0.5) : YT + vyi * tq - 4.9 * tq * tq;
        return <mesh key={i} position={[x0 + Math.cos(a) * vh * tq, y, z]} rotation={[tq * 6 + i, tq * 4, tq * 3]}><boxGeometry args={[sz, sz * 0.5, sz * 0.8]} /><meshStandardMaterial color={i % 2 ? "#f4ead6" : "#d3c6a8"} roughness={0.9} /></mesh>;
      })}
      {tt > 0 && Array.from({ length: 12 }).map((_, i) => {
        const u = tt / (1.4 + rnd(i + 70) * 0.8);
        if (u >= 1) return null;
        const a = rnd(i + 72) * Math.PI * 2;
        const rr = 0.1 + u * (0.3 + rnd(i + 74) * 0.5);
        return <mesh key={i} position={[PX + Math.cos(a) * rr, YT - 0.05 - u * 0.5 * rnd(i + 76), PZ + Math.sin(a) * rr]} scale={0.1 + u * 0.35}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#e8dcc2" transparent opacity={0.7 * (1 - u) * Math.min(1, tt * 10)} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

const Prato: React.FC<{ p: V; k: number }> = ({ p, k }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={suave(k)}>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.13, 0.09, 0.025, 24]} /><meshStandardMaterial color="#f4f1ea" roughness={0.3} /></mesh>
      <mesh position={[0, 0.028, 0]} scale={[1, 0.35, 1]}><sphereGeometry args={[0.095, 16, 10]} /><meshStandardMaterial color="#6a3a1c" roughness={0.45} /></mesh>
      {Array.from({ length: 10 }).map((_, i) => <mesh key={i} position={[(rnd(i) - 0.5) * 0.14, 0.05 + rnd(i + 9) * 0.015, (rnd(i + 4) - 0.5) * 0.14]} scale={[1.2, 0.8, 1]}><sphereGeometry args={[0.015, 8, 6]} /><meshStandardMaterial color="#8b5a2b" roughness={0.4} /></mesh>)}
    </group>
  );
};

// vão na fila de armários onde a geladeira fica em pé no chão, encostada na parede
const VAO: [number, number] = [1.3, 2.06];
const GX = (VAO[0] + VAO[1]) / 2;
const GW = 0.72;
const GD = 0.8;
const GZ = Z_PAREDE + GD / 2 + 0.005; // costas na parede

const Geladeira: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0.02) return null;
  const e = suave(k);
  const zf = GD / 2; // face da porta
  return (
    <group position={[GX, 0, GZ]} scale={[e, e, e]}>
      <Caixa p={[0, 0.045, 0]} t={[GW - 0.04, 0.09, GD - 0.04]} cor="#59606a" raio={0.01} sombra={false} />
      <Caixa p={[0, 0.95, 0]} t={[GW, 1.72, GD]} cor="#eef3f7" raio={0.04} met={0.2} rug={0.35} />
      {/* fresta entre a porta do congelador (em cima) e a da geladeira (embaixo) */}
      <Caixa p={[0, 1.3, zf + 0.002]} t={[GW - 0.02, 0.014, 0.01]} cor="#8d99a6" raio={0.003} />
      {/* puxadores verticais, junto à lateral oposta à dobradiça */}
      <Caixa p={[GW / 2 - 0.07, 1.5, zf + 0.025]} t={[0.025, 0.28, 0.035]} cor="#7e8894" raio={0.01} met={0.6} />
      <Caixa p={[GW / 2 - 0.07, 0.85, zf + 0.025]} t={[0.025, 0.5, 0.035]} cor="#7e8894" raio={0.01} met={0.6} />
    </group>
  );
};

const texturaPedra = () => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6c6358";
  g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      const dx = (y % 2) * 40;
      g.fillStyle = ["#7b7165", "#6a6155", "#847a6c", "#736a5e"][(x * 3 + y * 5) % 4];
      g.fillRect(x * 86 + dx - 40 + 3, y * 43 + 3, 80, 37);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Vinheta de 1679: sala de pedra, mesa, panela de ferro com tampa presa por uma barra; estufa e estoura de lado. */
const Sala1679: React.FC<{ bulge: number; estoura: number; t: number }> = ({ bulge, estoura, t }) => {
  const tex = useMemo(texturaPedra, []);
  const e = estoura * estoura;
  const sac = Math.sin(t * 50) * bulge * (1 - clamp01(estoura * 8)) * 0.004;
  const Rr = 0.15;
  const Hh = 0.2;
  const yb = 0.9; // topo da brasa sobre a mesa
  const fumo = clamp01(estoura * 3);
  return (
    <group position={[40, 0, 0]}>
      <mesh position={[0, 1.5, -1.3]}><planeGeometry args={[9, 3.2]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      <mesh position={[-3.2, 1.5, 0.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3, 3.2]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      <mesh position={[0, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[9, 3]} /><meshStandardMaterial color="#5c544a" roughness={0.95} /></mesh>
      {/* mesa de madeira */}
      <Caixa p={[0, 0.78, -0.1]} t={[1.5, 0.08, 0.8]} cor="#8b5e34" raio={0.015} />
      {[-0.65, 0.65].map((x) => [-0.3, 0.1].map((z) => <Caixa key={`${x}${z}`} p={[x, 0.37, z]} t={[0.08, 0.74, 0.08]} cor="#6e4726" raio={0.01} />))}
      {/* braseiro e fogo */}
      <mesh position={[0, 0.85, -0.1]}><cylinderGeometry args={[0.22, 0.25, 0.08, 20]} /><meshStandardMaterial color="#3a3530" roughness={0.9} /></mesh>
      <mesh position={[0, 0.895, -0.1]}><cylinderGeometry args={[0.2, 0.2, 0.012, 20]} /><meshBasicMaterial color="#ff6a1a" /></mesh>
      <Chama p={[0, 0.9, -0.08]} k={0.7} t={t} esc={0.4} />
      {/* panela de ferro: duas metades, a da direita voa no estouro */}
      <group position={[0, yb + 0.04, -0.1]}>
        <group scale={[1 + 0.12 * bulge, 1, 1 + 0.12 * bulge]} position={[sac, 0, 0]}>
          <mesh position={[0, Hh / 2, 0]}><cylinderGeometry args={[Rr, Rr * 0.9, Hh, 24, 1, false, 0, Math.PI]} /><meshStandardMaterial color={FERRO} metalness={0.5} roughness={0.55} side={THREE.DoubleSide} /></mesh>
          <group position={[e * 1.4, e * 0.6, e * 0.3]} rotation={[0, 0, -e * 2.2]}>
            <mesh position={[0, Hh / 2, 0]}><cylinderGeometry args={[Rr, Rr * 0.9, Hh, 24, 1, false, Math.PI, Math.PI]} /><meshStandardMaterial color={FERRO} metalness={0.5} roughness={0.55} side={THREE.DoubleSide} /></mesh>
          </group>
          <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[Rr * 0.9, 24]} /><meshStandardMaterial color={FERRO} /></mesh>
          {[-1, 1].map((s) => <Caixa key={s} p={[s * (Rr + 0.04), Hh - 0.03, 0]} t={[0.09, 0.04, 0.05]} cor="#1c1c20" raio={0.01} sombra={false} />)}
        </group>
        {/* tampa com a barra por cima, presa nas duas orelhas */}
        <group position={[e * 1.0 + sac, Hh + 0.01 + e * 2.0, e * 0.2]} rotation={[e * 5, 0, e * 6]}>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[Rr * 1.04, Rr * 1.04, 0.04, 24]} /><meshStandardMaterial color="#38383e" metalness={0.5} roughness={0.5} /></mesh>
          <Caixa p={[0, 0.095, 0]} t={[Rr * 2.5, 0.025, 0.04]} cor="#8a8f98" met={0.7} raio={0.008} />
          {[-1, 1].map((s) => <Caixa key={s} p={[s * Rr * 1.1, 0.06, 0]} t={[0.025, 0.09, 0.04]} cor="#8a8f98" met={0.7} raio={0.006} />)}
        </group>
      </group>
      {fumo > 0.02 && <Fumaca p={[0.2, yb + 0.35, -0.1]} t={t} k={fumo} cor="#e8e8e8" alt={0.7} larg={0.5} op={0.8} n={14} />}
      {fumo > 0.02 && <Halo p={[0.1, yb + 0.35, 0.05]} r={0.6} cor="#ffd9a0" op={0.9 * (1 - clamp01(estoura * 2.2 - 0.3))} />}
    </group>
  );
};

/* ---------- v2: válvula ampliada em corte, janela, X ---------- */

type VProps = {
  p: V; k: number; lift: number; t: number; entope: number;
  pino: number; pinoUp: number; res: number; resUp: number;
};

/** Válvula ampliada, vista em corte: tampa com o furo, o pino que sai dele, o pesinho preto (levanta, balança e volta), o botão vermelho e o plugue da reserva. */
const Valvula: React.FC<VProps> = ({ p, k, lift, t, entope, pino, pinoUp, res, resUp }) => {
  if (k <= 0.02) return null;
  const aço = "#aab2bc";
  const escuro = "#1b1d22";
  const subida = 0.012 + lift * 0.1;
  const bal = Math.sin(t * 29) * 0.05 * lift;
  const balX = Math.sin(t * 23 + 1) * 0.006 * lift;
  const pulsa = 0.5 + 0.5 * Math.sin(t * 9);
  const bloqueada = entope > 0.5;
  return (
    <group position={p} scale={suave(k) * 0.75}>
      {/* fundo da lupa */}
      <mesh position={[0, 0.05, -0.12]}><circleGeometry args={[0.58, 40]} /><meshBasicMaterial color="#fff6df" transparent opacity={0.9} /></mesh>
      <mesh position={[0, 0.05, -0.115]}><ringGeometry args={[0.55, 0.585, 40]} /><meshBasicMaterial color="#6d7580" /></mesh>
      {/* interior da panela (vapor) sob a tampa */}
      <mesh position={[0, -0.2, -0.02]}><planeGeometry args={[0.95, 0.24]} /><meshBasicMaterial color="#cfe6f5" transparent opacity={0.55} /></mesh>
      {/* tampa em corte, com o furo no meio */}
      {[-1, 1].map((s0) => <Caixa key={s0} p={[s0 * 0.255, -0.06, 0]} t={[0.37, 0.08, 0.14]} cor={aço} met={0.7} rug={0.3} raio={0.012} sombra={false} />)}
      {/* chaminé do furo (o pino) e o vazio escuro dentro dela */}
      {[-1, 1].map((s0) => <Caixa key={s0} p={[s0 * 0.058, 0.03, 0]} t={[0.026, 0.14, 0.14]} cor="#8b929c" met={0.7} rug={0.3} raio={0.006} sombra={false} />)}
      <mesh position={[0, -0.03, -0.01]}><boxGeometry args={[0.09, 0.28, 0.1]} /><meshBasicMaterial color={escuro} /></mesh>
      {/* pressão subindo pelo furo (setas vermelhas) */}
      {!bloqueada && [-0.025, 0.025].map((x, i) => <Seta key={i} a={[x, -0.3, 0.03]} b={[x, -0.1 + 0.06 * pulsa + lift * 0.05, 0.03]} cor="#ff2d2d" w={0.013} op={0.95} />)}
      {bloqueada && [-0.025, 0.025].map((x, i) => <Seta key={i} a={[x, -0.3, 0.03]} b={[x, -0.14 + 0.02 * pulsa, 0.03]} cor="#ff2d2d" w={0.013} op={0.95} />)}
      {entope > 0.02 && <mesh position={[0, -0.12 + 0.35 * (1 - suave(entope)), 0.02]} scale={[1.25, 0.95, 1]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#8a8d93" roughness={0.7} /></mesh>}
      {/* o pesinho: sinetinha preta (meia casca: a cavidade encaixa na chaminé) com dois furos laterais */}
      <group position={[balX, subida, 0]} rotation={[0, 0, bal]}>
        <PesoSino S={2.5} corte t={t} vapor={lift > 0.12 ? Math.min(1, lift * 3) : 0} />
      </group>
      {/* botão vermelho (indicador/trava): peça própria na tampa, sobe com a pressão */}
      {pino > 0.02 && (
        <group position={[-0.29, 0, 0]} scale={suave(pino)}>
          <Caixa p={[0, 0.045, 0]} t={[0.1, 0.07, 0.14]} cor="#6d747e" met={0.7} rug={0.3} raio={0.01} sombra={false} />
          <mesh position={[0, 0.015 + pinoUp * 0.1, 0]}><cylinderGeometry args={[0.026, 0.026, 0.14, 14]} /><meshStandardMaterial color="#e0302a" roughness={0.35} emissive="#a01408" emissiveIntensity={0.3 + 0.4 * pinoUp} /></mesh>
          <mesh position={[0, 0.095 + pinoUp * 0.1, 0]}><sphereGeometry args={[0.04, 14, 10]} /><meshStandardMaterial color="#ff3b30" roughness={0.3} emissive="#a01408" emissiveIntensity={0.3 + 0.4 * pinoUp} /></mesh>
        </group>
      )}
      {/* plugue verde da reserva */}
      {res > 0.02 && (
        <group position={[0.29, 0, 0]} scale={suave(res)}>
          <Caixa p={[0, 0.045, 0]} t={[0.1, 0.07, 0.14]} cor="#6d747e" met={0.7} rug={0.3} raio={0.01} sombra={false} />
          <mesh position={[0, 0.06 + resUp * 0.08, 0]}><cylinderGeometry args={[0.03, 0.03, 0.08, 14]} /><meshStandardMaterial color="#3ed36f" roughness={0.4} /></mesh>
          <mesh position={[0, 0.115 + resUp * 0.08, 0]}><sphereGeometry args={[0.04, 14, 10]} /><meshStandardMaterial color="#3ed36f" roughness={0.4} /></mesh>
          {resUp > 0.2 && [-1, 1].map((s0) => <Seta key={s0} a={[s0 * 0.05, 0.14 + resUp * 0.06, 0.03]} b={[s0 * 0.2, 0.26 + resUp * 0.06 + 0.02 * pulsa, 0.03]} cor="#cfe9ff" w={0.012} op={resUp} />)}
        </group>
      )}
    </group>
  );
};

/** Janela na parede com luz: brilho que pulsa devagar e poeira flutuando no feixe. */
const Janela: React.FC<{ p: V; t: number; k: number }> = ({ p, t, k }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p}>
      <Caixa p={[0, 0, 0]} t={[0.74, 0.9, 0.05]} cor="#a8743f" raio={0.01} sombra={false} />
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.64, 0.8]} /><meshBasicMaterial color="#bfe4ff" /></mesh>
      <mesh position={[0, 0, 0.035]}><boxGeometry args={[0.03, 0.8, 0.01]} /><meshBasicMaterial color="#a8743f" /></mesh>
      <mesh position={[0, 0, 0.035]}><boxGeometry args={[0.64, 0.03, 0.01]} /><meshBasicMaterial color="#a8743f" /></mesh>
      <Halo p={[0, 0.05, 0.2]} r={0.9} cor="#fff2c4" op={k * (0.32 + 0.08 * Math.sin(t * 0.9))} />
      {Array.from({ length: 9 }).map((_, i) => {
        const u = (t * 0.08 + rnd(i + 5)) % 1;
        return <mesh key={i} position={[(rnd(i) - 0.5) * 0.9 + Math.sin(t * 0.7 + i) * 0.05, 0.3 - u * 0.9, 0.2 + rnd(i + 2) * 0.4]} scale={0.008}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#fff8e0" transparent opacity={0.6 * Math.sin(u * Math.PI)} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/** X vermelho grande (no ar, de frente para a câmera). */
const Xis: React.FC<{ p: V; k: number; s?: number }> = ({ p, k, s = 0.3 }) => {
  if (k <= 0.02) return null;
  return (
    <group position={p} scale={suave(k)}>
      {[0.785, -0.785].map((a) => (
        <mesh key={a} rotation={[0, 0, a]}><boxGeometry args={[s * 0.22, s * 1.5, 0.02]} /><meshBasicMaterial color="#ff2d2d" /></mesh>
      ))}
    </group>
  );
};

/* ---------- cena ---------- */

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const PanelaCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => {
    const v = cena[k] as unknown;
    return Array.isArray(v) ? curva(v as [number, number][], p) : valor(n0(v), p, pad);
  };
  const epoca = cena.epoca === true;
  const gente = (cena.gente as GenteP[] | undefined) ?? [];
  // explosão: tau = s desde que a tampa disparou (boomP = progresso da batida em que começa; boomOff = s já passados, para continuar na batida seguinte)
  const boomP = typeof cena.boomP === "number" ? cena.boomP : null;
  const tau = boomP === null ? -1 : (p > 0 ? Math.max(0, p - boomP) * (t / p) : 0) + (typeof cena.boomOff === "number" ? cena.boomOff : 0) - (boomP > 0 && p < boomP ? 1e9 : 0);
  const subida = tau <= 0 ? 0 : tau < TL ? SOBE_TAMPA * Math.pow(tau / TL, 1.7) : SOBE_TAMPA + (tau - TL) * 14;
  const tremor = tau > 0 ? 0.035 * Math.exp(-tau * 2.5) + (tau > TL ? 0.05 * Math.exp(-(tau - TL) * 9) : 0) : 0;
  const o: Pote = {
    corte: cena.corte === true, tampa: n("tampa", 1), treme: n("treme"), estufa: n("estufa"), voo: subida, borracha: n("borracha"), peso: n("peso"), chia: n("chia"), pesoUp: n("pesoUp") * (cena.pesoOsc === true ? 0.5 + 0.5 * Math.sin(t * 6 - 1.57) : 1),
    entope: n("entope"), reserva: n("reserva"), resUp: n("resUp"), trava: n("trava"), travaUp: n("travaUp") * (1 - n("travaDesce")), raiox: n("raiox"), destaque: n("destaque"),
    quente: n("quente"), bolhas: n("bolhas"), feijao: n("feijao"), t, tAbs: tEpisodio, colherPote: n("colherPote"),
    vidro: cena.vidro === true, nivel: n("nivel", 0.5), nivelMax: n("nivelMax"), espuma: n("espuma"), semTampa: cena.semTampa === true, semPeso: cena.semPeso === true,
  };
  const panela = n("panela", 1);
  const gas = n("gas");
  const vapor = n("vapor");
  const pressao = n("pressao");
  const chia = n("chia");
  const lupaK = n("lupa");
  const lx = n("lupaX", -0.7);
  const ly = n("lupaY", 1.55);
  const LR = n("lupaR", 0.3);
  const modo = (cena.lupaModo as string | undefined) ?? "bolhas";
  const pulsa = 0.65 + 0.35 * Math.sin(tEpisodio * 8);
  const ancoraLupa: V = modo === "bolhas" ? P(0, 0.2) : modo === "feijao" ? P(0, 0.06) : P(0.08, 0.5);

  const S = n("etiqS", 0.3);
  const Kt = n("etiqK", 1);
  const et: Record<string, EtiqDef> = {
    borracha: { texto: "BORRACHA", para: P(-0.3, H), off: [-1.5, 0.9], cor: "#ff8f84" },
    pressao: { texto: "PRESSÃO", para: P(0.18, 0.28), off: [1.5, 0.5], cor: "#ffb26b" },
    peso: { texto: "PESO", para: P(X_PESO, H + 0.17), off: [1.3, 1.0] },
    reserva: { texto: "RESERVA", para: P(X_RES, H + 0.14), off: [1.4, 0.8], cor: "#7dffa8" },
    trava: { texto: "TRAVA", para: P(X_TRAVA, H + 0.1), off: [-1.4, 0.9], cor: "#ff8f84" },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fim === undefined || p <= fim) };
  }).filter((x) => x.ok);

  const fogoAceso = gas > 0.02;
  const rt = (cena.relogioTxt as [number, string][] | undefined) ?? [[0, ""]];
  const textoRelogio = (rt.filter((x) => p >= x[0]).pop() ?? rt[0])[1];
  const interroga = n("interroga");
  const geladeira = n("geladeira");
  // setas de vapor pelas frestas da tampa (8 pontos em volta da borda)
  const setasVapor = vapor > 0.02 && Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const u = (tEpisodio * 1.6 + i * 0.37) % 1;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const a0 = P(ca * 0.34, H + 0.03, sa * 0.34);
    const b0 = P(ca * (0.5 + 0.25 * u), H + 0.12 + 0.08 * u, sa * (0.5 + 0.25 * u));
    return <Seta key={i} a={a0} b={b0} cor="#9fd8ff" w={0.012} op={vapor * (1 - 0.5 * u)} />;
  });

  return (
    <group position={[tremor * Math.sin(tEpisodio * 83), tremor * Math.cos(tEpisodio * 71), 0]} rotation={[0, 0, tremor * 0.3 * Math.sin(tEpisodio * 57)]}>
      <hemisphereLight args={epoca ? ["#ffd9a8", "#2a1d10", 0.75] : ["#fff3dd", "#8a6a4a", 1.05]} />
      {epoca && <pointLight position={[40.4, 1.7, 0.6]} intensity={9} distance={7} color="#ffb060" />}
      <directionalLight position={epoca ? [38, 3, 3] : [-1.2, 3.6, 3.8]} intensity={epoca ? 0.6 : 2.2} color="#fff0d2" castShadow={!epoca} shadow-mapSize={[2048, 2048]} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={2.6} shadow-camera-bottom={-1.2} shadow-camera-near={0.5} shadow-camera-far={12} shadow-bias={-0.0004} />

      {epoca ? (
        <Sala1679 bulge={n("bulge")} estoura={n("estoura")} t={tEpisodio} />
      ) : (
        <group>
          <Ambiente vao={cena.vaoGeladeira === true ? VAO : undefined} />
          <Teto tt={tau - TL} />
          <Fogao fogo={gas} t={t} vazio={0.03} />
          <Janela p={[PX + 1.15, 1.55, Z_PAREDE + 0.03]} t={tEpisodio} k={n("janela", 1)} />
          {fogoAceso && <Halo p={[PX, CY + 0.06, PZ + 0.1]} r={0.28} cor="#4da6ff" op={0.35 * clamp01(gas)} />}

          {/* a panela */}
          {panela > 0.02 && (
            <group position={[PX, PY, PZ]} scale={PE * panela}>
              <Corpo o={o} />
              <Tampa o={o} />
            </group>
          )}
          {setasVapor}
          {n("jato") > 0.02 && [0, 1, 2].map((i) => <Seta key={i} a={P(0.36, H + 0.04 + i * 0.02, 0.0)} b={P(0.36 + (0.9 + 0.2 * pulsa) * n("jato"), H + 0.02 + i * 0.06, 0.04 * (i - 1))} cor="#9fd8ff" w={0.022} op={clamp01(n("jato") * 2)} />)}
          <Fumaca p={P(0, H + 0.2)} t={tEpisodio} k={n("fumaca")} cor="#ffffff" alt={0.5} larg={0.2} op={0.7} n={10} />
          {chia > 0.02 && o.semPeso && <Fumaca p={P(X_PESO, H + 0.2)} t={tEpisodio} k={chia} cor="#ffffff" alt={0.35} larg={0.05} op={0.8} n={7} />}
          {chia > 0.02 && o.semPeso && [-1, 1].map((s) => <Seta key={s} a={P(X_PESO + s * 0.05, H + 0.19)} b={P(X_PESO + s * 0.22, H + 0.27 + 0.03 * pulsa)} cor="#9fd8ff" w={0.012} op={chia} />)}

          {/* pressão dentro da panela de vidro: setas vermelhas empurrando a água para baixo */}
          {pressao > 0.02 && o.vidro && [-0.17, -0.06, 0.06, 0.17].map((x, i) => {
            const k = 0.5 + 0.5 * Math.sin(tEpisodio * 8 + i * 1.7);
            return <Seta key={i} a={P(x, H - 0.02, (i % 2 ? 0.08 : -0.08))} b={P(x, H * Math.max(o.nivel, 0.3) + 0.06 + 0.03 * k, (i % 2 ? 0.08 : -0.08))} cor="#ff2d2d" w={0.016} op={pressao} />;
          })}
          {/* pressão: setas de dentro para fora (só no corte) */}
          {pressao > 0.02 && o.corte && (
            <group>
              {([[-0.12, 0.22, -0.26, 0.22], [0.12, 0.22, 0.26, 0.22], [-0.1, 0.3, -0.2, 0.37], [0.1, 0.3, 0.2, 0.37], [0, 0.3, 0, 0.4], [-0.08, 0.12, -0.2, 0.12], [0.08, 0.12, 0.2, 0.12]] as number[][]).map(([x0, y0, x1, y1], i) => {
                const k = 0.5 + 0.5 * pulsa;
                return <Seta key={i} a={P(x0, y0, 0.01)} b={P(lerp(x0, x1, 0.55 + 0.45 * k), lerp(y0, y1, 0.55 + 0.45 * k), 0.01)} cor="#ff8a2a" w={0.014} op={pressao} />;
              })}
            </group>
          )}

          {/* setas vermelhas de pressão na tampa: saem da superfície, na direção da normal */}
          {n("pTampa") > 0.02 && o.tampa > 0.5 && !o.semTampa && (
            <group>
              {([[0, 0], [0.13, 0.5], [0.13, 2.6], [0.13, 4.7], [0.23, 1.2], [0.23, 3.3], [0.23, 5.4]] as number[][]).map(([rr, a], i) => {
                const x = rr * Math.cos(a);
                const z = rr * Math.sin(a);
                const yy = yTampa(Math.hypot(x, z)) + 0.015;
                const nx = x / RS;
                const nz = z / RS;
                const k = 0.55 + 0.45 * Math.sin(tEpisodio * 9 + i);
                const L = (0.1 + 0.08 * k) * (0.6 + 0.4 * n("pTampa"));
                return <Seta key={i} a={P(x, yy, z)} b={P(x + nx * L * 1.6, yy + L, z + nz * L * 1.6)} cor="#ff2d2d" w={0.016} op={clamp01(n("pTampa") * 1.5)} />;
              })}
            </group>
          )}
          <Valvula p={VPOS} k={n("valvula")} lift={Math.max(0, n("valvUp")) * (cena.valvOsc === true ? 0.65 + 0.35 * Math.sin(tEpisodio * 7) : 1)} t={tEpisodio} entope={n("valvEntope")} pino={n("vpino")} pinoUp={n("vpinoUp")} res={n("vres")} resUp={n("vresUp")} />
          {n("valvula") > 0.02 && <LinhasZoom de={P(X_PESO, yTampa(X_PESO) + 0.04)} p={VPOS} R={0.4} k={n("valvula")} />}
          <Xis p={P(0, 0.3, 0.32)} k={n("xis")} s={0.28} />
          <Termometro p={[PX - 0.32, CY + 0.04, 0.0]} k={n("termo")} temp={n("temp", 20)} />
          {n("termo") > 0.02 && <Liga a={[PX - 0.32, CY + 0.06, 0.0]} b={P(-0.22, 0.1)} w={0.008} cil cor="#3a3d44" op={suave(n("termo"))} />}
          <Manometro p={[PX + 0.4, CY + 0.42, Z_PAREDE + 0.06]} k={n("manOn")} v={n("manV")} />
          {n("relogio") > 0.02 && (
            <group>
              <RelogioParede p={[PX + 0.1, 1.52, Z_PAREDE + 0.03]} t={tEpisodio} voltas={n("relogioV", 0.3)} escala={0.55 * suave(n("relogio"))} />
              {textoRelogio !== "" && <Texto3D texto={textoRelogio} p={[PX + 0.1, 1.28, Z_PAREDE + 0.12]} h={0.09} escala={suave(n("relogio"))} />}
            </group>
          )}

          <Prato p={[-0.05, CY, 0.03]} k={n("prato")} />
          <Geladeira k={geladeira} />
          {interroga > 0.02 && <Texto3D texto="?" p={[GX, 1.0 + 0.35 * suave(interroga) + 0.02 * Math.sin(tEpisodio * 3), GZ + 0.1]} h={0.4} escala={suave(clamp01(interroga * 2)) * (1 - 0.9 * geladeira)} />}

          <Explosao tau={tau} />

          {/* lupa */}
          <LinhasZoom de={ancoraLupa} p={[lx, ly, 0.25]} R={LR} k={lupaK} />
          <Lupa p={[lx, ly, 0.25]} R={LR} k={lupaK}>
            {modo === "bolhas" && <LupaBolhas r={LR} sobe={n("bolhaSobe")} t={tEpisodio} />}
            {modo === "feijao" && <LupaFeijao r={LR} feijao={o.feijao} colher={n("colher")} />}
            {modo === "tampa" && <LupaTampa r={LR} o={o} reserva={o.reserva > 0.5} chia={chia} t={tEpisodio} />}
          </Lupa>

          {etiqs.map(({ c, ini }) => {
            const d = et[c];
            const de: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.1];
            return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
          })}
        </group>
      )}

      {gente.map((gd, i) => <Pessoa key={i} g={gd} p={p} t={t} tAbs={tEpisodio} />)}
    </group>
  );
};

void Z_FRENTE; void XS; void Liga;
const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const panela: Cenario3D = {
  Cena: PanelaCena,
  padrao: "geral",
  fundo: (cena) => (cena.epoca === true ? "#1d1611" : "#f3d6a4"),
  luzPropria: true,
  cameras: { geral: c([-0.8, 1.3, 3.2], [-0.8, 1.1, 0], 45) },
};
