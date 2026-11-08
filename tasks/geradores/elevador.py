import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/elevador/roteiro.json (episódio 14, "como o elevador te leva até o 14º andar sem te deixar cair?", 18 batidas) a partir da tabela de cenas de tasks/roteiro-elevador.md (v3, revisão da pessoa).
# Uso (da raiz): python3 tasks/geradores/elevador.py episodios/elevador/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/elevador/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/elevador.tsx (+ elevador-extra.tsx, elevador-perfil.ts, cartao-curva.tsx). Recorte de 5 andares: poço em x = 0 (plataforma), polia em x = 0,7 (y 13,3), contrapeso em x = 1,4; andares em y = 0 / 2,5 / 5,0 / 7,5 / 10,0.
# REGRA: o nome "elevador" só aparece a partir da batida 16 (fala, rótulo, cartão).
B = Base('roteiro-elevador.md', 'elevador', 14, 18)
W = B.W
NL = B.NLEVE
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep14) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep14', 'episode.json')
_bt = []
if os.path.exists(_EPJ):
    _bt = json.load(open(_EPJ, encoding='utf-8')).get('beats', [])
    if len(_bt) == 18 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0:
        _est = B.W
        def W(i, pat, fim=False):
            ps, ws = B.palavras_de(i), _bt[i - 1]['words']
            if len(ps) != len(ws): return _est(i, pat, fim)
            b0, b1 = _bt[i - 1]['start'], _bt[i - 1]['end']
            for k, w in enumerate(ps):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
def dur(i):
    if _bt: return round(_bt[i - 1]['end'] - _bt[i - 1]['start'], 3)
    return round(max(2.4, len(B.palavras_de(i)) / 2.9), 1)
def r3(x): return round(x, 3)
def ps(i, pat, d=0.0, fim=False): return r3(min(0.995, max(0.0, W(i, pat, fim) + d)))

VIRA_E = -math.pi / 2
ERGUE = {"ombroE.x": -2.6, "ombroD.x": -2.6, "cotoveloE.x": -0.4, "cotoveloD.x": -0.4, "tronco.x": -0.15, "maos": 0.2}
GOLPE = {"ombroE.x": -1.3, "ombroD.x": -1.3, "cotoveloE.x": -0.2, "cotoveloD.x": -0.2, "tronco.x": 0.35, "maos": 0.2}
BAIXO = {"ombroE.x": -0.7, "ombroD.x": -0.7, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 0.3}
POLEGAR = {"ombroD.x": -1.25, "cotoveloD.x": -1.5, "ombroD.z": -0.12, "maos": 0.05, "ombroE.z": 0.12, "cotoveloE.x": -0.18}
GRAB = {"ombroE.x": -1.0, "ombroD.x": -1.0, "cotoveloE.x": -0.4, "cotoveloD.x": -0.4, "ombroE.z": 0.1, "ombroD.z": -0.1, "maos": 0.3}
APERTA = {"ombroE.x": -0.9, "ombroE.z": 0.9, "cotoveloE.x": -0.5, "ombroD.z": -0.12, "cotoveloD.x": -0.18, "dedo": 1}
MAO_FORA_D = {"ombroD.z": -1.5, "ombroD.x": -0.1, "cotoveloD.x": -0.05, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "maos": 1}
MAO_FORA = {"ombroE.z": 1.45, "ombroE.x": -0.1, "cotoveloE.x": -0.05, "ombroD.z": -0.12, "cotoveloD.x": -0.18, "maos": 1}
ALCANCA = {"ombroE.x": -1.5, "ombroD.x": -1.5, "cotoveloE.x": -0.08, "cotoveloD.x": -0.08, "ombroE.z": 0.05, "ombroD.z": -0.05, "maos": 1}
OUCH = {"ombroE.x": -1.5, "ombroD.x": -1.5, "cotoveloE.x": -0.08, "cotoveloD.x": -0.08, "ombroE.z": 0.05, "ombroD.z": -0.05, "maos": 1, "tronco.x": -0.35, "cabeca.x": -0.2}
CELULAR = {"ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -1.2, "cotoveloD.x": -1.2, "ombroE.z": 0.05, "ombroD.z": -0.05, "maos": 0.3, "cabeca.x": 0.25}
SUSTO = {"ombroE.z": 0.9, "ombroD.z": -0.9, "ombroE.x": -0.8, "ombroD.x": -0.8, "cotoveloE.x": -0.6, "cotoveloD.x": -0.6, "tronco.x": -0.3, "maos": 1}
BRACOS = {"ombroE.z": 2.5, "ombroD.z": -2.5, "cotoveloE.z": 0.25, "cotoveloD.z": -0.25, "maos": 1}

def pt3(pos, alvo, fov=50): return pt(pos, alvo, fov)
def AJ(x, id, **k): return G(id=id, x=x, z=0.0, rot=VIRA_E, **k)


PRED = dict(predio=1, aco=1, cw=1, cordas=1, pisos=1, poliaK=0, motor=0, sulcos=1, trilhos=1)
cenas = {}
DUR = {}
A5 = 5.0  # andar de interação (laje y = 5,0)

# ---------------------------------------------------------------- 1: aérea descendo do apê (TV ligada) até o Zeca no térreo
def caminho(s, andares=13):
    XA, ST = 1.5, 3.0
    P = [(-2.6, 0), (-XA, 0)]
    for a in range(andares):
        y0 = a * ST
        P += [(XA, y0 + ST / 2), (2.5, y0 + ST / 2), (XA, y0 + ST / 2), (-XA, y0 + ST), (-2.5, y0 + ST), (-XA, y0 + ST)]
    P.pop(); P.append((-2.0, andares * ST))
    L = [math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) for i in range(len(P) - 1)]
    d = max(0, min(1, s)) * sum(L)
    for i, l in enumerate(L):
        if d <= l or i == len(L) - 1:
            u = min(1, d / l) if l else 0
            dx = P[i + 1][0] - P[i][0]
            return (P[i][0] + dx * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u, 1.2 if dx >= 0 else -1.2)
        d -= l
suave = lambda k: -(math.cos(math.pi * max(0, min(1, k))) - 1) / 2
D1 = dur(1); DUR[1] = D1
a1 = ps(1, '^andar')
cenas[1] = M(escadaria=1, gol=0,
  camera=cam(pt3([2.8, 47.5, 10.5], [-1.6, 41.0, 0], 52), pt3([-0.7, 2.5, 5.4], [-1.7, 1.45, 0], 46)),
  gente=[G(x=-1.9, z=0.6, rot=0.4, acao="em-pe", exp="sorriso", pose=[(r3(a1 - 0.2), {}), (r3(a1), OLHA_CIMA), (1, OLHA_CIMA)])])

# ---------------------------------------------------------------- 2: a subida relâmpago, chega morto, o gol já saiu
pe = ps(2, '^morto'); g2 = ps(2, '^gol'); fc = r3(pe + 0.06)
kx, ky, kr = [], [], []
N = 200
for i in range(N + 1):
    p = i / N * pe
    x, y, r = caminho(suave(p / pe))
    kx.append([r3(p), round(x, 3)]); ky.append([r3(p), round(y, 3)]); kr.append([r3(p), r])
kz = [[0, 0.1], [r3(pe), 0.1], [fc, 0.9], [1.0, 0.9]]
kx.append([fc, kx[-1][1]]); ky.append([fc, ky[-1][1]]); kr.append([fc, 0.9])
kx.append([1.0, kx[-1][1]]); ky.append([1.0, ky[-1][1]]); kr.append([1.0, 0.9])
D2 = dur(2); DUR[2] = D2
cenas[2] = M(escadaria=1, gol=V(0, 1, g2, r3(g2 + 0.08)),
  camera=cam(pt3([-0.7, 2.5, 5.4], [-1.7, 1.45, 0], 46), pt3([-0.4, 40.6, 8.6], [-1.0, 39.6, 0], 52), tempo=round(pe * D2, 2)),
  gente=[G(x=kx, z=kz, rot=kr, y=ky, acao=[(pe, "andando", "sorriso"), (fc, "abanando", "cansado"), (1, "em-pe", "cansado")], vel=2.4, suor=V(0, 1, 0.1, pe), deita=V(0, 1, fc, r3(fc + 0.08)))])

# ---------------------------------------------------------------- 3: vão, plataforma, corda, polia, a turma puxa (recorte de 5 andares, topo visível)
v2 = ps(3, '^vão'); p2 = ps(3, '^plataforma'); c2 = ps(3, '^corda'); o2 = ps(3, '^polia'); t2 = ps(3, '^turma'); pu = ps(3, '^puxar')
w0 = r3(p2 + 0.10); wm = r3(w0 + 0.08); w1 = r3(w0 + 0.16)
cenas[3] = M(predio=1, pisos=1, viga=1, bandeiras=1, ajudaY=6.0, vao=V(0, 1, v2, r3(v2 + 0.12)), platK=V(0, 1, p2, r3(p2 + 0.1)), bate=KF((0, 0), (r3(p2 + 0.1), 0), (r3(p2 + 0.11), 1), (r3(p2 + 0.2), 0), (1, 0)),
  cordas=V(0, 1, c2, r3(c2 + 0.06)), poliaK=V(0, 1, o2, r3(o2 + 0.08)),
  plat=V(5.0, 8.2, pu, 0.97), ajuda=V(0, 1, c2, r3(c2 + 0.08)),
  etiq=["plataforma@%s-%s" % (r3(p2 + 0.03), r3(c2)), "corda@%s-%s" % (r3(c2 + 0.03), r3(t2))], etiqS=0.9,
  camera=cam(pt3([-2.2, 6.8, 10.6], [0.5, 7.4, 0], 52), pt3([-1.4, 9.4, 11.0], [0.6, 9.3, 0], 52)),
  gente=[G(id="zeca", naPlat=True, suave=False, rot=[[0, 0.15], [w0, 0.15], [r3(w0 + 0.03), 2.5], [w1, 2.5], [r3(w1 + 0.05), 0.15], [1, 0.15]],
          x=[[0, -1.5], [w0, -1.5], [wm, -0.45], [w1, 0.0], [1, 0.0]], z=[[0, 1.7], [w0, 1.7], [wm, 1.0], [w1, 0.1], [1, 0.1]], y=[[0, -0.1], [r3(w1 - 0.04), -0.1], [w1, 0.0], [1, 0.0]],
          acao=[(w0, "em-pe", "surpreso"), (w1, "andando", "sorriso"), (1, "comemorando", "sorriso")]),
         AJ([[0, 6.0], [t2, 6.0], [r3(t2 + 0.12), 2.8], [1, 2.8]], "ajT", y=A5, acao=[(r3(t2 + 0.12), "andando", "sorriso"), (1, "em-pe", "sorriso")], puxa=V(0, 1, pu, r3(pu + 0.04))),
         AJ([[0, 6.8], [t2, 6.8], [r3(t2 + 0.12), 3.45], [1, 3.45]], "ajT2", y=A5, acao=[(r3(t2 + 0.12), "andando", "sorriso"), (1, "em-pe", "sorriso")], puxa=V(0, 1, pu, r3(pu + 0.04)))])

# ---------------------------------------------------------------- 4: a turma cansa e senta; entra o motor (casa de máquinas)
m3 = ps(4, '^motor')
cenas[4] = M(predio=1, pisos=1, bandeiras=1, ajudaY=6.0, plat=V(8.3, 9.9, round(m3 + 0.05, 3), 1.0), ajuda=1, cordas=1, aco=V(0, 1, m3, r3(m3 + 0.1)), sulcos=V(0, 1, m3, r3(m3 + 0.1)),
  sala=V(0, 1, r3(m3 - 0.06), r3(m3 + 0.06)), motor=V(0, 1, r3(m3 - 0.02), r3(m3 + 0.1)),
  etiq=["motor@%s-%s" % (r3(m3 + 0.02), 0.99)], etiqS=0.9,
  camera=cam(pt3([-1.8, 8.8, 11.8], [0.9, 8.6, 0], 52), pt3([-1.2, 9.2, 11.0], [0.9, 9.2, 0], 52)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.15, naPlat=True, acao="surpreso", exp="surpreso"),
         AJ(2.8, "ajT", y=A5, acao=[(0.3, "em-pe", "cansado"), (1, "sentado", "cansado")], puxa=V(1, 0, 0.1, 0.3), suor=1),
         AJ(3.45, "ajT2", y=A5, acao=[(0.3, "em-pe", "cansado"), (1, "sentado", "cansado")], puxa=V(1, 0, 0.1, 0.3), suor=1)])

# ---------------------------------------------------------------- 5: o motor sua; o peso do outro lado
c4 = ps(5, '^peso'); s4 = ps(5, '^sobe'); d4 = ps(5, '^diferença')
cenas[5] = M(predio=1, pisos=1, bandeiras=1, sala=1, motor=1, aco=1, sulcos=1, cordas=1, suor=V(1, 1), esforco=KF((0, 0), (0.12, 1.0), (c4, 1.0), (r3(c4 + 0.3), 0.15), (1, 0.1)),
  cw=V(0, 1, c4, r3(c4 + 0.12)), plat=KF((0, 9.9), (r3(s4 - 0.02), 9.9), (r3(s4 + 0.12), 7.6), (r3(d4 - 0.04), 9.5), (r3(d4 + 0.02), 9.5), (0.99, A5), (1, A5)),
  etiq=["contrapeso@%s-0.99" % r3(c4 + 0.06)], etiqS=0.9,
  camera=cam(pt3([-1.8, 8.8, 11.8], [0.9, 8.6, 0], 52), pt3([-1.4, 9.2, 10.8], [0.9, 9.2, 0], 52)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.15, naPlat=True, acao="explicando", exp="eureka")],
  c=[dict(tipo="comparacao", titulo="ESFORÇO DO MOTOR", itens=[dict(texto="SEM PESO", valor=2.7, rotulo="ALTO", cor="#ff6a3a"), dict(texto="COM PESO", valor=0.8, rotulo="BAIXO", cor="#5bd47a")], trecho=3, y=40)])

# ---------------------------------------------------------------- 6: ela balança; trilhos de aço
fx = ps(6, '^Fixe'); tr = ps(6, '^trilhos')
cenas[6] = M(PRED, plat=A5, trilhos=V(0, 1, r3(tr - 0.02), r3(tr + 0.12)),
  balanca=KF((0, 0), (0.05, 1), (fx, 1), (r3(tr + 0.1), 0), (1, 0)),
  etiq=["trilho@%s-0.99" % r3(tr + 0.06)], etiqS=0.9,
  camera=cam(pt3([-2.2, 6.4, 9.8], [0.3, 6.1, 0], 50), pt3([-1.4, 6.3, 8.6], [0.2, 6.1, 0], 50)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.15, acao="em-pe", exp="surpreso", naPlat=True, susto=KF((0, 0), (0.08, 1), (fx, 1), (r3(tr + 0.1), 0), (1, 0)))])

# ---------------------------------------------------------------- 7: passa direto; controlador e botão por andar
a5 = ps(7, '^passa'); t5 = ps(7, '^terraço'); k5 = ps(7, '^controlador'); b5 = ps(7, '^botão'); ap = ps(7, '^aperta'); m5 = ps(7, '^manda')
cenas[7] = M(PRED, plat=KF((0, A5), (0.03, A5), (0.09, 2.5), (r3(a5 - 0.05), 2.5), (r3(t5 + 0.02), 14.0), (r3(ap + 0.02), 14.0), (0.97, A5), (1, A5)),
  ctrlX=2.7, ctrlY=8.0, controlador=V(0, 1, r3(k5 - 0.02), r3(k5 + 0.1)), botaoK=V(0, 1, r3(b5 - 0.02), r3(b5 + 0.08)), lit1=KF((0, 0), (ap, 0), (r3(ap + 0.02), 1), (1, 1)),
  etiq=["controlador@%s-%s" % (r3(k5 + 0.04), r3(b5 + 0.03)), "botao@%s-0.99" % r3(b5 + 0.05)], etiqS=0.9,
  camera=cam(pt3([-2.2, 6.6, 10.6], [0.9, 6.2, 0], 52), pt3([-1.8, 6.6, 10.0], [0.9, 6.2, 0], 52)),
  gente=[G(id="zeca", x=-0.55, y=A5, z=1.75, rot=0.25, acao=[(r3(ap - 0.06), "acenando", "surpreso"), (1, "em-pe", "sorriso")], pose=[(r3(ap - 0.06), {}), (r3(ap + 0.14), APERTA), (1, {})])])

# ---------------------------------------------------------------- 8: tranco × curva de velocidade (cartão `curva` + cabine em sincronia)
trc = ps(8, '^tranco'); ent = ps(8, '^Então'); ace = ps(8, '^acelera')
cenas[8] = M(PRED, perfilA=[5.0, 7.5, 0.02, trc], perfilB=[7.5, 5.0, ace, 0.99], plat=5.0,
  ctrlX=-2.3, ctrlY=3.0, controlador=1, botaoK=1, fioMotor=1, lit1=0,
  sacode=KF((0, 0), (trc, 0), (r3(trc + 0.01), 1), (r3(trc + 0.07), 0), (1, 0)), bate=KF((0, 0), (trc, 0), (r3(trc + 0.01), 1), (r3(trc + 0.08), 0), (1, 0)),
  etiq=["controlador@%s-%s" % (r3(ent + 0.02), r3(ent + 0.2))], etiqS=0.9,
  camera=cam(pt3([-3.7, 7.4, 12.6], [-1.4, 6.9, 0], 52), pt3([-3.5, 7.5, 12.2], [-1.4, 7.0, 0], 52)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.15, acao="em-pe", exp="sorriso", naPlat=True, susto=KF((0, 0), (r3(trc - 0.01), 0), (r3(trc + 0.02), 1), (r3(trc + 0.1), 0), (1, 0)))],
  c=[dict(tipo="curva", iniA=0.02, fimA=trc, iniB=ace, fimB=0.99, trocaB=ent, x=36, y=40)])

# ---------------------------------------------------------------- 9: o peso escorrega; luz apaga; freio de mola
e6 = ps(9, '^escorregar'); f6 = ps(9, '^freio'); s6 = ps(9, '^sem$')
cenas[9] = M(PRED, botaoK=1, lit1=1, plat=KF((0, A5), (r3(e6 - 0.1), A5), (r3(e6 + 0.1), 4.35), (1, 4.35)),
  luz=KF((0, 1), (s6, 1), (r3(s6 + 0.05), 0.1), (1, 0.1)), freio=KF((0, 1), (s6, 1), (r3(s6 + 0.06), 0), (1, 0)),
  lupa=V(0, 1, r3(f6 - 0.02), r3(f6 + 0.1)), lupaModo="freio", lupaX=0.2, lupaY=9.6, lupaR=1.15, etiq=["freio@%s-0.99" % r3(f6 + 0.1)], etiqS=0.9,
  camera=cam(pt3([-2.2, 6.4, 11.8], [0.6, 6.2, 0], 52), pt3([0.0, 9.0, 7.4], [0.2, 9.4, 0], 46)),
  gente=[G(id="zeca", x=-0.55, y=A5, z=1.75, rot=0.25, acao="explicando", exp="eureka")])

# ---------------------------------------------------------------- 10: um buraco em cada andar; porta de andar
p7 = ps(10, '^Ponha'); a7 = ps(10, '^ali'); o7 = ps(10, '^porta')
zx = [[0, -1.6], [0.35, -0.6], [0.5, -0.45], [0.62, -0.9], [1, -1.4]]
zz = [[0, 2.7], [0.3, 1.5], [0.4, 1.12], [0.5, 1.12], [0.62, 2.0], [1, 2.1]]
cenas[10] = M(PRED, raiox=0.65, botaoK=1, lit1=0, frente=V(0, 1, r3(p7 - 0.03), r3(p7 + 0.1)), porta2=KF((0, 0), (a7, 0), (r3(a7 + 0.1), 1), (1, 1)), sacode=KF((0, 0), (0.38, 0), (0.42, 1), (0.52, 0), (1, 0)),
  plat=KF((0, 4.35), (0.06, 4.35), (0.2, 0.5), (r3(a7 - 0.1), 0.5), (r3(a7 + 0.04), A5), (1, A5)), etiq=["porta@%s-0.99" % r3(o7 + 0.02)], etiqS=0.9,
  camera=cam(pt3([3.8, 6.4, 9.8], [-0.4, 5.8, 0], 52), pt3([3.4, 6.2, 8.8], [-0.4, 5.8, 0], 52)),
  gente=[G(id="zeca", x=zx, z=zz, y=A5, rot=2.3, acao=[(0.4, "andando", "sorriso"), (0.52, "surpreso", "surpreso"), (0.62, "andando", "surpreso"), (1, "em-pe", "surpreso")], vel=0.6, prop="celular",
          pose=[(0.36, CELULAR), (0.4, CELULAR), (0.58, SUSTO), (0.64, {}), (1, {})], susto=KF((0, 0), (0.5, 0), (0.54, 1), (0.66, 1), (0.74, 0), (1, 0)))])

# ---------------------------------------------------------------- 11: mão pra fora (câmera perto: mão e parede juntas); cabine; as duas portas abrem juntas
m8 = ps(11, '^mão'); c8 = ps(11, '^cabine'); j8 = ps(11, '^juntas')
pt11 = KF((0, 1), (r3(c8 + 0.06), 1), (r3(c8 + 0.12), 0), (r3(j8 - 0.08), 0), (j8, 1), (1, 1))
cenas[11] = M(PRED, pisos=0, raiox=0.5, botaoK=1, lit1=0, frente=V(0, 1, r3(c8 - 0.04), r3(c8 + 0.04)), plat=KF((0, A5), (m8, A5), (r3(c8 - 0.02), 6.5), (r3(c8 + 0.1), 6.6), (r3(j8 - 0.12), 5.0), (1, A5)),
  cabine=V(0, 1, r3(c8 - 0.02), r3(c8 + 0.12)), porta2=pt11, cabPorta=pt11, raspa=KF((0, 0), (r3(m8 + 0.08), 0), (r3(m8 + 0.12), 1), (r3(c8 - 0.02), 1), (r3(c8 + 0.04), 0), (1, 0)),
  etiq=["cabine@%s-0.99" % r3(c8 + 0.04)], etiqS=0.9,
  camera=cam(pt3([1.4, 6.5, 5.0], [-0.85, 6.3, 0.2], 46), pt3([1.4, 7.1, 5.4], [-0.85, 6.9, 0.2], 46)),
  gente=[G(id="zeca", x=-0.25, z=0.2, rot=0.2, acao="em-pe", exp="sorriso", naPlat=True, pose=[(r3(m8 - 0.02), {}), (r3(m8 + 0.06), MAO_FORA_D), (r3(c8 + 0.02), MAO_FORA_D), (r3(c8 + 0.1), {}), (1, {})])])

# ---------------------------------------------------------------- 12: a porta fecha na mão (Looney Tunes); sensor
f9 = ps(12, '^fecha'); s9 = ps(12, '^sensor'); r9 = ps(12, '^reabre'); l9 = ps(12, '^caminho')
GAP = 0.14
pt9 = KF((0, 1), (r3(f9 - 0.03), 1), (r3(f9 + 0.06), GAP), (r3(r9 + 0.02), GAP), (r3(r9 + 0.14), 1), (r3(l9 + 0.02), 1), (1, 0))
cenas[12] = M(PRED, raiox=0.3, botaoK=1, lit1=0, frente=1, plat=A5, cabine=1, porta2=pt9, cabPorta=pt9,
  maoPos=[-0.17, 6.25, 0.85], maoDir=[-0.58, -0.1, 0.81],
  incha=KF((0, 0), (r3(f9 + 0.04), 0), (r3(f9 + 0.1), 1), (r3(r9 + 0.08), 1), (r3(r9 + 0.16), 0), (1, 0)),
  impacto=KF((0, 0), (r3(f9 + 0.04), 0), (r3(f9 + 0.08), 1), (r3(r9 + 0.08), 1), (r3(r9 + 0.16), 0), (1, 0)),
  sensor=V(0, 1, r3(s9 - 0.02), r3(s9 + 0.08)), sensorCorte=KF((0, 0), (r3(s9 + 0.08), 0), (r3(s9 + 0.12), 1), (r3(r9 + 0.1), 1), (r3(r9 + 0.18), 0), (1, 0)), etiq=["sensor@%s-0.99" % r3(s9 + 0.04)], etiqS=0.9,
  camera=cam(pt3([2.7, 6.6, 6.0], [-0.2, 6.0, 0.9], 46), pt3([2.4, 6.5, 5.4], [-0.3, 6.0, 0.9], 46)),
  gente=[G(id="zeca", x=-0.55, y=A5, z=1.4, rot=2.2, acao="em-pe", exp="sorriso",
          pose=[(r3(f9 - 0.04), ALCANCA), (r3(r9 + 0.1), ALCANCA), (r3(r9 + 0.14), {}), (1, {})],
          dor=KF((0, 0), (r3(f9 - 0.01), 0), (r3(f9 + 0.03), 1), (0.94, 1), (1, 0)), solto=KF((0, 0), (r3(r9 + 0.02), 0), (r3(r9 + 0.08), 1), (1, 1)))])

# ---------------------------------------------------------------- 13: vários cabos de aço
v10 = ps(13, '^vários'); r10 = ps(13, '^rompe')
cenas[13] = M(PRED, raiox=0.6, botaoK=1, frente=1, plat=A5, cabine=1, cabPorta=1, cordas=V(1, 4, v10, r3(v10 + 0.1)), quebra=V(0, 1, r3(r10 - 0.04), r3(r10 + 0.04)), corteAt=A5, corteOff=1.2,
  lupa=V(0, 1, r3(v10 + 0.12), r3(v10 + 0.22)), lupaModo="corda", lupaX=-1.1, lupaY=11.0, lupaR=0.9, rompe=V(0, 1, r3(r10 - 0.04), r3(r10 + 0.06)), etiq=["cordas@%s-%s" % (r3(v10 + 0.04), r3(v10 + 0.12))], etiqS=0.9,
  camera=cam(pt3([-2.0, 7.0, 9.6], [0.4, 6.6, 0], 52), pt3([-1.4, 7.2, 8.4], [0.3, 6.8, 0], 50)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.15, naPlat=True, acao="comemorando", exp="sorriso")])

# ---------------------------------------------------------------- 14: se todos rompem: regulador e trava nos trilhos; 1854
e11 = ps(14, '^todos'); rg = ps(14, '^regulador'); pl = ps(14, '^passou'); tv = ps(14, '^trava'); y11 = ps(14, '^1854'); cr = ps(14, '^cortar'); cd = ps(14, '^corda$', 0, True); ela = ps(14, '^Ela$'); bis = ps(14, '^pediu')
cenas[14] = M(PRED, raiox=1, botaoK=1, frente=0, pisos=0, regOn=1, regY=8.6, plat=A5, cabine=1, cabPorta=1, feiraDe=r3(y11 - 0.01),
  corte=V(0, 1, e11, r3(e11 + 0.06)), corteAt=A5, corteOff=1.2, quedaIni=r3(e11 + 0.07), quedaFim=r3(tv + 0.02), quedaD=2.7,
  veloz=V(0, 1, r3(e11 + 0.1), r3(rg)), reg=V(0, 1, r3(pl - 0.02), r3(pl + 0.06)), garras=V(0.05, 1, r3(tv - 0.01), r3(tv + 0.05)), freia=V(0, 1, r3(tv + 0.02), r3(tv + 0.13)), freiaD=0.45, fagulha=V(0, 1, r3(tv + 0.02), r3(y11 - 0.03)),
  lupa=KF((0, 0), (r3(tv - 0.02), 0), (r3(tv + 0.08), 1), (r3(y11 - 0.03), 1), (r3(y11 - 0.01), 0), (1, 0)), lupaModo="trava", lupaX=-1.3, lupaY=0.5, lupaR=0.9,
  etiq=["regulador@%s-%s" % (r3(rg + 0.02), r3(pl)), "trava@%s-%s" % (r3(tv + 0.02), r3(y11 - 0.02))], etiqS=0.8,
  platF=0.9, corteF=V(0, 1, r3(cd - 0.03), r3(cd + 0.03)), corteAtF=0.9, corteOffF=0.3, freiaF=V(0, 1, r3(cd + 0.02), r3(cd + 0.12)), freiaDF=0.28, garrasF=1, fagulhaF=V(0, 1, r3(cd + 0.04), r3(cd + 0.3)),
  aplauso=V(0, 1, r3(ela + 0.02), r3(bis - 0.02)), machado=V(0, 1, cr, cd), machadoPos=[-0.12, 2.4, 1.0],
  camera=cam(pt3([-1.4, 5.6, 9.6], [0.3, 5.3, 0], 50), pt3([-0.9, 1.6, 8.4], [-0.1, 1.2, 0], 50)),
  gente=[G(id="zeca", x=0, z=0.15, rot=0.1, acao="surpreso", exp="surpreso", naPlat=True, pose=GRAB, susto=V(0, 1, e11, r3(e11 + 0.08)))],
  genteF=[G(id="casaca", x=0.2, z=0.1, rot=0.1, acao="acenando", exp="sorriso", naPlat=True),
          G(id="ajudante", x=-0.45, y=0.5, z=1.0, rot=0.45, acao="em-pe", exp="sorriso", pose=[(cr, BAIXO), (r3(cr + 0.05), ERGUE), (cd, GOLPE), (1, BAIXO)]),
          G(id="zeca", x=1.9, z=1.7, rot=-0.3, acao="comemorando", exp="sorriso")],
  c=[rot("1854", 5, 130, 96)])

# ---------------------------------------------------------------- 15: o fundo do poço: a câmera desce com a cabine; bate e amortecedor
f12 = ps(15, '^chegar'); b12 = ps(15, '^bate'); a12 = ps(15, '^amortecedor'); s12 = ps(15, '^segura')
QD = 6.3
D15 = dur(15)
cenas[15] = M(PRED, raiox=0.8, botaoK=0, frente=0, pisos=0, regOn=1, regY=8.6, cabine=1, fosso=1, cabPorta=1, garras=0.05, quedaIni=f12, quedaFim=r3(b12 + 0.01), quedaD=QD,
  plat=KF((0, A5), (r3(a12 - 0.02), A5), (r3(a12 + 0.1), 1.2 + QD), (r3(s12 - 0.06), 1.2 + QD), (r3(s12 + 0.12), -0.5 + QD), (1, -0.5 + QD)),
  bate=KF((0, 0), (r3(b12 + 0.01), 0), (r3(b12 + 0.03), 1), (r3(b12 + 0.13), 0), (1, 0)), sacode=KF((0, 0), (r3(b12 + 0.01), 0), (r3(b12 + 0.03), 1), (r3(b12 + 0.11), 0), (1, 0)),
  amort=V(0, 1, a12, r3(a12 + 0.1)), comp=KF((0, 0), (r3(s12 - 0.06), 0), (r3(s12 + 0.12), 0.65), (1, 0.65)), etiq=["amortecedor@%s-0.99" % r3(a12 + 0.05)], etiqS=0.9,
  camera=cam(pt3([-3.4, 4.2, 12.0], [0.2, 3.6, 0], 52), pt3([-3.0, 0.2, 8.4], [0.2, 0.9, 0], 52), tempo=round((b12 + 0.04) * D15, 2)),
  gente=[G(id="zeca", x=0, z=0.15, rot=0.1, acao="surpreso", exp="surpreso", naPlat=True, suave=False, pose=GRAB, susto=KF((0, 1), (r3(a12 - 0.02), 1), (r3(a12 + 0.05), 0), (1, 0)))])

# ---------------------------------------------------------------- 16: você inventou o elevador
e13 = ps(16, '^elevador'); t13 = ps(16, '^segundo')
cenas[16] = M(PRED, raiox=0.25, botaoK=1, frente=0, pisos=0, regOn=1, regY=8.6, garras=0.05, cabine=1, cabPorta=1, plat=KF((0, 1.0), (0.2, 1.0), (0.95, 10.0), (1, 10.0)), destaque=V(0, 1, r3(e13 + 0.05), 0.9), tvApe=V(0, 1, 0.0, 0.2), tvY=10.0, golApe=V(0, 1, t13, r3(t13 + 0.1)),
  camera=cam(pt3([-4.6, 3.4, 12.0], [0.4, 4.4, 0], 52), pt3([4.4, 8.8, 12.0], [0.4, 8.4, 0], 52)),
  gente=[G(id="zeca", x=0, z=0.1, rot=0.0, acao="comemorando", exp="sorriso", naPlat=True, suave=False)], c=[rot("ELEVADOR", 1, 40, 110)])

# ---------------------------------------------------------------- 17: manda pra quem tem medo; o raio
r14 = ps(17, '^raio')
cenas[17] = M(PRED, raiox=0.2, botaoK=1, frente=0, pisos=0, regOn=1, regY=8.6, garras=0.05, cabine=1, cabPorta=1, plat=10.0, interroga=V(0, 1, r3(r14 + 0.05), r3(r14 + 0.3)), interrogaY=11.8, raio=V(0, 1, r14, r3(r14 + 0.1)), raioY=11.6,
  camera=cam(pt3([0.0, 11.5, 4.2], [0.0, 11.2, 0], 46), pt3([1.2, 10.6, 11.8], [1.0, 10.2, 0], 52)),
  gente=[G(id="zeca", x=0, z=0.25, rot=0.0, acao="em-pe", exp="sorriso", naPlat=True, pose=POLEGAR)])

# ---------------------------------------------------------------- 18: fecho
cenas[18] = M(PRED, raiox=0.2, botaoK=1, frente=0, regOn=1, regY=8.6, garras=0.05, cabine=1, cabPorta=0, plat=10.0, tvApe=1, tvY=10.0,
  camera=cam(pt3([0.3, 11.0, 8.0], [0.5, 11.6, 0], 50), pt3([0.3, 11.0, 7.6], [0.5, 11.6, 0], 50)),
  gente=[G(id="zeca", x=-0.35, y=10.0, z=2.3, rot=0.15, acao="explicando", exp="sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "o andar mais alto onde você já foi", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {
1: [("whoosh", 0, 0.35), ("tique", 1, 0.3)],
2: [("whoosh", 0, 0.35), ("tique", 2, 0.35), ("buzina", 4, 0.4), ("queda_energia", 5, 0.4)],
3: [("pop", 0, 0.4), ("pop", 1, 0.4), ("pop", 2, 0.4), ("rangido", 4, 0.4), ("jingle", 5, 0.4)],
4: [("pop", 0, 0.4), ("respiracao", 1, 0.4), ("motor", 3, 0.45)],
5: [("zumbido", 0, 0.35), ("pop", 1, 0.4), ("impacto", 2, 0.5), ("ding", 4, 0.45)],
6: [("impacto", 0, 0.4), ("impacto", 1, 0.4), ("pop", 2, 0.4), ("metal", 3, 0.55), ("ding", 5, 0.45)],
7: [("whoosh", 0, 0.4), ("pop", 2, 0.4), ("clique", 3, 0.45), ("ding", 4, 0.45)],
8: [("impacto", 0, 0.55), ("pop", 1, 0.4), ("zumbido", 2, 0.4), ("motor", 3, 0.45), ("ding", 5, 0.5)],
9: [("rangido", 0, 0.4), ("pop", 1, 0.4), ("queda_energia", 2, 0.5), ("metal", 3, 0.55)],
10: [("pop", 0, 0.4), ("coracao", 1, 0.4), ("porta", 2, 0.5), ("porta", 3, 0.45)],
11: [("estalo", 0, 0.45), ("pop", 1, 0.4), ("porta", 3, 0.5), ("ding", 4, 0.45)],
12: [("porta", 0, 0.5), ("impacto", 0, 0.5), ("pop", 1, 0.4), ("clique", 2, 0.4), ("ding", 4, 0.45)],
13: [("pop", 0, 0.4), ("pop", 1, 0.4), ("estalo", 2, 0.5), ("metal", 3, 0.45)],
14: [("estalo", 0, 0.5), ("tique", 2, 0.4), ("metal", 4, 0.55), ("jingle", 5, 0.4), ("pop", 6, 0.4)],
15: [("impacto", 1, 0.55), ("pop", 2, 0.4), ("ding", 3, 0.45)],
16: [("jingle", 0, 0.5), ("ding", 1, 0.5), ("elevador", 2, 0.4), ("pop", 5, 0.4)],
17: [("pop", 0, 0.4), ("trovao", 2, 0.5)],
18: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 4, 0.6)],
}
# Ambiência contínua de baixa frequência cansa (o motor a 0,1 durante as batidas 4-14 e o zumbido em 15-17 viraram um "drone" em ~80% do vídeo).
# Agora o motor só soa onde ele aparece (4, 5 e 9, a lupa no freio), baixo (0,04) e com fade; o resto fica sem ambiência contínua (os sfx cuidam).
AMB = {i: ("nenhuma", 0) for i in range(4, 19)}
AMB[1] = ("cidade", 0.08); AMB[2] = ("cidade", 0.08); AMB[3] = ("dia", 0.08)
for _i in (4, 5, 9): AMB[_i] = ("motor", 0.04)
for _i in range(1, 19): DUR.setdefault(_i, dur(_i))
B.salvar(cenas, SFX, AMB, DUR, proibido=('elevador',), ate=16)

# ---- pós-processo: `ant.y` (altura final da batida anterior) em METROS DO MUNDO. Quem está na plataforma (naPlat) tem y relativo a ela; sem isto a transição "cairia" do céu ou do chão.
import json as _j
def _fim(v):
    if isinstance(v, (int, float)): return v
    if isinstance(v, dict): return v.get('para')
    if isinstance(v, list) and v and isinstance(v[-1], list): return v[-1][-1]
    return None
def _plat_fim(c):
    if c.get('perfilB'): return c['perfilB'][1]
    pf = _fim(c.get('plat')) or 0.0
    if c.get('quedaD') and not c.get('feiraDe'): pf -= c['quedaD']
    if c.get('freiaD') and not c.get('feiraDe'): pf -= c['freiaD']
    if c.get('quedaD') and c.get('feiraDe'): pf -= c['quedaD'] + c['freiaD']
    return pf
_r = _j.load(open(sys.argv[1]))
_b = _r['batidas']
for _i in range(1, len(_b)):
    for _k, _g in enumerate(_b[_i]['cena'].get('gente') or []):
        _a = _g.get('ant')
        if not _a or _k >= len(_b[_i - 1]['cena'].get('gente') or []): continue
        _p = _b[_i - 1]['cena']['gente'][_k]
        _a['y'] = (_fim(_p.get('y')) or 0.0) + ((_plat_fim(_b[_i - 1]['cena']) + 0.1) if _p.get('naPlat') else 0.0)
_j.dump(_r, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
