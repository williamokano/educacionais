import React from "react";
import { poseDe } from "./acoes";
import { Adereco, CabecaAtras, CabecaFrente } from "./Adereco";
import { desbotar, escurecer } from "./cor";
import { Cabelo, CabeloAtras, Rosto } from "./Rosto";
import { Corpo, Estado, Expressao, Look, Peca, Personagem, Pose, Tema, Variante, Vista } from "./types";

// Medidas do boneco (unidades do viewBox; um adulto padrão mede ~420 do topo da cabeça ao chão).
const CHAO = 412;
const OMBRO_Y = 150;
const QUADRIL_Y = 285;
const TOPO_Y = 124; // topo do tronco
const BASE_Y = 296; // base do tronco
const L = { braco: 62, antebraco: 56, coxa: 70, canela: 62 };
const LARGURA = { magro: 84, medio: 94, forte: 106 };
const rad = (g: number) => (g * Math.PI) / 180;

type Pt = [number, number];
type Lado = -1 | 1;

/** Proporções e postura que vêm da idade; `proporcao` e `cabecaEscala` explícitos vencem. */
const proporcoes = (c: Corpo) => {
  const base = {
    bebe: { tronco: 0.62, membros: 0.5, cabeca: 1.75, coluna: 0, inclina: 0 },
    crianca: { tronco: 0.82, membros: 0.8, cabeca: 1.25, coluna: 0, inclina: 0 },
    adulto: { tronco: 1, membros: 1, cabeca: 1, coluna: 0, inclina: 0 },
    idoso: { tronco: 0.97, membros: 0.97, cabeca: 1, coluna: 7, inclina: 6 },
  }[c.idade ?? "adulto"];
  return {
    tronco: c.proporcao?.tronco ?? base.tronco,
    membros: c.proporcao?.membros ?? base.membros,
    cabeca: c.cabecaEscala ?? base.cabeca,
    coluna: base.coluna, // curvatura extra (perfil)
    inclina: base.inclina, // cabeça para frente/baixo
  };
};

/** Lado do rig (−1 = de trás/esquerda da tela, 1 = da frente/direita) de um membro do personagem. */
const ladoDe = (membro: "direito" | "esquerdo", vista: Vista): Lado =>
  vista === "frente" ? (membro === "direito" ? -1 : 1) : membro === "direito" ? 1 : -1;

/** Pernas: devolve [quadril, joelho, tornozelo] de cada perna. lado: -1 = de trás/esquerda, 1 = da frente/direita */
const perna = (pose: Pose, lado: Lado, k: number): [Pt, Pt, Pt] => {
  const [a, kn] = lado === 1 ? pose.pernaFrente : pose.pernaTras;
  const [coxa, canela] = [L.coxa * k, L.canela * k];
  if (pose.vista === "frente") {
    const enc = pose.encurtarCoxa ?? 1;
    const encC = pose.encurtarCanela ?? 1;
    const q: Pt = [18 * lado, QUADRIL_Y];
    const j: Pt = [q[0] + lado * Math.sin(rad(a)) * coxa * enc, q[1] + Math.cos(rad(a)) * coxa * enc];
    const t: Pt = [j[0] + lado * Math.sin(rad(kn)) * canela * encC, j[1] + Math.cos(rad(kn)) * canela * encC];
    return [q, j, t];
  }
  const q: Pt = [0, QUADRIL_Y];
  const j: Pt = [Math.sin(rad(a)) * coxa, q[1] + Math.cos(rad(a)) * coxa];
  const t: Pt = [j[0] + Math.sin(rad(a - kn)) * canela, j[1] + Math.cos(rad(a - kn)) * canela];
  return [q, j, t];
};

/** Braços: devolve [ombro, cotovelo, mão] */
const braco = (pose: Pose, lado: Lado, meiaLargura: number, ombroY: number, k: number): [Pt, Pt, Pt] => {
  const [a1, a2] = lado === 1 ? pose.bracoFrente : pose.bracoTras;
  const [b, ab] = [L.braco * k, L.antebraco * k];
  if (pose.vista === "frente") {
    const o: Pt = [meiaLargura * lado, ombroY];
    const c: Pt = [o[0] + lado * Math.sin(rad(a1)) * b, o[1] + Math.cos(rad(a1)) * b];
    const m: Pt = [c[0] - lado * Math.sin(rad(a2)) * ab, c[1] + Math.cos(rad(a2)) * ab];
    return [o, c, m];
  }
  const o: Pt = [2, ombroY + 4];
  const c: Pt = [o[0] + Math.sin(rad(a1)) * b, o[1] + Math.cos(rad(a1)) * b];
  const m: Pt = [c[0] + Math.sin(rad(a1 + a2)) * ab, c[1] + Math.cos(rad(a1 + a2)) * ab];
  return [o, c, m];
};

const ponto = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

/** Traço de uma peça: desenha a mesma forma por baixo, engordada, na cor do contorno. */
export const contornar = (el: React.ReactElement, c: number, tinta: string, chave?: string): React.ReactElement =>
  c > 0 ? (
    <React.Fragment key={chave}>
      {React.cloneElement(el as React.ReactElement<any>, { fill: tinta, stroke: tinta, strokeWidth: 2 * c, strokeLinejoin: "round", opacity: 1 })}
      {el}
    </React.Fragment>
  ) : el;

const Segmentos: React.FC<{ pts: Pt[]; larguras: number[]; cores: string[] }> = ({ pts, larguras, cores }) => (
  <g strokeLinecap="round">
    {pts.slice(1).map((p, i) => (
      <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={p[0]} y2={p[1]} stroke={cores[i]} strokeWidth={larguras[i]} />
    ))}
  </g>
);

/** Membro que afina: larguras por junta (n pontos → n larguras); contorno por baixo de todos os trechos. */
const Membro: React.FC<{ pts: Pt[]; larg: number[]; cores: string[]; c: number; tinta: string }> = ({ pts, larg, cores, c, tinta }) => {
  const trechos = pts.slice(1).map((b, i) => ({ a: pts[i], b, wa: larg[i], wb: larg[i + 1], cor: cores[i] }));
  const forma = (t: (typeof trechos)[number], i: number) => {
    const [dx, dy] = [t.b[0] - t.a[0], t.b[1] - t.a[1]];
    const n = Math.hypot(dx, dy) || 1;
    const [nx, ny] = [-dy / n, dx / n];
    const d = `M ${t.a[0] + (nx * t.wa) / 2} ${t.a[1] + (ny * t.wa) / 2} L ${t.b[0] + (nx * t.wb) / 2} ${t.b[1] + (ny * t.wb) / 2} `
      + `L ${t.b[0] - (nx * t.wb) / 2} ${t.b[1] - (ny * t.wb) / 2} L ${t.a[0] - (nx * t.wa) / 2} ${t.a[1] - (ny * t.wa) / 2} Z`;
    return (
      <g key={i}>
        <path d={d} />
        <circle cx={t.a[0]} cy={t.a[1]} r={t.wa / 2} />
        <circle cx={t.b[0]} cy={t.b[1]} r={t.wb / 2} />
      </g>
    );
  };
  return (
    <g>
      {c > 0 && <g fill={tinta} stroke={tinta} strokeWidth={2 * c} strokeLinejoin="round">{trechos.map(forma)}</g>}
      {trechos.map((t, i) => <g key={i} fill={t.cor}>{forma(t, i)}</g>)}
    </g>
  );
};

/** Cinemática inversa de dois ossos: cotovelo e mão para alcançar `alvo` a partir de `o` (alvo longe demais: estica). */
const ik = (o: Pt, alvo: Pt, l1: number, l2: number, prefere: (e: Pt) => number): [Pt, Pt, Pt] => {
  let [dx, dy] = [alvo[0] - o[0], alvo[1] - o[1]];
  let d = Math.hypot(dx, dy) || 1;
  const max = (l1 + l2) * 0.999;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const [ux, uy] = [dx / d, dy / d];
  const base: Pt = [o[0] + ux * a, o[1] + uy * a];
  const e1: Pt = [base[0] - uy * h, base[1] + ux * h];
  const e2: Pt = [base[0] + uy * h, base[1] - ux * h];
  return [o, prefere(e1) >= prefere(e2) ? e1 : e2, [o[0] + dx, o[1] + dy]];
};

/** Adereços que são apoio: a ponta fica no chão e o braço vai até eles (não o contrário). */
const APOIOS = new Set(["muleta", "bengala"]);
type Apoio = { tipo: string; ponta: Pt; topo: Pt; pega: Pt; lado: Lado };

const ApoioDesenho: React.FC<{ a: Apoio; vista: Vista; escurecerPor: number; c: number; tinta: string }> = ({ a, vista, escurecerPor, c, tinta }) => {
  const ct = (el: React.ReactElement, chave?: string) => contornar(el, c, tinta, chave);
  const cor = (h: string) => escurecer(h, escurecerPor);
  const ang = (Math.atan2(a.topo[1] - a.ponta[1], a.topo[0] - a.ponta[0]) * 180) / Math.PI;
  if (a.tipo === "muleta") {
    return (
      <g>
        {ct(<line x1={a.ponta[0]} y1={a.ponta[1]} x2={a.topo[0]} y2={a.topo[1]} stroke={cor("#9AA1AB")} strokeWidth={9} strokeLinecap="round" />, "haste")}
        <g transform={`translate(${a.topo[0]} ${a.topo[1]}) rotate(${ang + 90})`}>{ct(<rect x={-17} y={-6} width={34} height={12} rx={6} fill={cor("#3A3F48")} />)}</g>
        <g transform={`translate(${a.pega[0]} ${a.pega[1]}) rotate(${ang + 90})`}>{ct(<rect x={-12} y={-5} width={24} height={10} rx={4} fill={cor("#3A3F48")} />)}</g>
        {ct(<circle cx={a.ponta[0]} cy={a.ponta[1] - 3} r={6} fill="#2A2420" />, "ponteira")}
      </g>
    );
  }
  // bengala: haste até o cabo, cabo curvo para a frente (perfil) ou para fora (frente)
  const lado = vista === "perfil" ? 1 : a.lado;
  const [x, y] = a.topo;
  return (
    <g>
      {ct(<line x1={a.ponta[0]} y1={a.ponta[1]} x2={x} y2={y} stroke={cor("#6B4A2E")} strokeWidth={9} strokeLinecap="round" />, "haste")}
      {ct(<path d={`M ${x} ${y} Q ${x} ${y - 16} ${x + 14 * lado} ${y - 16} Q ${x + 26 * lado} ${y - 16} ${x + 26 * lado} ${y - 4}`} stroke={cor("#6B4A2E")} strokeWidth={9} fill="none" strokeLinecap="round" />, "cabo")}
      {ct(<circle cx={a.ponta[0]} cy={a.ponta[1] - 3} r={5} fill="#2A2420" />, "ponteira")}
    </g>
  );
};

const rasgo = (x: number, y: number, s: number) =>
  `M ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.6} L ${x + s * 0.2} ${y - s * 0.2} L ${x + s} ${y - s * 0.5} L ${x + s * 0.6} ${y + s * 0.3} L ${x + s * 0.1} ${y + s * 0.7} L ${x - s * 0.5} ${y + s * 0.4} Z`;

/** Marcas de desgaste numa área (lista de pontos onde podem aparecer). */
const Desgaste: React.FC<{ estados: Estado[]; pontos: Pt[]; pele: string; cor: string }> = ({ estados, pontos, pele, cor }) => (
  <g>
    {estados.includes("suja") && pontos.map(([x, y], i) => (
      <ellipse key={`s${i}`} cx={x + 6} cy={y + 10} rx={13} ry={8} fill="#3A3024" opacity={0.22} transform={`rotate(${i * 37} ${x} ${y})`} />
    ))}
    {estados.includes("rasgada") && pontos.filter((_, i) => i % 2 === 0).map(([x, y], i) => (
      <path key={`r${i}`} d={rasgo(x, y, 9)} fill={pele} />
    ))}
    {estados.includes("remendada") && pontos.slice(0, 1).map(([x, y], i) => (
      <rect key={`p${i}`} x={x - 10} y={y - 8} width={20} height={16} fill={escurecer(cor, 1.25)} stroke={escurecer(cor, 0.6)} strokeWidth={2} strokeDasharray="3 3" />
    ))}
  </g>
);

/** Relógio ou pulseira no pulso: centro e ângulo do antebraço. */
const Pulso: React.FC<{ peca: Peca; em: Pt; ang: number; larg: number }> = ({ peca, em, ang, larg }) => (
  <g transform={`translate(${em[0]} ${em[1]}) rotate(${ang})`}>
    {peca.id === "relogio" ? (
      <g>
        <rect x={-4} y={-larg / 2 - 2} width={9} height={larg + 4} rx={3} fill={peca.cor} />
        <circle cx={0} cy={0} r={7} fill={peca.cor2 ?? "#E8E4DA"} stroke={escurecer(peca.cor, 0.7)} strokeWidth={2} />
      </g>
    ) : (
      <rect x={-3} y={-larg / 2 - 1} width={6} height={larg + 2} rx={3} fill={peca.cor} />
    )}
  </g>
);

/** Tronco com forma (tema detalhado ou silhueta feminina). Masculino: ombro largo afinando; feminino: cintura e quadril. */
const troncoForma = (w: number, topo: number, vista: Vista, feminina: boolean, rOmbro = 24): string => {
  const base = BASE_Y;
  const r = 20;
  const ro = rOmbro;
  if (vista === "perfil") {
    return `M ${-w / 2} ${topo + r} Q ${-w / 2} ${topo} ${-w / 2 + r} ${topo} L ${w / 2 - r} ${topo} Q ${w / 2} ${topo} ${w / 2} ${topo + r} `
      + `L ${w / 2} ${base - r} Q ${w / 2} ${base} ${w / 2 - r} ${base} L ${-w / 2 + r} ${base} Q ${-w / 2} ${base} ${-w / 2} ${base - r} Z`;
  }
  if (feminina) {
    const [om, ci, qu] = [w * 0.42, w * 0.34, w * 0.47];
    const meio = topo + (base - topo) * 0.55;
    return `M ${-om} ${topo + ro} Q ${-om} ${topo} ${-om + ro} ${topo} L ${om - ro} ${topo} Q ${om} ${topo} ${om} ${topo + ro} `
      + `Q ${ci} ${meio} ${qu} ${base - 14} Q ${qu} ${base} ${qu - r} ${base} L ${-qu + r} ${base} Q ${-qu} ${base} ${-qu} ${base - 14} `
      + `Q ${-ci} ${meio} ${-om} ${topo + ro} Z`;
  }
  const ci = w * 0.44;
  return `M ${-w / 2} ${topo + ro} Q ${-w / 2} ${topo} ${-w / 2 + ro} ${topo} L ${w / 2 - ro} ${topo} Q ${w / 2} ${topo} ${w / 2} ${topo + ro} `
    + `L ${ci} ${base - r} Q ${ci} ${base} ${ci - r} ${base} L ${-ci + r} ${base} Q ${-ci} ${base} ${-ci} ${base - r} Z`;
};

export type BonecoProps = {
  personagem: Personagem;
  look: string;
  acao: string;
  t: number; // segundos desde o início da ação
  vista: Vista;
  expressao: Expressao;
  variante?: Variante;
  tema: Tema;
  /** pose já calculada (o episódio mistura poses entre batidas); sem ela, a pose sai de `acao` em `t` */
  pose?: Pose;
  /** false = sem a sombra no chão (pendurado na escada, no ar) */
  sombraChao?: boolean;
};

export const Boneco: React.FC<BonecoProps> = ({ personagem, look: lookId, acao, t, vista, expressao, variante = "normal", tema, pose: poseExterna, sombraChao = true }) => {
  const look: Look | undefined = personagem.looks[lookId];
  if (!look) throw new Error(`look "${lookId}" não existe para ${personagem.id}`);
  const corpo: Corpo = look.corpo
    ? { ...personagem.corpo, ...look.corpo, rosto: { ...personagem.corpo.rosto, ...look.corpo.rosto } }
    : personagem.corpo;
  const infectado = variante === "infectado";
  const det2 = !!tema.detalhado; // traço por peça, membros que afinam, tronco com forma
  const c = tema.contorno;
  const tinta = tema.corContorno;
  const ct = (el: React.ReactElement, chave?: string) => contornar(el, c, tinta, chave);
  const prop = proporcoes(corpo);
  const feminina = corpo.silhueta === "feminina";

  const acaoPose = poseExterna ?? poseDe(acao, t, vista);
  // adereços do look entram quando a ação não ocupa a mão
  const base0: Pose = {
    ...acaoPose,
    maoFrente: acaoPose.maoFrente ?? look.aderecos?.maoFrente,
    maoTras: acaoPose.maoTras ?? look.aderecos?.maoTras,
  };
  // postura da idade (idoso: costas curvadas, cabeça para frente)
  const base: Pose = prop.coluna || prop.inclina
    ? { ...base0, coluna: (base0.coluna ?? 0) + (vista === "perfil" ? prop.coluna : 0), cabeca: (base0.cabeca ?? 0) + (vista === "perfil" ? prop.inclina : 0) }
    : base0;
  const pose: Pose = infectado
    ? { ...base, coluna: (base.coluna ?? 0) + (vista === "perfil" ? 10 : 4), cabeca: (base.cabeca ?? 0) + 12 }
    : base;

  const estadosDe = (e?: Estado[]): Estado[] => (infectado ? [...new Set([...(e ?? []), "rasgada", "suja"] as Estado[])] : e ?? []);
  const corDe = (peca?: { cor: string; estado?: Estado[] }) =>
    peca ? (estadosDe(peca.estado).includes("gasta") || infectado ? desbotar(peca.cor) : peca.cor) : undefined;

  const pele = infectado ? tema.infectado.pele : corpo.pele;
  const troncoPeca = look.macacao ?? look.tronco;
  const pernasPeca = look.macacao ?? look.pernas;
  const corTronco = corDe(troncoPeca) ?? pele;
  const corPernas = corDe(pernasPeca) ?? pele;
  const corAntebraco = look.mangaCurta ? pele : corTronco;
  const corMao = corDe(look.maos) ?? pele;
  const corPe = corDe(look.pes)!;
  const sombra = (cor: string) => (vista === "perfil" ? escurecer(cor, tema.sombraMembroTras) : cor);
  const hazmat = look.cabeca?.id === "capuz-hazmat";
  const capuzErguido = look.cabeca?.id === "capuz";

  const w = LARGURA[corpo.porte] * (vista === "perfil" ? 0.72 : 1) * (feminina ? 0.94 : 1);
  const espessura = (corpo.porte === "forte" ? 4 : corpo.porte === "magro" ? -2 : 0) - (feminina ? 1.5 : 0);
  const k = prop.membros;
  const bordaOmbro = vista === "frente" && feminina ? w * 0.42 : w / 2;
  const meiaBraco = ((24 + espessura) * Math.max(0.75, k)) / 2; // meia largura do braço no ombro (tema detalhado)
  const ombroNoCanto = det2 && vista === "frente";
  // a "bola" do ombro fica quase toda fora do tronco e só encosta na quina de cima (centro a 3/4 do raio para fora)
  // adulto e idoso: a bola desce um pouco e entra um pouco (na criança, a proporção já fecha sem ajuste)
  const crianca = corpo.idade === "crianca" || corpo.idade === "bebe";
  const meiaOmbro = ombroNoCanto ? bordaOmbro + meiaBraco * 0.75 - (crianca ? 0 : 3) : bordaOmbro;

  // tronco mais curto (bebê, criança): o topo desce; cabeça, ombros e mochila acompanham
  const topo = QUADRIL_Y - (QUADRIL_Y - TOPO_Y) * prop.tronco;
  const ombroY = ombroNoCanto ? topo + meiaBraco * 0.8 + (crianca ? 0 : 6) : QUADRIL_Y - (QUADRIL_Y - OMBRO_Y) * prop.tronco;
  const dTopo = topo - TOPO_Y;

  const membros = corpo.membros ?? {};
  const pernaTipo = (lado: Lado) =>
    ladoDe("direito", vista) === lado ? membros.pernaDireita : membros.pernaEsquerda;
  const bracoTipo = (lado: Lado) =>
    ladoDe("direito", vista) === lado ? membros.bracoDireito : membros.bracoEsquerdo;
  const pulsoDe = (lado: Lado) =>
    ladoDe("direito", vista) === lado ? look.pulsos?.direito : look.pulsos?.esquerdo;

  const pernaT = perna(pose, -1, k);
  const pernaF = perna(pose, 1, k);
  let bracoT = braco(pose, -1, meiaOmbro, ombroY, k);
  let bracoF = braco(pose, 1, meiaOmbro, ombroY, k);
  const apoioNa = (lado: Lado) => {
    const id = lado === 1 ? pose.maoFrente : pose.maoTras;
    return id && APOIOS.has(id) && bracoTipo(lado) !== "ausente" ? id : undefined;
  };
  const temApoio = !!(apoioNa(-1) || apoioNa(1));

  // apoia no chão: o ponto mais baixo (pé ou quadril, se sentado) encosta em CHAO; perna ausente não apoia.
  // O deslocamento é aplicado DEPOIS da escala de altura (ver transform no retorno), por isso multiplica pela altura.
  const apoios = [
    pernaTipo(-1) === "ausente" ? -Infinity : pernaT[2][1] + 14 * k,
    pernaTipo(1) === "ausente" ? -Infinity : pernaF[2][1] + 14 * k,
  ];
  const quadrilApoiado = temApoio && (pernaTipo(-1) === "ausente" || pernaTipo(1) === "ausente")
    ? QUADRIL_Y + (L.coxa + L.canela) * k * 0.92 + 14 * k
    : -Infinity;
  const maisBaixo = Math.max(...apoios, QUADRIL_Y + 10, quadrilApoiado);
  const descer = (CHAO - maisBaixo) * corpo.altura - (pose.pulo ?? 0);
  // respiração: o tronco sobe e desce 1,5 px (o tronco gira no quadril, então não descola das pernas)
  const folego = Math.sin(t * 2.2) * 1.5;

  // apoios: a ponta fica no chão; o braço é recalculado (IK) para a mão chegar à empunhadura.
  // O braço vive dentro de corpoSuperior (respiração + inclinação da coluna), o apoio fora: converte entre os dois.
  const giro = rad(pose.coluna ?? 0);
  const paraFora = ([x, y]: Pt): Pt => {
    const [dx, dy] = [x, y - QUADRIL_Y];
    return [dx * Math.cos(giro) - dy * Math.sin(giro), QUADRIL_Y + dx * Math.sin(giro) + dy * Math.cos(giro) + folego];
  };
  const paraDentro = ([x, y]: Pt): Pt => {
    const [dx, dy] = [x, y - folego - QUADRIL_Y];
    return [dx * Math.cos(-giro) - dy * Math.sin(-giro), QUADRIL_Y + dx * Math.sin(-giro) + dy * Math.cos(-giro)];
  };
  const yChao = CHAO - descer / corpo.altura;
  const apoiosCena: Apoio[] = [];
  for (const lado of [-1, 1] as Lado[]) {
    const tipo = apoioNa(lado);
    if (!tipo) continue;
    const pts = lado === 1 ? bracoF : bracoT;
    const ombro = paraFora(pts[0]);
    const xPonta = vista === "perfil" ? (pose.apoio?.x ?? 30) - (lado === -1 ? 10 : 0) : lado * (meiaOmbro + 30);
    const ponta: Pt = [xPonta, yChao - (vista === "perfil" ? pose.apoio?.ergue ?? 0 : 0)];
    let topo: Pt;
    let pega: Pt;
    if (tipo === "muleta") {
      // do chão até a axila; a mão na barra do meio
      topo = [ombro[0] + (vista === "perfil" ? -4 : lado * 4), ombro[1] + 16];
      pega = ponto(ponta, topo, 0.64);
    } else {
      // bengala de comprimento fixo (altura da mão com o braço caído), inclinada na direção do ombro
      const comp = yChao - (ombroY + (L.braco + L.antebraco) * k * 0.86);
      const mira: Pt = [ponta[0] + (ombro[0] - ponta[0]) * 0.3, ombro[1]];
      const n = Math.hypot(mira[0] - ponta[0], mira[1] - ponta[1]) || 1;
      topo = [ponta[0] + ((mira[0] - ponta[0]) / n) * comp, ponta[1] + ((mira[1] - ponta[1]) / n) * comp];
      pega = topo;
    }
    // cotovelo: para trás no perfil, para fora de frente
    const prefere = (e: Pt) => (vista === "perfil" ? -e[0] : lado * e[0]);
    const novo = ik(pts[0], paraDentro(pega), L.braco * k, L.antebraco * k, prefere);
    if (lado === 1) bracoF = novo; else bracoT = novo;
    apoiosCena.push({ tipo, ponta, topo, pega, lado });
  }
  const almofada = (lado: Lado) => {
    const a = apoiosCena.find((x) => x.lado === lado && x.tipo === "muleta");
    if (!a) return null;
    const ang = (Math.atan2(a.topo[1] - a.ponta[1], a.topo[0] - a.ponta[0]) * 180) / Math.PI;
    return (
      <g>
        {contornar(<line x1={a.pega[0]} y1={a.pega[1]} x2={a.topo[0]} y2={a.topo[1]} stroke="#9AA1AB" strokeWidth={8} strokeLinecap="round" opacity={0.95} />, c, tinta, "h")}
        <g transform={`translate(${a.topo[0]} ${a.topo[1]}) rotate(${ang + 90})`}>{contornar(<rect x={-17} y={-6} width={34} height={12} rx={6} fill="#3A3F48" />, c, tinta, "p")}</g>
      </g>
    );
  };
  const desenharApoio = (lado: Lado) => {
    const a = apoiosCena.find((x) => x.lado === lado);
    return a && <ApoioDesenho a={a} vista={vista} escurecerPor={vista === "perfil" && lado === -1 ? tema.sombraMembroTras : 1} c={c} tinta={tinta} />;
  };

  const piscar = t % 3.2 < 0.12 ? 0.1 : 1;
  const estTronco = estadosDe(troncoPeca?.estado);
  const estPernas = estadosDe(pernasPeca?.estado);
  const det = troncoPeca?.detalhes ?? [];

  const Pe: React.FC<{ p: Pt; cor: string }> = ({ p, cor }) => {
    const s = Math.max(0.6, k);
    return ct(vista === "frente"
      ? <rect x={p[0] - 17 * s} y={p[1] - 2} width={34 * s} height={16 * s} rx={8 * s} fill={cor} />
      : <rect x={p[0] - 10 * s} y={p[1] - 2} width={40 * s} height={16 * s} rx={8 * s} fill={cor} />);
  };

  const bermuda = pernasPeca?.detalhes?.includes("bermuda");
  const canoAlto = look.pes.detalhes?.includes("cano-alto");
  const largPerna = det2 ? [30 + espessura, 23 + espessura, 18 + espessura].map((v) => v * Math.max(0.75, k)) : [26 + espessura, 22 + espessura];
  const largBraco = det2 ? [24 + espessura, 19 + espessura, 15 + espessura].map((v) => v * Math.max(0.75, k)) : [22 + espessura, 20 + espessura];

  const Perna: React.FC<{ pts: [Pt, Pt, Pt]; tras: boolean; tipo?: "ausente" | "pau" }> = ({ pts, tras, tipo }) => {
    const cor = tras ? sombra(corPernas) : corPernas;
    const canela = bermuda ? (tras ? sombra(pele) : pele) : cor;
    const at = (f: number): Pt => ponto(pts[1], pts[2], f);
    const mid = at(0.5);
    if (tipo === "ausente") {
      // coto: só o começo da coxa, com a barra da calça dobrada
      const fim = ponto(pts[0], pts[1], 0.42);
      return det2
        ? <Membro pts={[pts[0], fim]} larg={[largPerna[0], largPerna[0] * 0.95]} cores={[cor]} c={c} tinta={tinta} />
        : <Segmentos pts={[pts[0], fim]} larguras={[largPerna[0]]} cores={[cor]} />;
    }
    if (tipo === "pau") {
      // coxa normal, barra no joelho e uma estaca de madeira até o chão
      const madeira = tras ? sombra("#8A6440") : "#8A6440";
      return (
        <g>
          {det2
            ? <Membro pts={[pts[0], pts[1]]} larg={[largPerna[0], largPerna[1] + 2]} cores={[cor]} c={c} tinta={tinta} />
            : <Segmentos pts={[pts[0], pts[1]]} larguras={[largPerna[0]]} cores={[cor]} />}
          <Membro pts={[pts[1], [pts[2][0], pts[2][1] + 12]]} larg={[13, 8]} cores={[madeira]} c={c} tinta={tinta} />
          {ct(<circle cx={pts[1][0]} cy={pts[1][1]} r={largPerna[1] / 2 + 2} fill={escurecer(cor, 0.85)} />)}
          {ct(<circle cx={pts[2][0]} cy={pts[2][1] + 12} r={5} fill="#2A2420" />)}
        </g>
      );
    }
    return (
      <g>
        {det2
          ? <Membro pts={pts} larg={largPerna} cores={[cor, canela]} c={c} tinta={tinta} />
          : <Segmentos pts={pts} larguras={largPerna} cores={[cor, canela]} />}
        {bermuda && <circle cx={pts[1][0]} cy={pts[1][1]} r={14 + espessura / 2} fill={cor} />}
        {canoAlto && (
          <line x1={at(0.55)[0]} y1={at(0.55)[1]} x2={pts[2][0]} y2={pts[2][1]} stroke={tras ? sombra(corPe) : corPe} strokeWidth={(det2 ? largPerna[2] + 6 : 26 + espessura)} strokeLinecap="round" />
        )}
        {pernasPeca?.detalhes?.includes("faixa-refletiva") && (
          // faixa atravessando a canela: trecho curto da própria canela, na cor da faixa
          <line x1={at(0.5)[0]} y1={at(0.5)[1]} x2={at(0.62)[0]} y2={at(0.62)[1]} stroke={pernasPeca.cor2 ?? "#D8DCD0"} strokeWidth={(det2 ? largPerna[1] : 22 + espessura)} />
        )}
        <Desgaste estados={estPernas} pontos={[pts[1], mid]} pele={pele} cor={cor} />
        <Pe p={pts[2]} cor={tras ? sombra(corPe) : corPe} />
      </g>
    );
  };

  const Braco: React.FC<{ pts: [Pt, Pt, Pt]; tras: boolean; lado: Lado; adereco?: string; giro?: number }> = ({ pts, tras, lado, adereco, giro }) => {
    const cTronco = tras ? sombra(corTronco) : corTronco;
    const cAnte = tras ? sombra(corAntebraco) : corAntebraco;
    if (bracoTipo(lado) === "ausente") {
      // coto: manga curta fechada logo abaixo do ombro
      const fim = ponto(pts[0], pts[1], 0.38);
      return det2
        ? <Membro pts={[pts[0], fim]} larg={[largBraco[0], largBraco[0] * 0.95]} cores={[cTronco]} c={c} tinta={tinta} />
        : <Segmentos pts={[pts[0], fim]} larguras={[largBraco[0]]} cores={[cTronco]} />;
    }
    const anguloAnte = (Math.atan2(pts[2][1] - pts[1][1], pts[2][0] - pts[1][0]) * 180) / Math.PI;
    const pulso = pulsoDe(lado);
    const punho = det.includes("punhos") && !look.mangaCurta;
    const rMao = 12 * Math.max(0.7, k) * (det2 ? 1.08 : 1);
    return (
      <g>
        {det2
          ? <Membro pts={pts} larg={largBraco} cores={[cTronco, cAnte]} c={c} tinta={tinta} />
          : <Segmentos pts={pts} larguras={largBraco} cores={[cTronco, cAnte]} />}
        {punho && <Pulso peca={{ id: "pulseira", cor: escurecer(cAnte, 0.8) }} em={ponto(pts[1], pts[2], 0.86)} ang={anguloAnte} larg={(det2 ? largBraco[2] : 20) + 2} />}
        {pulso && <Pulso peca={{ ...pulso, cor: tras ? sombra(pulso.cor) : pulso.cor }} em={ponto(pts[1], pts[2], 0.8)} ang={anguloAnte} larg={det2 ? largBraco[2] : 18} />}
        {ct(<circle cx={pts[2][0]} cy={pts[2][1]} r={rMao} fill={tras ? sombra(corMao) : corMao} />)}
        {adereco && !APOIOS.has(adereco) && <g transform={`translate(${pts[2][0]} ${pts[2][1]})`}><Adereco id={adereco} giro={giro} /></g>}
      </g>
    );
  };

  const formaTronco = det2 || feminina
    ? <path d={troncoForma(w, topo, vista, feminina, 20)} fill={corTronco} />
    : <rect x={-w / 2} y={topo} width={w} height={BASE_Y - topo} rx={vista === "frente" ? 24 : 20} fill={corTronco} />;

  const torso = (
    <g>
      {ct(formaTronco)}
      {feminina && vista === "perfil" && <ellipse cx={w / 2 - 2} cy={topo + 52} rx={9} ry={15} fill={corTronco} />}
      {corpo.porte === "forte" && vista === "perfil" && <ellipse cx={w / 2 - 4} cy={238} rx={20} ry={40} fill={corTronco} />}
      {look.macacao && vista === "frente" && det.includes("ziper") && <line x1={0} y1={topo + 8} x2={0} y2={290} stroke={escurecer(corTronco, 0.75)} strokeWidth={3} />}
      {!look.macacao && det.includes("ziper") && vista === "frente" && det2 && <line x1={0} y1={topo + 18} x2={0} y2={292} stroke={escurecer(corTronco, 0.72)} strokeWidth={3} />}
      {det.includes("gola") && vista === "frente" && <path d={`M -18 ${topo} L 0 ${topo + 22} L 18 ${topo} Z`} fill={escurecer(corTronco, 0.8)} />}
      {det.includes("faixa-refletiva") && <rect x={-w / 2} y={196} width={w} height={12} fill={troncoPeca?.cor2 ?? "#D8DCD0"} />}
      {det.includes("cracha") && (vista === "frente"
        ? <g><rect x={-w / 2 + 12} y={150} width={18} height={24} rx={2} fill="#F4F1EA" /><rect x={-w / 2 + 12} y={150} width={18} height={6} fill="#C8372D" /></g>
        : <rect x={w / 2 - 14} y={152} width={10} height={20} rx={2} fill="#F4F1EA" />)}
      {det.includes("bolsos") && vista === "frente" && <rect x={w / 2 - 34} y={150} width={22} height={22} rx={3} fill={escurecer(corTronco, 0.88)} />}
      {det.includes("bolso-canguru") && (vista === "frente"
        ? <path d={`M ${-w * 0.3} 266 L ${-w * 0.24} 226 L ${w * 0.24} 226 L ${w * 0.3} 266 Z`} fill={escurecer(corTronco, 0.86)} />
        : <path d={`M ${w / 2 - 30} 226 L ${w / 2} 226 L ${w / 2} 266 L ${w / 2 - 24} 266 Z`} fill={escurecer(corTronco, 0.86)} />)}
      {det.includes("cordao") && vista === "frente" && (
        <g stroke={troncoPeca?.cor2 ?? "#E8E1D3"} strokeWidth={3} strokeLinecap="round">
          <line x1={-9} y1={topo + 6} x2={-11} y2={topo + 48} /><line x1={9} y1={topo + 6} x2={11} y2={topo + 48} />
        </g>
      )}
      {(det.includes("camiseta-por-baixo") || det.includes("camisa-para-fora")) && (vista === "frente"
        ? <path d={`M -20 ${topo} L 0 ${topo + 80} L 20 ${topo} Z`} fill={troncoPeca?.cor2 ?? "#222226"} />
        : <rect x={w / 2 - 8} y={topo + 2} width={8} height={70} fill={troncoPeca?.cor2 ?? "#222226"} />)}
      {det.includes("camiseta-por-baixo") && vista === "frente" && (
        <g stroke={escurecer(corTronco, 0.72)} strokeWidth={4} fill="none"><path d={`M -20 ${topo} L -6 ${topo + 72}`} /><path d={`M 20 ${topo} L 6 ${topo + 72}`} /></g>
      )}
      {det.includes("camisa-para-fora") && (
        <g fill={troncoPeca?.cor2 ?? "#F4F1EA"}>
          <rect x={-w / 2 + 8} y={284} width={w - 16} height={18} rx={4} />
          {vista === "frente" && <><path d={`M 20 ${topo - 2} L 4 ${topo + 12} L 14 ${topo + 18} Z`} /><path d={`M -20 ${topo - 2} L -4 ${topo + 12} L -14 ${topo + 18} Z`} /></>}
        </g>
      )}
      {det.includes("estetoscopio") && (vista === "frente"
        ? <g><path d="M -20 124 Q -26 186 0 192 Q 26 186 20 124" stroke="#2A2D33" strokeWidth={4} fill="none" /><circle cx={0} cy={196} r={8} fill="#B9BEC5" /></g>
        : <path d="M -4 124 Q 6 180 22 186" stroke="#2A2D33" strokeWidth={4} fill="none" />)}
      <Desgaste estados={estTronco} pontos={[[-w * 0.22, 236], [w * 0.2, 176], [w * 0.05, 262], [-w * 0.26, 160]]} pele={pele} cor={corTronco} />
      {look.cintura && (
        <g>
          <rect x={-w / 2 - 2} y={262} width={w + 4} height={16} fill={corDe(look.cintura)} />
          {(vista === "frente" ? [-w / 2 + 8, w / 2 - 22] : [w / 2 - 24]).map((x, i) => (
            <rect key={i} x={x} y={270} width={16} height={24} rx={3} fill={escurecer(corDe(look.cintura)!, 0.8)} />
          ))}
        </g>
      )}
    </g>
  );

  // costas: mochila comum ou "caixa" (bag térmica de entrega, quadrada e maior que os ombros)
  const caixa = look.costas?.detalhes?.includes("caixa");
  const corMochila = corDe(look.costas);
  const mochila = look.costas && (caixa
    ? (vista === "perfil"
      ? <g>{ct(<rect x={-w / 2 - 62} y={118} width={70} height={104} rx={8} fill={corMochila} />)}<rect x={-w / 2 - 62} y={138} width={70} height={10} fill={escurecer(corMochila!, 0.8)} /></g>
      : <g>{ct(<rect x={-w / 2 - 16} y={100} width={w + 32} height={112} rx={10} fill={corMochila} />)}<rect x={-w / 2 - 16} y={100} width={w + 32} height={12} rx={6} fill={escurecer(corMochila!, 0.8)} /></g>)
    : (vista === "perfil"
      ? ct(<rect x={-w / 2 - 30} y={140} width={36} height={118} rx={10} fill={corMochila} />)
      : <g>{ct(<rect x={-w / 2 - 12} y={150} width={14} height={100} rx={6} fill={corMochila} />, "a")}{ct(<rect x={w / 2 - 2} y={150} width={14} height={100} rx={6} fill={corMochila} />, "b")}</g>));
  const alcas = look.costas && vista === "frente" && (
    <g fill={escurecer(corMochila!, 0.8)}><rect x={-w / 2 + 6} y={128} width={10} height={90} /><rect x={w / 2 - 16} y={128} width={10} height={90} /></g>
  );

  const ce = prop.cabeca;
  const capuz = det.includes("capuz") && !hazmat && !capuzErguido && (vista === "frente"
    ? ct(<ellipse cx={0} cy={128} rx={44} ry={18} fill={escurecer(corTronco, 0.85)} />)
    : ct(<circle cx={-26} cy={128} r={24} fill={escurecer(corTronco, 0.85)} />));
  const corFone = troncoPeca?.cores?.["fone-pescoco"] ?? "#1C1C1F";
  const fone = det.includes("fone-pescoco") && (vista === "frente"
    ? <g><path d="M -26 128 Q 0 146 26 128" stroke={corFone} strokeWidth={6} fill="none" /><circle cx={-26} cy={128} r={11} fill={corFone} /><circle cx={26} cy={128} r={11} fill={corFone} /></g>
    : <circle cx={8} cy={130} r={12} fill={corFone} />);

  // a cabeça (e tudo que a acompanha) desce junto com o topo do tronco
  const naCabeca = (inner: React.ReactNode) => (
    <g transform={`translate(0 ${dTopo})`}>
      <g transform={`rotate(${pose.cabeca ?? 0} 0 120)`}>
        <g transform={`translate(0 118) scale(${ce}) translate(0 -118)`}>{inner}</g>
      </g>
    </g>
  );
  // o capuz do moletom herda a cor do tronco quando não tem cor própria
  const pecaCabeca: Peca | undefined = capuzErguido && look.cabeca ? { ...look.cabeca, cor: look.cabeca.cor || corTronco } : look.cabeca;
  const semCabelo = hazmat || capuzErguido;

  const orelhas = det2 && vista === "frente" && !semCabelo && (
    <g>{ct(<circle cx={-46} cy={80} r={9} fill={escurecer(pele, 0.94)} />, "oe")}{ct(<circle cx={46} cy={80} r={9} fill={escurecer(pele, 0.94)} />, "od")}</g>
  );

  const cabeca = (
    <g transform={`translate(0 ${dTopo})`}>
      <g transform={`rotate(${pose.cabeca ?? 0} 0 120)`}>
        {capuz}
        {ct(<rect x={det2 ? -10 : -11} y={104} width={det2 ? 20 : 22} height={28} fill={escurecer(pele, 0.92)} />)}
        <g transform={`translate(0 118) scale(${ce}) translate(0 -118)`}>
          <CabecaAtras peca={pecaCabeca} vista={vista} contorno={c} tinta={tinta} />
          {orelhas}
          {ct(<circle cx={0} cy={72} r={46} fill={pele} />)}
          {!semCabelo && <Cabelo corpo={corpo} vista={vista} contorno={c} tinta={tinta} />}
          <Rosto corpo={corpo} vista={vista} expressao={expressao} tema={tema} infectado={infectado} piscar={piscar} pele={pele} boca={pose.boca} olhar={pose.olhar} />
          <CabecaFrente peca={pecaCabeca} vista={vista} contorno={c} tinta={tinta} />
        </g>
        {fone}
      </g>
    </g>
  );
  // cabelo comprido e rabo de cavalo: camada atrás do tronco, presa à cabeça
  const cabeloAtras = !semCabelo && naCabeca(<CabeloAtras corpo={corpo} vista={vista} contorno={c} tinta={tinta} />);

  const joelhosNaFrente = vista === "frente" && pose.pernaFrente[0] > 90;
  const corpoSuperior = (inner: React.ReactNode) => <g transform={`translate(0 ${folego}) rotate(${pose.coluna ?? 0} 0 ${QUADRIL_Y})`}>{inner}</g>;
  const noTopo = (inner: React.ReactNode) => <g transform={`translate(0 ${dTopo})`}>{inner}</g>;

  return (
    <>
    {sombraChao && (pose.deitado
      ? <ellipse cx={200 * corpo.altura} cy={CHAO + 2} rx={210 * corpo.altura} ry={10} fill="#000" opacity={0.18} />
      : <ellipse cx={0} cy={CHAO + 2} rx={70 * corpo.altura * (1 - Math.min(pose.pulo ?? 0, 40) / 80)} ry={9} fill="#000" opacity={0.16} />)}
    <g transform={pose.deitado
      // deitado: gira 90° em torno dos pés (cabeça para a frente, peito para o chão) e sobe meia espessura do corpo
      ? `translate(0 ${CHAO - 34 * corpo.altura}) scale(${corpo.altura}) rotate(90) translate(0 ${-CHAO})`
      : `translate(0 ${descer}) translate(0 ${CHAO}) scale(${corpo.altura}) translate(0 ${-CHAO})`}>
      {vista === "perfil" ? (
        <>
          {corpoSuperior(cabeloAtras)}
          {desenharApoio(-1)}
          <Perna pts={pernaT} tras tipo={pernaTipo(-1)} />
          {corpoSuperior(<><Braco pts={bracoT} tras lado={-1} adereco={pose.maoTras} />{noTopo(mochila)}</>)}
          {corpoSuperior(torso)}
          <Perna pts={pernaF} tras={false} tipo={pernaTipo(1)} />
          {desenharApoio(1)}
          {corpoSuperior(<>{cabeca}<Braco pts={bracoF} tras={false} lado={1} adereco={pose.maoFrente} giro={pose.giroAdereco} /></>)}
          {vista === "perfil" && almofada(1)}
        </>
      ) : (
        <>
          {corpoSuperior(<>{noTopo(mochila)}{cabeloAtras}</>)}
          {!joelhosNaFrente && <><Perna pts={pernaT} tras={false} tipo={pernaTipo(-1)} /><Perna pts={pernaF} tras={false} tipo={pernaTipo(1)} /></>}
          {corpoSuperior(<>{torso}{noTopo(alcas)}{cabeca}</>)}
          {/* sentado de frente: joelhos acima do quadril ficam na frente da barriga */}
          {joelhosNaFrente && <><Perna pts={pernaT} tras={false} tipo={pernaTipo(-1)} /><Perna pts={pernaF} tras={false} tipo={pernaTipo(1)} /></>}
          {desenharApoio(-1)}
          {desenharApoio(1)}
          {corpoSuperior(<>
            <Braco pts={bracoT} tras={false} lado={-1} adereco={pose.maoTras} />
            <Braco pts={bracoF} tras={false} lado={1} adereco={pose.maoFrente} giro={pose.giroAdereco} />
          </>)}
        </>
      )}
    </g>
    </>
  );
};
