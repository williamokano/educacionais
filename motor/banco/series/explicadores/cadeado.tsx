import React from "react";
import * as THREE from "three";
import { clamp01, lerp, suave } from "../../../src/v3d/anima";
import { Caixa } from "../../../src/v3d/qualidade";
import { Cenario3D, Cenario3DProps, Pose3D } from "../../../src/v3d/tipos";
import { poseDe3D } from "../../../src/v3d/acoes";
import { Etiqueta, Halo, Liga, Texto3D } from "./cozinha-base";
import { Ctx, EtiqDef, Oficina, V, mkCtx, mistura, Arvore } from "./rasc";
import {
  ACO, AGUA, Alicate, Barra, Bicicleta, CadeadoMini, CaixaM, Calha, ChaveGrande, ChavePeq, Corda, Corrente, Impacto, LARANJA, LH, LJ, MaoGrande, Martelo, Metal, Mola, MolaX,
  OURO, Parafuso, Pino, Poste, TipoPino, alturaChave, empunhadura, perfilChave,
} from "./cad-pecas";
import { Caminhantes, GenteC, PessoaC } from "./cad-gente";
import { agarra, agacha } from "./cad-maos";

// Cadeado (episódio 20, "como um cadeado sabe qual é a chave certa?"). Maquetes de bancada gigantes (não é o tamanho real), em raio-X, e a rua com gente de verdade.
//   palco "corpo" (x = 0): placa na bancada (topo em y = 1,0), haste em U (pernas em x = ±0,6), ferrolho que desliza para o furo da perna (em corte), corpo, cilindro com braço.
//   palco "cilindro" (x = 60): corte lateral: carcaça (y 0 a 1,78), cilindro (y -1,2 a 0), fresta em y = 0, cinco câmaras com pino, mola e teto; chave extrudada.
//   palco "rua" (x = 120): calçada, poste, bicicleta, corda, bilhete, transeuntes Boneco3D, o ladrão.   palco "vinheta" (x = 180): tranca egípcia e cadeados.
// Posições de `gente` são RELATIVAS ao palco (as câmeras são absolutas). Campos (número, { de, para, ini, fim } ou chaves [[progresso, valor], ...]):
//   corpo    my (desce a maquete; -0,9 = no chão) · bancada (0 tira) · suporte · hasteVis · trinco · trincoX 0..1 (puxado à mão) · mao 0..1 · abre · corpoVis · cilVis · gira · chaveNoCorpo · raiox · aco
//            hasteGrossa · hfVis · quente · protetor · corte 0..1 (a haste cortada abre) · ferr "martelo"|"alicate" · lin · dist · lrot · hx · golpe · golpeT0 (s) · ali (rad) · apr (m) · base (m) · treme · ay (altura do corte)
//   cilindro pinosVis · corte · kp · molas · empurra · fresta · chave · chaveTipo · fila · formato · npin · gira
//   rua      bx (x da bicicleta) · corda 0..1 · cortada 0/1 · bilhete · corrente 0..1 (cadeado) · entardecer 0..1 · cam 0..1 (transeuntes)
//   vinheta  vinheta 0 (tranca egípcia) | 1 (cadeados) · chave1861

const OFF_Y = 3.2; // altura da origem do corte do cilindro no palco 2 (a vista gira 90 graus: a chave sobe de baixo)
const XP = [-1.2, -0.6, 0, 0.6, 1.2];
const KP: Record<string, number[]> = { dif: [0.5, 0.32, 0.6, 0.42, 0.28], igual: [0.45, 0.45, 0.45, 0.45, 0.45] };
const DEV = [0, 0.13, 0, -0.11, 0];
const DRV = 0.55; // comprimento do pino de cima
const Y0 = -0.7; // base do pino de baixo em repouso
const CEIL = 1.5; // teto da câmara (os pinos de cima e as molas sobem até aqui)

const eb = (k: number) => { const x = clamp01(k); const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** a peça voa de `de` até o lugar (pouso com um quique) */
const Entra: React.FC<{ k: number; de?: V; children: React.ReactNode }> = ({ k, de = [0, 0.9, 0], children }) => {
  if (k <= 0.01) return null;
  const e = eb(k);
  return <group position={[de[0] * (1 - e), de[1] * (1 - e), de[2] * (1 - e)]}>{children}</group>;
};

/* ---------- palco 1: o corpo (ferrolho, haste, corpo, cilindro), o ladrão e as ferramentas ---------- */

// Trava (maquete): cilindro na BASE do corpo, eixo vertical, buraco da chave voltado para baixo (como nos cadeados comuns); o came (braço no topo do cilindro) gira
// num plano horizontal e puxa o bloco da lingueta pelo elo. A lingueta corre na guia e entra no entalhe da ponta do braço CURTO do arco em J (x = -0,5);
// o braço COMPRIDO (x = +0,5) corre dentro de um trilho (tubo) e a mola apoia no trilho.
const BRACO = 0.21, A0 = 1.0, LINK = 0.25, YT = 1.5, BY = 1.62, PLACA_TOPO = 0.995, XC = 0.5, XK = -0.5, LTIP = 0.17, LROD = 0.4, PIVO = 1.55;
/** x do bloco da lingueta (ponta de trás da lingueta, onde o elo prende), com o cilindro girado `g` */
const pinX = (g: number) => {
  const a = g - A0;
  const tx = BRACO * Math.sin(a), tz = BRACO * Math.cos(a);
  return tx - Math.sqrt(Math.max(LINK * LINK - (BY - YT) ** 2 - tz * tz, 0));
};
const PIN0 = pinX(0);
const RETRAI = pinX(1.0) - PIN0;

const HasteCor = "#c9d3da";

/** arco em J de aço: braço comprido em x = +0,5 (corre no trilho) e braço curto em x = -0,5 com o entalhe perto da ponta; o arco tem o tamanho do corpo. O arco abre em torno do braço comprido quando é cortado (corte 0..1). */
const YA = 2.3; // altura em que o braço curto começa a curvar
const DY = 0.3; // o braço comprido sobe mais: o arco é um J
const Arco: React.FC<{ r: number; cor: string; op: number; emi?: string; emiK?: number }> = ({ r, cor, op, emi, emiK }) => {
  const geo = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) { const t = (i / 36) * Math.PI; pts.push(new THREE.Vector3(0.5 * Math.cos(t), YA + 0.5 * Math.sin(t) + DY * (1 + Math.cos(t)) / 2, 0)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 12, false);
  }, [r]);
  return <mesh geometry={geo} castShadow><Metal cor={cor} met={0.7} rug={0.3} op={op} emi={emi} emiK={emiK} /></mesh>;
};
const HasteFina: React.FC<{ op: number; corte: number; pinch: number; yc: number }> = ({ op, corte, pinch, yc }) => {
  const gap = 0.045 * (1 - pinch);
  const sw = suave(corte) * 1.25;
  return (
    <group>
      <Barra a={[XC, 1.15, 0]} b={[XC, YA + DY, 0]} r={0.07} cor={HasteCor} met={0.75} rug={0.25} op={op} />
      <mesh position={[XC, 1.15, 0]}><sphereGeometry args={[0.07, 14, 10]} /><Metal cor={HasteCor} met={0.75} rug={0.25} op={op} /></mesh>
      <Calha p={[XK, BY, 0]} d={0.14} h={0.26} zd={0.07} furoY={0} furoR={0.04} cor="#a9b4bc" op={op} />
      <Barra a={[XK, BY + 0.13, 0]} b={[XK, yc - gap, 0]} r={0.07} cor={HasteCor} met={0.75} rug={0.25} op={op} />
      {pinch < 0.99 && pinch > 0.01 && <Barra a={[XK, yc - gap - 0.002, 0]} b={[XK, yc + gap + 0.002, 0]} r={0.07 * pinch} cor={HasteCor} met={0.75} rug={0.25} op={op} />}
      <group position={[XC, 0, 0]} rotation={[0, sw, 0]}>
        <group position={[-XC, 0, 0]}>
          <Barra a={[XK, yc + gap, 0]} b={[XK, YA, 0]} r={0.07} cor={HasteCor} met={0.75} rug={0.25} op={op} />
          <group position={[0, 0, 0]}><Arco r={0.07} cor={HasteCor} op={op} /></group>
        </group>
      </group>
    </group>
  );
};

const HasteGrossa: React.FC<{ op: number; quente: number }> = ({ op, quente }) => {
  const cor = mistura("#2f3a42", "#ff7a2a", quente);
  const emi = "#ff5a10";
  return (
    <group>
      <Barra a={[XC, 1.15, 0]} b={[XC, YA + DY, 0]} r={0.12} cor={cor} met={0.7} rug={0.32} op={op} />
      <Barra a={[XK, 1.5, 0]} b={[XK, YA, 0]} r={0.12} cor={cor} met={0.7} rug={0.32} op={op} />
      <Arco r={0.12} cor={cor} op={op} emi={emi} emiK={quente * 0.9} />
      {quente > 0.02 && <Halo p={[0, 2.5, 0.3]} r={1.2 * quente} cor="#ff8a3a" op={0.35 * quente} />}
    </group>
  );
};

const Corpo: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, p, t, tEp } = C;
  const gente = (C.cena.gente as GenteC[] | undefined) ?? [];
  const my = n("my", 0), mz = n("mz", 0);
  const aco = n("aco", 0);
  const rx = n("raiox", 1) * (1 - aco);
  const hv = n("hasteVis", 0), abre = n("abre", 0), tv = n("trinco", 0), g = n("gira", 0), cilV = n("cilVis", 0), corpoV = n("corpoVis", 0), sup = n("suporte", 0);
  const trincoX = n("trincoX", 0), mao = n("mao", 0), chaveNo = n("chaveNoCorpo", 0);
  const hg = n("hasteGrossa", 0), hfv = n("hfVis", 1), quente = n("quente", 0), pro = n("protetor", 0), corte = n("corte", 0);
  const ali = n("ali", 0.4);
  const yc = n("ay", 2.22);
  const topY = 2.1 + 0.12 * aco;
  const bz = 0.25 + 0.06 * aco;
  const pin = cilV > 0.5 ? pinX(g) : PIN0 + RETRAI * trincoX;
  const tip = pin - LTIP;
  const armTip: V = [BRACO * Math.sin(g - A0), YT, BRACO * Math.cos(g - A0)];
  const giraX = n("giraX", 0);
  const placa = n("placa", sup);
  const pinch = n("ferr", 0) > 0 || C.cena.ferr === "alicate" ? (corte > 0.02 ? 0 : clamp01((ali - 0.04) / (0.136 - 0.04))) : 1;
  const hasteOp = (1 - hg) * hfv;
  const hy = 0.35 * abre;
  const bancada = n("bancada", 1) > 0.5;
  const dur = p > 0.001 ? t / p : 3;
  const knobVis = tv > 0.02 && cilV < 0.3;
  const pinK = eb(n("pinK", 1));
  void pinK; void dur;
  return (
    <group>
      <hemisphereLight args={["#fff6e6", "#8a7a5a", 1.15]} />
      <directionalLight position={[-3, 7, 8]} intensity={1.5} color="#fff3dc" />
      <Oficina escuro={n("escuro", 0)} bancada={bancada} />
      <group position={[0, my, mz]}>
       <group position={[0, PIVO, 0]} rotation={[giraX, 0, 0]}><group position={[0, -PIVO, 0]}>
        {/* placa de fixação na bancada, com parafusos */}
        {placa > 0.02 && (
          <Entra k={placa} de={[0, -1.1, 0.3]}>
            <CaixaM p={[0, PLACA_TOPO - 0.05, 0]} t={[2.1, 0.1, 0.62]} raio={0.025} cor="#6f7d88" met={0.55} rug={0.45} />
            {[-0.95, 0.95].map((x) => [-0.2, 0.2].map((z) => <Parafuso key={`${x}${z}`} p={[x, PLACA_TOPO + 0.012, z]} rot={[0, 0.4, 0]} r={0.034} />))}
          </Entra>
        )}
        {sup > 0.02 && (
          <Entra k={sup} de={[0, 1.1, 0.3]}>
            {/* trilho do braço comprido e furo do braço curto: tubos presos à placa */}
            {[XC, XK].map((x) => (
              <group key={x}>
                <mesh position={[x, 1.55, 0]}><cylinderGeometry args={[0.12, 0.12, 1.1, 24, 1, true]} /><meshStandardMaterial color="#4b565e" metalness={0.6} roughness={0.4} transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} /></mesh>
                <mesh position={[x, PLACA_TOPO + 0.02, 0]}><cylinderGeometry args={[0.16, 0.16, 0.04, 24]} /><Metal cor="#7f8c96" /></mesh>
                <mesh position={[x, 2.09, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.12, 0.02, 8, 24]} /><Metal cor="#9aa6af" /></mesh>
              </group>
            ))}
          </Entra>
        )}
        {/* guia da lingueta (em corte, aparafusada na placa) */}
        {tv > 0.02 && (
          <Entra k={clamp01(tv * 1.2)} de={[0, 0.8, 0.2]}>
            <Calha p={[-0.1, 1.435, 0]} d={0.08} h={0.83} zd={0.11} furoY={BY - 1.435} furoR={0.05} />
            <CaixaM p={[-0.1, PLACA_TOPO + 0.02, 0.06]} t={[0.15, 0.04, 0.36]} raio={0.012} cor="#7f8c96" />
            <Parafuso p={[-0.1, PLACA_TOPO + 0.048, 0.2]} rot={[0, 0.2, 0]} r={0.03} />
          </Entra>
        )}
        {/* trava: lingueta que entra no entalhe do braço curto, bloco, haste de guia e mola apoiada no trilho do braço comprido */}
        {tv > 0.02 && (
          <Entra k={tv} de={[-0.9, 0.5, 0.2]}>
            <Barra a={[tip, BY, 0]} b={[pin + LROD, BY, 0]} r={0.03} cor="#ff9a3c" met={0.55} rug={0.3} />
            <mesh position={[tip, BY, 0]}><sphereGeometry args={[0.03, 14, 10]} /><Metal cor="#ff9a3c" met={0.55} rug={0.3} /></mesh>
            <CaixaM p={[pin, BY, 0]} t={[0.1, 0.15, 0.15]} raio={0.02} cor="#ffb347" met={0.4} rug={0.4} />
            <MolaX y={BY} x0={pin + 0.05} x1={XC - 0.12} voltas={8} raio={0.06} fio={0.015} />
            {knobVis && (
              <group>
                <Barra a={[pin + 0.2, BY, 0]} b={[pin + 0.2, BY + 0.3, 0]} r={0.018} cor="#ffb347" />
                <mesh position={[pin + 0.2, BY + 0.36, 0]}><sphereGeometry args={[0.062, 16, 12]} /><Metal cor="#ffd23f" met={0.4} rug={0.35} /></mesh>
              </group>
            )}
          </Entra>
        )}
        {/* a mão grande que puxa a trava */}
        {mao > 0.02 && knobVis && (
          <group position={[pin + 0.2 + 0.3 + 0.5 * (1 - suave(mao)), BY + 0.37 + 0.2 * (1 - suave(mao)), 0.02]} rotation={[0, -Math.PI / 2, 0.15]} scale={1.3}>
            <MaoGrande fecha={suave(clamp01(mao * 2.2))} />
          </group>
        )}
        {/* arco em J: aço fino com o entalhe em corte (some quando entra a grossa) */}
        {hv > 0.02 && hasteOp > 0.01 && (
          <Entra k={hv} de={[0, 1.2, 0.2]}>
            <group position={[0, hy, 0]}><HasteFina op={hasteOp} corte={corte} pinch={pinch} yc={yc} /></group>
          </Entra>
        )}
        {hg > 0.01 && <group position={[0, hy, 0]}><HasteGrossa op={hg} quente={quente} /></group>}
        {/* o corpo fecha em volta */}
        {corpoV > 0.02 && (
          <group position={[0, (1 - eb(corpoV)) * 0.9, 0]}>
            <CaixaM p={[0, 1.55 + 0.06 * aco, 0]} t={[1.9 + 0.2 * aco, 1.1 + 0.12 * aco, 0.5 + 0.12 * aco]} raio={0.07} cor={mistura("#b9c8d2", "#38424a", aco)} met={0.6} rug={0.38} op={lerp(1, 0.2, rx) * clamp01(corpoV * 3)} contorno={rx > 0.3 ? "#eaf6ff" : undefined} />
            {[-0.82, 0.82].map((x) => [1.12, topY - 0.12].map((y) => <Parafuso key={`${x}${y}`} p={[x, y, bz + 0.004]} r={0.035} />))}
          </group>
        )}
        {/* protetor: dois ombros de aço do corpo em volta dos braços */}
        {pro > 0.02 && (() => {
          const h = Math.max(0.02, (2.62 - topY) * suave(pro));
          return [XK, XC].map((x) => <CaixaM key={x} p={[x, topY - 0.01 + h / 2, 0]} t={[0.46, h, 0.5 + 0.12 * aco]} raio={0.05} cor="#4a545c" met={0.65} rug={0.35} />);
        })()}
        {/* cilindro na base do corpo: buraco da chave para baixo; o came no topo gira num plano horizontal e puxa a trava */}
        {cilV > 0.02 && (
          <Entra k={cilV} de={[0, -0.9, 0.3]}>
            <group rotation={[0, g - A0, 0]}>
              <mesh position={[0, 1.24, 0]} castShadow><cylinderGeometry args={[0.17, 0.17, 0.5, 36]} /><Metal cor="#e0b13c" met={0.7} rug={0.3} /></mesh>
              <mesh position={[0, 0.985, 0]}><cylinderGeometry args={[0.172, 0.172, 0.01, 36]} /><Metal cor="#f0c860" met={0.7} rug={0.3} /></mesh>
              <Caixa p={[0, 0.978, 0]} t={[0.14, 0.012, 0.04]} cor="#14181c" raio={0.004} sombra={false} />
              <Barra a={[0, 1.5, 0]} b={[0, 1.5, BRACO]} r={0.024} cor="#37c26a" met={0.4} />
              {chaveNo > 0.02 && (
                <group position={[0, 0.84 - 0.9 * (1 - eb(chaveNo)), 0]} rotation={[0, 0, Math.PI / 2]}><ChavePeq s={0.9} /></group>
              )}
            </group>
            <mesh position={[armTip[0], YT, armTip[2]]}><sphereGeometry args={[0.04, 12, 10]} /><Metal cor="#37c26a" met={0.4} /></mesh>
            <Barra a={armTip} b={[pin, BY, 0]} r={0.018} cor="#37c26a" met={0.4} />
            <mesh position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.185, 0.02, 10, 40]} /><Metal cor="#9aa6af" met={0.8} rug={0.28} /></mesh>
          </Entra>
        )}
       </group></group>
      </group>
      <Ladrao C={C} my={my} topY={topY} aco={aco} />
      {gente.map((gd, i) => (
        <PessoaC key={i} g={gd} p={p} t={t} tAbs={tEp}
          maos={n("cordaMao", 0) > 0.5 ? (h) => <Corda pts={[h.D, [h.D[0] + 0.01, h.D[1] - 0.16, h.D[2] + 0.03], [h.D[0] + 0.03, h.D[1] - 0.4, h.D[2] + 0.07], [h.D[0] + 0.0, h.D[1] - 0.62, h.D[2] + 0.04], [h.D[0] + 0.08, h.D[1] - 0.72, h.D[2] + 0.09]]} r={0.014} /> : undefined} />
      ))}
    </group>
  );
};

/* ---------- o ladrão com o martelão e com o corta-vergalhão ---------- */

const kfa = (u: number, pts: [number, number][]) => {
  if (u <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (u <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], suave((u - pts[i - 1][0]) / Math.max(pts[i][0] - pts[i - 1][0], 1e-6)));
  }
  return pts[pts.length - 1][1];
};
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (a: THREE.Vector3): V => [a.x, a.y, a.z];

const Ladrao: React.FC<{ C: Ctx; my: number; topY: number; aco: number }> = ({ C, my, topY, aco }) => {
  const { n, p, t, tEp } = C;
  const ferr = C.cena.ferr as string | undefined;
  if (!ferr) return null;
  const lg = (C.cena.lg as GenteC | undefined) ?? {};
  const lin = n("lin", 1);
  const theta = n("lrot", 0.8);
  const dist = n("dist", ferr === "martelo" ? 1.08 : 1.5);
  const dur = p > 0.001 ? t / p : 3;
  const ab = n("ali", 0.2);
  const hgt = n("ay", 2.22) + my; // altura do corte (mundo)
  const h = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
  const aim = new THREE.Vector3(ferr === "martelo" ? n("hx", -0.55) : -0.5, ferr === "martelo" ? topY + my + 0.056 : hgt, 0);
  const S = new THREE.Vector3(aim.x - dist * h.x, 0, aim.z - dist * h.z);
  const rot = lerp(Math.PI / 2, theta, suave(lin));
  const walk = 1 - suave((lin - 0.7) / 0.3);
  const pos = new THREE.Vector3(S.x - 2.8 * (1 - suave(lin)), 0, S.z);
  const treme = n("treme", 0);
  let ajuste: ((pose: Pose3D, loc: (w: V) => V, ta: number) => void) | undefined;
  const tools: React.ReactNode[] = [];

  if (ferr === "martelo") {
    const ativo = n("golpe", 0) > 0.5;
    const T = 1.35;
    const t0 = n("golpeT0", 0.4) * dur;
    const ph = ativo && t > t0 ? ((t - t0) % T) / T : 0;
    const psiS = 1.9;
    const dirS = h.clone().multiplyScalar(Math.sin(psiS)).addScaledVector(UP, Math.cos(psiS));
    const GS = aim.clone().addScaledVector(dirS, -0.56);
    const fS = GS.clone().sub(S).dot(h);
    const uS = GS.y;
    const psi = kfa(ph, [[0, 0.9], [0.34, -1.05], [0.45, -1.05], [0.575, psiS], [0.66, psiS], [0.8, 1.2], [1, 0.9]]);
    const f = kfa(ph, [[0, 0.3], [0.34, 0.02], [0.45, 0.02], [0.575, fS], [0.66, fS], [0.8, 0.38], [1, 0.3]]);
    const u = kfa(ph, [[0, 1.2], [0.34, 1.95], [0.45, 1.95], [0.575, uS], [0.66, uS], [0.8, 1.4], [1, 1.2]]);
    const tx = kfa(ph, [[0, 0.05], [0.34, -0.3], [0.45, -0.3], [0.575, 0.5], [0.66, 0.5], [0.82, 0.12], [1, 0.05]]);
    const kn = kfa(ph, [[0, 0.12], [0.34, 0.0], [0.45, 0.0], [0.575, 0.6], [0.66, 0.6], [0.82, 0.2], [1, 0.12]]);
    const tremor = ph > 0.6 && ph < 0.95 ? (1 - (ph - 0.6) / 0.35) * 0.025 : 0;
    const d = h.clone().multiplyScalar(Math.sin(psi)).addScaledVector(UP, Math.cos(psi));
    const G = S.clone().addScaledVector(h, f).setY(u);
    G.addScaledVector(h, Math.sin(tEp * 55) * tremor);
    const Ghi = G.clone().addScaledVector(d, 0.22);
    const X = h.clone().multiplyScalar(Math.cos(psi)).addScaledVector(UP, -Math.sin(psi));
    const Z = new THREE.Vector3().crossVectors(X, d);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, d, Z));
    const bottom = G.clone().addScaledVector(d, -0.1);
    const kImp = clamp01((ph - 0.575) / 0.11);
    tools.push(
      <group key="mt" position={v3(bottom)} quaternion={q}><Martelo cabo={0.7} /></group>,
      ativo && ph > 0.575 && ph < 0.7 ? <Impacto key="imp" p={[aim.x, aim.y + 0.1, aim.z + 0.3]} k={kImp} esc={1.3} /> : null,
    );
    ajuste = (pose, loc) => {
      const w = walk;
      const wk = poseDe3D("andando", tEp * 1.3);
      for (const j of Object.keys(wk)) pose[j] = lerp(pose[j] ?? 0, wk[j] ?? 0, w);
      pose["tronco.x"] = lerp(tx, 0.06, w);
      if (w < 0.6) agacha(pose, kn, kn * 2);
      agarra(pose, -1, loc(v3(G)), 1);
      agarra(pose, 1, loc(v3(Ghi)), 1);
    };
  } else {
    // corta-vergalhão: o pivô fica a (base + apr) metros do furo da perna, a ferramenta aponta para a perna subindo `el`
    const el = 0.35;
    const a = h.clone().multiplyScalar(Math.cos(el)).addScaledVector(UP, Math.sin(el));
    const nn = new THREE.Vector3().crossVectors(UP, h).normalize();
    const w = new THREE.Vector3().crossVectors(a, nn);
    const apr = n("apr", 0);
    const base = n("base", LJ - 0.06);
    const P = aim.clone().addScaledVector(a, -(base + apr));
    P.addScaledVector(nn, Math.sin(tEp * 47) * 0.012 * treme).addScaledVector(UP, Math.cos(tEp * 41) * 0.01 * treme);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, nn, w));
    tools.push(<group key="al" position={v3(P)} quaternion={q}><Alicate ab={ab} /></group>);
    const mundo = (lp: [number, number, number], dz: number) => P.clone().addScaledVector(a, lp[0]).addScaledVector(nn, lp[1]).addScaledVector(w, lp[2] + dz);
    const hA = mundo(empunhadura(ab, "A"), 0.022);
    const hB = mundo(empunhadura(ab, "B"), -0.022);
    if (n("batida", 0) > 0.5 || apr < 0.001 && treme > 0.2) tools.push(<Impacto key="imp" p={v3(aim.clone().addScaledVector(a, -0.4).add(new THREE.Vector3(0, 0.05, 0.25)))} k={clamp01(((tEp * 2.4) % 1))} esc={0.8} />);
    ajuste = (pose, loc) => {
      const wk = poseDe3D("andando", tEp * 1.3);
      for (const j of Object.keys(wk)) pose[j] = lerp(pose[j] ?? 0, wk[j] ?? 0, walk);
      pose["tronco.x"] = lerp(0.18 + 0.12 * treme, 0.06, walk);
      pose["tronco.z"] = Math.sin(tEp * 38) * 0.03 * treme;
      agarra(pose, -1, loc(v3(hA)), 1);
      agarra(pose, 1, loc(v3(hB)), 1);
    };
  }
  return (
    <group>
      <PessoaC g={{ quem: "ladrao", acao: "em-pe", exp: "sorriso", esc: 1.0, ...lg }} p={p} t={t} tAbs={tEp} x={pos.x} z={pos.z} rot={rot} ajuste={ajuste} />
      {tools}
      {aco < 0 && null}
    </group>
  );
};

/* ---------- palco 2: o cilindro em corte ---------- */

const Cilindro: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp, p, t } = C;
  const gente = (C.cena.gente as GenteC[] | undefined) ?? [];
  const pv = n("pinosVis", 0), corte = n("corte", 1), molas = n("molas", 1), empurra = n("empurra", 0), fr = n("fresta", 0), chave = n("chave", 0), gira = n("gira", 0);
  const fila = n("fila", 0), fm = n("formato", 0);
  const npin = Math.round(n("npin", 5));
  const muda = (C.cena.muda as number | undefined) ?? -1;
  const kpTipo = (p < muda ? (C.cena.kp0 as string | undefined) : (C.cena.kp as string | undefined)) ?? "dif";
  const tipo = (p < muda ? (C.cena.tipo0 as string | undefined) : (C.cena.chaveTipo as string | undefined)) ?? "certa";
  const kp = KP[kpTipo] ?? KP.dif;
  const xTip = lerp(-3.6, 1.9, chave);
  const tops = XP.map((_, i) => (tipo === "lisa" ? -0.45 : -kp[i] + (tipo === "errada" ? DEV[i] : 0)));
  const perfil = perfilChave(XP.map((x) => x - 1.9), tops, -0.8, -0.62);
  const bot = XP.map((x) => (chave > 0.005 ? Math.max(Y0, alturaChave(perfil, x - xTip)) : Y0));
  const emp = Math.min(empurra, 0.3);
  const inteiro = corte < 0.5;
  const lowTop = XP.map((_, i) => bot[i] + (inteiro ? kp[i] + DRV : kp[i]) + (inteiro ? emp : 0));
  const botReal = XP.map((_, i) => bot[i] + (inteiro ? emp : 0));
  const cruza = XP.map((_, i) => (inteiro ? botReal[i] < 0 && lowTop[i] > 0 : Math.abs(lowTop[i]) > 0.03));
  const alinhado = cruza.slice(0, npin).every((c) => !c) && chave > 0.9;
  const vis = (i: number) => (i < npin ? clamp01(pv * 1.6 - i * 0.16) : 0);
  const fl = (i: number) => clamp01(fm * 1.5 - i * 0.18);
  const tipoPino = (i: number): TipoPino => (fl(i) > 0.5 ? (i % 2 ? "serra" : "carretel") : "inf");
  return (
    <group position={[0, OFF_Y, 0]}>
      <hemisphereLight args={["#fff6e6", "#8a7a5a", 1.15]} />
      <directionalLight position={[-3, 7, 8]} intensity={1.5} color="#fff3dc" />
      <group position={[0, -OFF_Y, 0]}><Oficina /></group>
      <group rotation={[0, 0, Math.PI / 2]}>
      {/* carcaça (vidro) e teto de aço */}
      <CaixaM p={[0, CEIL / 2, 0]} t={[3.9, CEIL, 1.2]} raio={0.02} cor="#cdd5db" met={0.3} rug={0.5} op={0.22} contorno="#e6f1f7" />
      <CaixaM p={[0, CEIL + 0.14, 0]} t={[3.9, 0.28, 1.2]} raio={0.03} cor="#8d99a3" met={0.6} rug={0.4} />
      {/* câmaras dos pinos de cima */}
      {XP.map((x, i) => i < npin && <mesh key={i} position={[x, CEIL / 2, 0]}><cylinderGeometry args={[0.145, 0.145, CEIL, 20, 1, true]} /><meshStandardMaterial color="#3a444c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
      {/* cilindro (gira em torno do eixo y = -0,6) */}
      <group position={[0, -0.6, 0]} rotation={[gira, 0, 0]}>
        <group position={[0, 0.6, 0]}>
          <mesh position={[0, -0.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 3.9, 40]} /><meshStandardMaterial color="#aebcc6" metalness={0.5} roughness={0.35} transparent opacity={0.3} depthWrite={false} /></mesh>
          {[-1.95, 1.95].map((x) => <mesh key={x} position={[x, -0.6, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.6, 0.012, 6, 40]} /><meshBasicMaterial color="#e6f1f7" /></mesh>)}
          <mesh position={[0, -0.6, 0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 3.9, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
          {/* câmaras dos pinos de baixo e canal da chave */}
          {XP.map((x, i) => i < npin && <mesh key={i} position={[x, -0.45, 0]}><cylinderGeometry args={[0.145, 0.145, 0.9, 20, 1, true]} /><meshStandardMaterial color="#3a444c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
          <Caixa p={[0, -0.84, 0]} t={[3.7, 0.45, 0.34]} cor="#273038" raio={0.02} op={0.3} sombra={false} />
          {/* pinos de baixo */}
          {XP.map((x, i) => {
            const k = vis(i);
            if (k <= 0.01) return null;
            const L = inteiro ? kp[i] + DRV : kp[i];
            return (
              <Entra key={i} k={k} de={[0, 0, 0.9]}>
                {fl(i) > 0.01 && fl(i) < 0.5 && <group />}
                <Pino p={[x, botReal[i], 0]} L={L} tipo={tipoPino(i)} cor={fl(i) > 0.5 ? "#f5c04a" : LARANJA} />
                {fl(i) > 0.5 && <Halo p={[x, botReal[i] + L / 2, 0.2]} r={0.4 * (1 - suave((fl(i) - 0.5) * 2)) + 0.01} cor="#ffe9a0" op={0.5 * (1 - fl(i))} />}
              </Entra>
            );
          })}
          {/* chave */}
          {chave > 0.01 && (
            <group position={[xTip, 0, 0]}><ChaveGrande perfil={perfil} fundo={-1.05} ombro={-0.62} /></group>
          )}
        </group>
      </group>
      {/* pinos de cima e molas */}
      {XP.map((x, i) => {
        const k = vis(i);
        if (k <= 0.01) return null;
        const base = inteiro ? botReal[i] + kp[i] + DRV : lowTop[i];
        const gapP = corte > 0.02 && corte < 0.98 ? 0.05 * Math.sin(Math.PI * corte) : 0;
        const topo = base + (inteiro ? 0 : DRV);
        return (
          <Entra key={i} k={k} de={[0, 0, 0.9]}>
            {!inteiro && <Pino p={[x, lowTop[i] + gapP, 0]} L={DRV} tipo="sup" cor={mistura(LARANJA, AGUA, clamp01(corte))} />}
            {molas > 0.02 && <Mola x={x} y0={inteiro ? base : topo + gapP} y1={CEIL} />}
          </Entra>
        );
      })}
      {/* marcas de cruzamento (pino atravessando a fresta) */}
      {pv > 0.02 && fr > 0.02 && XP.map((x, i) => (i < npin && cruza[i] ? <Halo key={i} p={[x, 0, 0.55]} r={0.34 + 0.05 * Math.sin(tEp * 8)} cor="#ff3b2f" op={0.65 * fr} /> : null))}
      {/* a fresta: a linha entre a carcaça e o cilindro */}
      {fr > 0.02 && <mesh position={[0, 0, 0.62]}><boxGeometry args={[3.9, 0.05, 0.02]} /><meshBasicMaterial color={alinhado ? "#37ff7a" : "#ffe14a"} /></mesh>}
      {alinhado && fr > 0.02 && <Halo p={[0, 0, 0.7]} r={1.4} cor="#6bff9a" op={0.35} />}
      </group>
      {/* várias chaves passando */}
      {fila > 0.02 && [0, 1, 2, 3, 4].map((i) => {
        const x = ((((i * 1.5 + tEp * 0.9) % 7.5) + 7.5) % 7.5) - 3.75;
        return <group key={i} position={[x, 2.6 + (i % 2) * 0.5, 0.5]} rotation={[0, 0, Math.sin(i) * 0.15]} scale={fila}><ChavePeq s={1.5} dentes={[0.05 + ((i * 7) % 5) * 0.045, 0.2 - ((i * 3) % 4) * 0.04, 0.1 + ((i * 5) % 3) * 0.05, 0.22 - ((i * 2) % 4) * 0.045, 0.08 + ((i * 11) % 6) * 0.03]} /></group>;
      })}
      {gente.map((gd, i) => (
        <group key={i} position={[0, -OFF_Y, 0]}>
          <PessoaC g={gd} p={p} t={t} tAbs={tEp}
            maos={gd.quem === "vizinho" ? (h) => <group position={h.D} rotation={[0.3, 0, Math.PI / 2 + 0.2]}><ChavePeq s={0.5} /></group> : undefined} />
        </group>
      ))}
    </group>
  );
};

/* ---------- palco 3: a rua ---------- */

const PREDIOS: { x: number; w: number; h: number; cor: string }[] = [
  { x: -9.5, w: 3.4, h: 5.6, cor: "#e8c9a0" }, { x: -6.0, w: 3.5, h: 6.8, cor: "#a9c4d8" }, { x: -2.4, w: 3.6, h: 5.2, cor: "#e3a79a" },
  { x: 1.4, w: 3.7, h: 6.2, cor: "#c9d9a8" }, { x: 5.1, w: 3.5, h: 5.4, cor: "#e6d49a" }, { x: 8.7, w: 3.6, h: 6.6, cor: "#b9a9d4" }, { x: 12.3, w: 3.6, h: 5.8, cor: "#e8c9a0" },
];

const Rua: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, p, t, tEp } = C;
  const gente = (C.cena.gente as GenteC[] | undefined) ?? [];
  const bx = n("bx", -0.15), corda = n("corda", 1), cortada = n("cortada", 0) > 0.5, bil = n("bilhete", 0), corr = n("corrente", 0), ent = n("entardecer", 0);
  const camV = n("transe", 1);
  const snip = n("snip", 0);
  const PX = 1.2;
  const sol = mistura("#ffe9c0", "#ff9a52", ent);
  const jan = mistura("#9cc4e4", "#ffd57a", ent);
  const fio: V[] = [];
  // corda amarrada: do cubo da roda até o poste, com folga, e voltas em torno do poste
  const ponta: V = [bx + 0.5, 0.62, 0.02];
  const voltas: V[] = Array.from({ length: 21 }, (_, i) => { const a = (i / 20) * Math.PI * 2 * 2.4 + 0.5; return [PX + Math.cos(a) * 0.088, 0.78 - (i / 20) * 0.12, Math.sin(a) * 0.088] as V; });
  const tuboAmarra: V[] = [ponta, [bx + 0.5 + (PX - bx - 0.5) * 0.35, 0.42, 0.05], [bx + 0.5 + (PX - bx - 0.5) * 0.7, 0.5, 0.06], [PX - 0.1, 0.74, 0.09], ...voltas];
  void fio;
  return (
    <group>
      <hemisphereLight args={[mistura("#fff3dd", "#ffcf9a", ent), mistura("#8a7a5a", "#7a5a48", ent), 1.0 - 0.1 * ent]} />
      <directionalLight position={[-4, 6 - 3.2 * ent, 8]} intensity={1.55} color={sol} />
      {/* prédios ao fundo, com janelas e portas */}
      {PREDIOS.map((b, i) => (
        <group key={i} position={[b.x, 0, -3.6]}>
          <mesh position={[0, b.h / 2, 0]}><boxGeometry args={[b.w - 0.1, b.h, 1.2]} /><meshStandardMaterial color={b.cor} roughness={0.95} /></mesh>
          {[0, 1, 2].map((r) => [-1, 1].map((c) => (
            <mesh key={`${r}${c}`} position={[c * 0.9, 1.9 + r * 1.35, 0.62]}><planeGeometry args={[0.62, 0.9]} /><meshStandardMaterial color={jan} emissive={ent > 0.2 ? "#ffcf6a" : "#000000"} emissiveIntensity={0.5 * ent} roughness={0.3} /></mesh>
          )))}
          <mesh position={[0, 0.9, 0.62]}><planeGeometry args={[0.9, 1.8]} /><meshStandardMaterial color={i % 2 ? "#7a5230" : "#3f6d8c"} roughness={0.7} /></mesh>
          <Caixa p={[0, 2.0, 0.85]} t={[1.4, 0.07, 0.6]} cor={i % 2 ? "#d9503f" : "#2f8f6a"} raio={0.02} />
        </group>
      ))}
      {/* calçada com juntas, meio-fio e rua */}
      <mesh position={[0, 0, 0.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 7.6]} /><meshStandardMaterial color="#bdb6a8" roughness={1} /></mesh>
      {Array.from({ length: 24 }).map((_, i) => <mesh key={i} position={[-18 + i * 1.6, 0.006, 0.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 7.6]} /><meshStandardMaterial color="#8f8a7f" roughness={1} /></mesh>)}
      <Caixa p={[0, 0.06, 4.7]} t={[60, 0.12, 0.2]} cor="#d3cdc0" raio={0.02} />
      <mesh position={[0, -0.005, 8.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 6.6]} /><meshStandardMaterial color="#4a4d52" roughness={1} /></mesh>
      {Array.from({ length: 10 }).map((_, i) => <mesh key={i} position={[-16 + i * 3.6, 0.004, 8.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 0.14]} /><meshStandardMaterial color="#e8e3c8" roughness={1} /></mesh>)}
      <Arvore x={-5.2} z={-2.2} s={1.7} />
      <Arvore x={7.2} z={-2.3} s={1.5} cor="#4a8a40" />
      {/* poste */}
      <group position={[PX, 0, 0]}><Poste alt={3.4} /></group>
      {/* bilhete preso no poste */}
      {bil > 0.02 && (
        <group position={[PX, 1.55, 0.1]} scale={suave(bil)} rotation={[0, 0, 0.06]}>
          <mesh><planeGeometry args={[1.0, 0.6]} /><meshStandardMaterial color="#3a3f47" roughness={0.9} /></mesh>
          <Texto3D texto="obrigado" p={[0, 0, 0.04]} h={0.2} cor="#ffd23f" />
        </group>
      )}
      {/* bicicleta com a corda */}
      <group position={[bx, 0, 0]}><Bicicleta rod={bx / 0.34} /></group>
      {corda > 0.02 && !cortada && <Corda pts={tuboAmarra} ate={corda} />}
      {cortada && (
        <group>
          <Corda pts={[[PX - 0.1, 0.74, 0.09], ...voltas, [PX + 0.05, 0.62, 0.1], [PX + 0.12, 0.36, 0.14], [PX + 0.14, 0.05, 0.2]]} />
          <Corda pts={[ponta, [bx + 0.42, 0.45, 0.06], [bx + 0.2, 0.2, 0.08], [bx - 0.1, 0.04, 0.1], [bx - 0.35, 0.025, 0.12]]} />
        </group>
      )}
      {snip > 0.02 && snip < 0.98 && <Impacto p={[bx + 0.7, 0.62, 0.25]} k={snip} esc={0.6} />}
      {/* corrente com o cadeado (fim) */}
      {corr > 0.02 && (
        <group>
          <Corrente pts={[[PX - 0.09, 0.75, 0.04], [bx + 0.6, 0.6, 0.08], [bx + 0.5, 0.58, 0.02]]} />
          <group position={[PX - 0.3, 0.52, 0.12]} scale={0.1 * suave(corr) * 1.6}><CadeadoMini s={1} /></group>
        </group>
      )}
      {/* folhas ao vento */}
      {Array.from({ length: 9 }).map((_, i) => <mesh key={i} position={[((tEp * 0.8 + i * 1.3) % 9) - 4.5, 0.5 + ((i * 0.37 + tEp * 0.3) % 1.7), 0.9 + (i % 3) * 0.3]} rotation={[tEp + i, tEp * 0.7, 0]} scale={[0.12, 0.02, 0.09]}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial color={i % 2 ? "#c9822f" : "#a6502a"} /></mesh>)}
      {/* transeuntes de verdade */}
      {camV > 0.02 && <Caminhantes tAbs={tEp} cx={0} larg={9} max={26} tira={(C.cena.tira as number[] | undefined) ?? []} />}
      {gente.map((gd, i) => (
        <PessoaC key={i} g={gd} p={p} t={t} tAbs={tEp}
          ajuste={gd.quem === "ladrao" ? (pose, loc, ta) => {
            // monta na bicicleta: sentado, pedalando, as duas mãos no guidão
            const k = clamp01(n("monta", 0));
            if (k < 0.01) return;
            const c = -ta * 9;
            const alvo: Record<string, number> = { "pernaE.x": -1.15 + 0.5 * Math.sin(c), "pernaD.x": -1.15 - 0.5 * Math.sin(c), "joelhoE.x": 1.2 + 0.5 * Math.max(0, Math.cos(c)), "joelhoD.x": 1.2 + 0.5 * Math.max(0, -Math.cos(c)), "tronco.x": 0.38, "quadril.y": -0.12 };
            for (const j of Object.keys(alvo)) pose[j] = lerp(pose[j] ?? 0, alvo[j], k);
            agarra(pose, 1, loc([bx + 0.37, 0.92, 0.26]), k);
            agarra(pose, -1, loc([bx + 0.37, 0.92, -0.26]), k);
          } : (gd.quem ?? "zeca") === "zeca" && n("amarra", 0) > 0.02 ? (pose, loc, ta) => {
            const k = n("amarra", 0);
            const w = Math.sin(ta * 9) * 0.03;
            pose["tronco.x"] = (pose["tronco.x"] ?? 0) + 0.35 * k;
            agarra(pose, 1, loc([PX - 0.35 + w, 0.82, 0.3]), k);
            agarra(pose, -1, loc([PX - 0.25 - w, 0.8, 0.3]), k);
          } : undefined} />
      ))}
      {n("interroga", 0) > 0.02 && <Texto3D texto="?" p={[0.5, 2.5 + 0.08 * Math.sin(tEp * 3), 0.9]} h={0.6 * suave(n("interroga", 0))} cor="#ffd23f" />}
    </group>
  );
};

/* ---------- palco 4: tranca egípcia, cadeado romano e chave de 1861 ---------- */

const Madeira = "#a8794a";

const Egipcia: React.FC<{ tEp: number }> = ({ tEp }) => {
  // ciclo de 6 s: a chave entra, as pontas empurram os pinos para cima, o ferrolho desliza
  const c = ((tEp % 6.5) / 6.5);
  const entra = kfa(c, [[0, 0], [0.25, 1], [0.8, 1], [0.92, 0], [1, 0]]);
  const pinos = kfa(c, [[0, 0], [0.25, 0], [0.4, 1], [0.8, 1], [0.92, 0], [1, 0]]);
  const ferr = kfa(c, [[0, 0], [0.45, 0], [0.65, 1], [0.8, 1], [0.92, 0], [1, 0]]);
  const XPI = [-0.36, 0, 0.36];
  return (
    <group position={[0, 1.7, 0]}>
      {/* poste da porta (madeira) e o ferrolho, que corre dentro dele */}
      <Caixa p={[0, 0, -0.2]} t={[3.4, 0.9, 0.5]} cor="#7a5230" raio={0.05} rug={0.9} />
      <Caixa p={[0.4 + ferr * 0.9, -0.05, 0.15]} t={[2.8, 0.22, 0.2]} cor="#6a4426" raio={0.03} rug={0.9} />
      {XPI.map((x, i) => <mesh key={i} position={[x - 0.1, 0.1, 0.26]}><cylinderGeometry args={[0.07, 0.07, 0.02, 14]} /><meshStandardMaterial color="#1b130c" /></mesh>)}
      {/* caixa dos pinos em cima do ferrolho */}
      <Caixa p={[-0.1, 0.62, 0.15]} t={[1.4, 0.55, 0.32]} cor={Madeira} raio={0.04} rug={0.9} />
      {XPI.map((x, i) => (
        <group key={i} position={[x - 0.1, 0.5 + pinos * 0.28, 0.15]}>
          <Pino p={[0, -0.25, 0]} L={0.5} tipo="sup" r={0.075} cor="#c28a52" />
        </group>
      ))}
      {/* chave de madeira com pinos, entra por baixo */}
      <group position={[-1.9 + entra * 1.9, -0.55, 0.15]}>
        <Caixa p={[0, 0, 0]} t={[2.2, 0.12, 0.16]} cor="#8c5c30" raio={0.03} rug={0.9} />
        {XPI.map((x, i) => <Caixa key={i} p={[x + 0.9, 0.12, 0]} t={[0.09, 0.16, 0.1]} cor="#b9854e" raio={0.015} rug={0.9} />)}
      </group>
    </group>
  );
};

const Romano: React.FC = () => {
  const perfil = [[0.0, 0], [0.34, 0], [0.4, 0.04], [0.4, 0.1], [0.34, 0.14], [0.36, 0.2], [0.42, 0.24], [0.42, 0.7], [0.36, 0.74], [0.38, 0.8], [0.3, 0.84], [0.0, 0.86]].map(([x, y]) => new THREE.Vector2(x, y));
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.43, 0, 0]} castShadow><latheGeometry args={[perfil, 28]} /><Metal cor="#b9783a" met={0.75} rug={0.38} /></mesh>
      <mesh position={[0.43, 0.44, 0.0]} rotation={[0, 0, 0]}><torusGeometry args={[0.2, 0.05, 10, 24, Math.PI]} /><Metal cor="#b9783a" met={0.75} rug={0.38} /></mesh>
      <Barra a={[0.23, 0.42, 0]} b={[0.23, 0.0, 0]} r={0.05} cor="#b9783a" met={0.75} rug={0.38} />
      <Barra a={[0.63, 0.42, 0]} b={[0.63, 0.2, 0]} r={0.05} cor="#b9783a" met={0.75} rug={0.38} />
      <mesh position={[0.63, 0.14, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.085, 0.16, 4]} /><Metal cor="#8e5a2a" met={0.7} rug={0.4} /></mesh>
    </group>
  );
};

const Vinheta: React.FC<{ C: Ctx }> = ({ C }) => {
  const { n, tEp, p, t } = C;
  const gente = (C.cena.gente as GenteC[] | undefined) ?? [];
  const modo = n("vinheta", 0);
  const y61 = n("chave1861", 0);
  return (
    <group>
      <hemisphereLight args={["#fff3dd", "#8a7a5a", 1.15]} />
      <directionalLight position={[-3, 6, 8]} intensity={1.5} color="#ffe3b0" />
      <mesh position={[0, 1.8, -1.2]}><planeGeometry args={[14, 8]} /><meshStandardMaterial color={modo < 0.5 ? "#d9b57a" : "#5b4a3a"} roughness={1} /></mesh>
      {modo < 0.5 ? (
        <group>
          {/* relevo de pedra: faixas de glifos */}
          {[0.9, 2.9].map((y, r) => Array.from({ length: 11 }).map((_, i) => <Caixa key={`${r}${i}`} p={[-5 + i * 1.0, y, -1.12]} t={[0.4 + 0.1 * ((i * 3) % 3), 0.5, 0.05]} cor="#c4a066" raio={0.02} sombra={false} />))}
          <Egipcia tEp={tEp} />
        </group>
      ) : (
        <group>
          {[-1.2, 0.9].map((x) => <mesh key={x} position={[x, 0.6, 0]}><cylinderGeometry args={[0.6, 0.7, 1.2, 24]} /><meshStandardMaterial color="#6f5a46" roughness={0.9} /></mesh>)}
          <group position={[-1.6, 1.25, 0]} rotation={[0, 0.3, 0]} scale={1.1}><Romano /></group>
          <group position={[0.9, 1.25, 0]} rotation={[0, -0.3, 0]}><CadeadoMini s={0.85} cor="#6c7a86" /></group>
        </group>
      )}
      {y61 > 0.02 && (
        <group position={[-0.6, 3.6, 0.6]} scale={3.4 * suave(y61)} rotation={[0, 0.35 * Math.sin(tEp * 1.2), 0.08 * Math.sin(tEp * 1.7)]}>
          <ChavePeq s={1} />
          <Halo p={[0.3, 0, 0.1]} r={0.9} cor="#ffe9a0" op={0.4} />
        </group>
      )}
      {gente.map((gd, i) => <PessoaC key={i} g={gd} p={p} t={t} tAbs={tEp} />)}
    </group>
  );
};

/* ---------- cena ---------- */

const PALCO_X: Record<string, number> = { corpo: 0, cilindro: 60, rua: 120, vinheta: 180 };

const CadCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const C = mkCtx(cena, p, t, tEpisodio);
  const { n } = C;
  const palco = (cena.palco as string | undefined) ?? "corpo";
  const X0 = PALCO_X[palco] ?? 0;
  const my = n("my", 0);
  const et: Record<string, EtiqDef> = {
    cilindro: { texto: "CILINDRO", para: [0, 1.0, 0.0], off: [0.9, -0.6], cor: "#ffd23f" },
    haste: { texto: "HASTE", para: [-0.5, 2.6, 0.1], off: [-0.8, 0.5], cor: "#e8eef2" },
    pinos: { texto: "PINOS", para: [-0.2, OFF_Y - 0.6, 0.3], off: [-1.1, 0.9], cor: "#ffb36a" },
    fresta: { texto: "FRESTA", para: [0.0, OFF_Y + 1.2, 0.65], off: [1.1, 0.3], cor: "#ffe14a" },
    mola: { texto: "MOLA", para: [-1.1, OFF_Y + 0.6, 0.2], off: [-0.6, 1.0], cor: "#cfd8de" },
    protetor: { texto: "PROTETOR", para: [-0.5, 2.5, 0.3], off: [-0.8, 0.9], cor: "#cfd8de" },
    temperado: { texto: "TEMPERADO", para: [0.5, 2.3, 0.15], off: [0.9, 0.8], cor: "#ffb36a" },
    aco: { texto: "AÇO", para: [0.9, 1.5, 0.35], off: [0.8, -0.9], cor: "#cfd8de" },
    formatos: { texto: "FORMATOS", para: [-0.2, OFF_Y + 0.6, 0.3], off: [-1.0, 0.9], cor: "#ffd23f" },
    ferrolho: { texto: "FERROLHO", para: [-0.3, BY, 0.1], off: [-0.4, -1.0], cor: "#ffb36a" },
    cadeado: { texto: "CADEADO", para: [0.1, 2.0, 0.4], off: [0.2, 1.4], cor: "#ffd23f" },
    chave: { texto: "CHAVE", para: [0.9, OFF_Y - 1.4, 0.2], off: [0.8, -0.8], cor: OURO },
  };
  const S = n("etiqS", 1);
  const Kt = n("etiqK", 1);
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((e) => {
    const [c, d] = e.split("@");
    const [ini, fimE] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fimE === undefined || p <= fimE) };
  }).filter((x) => x.ok);
  return (
    <group>
      <group position={[X0, 0, 0]}>
        {palco === "corpo" && <Corpo C={C} />}
        {palco === "cilindro" && <Cilindro C={C} />}
        {palco === "rua" && <Rua C={C} />}
        {palco === "vinheta" && <Vinheta C={C} />}
      </group>
      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const dy = palco === "corpo" ? my : 0;
        const gx = palco === "corpo" ? n("giraX", 0) : 0;
        const ry = d.para[1] - PIVO, rz = d.para[2];
        const base: V = palco === "corpo" ? [X0 + d.para[0], PIVO + ry * Math.cos(gx) - rz * Math.sin(gx) + dy, ry * Math.sin(gx) + rz * Math.cos(gx)] : [d.para[0] + X0, d.para[1] + dy, d.para[2]];
        const off: V = [base[0] + d.off[0] * S, base[1] + d.off[1] * S, base[2] + 0.3];
        return <Etiqueta key={c} texto={d.texto} de={off} para={base} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void Liga; void ACO; void LH;

export const cadeado: Cenario3D = {
  Cena: CadCena,
  padrao: "geral",
  fundo: (cena, p) => ((cena.palco as string | undefined) === "rua" ? mistura("#a9d6f5", "#f2a768", valorSimples(cena.entardecer, p)) : "#d9c7a4"),
  luzPropria: true,
  cameras: { geral: { pos: [0, 2.2, 8], alvo: [0, 1.8, 0], fov: 50 } },
};

function valorSimples(v: unknown, p: number): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "de" in (v as object)) {
    const o = v as { de: number; para: number; ini?: number; fim?: number };
    return lerp(o.de, o.para, suave((p - (o.ini ?? 0)) / Math.max((o.fim ?? 1) - (o.ini ?? 0), 1e-6)));
  }
  return 0;
}
