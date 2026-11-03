import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp01, lerp, lerp3, suave, valor } from "../../../src/v3d/anima";
import { Cenario3D, Cenario3DProps, V3, Valor } from "../../../src/v3d/tipos";
import { AZUL_AR, Etiqueta, Fluxo, Halo, Seta, Texto3D, Fumaca, V } from "./cozinha-base";
import {
  Ambiente, Fogao, Gente, GenteDef, Guardanapo, Manchas, Panela, BatataNaPanela, RelogioParede, Respingos, Tampa,
  CY, H_PANELA, POT_ESC, POT_POS, XB, XM, XS, Z_PAREDE,
} from "./cozinha-fogao";
import {
  Assadeira, BatataSolo, Cesto, Chama, EscCtx, FUNDO_BANDEJA, FUNDO_CESTO, Fatia, Forno, Garrafa, Gaveta, geo, Geo, Gotas, LINHA_TEMP,
  ManchaChao, Marca, MicroOndas, Papel, Pilha, Resistencia, Sensor, SetasBatata, Termo3D, Ventilador, X0, ZB,
} from "./cozinha-forno";

// Cozinha do episódio 9 (como fritar batata sem fritura), EM ESCALA REAL: o Zeca tem ~1,7 m, a bancada 0,9 m (cintura).
// Vista em CORTE (o plano z = 0 é a "parede de vidro"). O fogão (0,8 m) tem as bocas em cima e o FORNO EMBAIXO; o forno encolhe até virar
// uma caixinha (torradeira ~45 cm) que sai do fogão e vai para a bancada, onde vira o aparelho final (~30 cm). O micro-ondas (~50 cm)
// fica na bancada, ao lado. O forno e tudo o que vai dentro são desenhados num sistema próprio (X0 = 2,2; piso do forno em y = 1,0) e
// postos no mundo por uma escala que muda com o tamanho do forno; a panela e o que está nela também têm sistema local (POT_ESC).
// A batata é palito (~1,3 cm de seção, 7 cm de comprimento) em todas as cenas.
// Campos da cena (número ou { de, para, ini, fim }; booleanos com true):
//   fogão     fogo 0..1 (chama azul) · chia 0..1 (ondinhas) · bolhas 0..1 · panela 0..1 (presença; 0 some) · escurece 0..1
//             tampa 0..1 (0 erguida, 1 fechando a panela) · espirra 0..1 (gotas de óleo; com tampa fechada elas batem nela) · sujo 0..1 (manchas na
//             parede, no fogão e na camisa) · cai 0..1,6 (os palitos caem na panela; 1,6 = os três feixes) · saida 0..1 (os palitos sobem pingando
//             até o guardanapo) · guardanapo 0..1 · mancha 0..1 (óleo no guardanapo)
//   forno     forno 0..2 (0 forno do fogão, 1 caixinha, 2 aparelho; as paredes se movem) · sai 0..1 (a caixinha sai do fogão e vai para a bancada)
//             corpo 0..1 (corpo preto, pezinhos, faixas laranja, gaveta alta e alça) · porta 0..1 (0 aberta, 1 fechada; só no forno do fogão)
//             luzForno 0..1 · painel 0..1 (tela do temporizador e botão do termostato) · contagem (segundos na tela) / tela (texto) · sino 0..1
//             puxaPulso [a, b] (a gaveta do aparelho sai deslizando reta para a frente com o cesto dentro e volta) · fan 0..1 (o ventilador entra)
//   dentro    bandeja 0..1 (a assadeira entra) · cesto 0..1 (a assadeira sai e o cesto furado entra) · gaveta 0..1 (entra embaixo) · pilha: true (os
//             palitos) · doura 0..1 (0 crua · 0,42 dourada · 0,7 queimada · 1 carvão) · seca 0..1 (pálida, dura, murcha) · expo 0..1 (0 só o topo
//             recebe o ar e o meio fica cru e frio; 1 todos iguais) · frio 0..1 · brilho 0..1 (óleo) · qtd 0..1 · queda 0..1 · fumaca 0..1 ·
//             vapor 0..1 · solo 0..1 (um palito ampliado, em lente) · capa 0..1 (a camada de ar)
//   calor     res 0..1 (brilho da resistência) · resPos 0..1 (0 colada no teto, longe do cesto; 1 pertinho do cesto) · vent 0..1 (giro do ventilador)
//             setas: "fraco" | "forte" | "topo" | "laco" | "quente" · setasDe 0..1 · pinga 0..1 · mancha1 0..1 · fio 0..1 · garrafa 0..1 · dist 0..1
//             termostato: true (a temperatura e a resistência oscilam sozinhas rente à linha) · temp 0..1,2 · linha 0..1 · termo: true · sensor 0..1
//   corte     fatia 0..1 (corte de UM palito em primeiro plano) · pen 0..2,6 (até onde o calor entra) · fatiaTam · fantasma 0..1 (a batata grossa ao lado,
//             em que o degradê some antes do centro) · penF
//   papel     papel 0..1 · papelEntra 0..1 · ventoPapel 0..1 · fogoPapel 0..1 · papelVis 0..1 · marcas: "ok" | "x" | "ambas" · marcaK · marcaK2
//   cenário   relogio: true · relogioVel (voltas/s) · micro 0..1 · interroga 0..1 · destaque 0..1 (as quatro peças piscam) · partida 0..1
//   rota      lista de paradas de câmera { p, pos, alvo, fov }: segura cada ponto e só depois vai ao seguinte (vale mais que `camera`)
//   gente     lista de { id: "zeca", x, y, z, rot (Valor), acao ou [[ate, acao, exp]…], exp, queima 0..1 (braço vermelho), oleoBraco 0..1, manchas 0..1
//             (camisa), braco "E" | "D", segura "palito", olha [x,y,z], pula }
//   etiq      lista de rótulos 3D, cada um "chave", "chave@0.4" (aparece aos 40%) ou "chave@0.2-0.6" · etiqS (afasta o texto do alvo, em m)
//             · etiqK (multiplicador do tamanho do texto) · etiqYmax (limite de cima do texto, ndc)
//             chaves: tampa, fio, capa, ventilador, cesto, casca, gaveta, resistencia, termostato, temporizador, cru, pesado, vazio, e as quatro
//             da revelação (afVentilador, afResistencia, afCesto, afGaveta): o nome do aparelho só aparece na batida 24 (a da revelação)

const n0 = (v: unknown) => v as Valor;

type Parada = { p: number; pos: V3; alvo: V3; fov?: number };

const RotaCamera: React.FC<{ rota: Parada[]; p: number }> = ({ rota, p }) => {
  const { camera } = useThree();
  let i = 0;
  while (i + 1 < rota.length && rota[i + 1].p <= p) i++;
  const a = rota[i];
  const b = rota[Math.min(i + 1, rota.length - 1)];
  const k = b.p > a.p ? suave(clamp01((p - a.p) / (b.p - a.p))) : 0;
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...lerp3(a.pos, b.pos, k));
  cam.fov = lerp(a.fov ?? 50, b.fov ?? 50, k);
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...lerp3(a.alvo, b.alvo, k)));
  return null;
};

/** Setas de ar para cada modo, no sistema do forno. */
const rotasDeAr = (modo: string, g: Geo, topo: number): { rotas: V[][]; w: number; op: number; vel: number; n: number; decai?: boolean; cor: string } | null => {
  const F: V = [X0, g.yt - 0.3, ZB + 0.35];
  const fino = g.wi < 0.75 ? 1.6 : 2.0;
  if (modo === "fraco" || modo === "forte") {
    const alvos: V[] = [[X0 - g.wi + 0.1, g.yb + g.hi * 0.5, -0.2], [X0 + g.wi - 0.1, g.yb + g.hi * 0.5, -0.2], [X0 - g.wi * 0.5, g.yb + 0.25, 0.0], [X0 + g.wi * 0.5, g.yb + 0.25, 0.0], [X0, g.yb + 0.15, 0.1], [X0 - g.wi + 0.1, g.yt - 0.3, 0.0], [X0 + g.wi - 0.1, g.yt - 0.3, 0.0]];
    const forte = modo === "forte";
    return { rotas: alvos.map((a) => [F, a]), w: (forte ? 0.04 : 0.028) * fino, op: forte ? 0.95 : 0.55, vel: forte ? 1.8 : 0.55, n: 2, decai: !forte, cor: "#ff9a3c" };
  }
  if (modo === "topo") {
    const rotas: V[][] = [-0.6, -0.3, 0, 0.3, 0.6].map((s) => [[X0 + s * g.wi, g.yt - 0.45, -0.3 + s * 0.2], [X0 + s * g.wi, topo + 0.04, -0.3 + s * 0.2]]);
    return { rotas, w: 0.05 * fino, op: 0.95, vel: 0.8, n: 2, cor: "#ff9a3c" };
  }
  if (modo === "laco" || modo === "quente") {
    const yU = g.yb + 0.21;
    const rotas: V[][] = [];
    for (const z of [0.1, -0.45]) {
      for (const s of [-1, 1]) {
        for (const h of [0.2, 0.55]) {
          rotas.push([[X0 + s * 0.2, g.yt - 0.4, z], [X0 + s * (g.wi - 0.1), g.yt - 0.55, z], [X0 + s * (g.wi - 0.1), yU, z], [X0 + s * h * g.wi, yU, z], [X0 + s * h * g.wi, topo + 0.24, z]]);
        }
      }
    }
    return { rotas, w: (g.wi < 0.75 ? 0.045 : 0.07), op: 0.9, vel: 1.1, n: g.wi < 0.75 ? 3 : 4, cor: modo === "laco" ? AZUL_AR : "#ff9a3c" };
  }
  return null;
};

type EtiqDef = { texto: string; para: V; off: [number, number]; cor?: string };

const CozinhaCena: React.FC<Cenario3DProps> = ({ cena, progresso: p, t, tEpisodio }) => {
  const n = (k: string, pad = 0) => valor(n0(cena[k]), p, pad);
  const b = (k: string) => cena[k] === true;
  const f = Math.max(0, n("forno", 0));
  const corpo = n("corpo");
  const g = geo(f, corpo);
  const porta = n("porta", 0);
  const cesto = n("cesto");
  const bandeja = n("bandeja");
  const gaveta = n("gaveta");
  const doura = n("doura");
  const resPos = n("resPos");
  const vent = n("vent");
  const stage2 = clamp01(f - 1);

  // onde o forno está: no fogão (sai = 0) ou na bancada (sai = 1), e a escala que o desenho tem no mundo
  const sMod = f <= 1 ? lerp(0.245, 0.235, suave(f)) : lerp(0.235, 0.19, suave(f - 1));
  const sai = n("sai");
  const e = suave(sai);
  const PX = lerp(XS, XB, e);
  const PY = lerp(0.215, CY, e) + Math.sin(Math.PI * e) * 0.25;
  const PZ = lerp(0.14, 0.04, e);
  const W = (v: V): V => [PX + sMod * (v[0] - X0), PY + sMod * (v[1] - CY), PZ + sMod * v[2]];

  // qual recipiente leva os palitos: a assadeira (cesto < 0,5) ou o cesto furado
  const naAssadeira = cesto < 0.5;
  const kBandeja = Math.min(bandeja, naAssadeira ? 1 - clamp01(cesto * 2) : 1);
  const kCesto = clamp01(cesto * 2 - 1);
  const kRec = naAssadeira ? kBandeja : kCesto;
  const baseY = naAssadeira ? g.yb + FUNDO_BANDEJA : g.yb + FUNDO_CESTO + 0.015;
  const FORA = 2.6;
  const zOff = FORA * (1 - suave(kRec));
  const altura = lerp(0.32, 0.2, stage2);
  const topoPilha = baseY + 0.06 + altura + 0.05;
  const topoCesto = g.yb + FUNDO_CESTO + 0.06 + altura + 0.05;

  // a gaveta do aparelho sai deslizando reta para a frente, com o cesto dentro, e volta
  const pp = cena.puxaPulso as [number, number] | undefined;
  const puxa = pp && corpo > 0.5 ? Math.sin(Math.PI * clamp01((p - pp[0]) / (pp[1] - pp[0]))) * 1.0 : 0;

  const resY = lerp(g.yt - 0.09, Math.min(g.yt - 0.09, topoCesto + 0.2), resPos);

  let res = n("res", 0.45);
  let temp = n("temp", 0);
  if (b("termostato")) {
    const nivel = (tt: number) => lerp(0.15, LINHA_TEMP, suave(clamp01(tt / 2.2))) + 0.07 * clamp01((tt - 1.8) / 1.0) * Math.sin((tt - 1.8) * 2.6);
    const d = nivel(t + 0.05) - nivel(t - 0.05);
    temp = nivel(t);
    res = t < 1.9 ? 0.9 : 0.03 + 0.92 * clamp01((d + 0.006) / 0.012);
  }

  const fumaca = n("fumaca");
  const vapor = n("vapor");
  const solo = n("solo");
  const pilha = b("pilha") && solo < 0.5 && kRec > 0.02;

  const papel = n("papel");
  const lift = n("ventoPapel");
  const fogoPapel = n("fogoPapel");
  const baseCesto = g.yb + FUNDO_CESTO;
  const larg = g.wi * 2 - 0.4;

  // rótulos 3D (para no mundo)
  const S = n("etiqS", 0.3);
  const Kt = n("etiqK", 1);
  const fanY = g.yt - Math.min(0.26, g.hi * 0.2) - 0.06;
  const fatiaY = g.yb + g.hi * 0.5 + 0.05;
  const potTop: V = [POT_POS[0], POT_POS[1] + (H_PANELA + 0.1) * POT_ESC, POT_POS[2]];
  const et: Record<string, EtiqDef> = {
    tampa: { texto: "TAMPA", para: potTop, off: [-1.2, 0.9] },
    fio: { texto: "FIO DE ÓLEO", para: W([X0 + 0.16, g.yb + 1.0, -0.2]), off: [1.1, 0.5] },
    capa: { texto: "CAPA DE AR", para: W([X0 + 0.55, g.yb + 0.45, -0.1]), off: [1.0, -0.9] },
    ventilador: { texto: "VENTILADOR", para: W([X0, fanY, ZB + 0.3]), off: [1.3, 0.9] },
    cesto: { texto: "CESTO FURADO", para: W([X0 - g.wi + 0.1, baseCesto + 0.1, 0.1]), off: [-0.8, -0.9] },
    casca: { texto: "CASCA × MEIO", para: W([X0 + 0.55, fatiaY + 0.62, 0.55]), off: [0.0, 0.9] },
    gaveta: { texto: "GAVETA", para: W([X0 + g.wi * 0.5, g.yb + 0.09, 0.25]), off: [1.0, -0.9] },
    resistencia: { texto: "RESISTÊNCIA", para: W([X0 + g.wi * 0.4, resY, -0.3]), off: [-1.3, 1.0] },
    termostato: { texto: "TERMOSTATO", para: W([X0 + g.wi - 0.34, Math.max(topoCesto + 0.1, g.yb + 0.35), 0.0]), off: [-1.4, 1.1] },
    temporizador: { texto: "TEMPORIZADOR", para: W([X0, g.yt + 0.1 + 0.15 * corpo, 0.25]), off: [0.8, 1.2] },
    cru: { texto: "CRU", para: W([X0, g.yb + 0.3, 0.1]), off: [-1.0, 1.0] },
    pesado: { texto: "PESADO", para: W([X0 - g.wi * 0.35, baseCesto + 0.3, 0.1]), off: [-0.8, 1.2], cor: "#3ed36f" },
    vazio: { texto: "VAZIO", para: W([X0 + g.wi * 0.2, baseCesto + 0.08, 0.1]), off: [-1.6, 0.0], cor: "#ff5a4a" },
    afVentilador: { texto: "VENTILADOR", para: W([X0, fanY, ZB + 0.3]), off: [-1.4, 1.6] },
    afResistencia: { texto: "RESISTÊNCIA", para: W([X0 + g.wi * 0.5, resY, -0.3]), off: [-1.4, 0.8] },
    afCesto: { texto: "CESTO", para: W([X0 - g.wi + 0.1, baseCesto + 0.1, 0.1]), off: [-1.0, -0.6] },
    afGaveta: { texto: "GAVETA", para: W([X0 + g.wi * 0.5, g.yb + 0.09, 0.25]), off: [1.0, -0.8] },
  };
  const etiqs = ((cena.etiq as string[] | undefined) ?? []).map((et0) => {
    const [c, d] = et0.split("@");
    const [ini, fim] = (d ?? "0").split("-").map(parseFloat);
    return { c, ini, ok: !!et[c] && p >= ini && (fim === undefined || p <= fim) };
  }).filter((x) => x.ok);

  const ar = (cena.setas ? rotasDeAr(cena.setas as string, g, topoPilha) : null);
  const arOp = p >= n("setasDe", 0) ? 1 : 0;

  const cont = cena.contagem ? Math.max(0, Math.round(valor(n0(cena.contagem), p, 0))) : null;
  const tela = cont !== null ? `0:0${cont}` : (cena.tela as string | undefined) ?? "0:00";
  const gente = (cena.gente as GenteDef[] | undefined) ?? [];
  const destaque = n("destaque");
  const pulso = (i: number) => {
    const k = destaque * 4 - i;
    return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
  };

  const kGar = n("garrafa");
  const gotasK = n("pinga");
  const yGota1 = gaveta > 0.8 ? g.yb + 0.05 : g.yb + 0.02;
  const ventGiro = tEpisodio;
  const fan = n("fan", 1);
  const potK = n("panela", 1);
  const vazio = suave(clamp01((sai - 0.6) / 0.3));

  return (
    <group>
      {Array.isArray(cena.rota) && <RotaCamera rota={cena.rota as Parada[]} p={p} />}
      <hemisphereLight args={["#fff3dd", "#8a6a4a", 1.05]} />
      <directionalLight position={[-1.2, 3.6, 3.8]} intensity={2.2} color="#fff0d2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={2.6} shadow-camera-bottom={-1.2} shadow-camera-near={0.5} shadow-camera-far={12} shadow-bias={-0.0004} />
      <Ambiente />
      {b("relogio") && <RelogioParede p={[0.85, 1.58, Z_PAREDE + 0.04]} t={t} voltas={n("relogioVel", 0.2)} escala={0.5} />}

      {/* fogão com o forno embaixo, panela e o que acontece nela */}
      <Fogao fogo={n("fogo")} t={t} vazio={vazio} />
      <group position={POT_POS} scale={POT_ESC}>
        <Panela k={potK} t={t} bolhas={n("bolhas")} chia={n("chia")} escurece={n("escurece")} />
        {potK > 0.02 && <BatataNaPanela cai={n("cai")} saida={n("saida")} t={t} doura={0.12} />}
        <Respingos k={n("espirra")} t={t} teto={n("tampa") > 0.8 ? H_PANELA + 0.02 : undefined} />
        {n("tampa") > 0.01 && potK > 0.02 && <Tampa k={n("tampa")} />}
      </group>
      <Manchas k={n("sujo")} />
      <Guardanapo k={n("guardanapo")} mancha={n("mancha")} />

      {/* o forno (do fogão, depois a caixinha e o aparelho): desenhado no sistema próprio e escalado */}
      <EscCtx.Provider value={sMod}>
        <group position={[PX, PY, PZ]} scale={sMod}>
          <group position={[-X0, -CY, 0]}>
            <Forno g={g} corpo={corpo} porta={porta} luz={n("luzForno")} painel={n("painel")} texto={tela} t={t} sino={n("sino")} semPorta={f > 0.02} />
            <Resistencia g={g} y={resY} res={res} />
            <Ventilador g={g} giro={ventGiro} vel={vent} k={fan} />
            {bandeja > 0.01 && kBandeja > 0.001 && naAssadeira && <Assadeira g={g} k={kBandeja} />}
            {cesto > 0.5 && kCesto > 0.001 && <Cesto g={g} k={kCesto} zExtra={puxa} />}
            {gaveta > 0.001 && <Gaveta g={g} k={gaveta} corpo={corpo} zExtra={puxa} />}
            {pilha && (
              <Pilha g={g} base={baseY} zOff={zOff} zExtra={puxa} doura={doura} seca={n("seca")} expo={n("expo", 1)} frio={n("frio")} brilho={n("brilho")} palitos={1}
                altura={altura} queda={n("queda", 1)} qtd={n("qtd", 1)} />
            )}
            {solo > 0.02 && (
              <group>
                <BatataSolo p={[X0, g.yb + 0.55, -0.3]} esc={1.3 * solo} doura={doura} capa={n("capa")} t={t} />
                {p >= n("setasDe", 0) && <SetasBatata p={[X0, g.yb + 0.55, -0.3]} esc={1.3} capa={n("capa")} t={t} giro={vent} />}
              </group>
            )}
            {fumaca > 0.02 && <Fumaca p={[X0, topoCesto - 0.05, -0.3]} t={t} k={fumaca} alt={g.hi * 0.7} larg={g.wi * 1.2} />}
            {vapor > 0.02 && <Fumaca p={[X0 - 0.1, topoPilha, -0.1]} t={t} k={vapor} cor="#ffffff" alt={0.55} larg={0.3} op={0.7} />}
            {ar && arOp > 0 && <Fluxo rotas={ar.rotas} t={t} n={ar.n} vel={ar.vel} cor={ar.cor} w={ar.w} op={ar.op} decai={ar.decai} />}
            <ManchaChao g={g} k={n("mancha1")} />
            <Gotas g={g} k={gotasK} t={t} y0={baseCesto - 0.02} y1={yGota1} />
            {kGar > 0.02 && <Garrafa p={[X0 - 0.35, g.yb + 0.7, -0.2]} k={kGar} fio={n("fio")} t={t} alvoY={topoPilha} />}
            {n("fatia") > 0.02 && <Fatia p={[X0 + 0.5, fatiaY, 0.55]} tam={n("fatiaTam", 1.25)} pen={n("pen")} forma="q" k={n("fatia")} />}
            {n("fantasma") > 0.02 && <Fatia p={[X0 - 0.62, fatiaY, 0.55]} tam={0.8} pen={n("penF", 0.5)} forma="c" k={n("fantasma")} alfa={0.85} />}
            {b("termo") && <Termo3D g={g} temp={temp} linha={n("linha")} t={t} />}
            <Sensor g={g} yBase={topoCesto + 0.05} k={n("sensor")} t={t} />
            {papel > 0.01 && <Papel x={X0} z={-0.4} y0={baseCesto + 0.02} yRes={resY} lift={lift} fogo={fogoPapel} t={t} vis={clamp01(papel * 6) * n("papelVis", 1)} larg={larg} ent={n("papelEntra", 1)} />}
            {fogoPapel > 0.02 && <Chama p={[X0 - 0.35, resY - 0.1, 0.1]} k={clamp01(fogoPapel * 4)} t={t} esc={0.85} />}
            {fogoPapel > 0.02 && <Fumaca p={[X0, resY, -0.3]} t={t} k={fogoPapel} alt={0.5} larg={0.3} />}
            {(cena.marcas === "ok" || cena.marcas === "ambas") && p < 0.56 && <Marca p={[X0 + g.wi * 0.35, baseCesto + 0.45, 0.35]} ok k={n("marcaK", 1)} esc={1.4} />}
            {(cena.marcas === "x" || cena.marcas === "ambas") && p >= 0.6 && <Marca p={[X0, baseCesto + 0.08, 0.3]} ok={false} k={n("marcaK2", n("marcaK", 1))} esc={2.2} />}
            {n("partida") > 0.02 && (
              <group position={[X0 + 0.12, topoCesto + 0.05 + 0.2 * suave(n("partida")), 0.0]}>
                {[-1, 1].map((sg) => <mesh key={sg} position={[sg * 0.05 * (0.4 + suave(n("partida"))), 0, 0]} rotation={[0, 0, sg * 0.35 * suave(n("partida"))]}><boxGeometry args={[0.2, 0.05, 0.05]} /><meshStandardMaterial color="#e2a63e" roughness={0.6} /></mesh>)}
              </group>
            )}
            {n("dist") > 0.02 && (
              <group>
                <Seta a={[X0 + g.wi - 0.45, (resY + topoCesto) / 2, 0.15]} b={[X0 + g.wi - 0.45, resY - 0.06, 0.15]} cor="#ffd23f" w={0.05} op={n("dist")} />
                <Seta a={[X0 + g.wi - 0.45, (resY + topoCesto) / 2, 0.15]} b={[X0 + g.wi - 0.45, topoCesto + 0.04, 0.15]} cor="#ffd23f" w={0.05} op={n("dist")} />
              </group>
            )}
            {destaque > 0.001 && (
              <group>
                <Halo p={[X0, fanY, ZB + 0.4]} r={0.6} cor="#ffe9a8" op={0.9 * pulso(0)} />
                <Halo p={[X0, resY, -0.3]} r={0.8} cor="#ff8a2a" op={0.9 * pulso(1)} />
                <Halo p={[X0, baseCesto + 0.1, -0.3]} r={0.9} cor="#9fdcff" op={0.9 * pulso(2)} />
                <Halo p={[X0, g.yb + 0.1, 0.1]} r={0.8} cor="#ffe9a8" op={0.9 * pulso(3)} />
              </group>
            )}
          </group>
        </group>
      </EscCtx.Provider>

      {/* micro-ondas e o ponto de interrogação */}
      <MicroOndas k={n("micro")} t={t} />
      {n("interroga") > 0.02 && <Texto3D texto="?" p={[(XB + XM) / 2 + 0.05, CY + 0.62 + 0.12 * suave(n("interroga")) + 0.02 * Math.sin(t * 3), 0.1]} h={0.3} escala={suave(clamp01(n("interroga") * 2))} />}

      {gente.map((gd, i) => <Gente key={`${gd.id}${i}`} g={gd} p={p} t={t} tAbs={tEpisodio} />)}

      {etiqs.map(({ c, ini }) => {
        const d = et[c];
        const de: V = [d.para[0] + d.off[0] * S, d.para[1] + d.off[1] * S, d.para[2] + 0.1];
        return <Etiqueta key={c} texto={d.texto} de={de} para={d.para} k={Kt} cor={d.cor} ymax={n("etiqYmax", 0.64)} pop={p > 0 ? clamp01((t * (p - ini)) / (p * 0.25)) : 1} />;
      })}
    </group>
  );
};

void XS;

const c = (pos: V3, alvo: V3, fov = 50) => ({ pos, alvo, fov });

export const cozinha: Cenario3D = {
  Cena: CozinhaCena,
  padrao: "geral",
  fundo: () => "#f3d6a4",
  luzPropria: true,
  cameras: {
    geral: c([0.3, 1.1, 3.8], [0.3, 0.95, 0], 50),
    fogao: c([-0.6, 1.0, 2.6], [-0.6, 0.9, 0], 50),
  },
};
