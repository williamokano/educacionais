import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/submarino/roteiro.json (episódio 19, "como um barco de aço afunda de propósito e volta?") a partir de tasks/roteiro-submarino.md (v2, aprovado).
# Uso (da raiz): python3 tasks/geradores/submarino.py episodios/submarino/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/submarino/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/submarino.tsx (campos no topo + peças internas no código). REGRA: "submarino" só a partir da batida 14.
B = Base('roteiro-submarino.md', 'submarino', 19, 17)
W = B.W
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep19) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep19', 'episode.json')
_bt = []
if os.path.exists(_EPJ):
    _bt = json.load(open(_EPJ, encoding='utf-8')).get('beats', [])
    if len(_bt) == 17 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0:
        _est = B.W
        def W(i, pat, fim=False):
            ps_, ws = B.palavras_de(i), _bt[i - 1]['words']
            if len(ps_) != len(ws): return _est(i, pat, fim)
            b0, b1 = _bt[i - 1]['start'], _bt[i - 1]['end']
            for k, w in enumerate(ps_):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
DUR = {i: round(_bt[i - 1]['end'] - _bt[i - 1]['start'], 3) for i in range(1, 18)} if _bt else {}
def r3(x): return round(x, 3)
def ps(i, pat, d=0.0, fim=False): return r3(min(0.995, max(0.0, W(i, pat, fim) + d)))
def P(pos, alvo, fov=50): return pt(pos, alvo, fov)
def CT(cx=-0.2, ty=-1.0, D=10.4, cx1=None, ty1=None, D1=None):
    cx = cx - 0.55
    cx1 = (cx1 if cx1 is not None else cx + 0.55) - 0.55
    return cam(P([cx, ty + 0.3, D], [cx, ty, 0]), P([cx1 if cx1 is not None else cx, (ty1 if ty1 is not None else ty) + 0.3, D1 or D - 0.5], [cx1 if cx1 is not None else cx, ty1 if ty1 is not None else ty, 0]))
def ZD(x=-1.3, **k): return G(x=x, z=-3.0, rot=0.0, esc=1.5, **k)           # Zeca no cais, de frente
def ZA(x=-2.2, y=-0.4, **k): return G(x=x, y=y, z=-0.2, rot=0.4, esc=1.1, **k)  # Zeca na água do lago
EMPURRA = {"ombroE.x": -1.1, "ombroD.x": -1.1, "cotoveloE.x": -0.1, "cotoveloD.x": -0.1, "ombroE.z": 0.1, "ombroD.z": -0.1, "tronco.x": 0.3, "maos": 0.5}
BOIAR = {"ombroE.z": 1.0, "ombroD.z": -1.0, "cotoveloE.x": -0.3, "cotoveloD.x": -0.3, "maos": 1}
NADA = {"ombroE.x": -1.6, "ombroD.x": -1.6, "cotoveloE.x": -0.2, "cotoveloD.x": -0.2, "tronco.x": 0.7, "pernaE.x": 0.3, "pernaD.x": -0.3, "maos": 0.4}
CHINELO = {"ombroD.x": -1.2, "cotoveloD.x": -1.0, "ombroD.z": -0.2, "maos": 0.3, "ombroE.z": 0.12, "cotoveloE.x": -0.18}

cenas = {}
# 1: pôr do sol no cais; perde a aposta, mergulha atrás do chinelo e volta ofegante
m1 = ps(1, '^mergulhe'); a1 = ps(1, '^acaba'); mas = ps(1, '^Mas')
cenas[1] = M(entardecer=1, raiox=0, subVis=0, chinelo=1,
  camera=cam(P([0.6, 0.35, 6.2], [-0.8, 1.0, -3.0], 52), P([-0.3, -1.1, 10.4], [-0.3, -1.1, 0], 50)),
  gente=[G(x=-1.3, y=[[0, 0], [m1, 0], [r3(m1 + 0.05), 0.7], [r3(m1 + 0.1), -0.3], [mas, -1.7], [r3(mas + 0.12), -1.7], [0.97, -0.15], [1, -0.15]],
           z=[[0, -3.0], [m1, -3.0], [r3(m1 + 0.1), -0.2], [1, -0.2]], rot=[[0, 0.0], [m1, 0.0], [r3(m1 + 0.1), 0.4], [1, 0.4]], esc=1.3,
           acao=[(m1, "em-pe", "sorriso"), (mas, "em-pe", "surpreso"), (1, "em-pe", "cansado")], suor=V(0, 1, mas, 1.0),
           pose=[(m1, {}), (mas, NADA), (1, {"tronco.x": 0.3, "ombroE.x": -0.6, "ombroD.x": -0.6, "cotoveloE.x": -0.8, "cotoveloD.x": -0.8})])])
# 2: barco de aço oco e com ar: boia por mais que empurre
e2 = ps(2, '^empurre')
cenas[2] = M(raiox=V(0, 1, 0.2, 0.5), ar=V(0, 1, 0.3, 0.6), sy=KF((0, 0.15), (r3(e2 - 0.25), 0.15), (r3(e2 - 0.1), -0.1), (r3(e2 + 0.05), 0.15), (1, 0.15)), subVis=V(0, 1, 0.0, 0.12),
  camera=CT(-0.2, -0.5, 9.8, -0.2, -0.5, 9.2), gente=[ZA(acao="explicando", exp="sorriso", pose=[(r3(e2 - 0.3), {}), (r3(e2 - 0.2), EMPURRA), (r3(e2 + 0.1), EMPURRA), (1, {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -1.4, "cotoveloD.x": -1.4, "maos": 1})])])
# 3: deixa a água entrar; afunda ao lado do chinelo; cheio de água, nunca mais volta
c3 = ps(3, '^cheio')
cenas[3] = M(raiox=1, ar=1, cheio=V(0, 1, 0.1, 0.5), sy=V(0.15, -2.75, 0.2, 0.6),
  camera=cam(P([-0.2, -0.5, 10.4], [-0.2, -0.8, 0]), P([-0.2, -2.0, 10.0], [-0.2, -2.0, 0])),
  gente=[ZA(acao=[(c3, "comemorando", "sorriso"), (1, "em-pe", "cansado")], pose=[(c3, BOIAR), (1, {"tronco.x": 0.25, "cabeca.x": 0.3})])])
# 4: casco fechado, tanques na barriga com tampa em cima e embaixo; abre; água entra por baixo, ar sai por cima; afunda
t4 = ps(4, '^tanques'); a4 = ps(4, '^água'); r4 = ps(4, '^ar$'); f4 = ps(4, '^afunda')
cenas[4] = M(raiox=1, cheio=0, tanque=V(0, 1, r3(t4 - 0.02), r3(t4 + 0.1)), nivT=V(0, 1, a4, r3(f4 - 0.02)), tampaC=V(0, 1, r3(a4 - 0.1), a4), tampaB=V(0, 1, r3(a4 - 0.1), a4), bolhas=V(0, 1, r3(r4 - 0.02), r3(r4 + 0.1)),
  sy=KF((0, 0.15), (r3(f4 - 0.03), 0.15), (0.97, -2.4)), etiq=["tanque@%s-0.62" % r3(t4)], etiqS=1.0,
  camera=cam(P([-0.6, 0.0, 8.0], [-0.1, -0.1, 0]), P([-0.2, -1.2, 9.6], [-0.2, -1.4, 0])), gente=[ZA(x=-2.0, acao="explicando", exp="sorriso")])
# 5: ar comprimido nos tanques: a água sai por baixo e o barco sobe; câmera segue
c5 = ps(5, '^ar$'); s5 = ps(5, '^sobe')
cenas[5] = M(raiox=1, tanque=1, cil=V(0, 1, r3(c5 - 0.02), r3(c5 + 0.12)), tampaC=0, tampaB=V(0, 1, r3(c5 + 0.05), r3(c5 + 0.15)), sopra=V(0, 1, r3(c5 + 0.1), r3(c5 + 0.2)), nivT=KF((0, 1), (r3(c5 + 0.15), 1), (r3(s5 - 0.02), 0.05), (1, 0.05)),
  sy=KF((0, -2.4), (r3(s5 - 0.03), -2.4), (0.95, 0.15), (1, 0.15)), etiq=["ar@%s-0.99" % r3(c5)], etiqS=1.0,
  camera=cam(P([-2.8, -2.6, 9.0], [-0.1, -2.4, 0]), P([-1.0, 0.5, 9.4], [-0.1, -0.1, 0])),
  gente=[ZA(x=-2.0, acao=[(s5, "em-pe", "sorriso"), (1, "comemorando", "sorriso")], pose=[(s5, {}), (1, BOIAR)])])
# 6: o mar aperta: a cada 10 m, mais uma atmosfera; o casco amassa como lata
a6 = ps(6, '^aperta'); l6 = ps(6, '^lata')
cenas[6] = M(raiox=0, tanque=0, sy=-2.6, aperta=V(0, 1, a6, r3(a6 + 0.15)), amassa=V(0, 1, r3(l6 - 0.12), r3(l6 + 0.1)),
  camera=CT(-0.2, -2.0, 8.0, -0.2, -2.0, 7.5), gente=[ZA(x=-2.0, y=-0.3, acao="em-pe", exp="surpreso")], c=[rot("+1 ATM / 10 m", 1, 40, 70)])
# 7: casco grosso e redondo, como charuto; o aperto se espalha; órbita curta
g7 = ps(7, '^grosso')
cenas[7] = M(raiox=0.6, sy=-2.4, grosso=V(0, 1, r3(g7 - 0.05), r3(g7 + 0.15)), aperta=KF((0, 1), (0.5, 1), (0.75, 0.1), (1, 0)), etiq=["casco@%s-0.99" % r3(g7 + 0.08)], etiqS=1.0,
  camera=cam(P([-4.2, -1.2, 8.2], [0, -2.2, 0]), P([4.0, -1.2, 8.4], [0, -2.2, 0])), gente=[ZA(x=-2.0, y=-0.3, acao="comemorando", exp="sorriso", pose=BOIAR)])
# 8: o ar acaba e fica cinza; aparelho faz oxigênio da água; filtro tira o gás carbônico
a8 = ps(8, '^acaba'); o8 = ps(8, '^oxigênio'); f8 = ps(8, '^filtro')
cenas[8] = M(raiox=1, grosso=1, sy=-1.6, arCinza=KF((0, 0), (r3(a8 + 0.02), 0), (r3(a8 + 0.12), 1), (r3(f8 + 0.12), 1), (0.95, 0.0), (1, 0)), oxi=V(0, 1, r3(o8 - 0.04), r3(o8 + 0.08)), filtro=V(0, 1, r3(f8 - 0.04), r3(f8 + 0.08)),
  etiq=["oxi@%s-%s" % (r3(o8 + 0.02), r3(f8)), "filtro@%s-0.99" % r3(f8 + 0.03)], etiqS=1.0,
  camera=CT(-0.1, -1.4, 7.4, -0.1, -1.4, 6.9), gente=[ZA(x=-2.0, y=-0.3, acao="em-pe", exp="cansado", pose=[(r3(f8 + 0.05), {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -1.4, "cotoveloD.x": -1.4, "maos": 1}), (1, {})])])
# 9: escuro; periscópio sobe mostrando a margem; sonar manda som e escuta o eco
p9 = ps(9, '^periscópio'); s9 = ps(9, '^sonar')
cenas[9] = M(raiox=0.7, grosso=1, oxi=1, filtro=1, escuro=V(0, 1, 0.0, 0.12), sy=-2.2, torre=V(0, 1, r3(p9 - 0.02), r3(p9 + 0.06)), peri=V(0, 1, r3(p9 - 0.02), r3(p9 + 0.15)), periVis=KF((0, 0), (r3(p9 + 0.1), 0), (r3(p9 + 0.16), 1), (r3(s9 - 0.08), 1), (r3(s9 - 0.02), 0), (1, 0)),
  sonar=KF((0, 0), (r3(s9 + 0.02), 0), (0.99, 1)), etiq=["peri@%s-%s" % (r3(p9 + 0.03), r3(s9 - 0.05)), "sonar@%s-0.99" % r3(s9 + 0.03)], etiqS=1.0,
  camera=cam(P([-0.2, -1.2, 10.4], [-0.2, -1.4, 0]), P([0.6, -1.2, 9.4], [0.6, -1.6, 0])), gente=[ZA(x=-2.0, y=-0.3, acao="explicando", exp="sorriso")])
# 10: o diesel queima ar e tosse; entra bateria e motor elétrico; anda em silêncio
d10 = ps(10, '^diesel'); b10 = ps(10, '^bateria')
cenas[10] = M(raiox=1, grosso=1, sy=-1.8, torre=1, peri=0.0, diesel=KF((0, 0), (0.05, 1), (r3(b10 - 0.02), 1), (r3(b10 + 0.05), 0), (1, 0)), bat=V(0, 1, r3(b10 - 0.02), r3(b10 + 0.1)), motorE=V(0, 1, r3(b10 + 0.03), r3(b10 + 0.12)),
  sx=V(-0.4, 1.4, r3(b10 + 0.15), 0.97), etiq=["bateria@%s-%s" % (r3(b10 + 0.03), r3(b10 + 0.2)), "motorE@%s-0.99" % r3(b10 + 0.12)], etiqS=1.0,
  camera=CT(0.2, -1.2, 8.4, 0.5, -1.2, 8.0), gente=[ZA(x=-2.0, y=-0.3, acao=[(b10, "pensando", "surpreso"), (1, "em-pe", "sorriso")], pose=[(b10, MAO_QUEIXO), (1, {})])])
# 11: asinhas inclinadas para baixo: desce; para cima: sobe
b11 = ps(11, '^baixo'); c11 = ps(11, '^cima')
cenas[11] = M(raiox=1, grosso=1, torre=1, bat=1, motorE=1, asaVis=V(0, 1, 0.02, 0.15), fluxo=V(0, 1, 0.1, 0.25), sx=0.3,
  asaAng=KF((0, 0), (r3(b11 - 0.1), 0), (b11, -0.5), (r3(c11 - 0.05), -0.5), (c11, 0.5), (1, 0.5)),
  sy=KF((0, -1.6), (b11, -1.6), (r3(c11 - 0.06), -2.6), (r3(c11 + 0.04), -2.6), (0.97, -0.9)), pitch=KF((0, 0), (b11, 0), (r3(b11 + 0.08), -0.15), (r3(c11 - 0.06), -0.15), (r3(c11 + 0.1), 0.15), (1, 0.15)), etiq=["asas@0.04-0.4"], etiqS=1.0,
  camera=CT(0.2, -1.5, 9.4, 0.2, -1.5, 8.9), gente=[ZA(x=-2.0, y=-0.3, acao="explicando", exp="sorriso")])
# 12: a bateria zera; entra o reator brilhando; o barco segue
z12 = ps(12, '^acaba'); r12 = ps(12, '^reator')
cenas[12] = M(raiox=1, grosso=1, torre=1, motorE=1, bat=1, batNiv=KF((0, 1), (r3(z12 - 0.05), 1), (z12, 0.0), (1, 0.0)), reator=V(0, 1, r3(r12 - 0.03), r3(r12 + 0.1)), sy=-1.6, sx=V(0.3, 1.6, r3(r12 + 0.1), 1.0),
  etiq=["reator@%s-0.99" % r3(r12 + 0.04)], etiqS=1.0, camera=CT(0.4, -1.2, 8.8, 0.6, -1.2, 8.3),
  gente=[ZA(x=-2.0, y=-0.3, acao=[(z12, "em-pe", "sorriso"), (r12, "em-pe", "preocupado"), (1, "comemorando", "sorriso")], pose=[(r12, {}), (1, BOIAR)])])
# 13: câmara de saída: enche de água até igualar o aperto; a pessoa sai flutuando
c13 = ps(13, '^câmara'); e13 = ps(13, '^enche'); s13 = ps(13, '^sai')
cenas[13] = M(raiox=1, grosso=1, torre=1, motorE=1, bat=1, batNiv=1, reator=1, sy=-2.4, sx=0.4, camara=V(0, 1, r3(c13 - 0.02), r3(c13 + 0.08)), camAgua=V(0, 1, r3(e13 - 0.02), r3(e13 + 0.15)), etiq=["camara@%s-0.99" % r3(c13 + 0.03)], etiqS=1.0,
  camera=CT(-0.4, -1.9, 8.2, -0.5, -1.6, 7.6),
  gente=[G(x=-2.0, y=[[0, -2.4], [r3(s13 - 0.03), -2.4], [0.97, -0.5], [1, -0.5]], z=-0.2, rot=0.5, esc=1.0, acao="em-pe", exp="sorriso", pose=BOIAR)])
# 14: revelação: o barco ganha a torre, rótulos acendem; a câmera sobe do fundo, atravessa a superfície e abre no cais, com o chinelo
e14 = ps(14, '^submarino')
cenas[14] = M(entardecer=1, raiox=0.6, grosso=1, torre=1, peri=0.0, motorE=1, bat=1, reator=1, oxi=1, filtro=1, sy=-2.6, chinelo=0, etiq=["sub@%s-0.99" % r3(e14 - 0.03)], etiqS=1.0,
  camera=cam(P([-0.2, -3.0, 8.8], [-0.2, -2.5, 0]), P([-0.6, 1.6, 10.6], [-0.8, 1.3, -3.0], 52)),
  gente=[ZD(acao="comemorando", exp="sorriso", obj="chinelo", pose=CHINELO)], c=[rot("SUBMARINO", 1, 40, 100)])
# 15: submarino em silêncio no oceano, dias passando
cenas[15] = M(raiox=0, grosso=1, torre=1, sy=-1.6, sx=V(-1.8, 1.8, 0.0, 1.0), dias=V(0.0, 1.0, 0.0, 1.0), chinelo=0, entardecer=0.4,
  camera=cam(P([-3.0, -0.6, 9.4], [0, -1.6, 0]), P([-1.0, -0.4, 9.0], [0.2, -1.6, 0])), gente=[ZD(x=-2.2, acao="em-pe", exp="sorriso")])
# 16: gancho: o cadeado sobe no céu, ponto de interrogação vira lâmpada
c16 = ps(16, '^cadeado')
cenas[16] = M(entardecer=1, raiox=0, torre=1, grosso=1, sy=0.15, chinelo=0, cadeado=V(0, 1, r3(c16 - 0.05), r3(c16 + 0.1)), lampada=V(0, 1, ps(16, '^Siga'), r3(ps(16, '^Siga') + 0.12)),
  camera=cam(P([-0.2, 1.4, 11.0], [-0.2, 1.8, 0]), P([-0.2, 1.7, 10.2], [-0.2, 2.0, 0])), gente=[ZD(acao="em-pe", exp="sorriso", pose=CHINELO)])
# 17: fecho com as chamadas
cenas[17] = M(entardecer=1, raiox=0, torre=1, grosso=1, sy=0.15, chinelo=0,
  camera=cam(P([-0.2, 1.2, 9.4], [-0.2, 1.4, 0]), P([-0.2, 1.3, 9.0], [-0.2, 1.4, 0])), gente=[ZD(x=-1.0, acao="em-pe", exp="sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "CHINELO", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {
1: [("whoosh", 0, 0.35), ("agua", 3, 0.5), ("tosse", 4, 0.4)],
2: [("pop", 0, 0.4), ("impacto", 1, 0.4), ("pop", 2, 0.3)],
3: [("agua", 0, 0.5), ("whoosh", 1, 0.4), ("impacto", 2, 0.4)],
4: [("pop", 0, 0.4), ("agua", 2, 0.45), ("pop", 3, 0.4)],
5: [("pop", 0, 0.4), ("sopro", 1, 0.45), ("whoosh", 2, 0.4)],
6: [("pop", 0, 0.4), ("metal", 1, 0.5), ("impacto", 2, 0.55)],
7: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("metal", 2, 0.4)],
8: [("respiracao", 0, 0.35), ("pop", 1, 0.4), ("ding", 2, 0.4)],
9: [("pop", 0, 0.4), ("bips", 2, 0.5), ("bips", 3, 0.5)],
10: [("motor", 0, 0.45), ("pop", 1, 0.4), ("zumbido", 2, 0.35)],
11: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("whoosh", 3, 0.4)],
12: [("queda_energia", 0, 0.4), ("pop", 1, 0.4), ("ding", 2, 0.4)],
13: [("pop", 0, 0.4), ("agua", 1, 0.5), ("whoosh", 2, 0.4)],
14: [("jingle", 0, 0.5), ("ding", 1, 0.5), ("pop", 2, 0.4)],
15: [("zumbido", 0, 0.3), ("pop", 1, 0.3)],
16: [("pop", 0, 0.4), ("clique", 1, 0.4), ("ding", 2, 0.45)],
17: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.6)],
}
AMB = {i: ("nenhuma", 0) for i in range(1, 18)}
# O zumbido contínuo (0,05 nas batidas 2-13, ~76% do vídeo) virou "drone": agora só onde o motor aparece (10-13), baixo.
for i in range(10, 14): AMB[i] = ("zumbido", 0.035)
AMB[1] = ("dia", 0.08); AMB[14] = ("dia", 0.06)
B.salvar(cenas, SFX, AMB, DUR, proibido=('submarino',), ate=14)

# Abertura com pedido de voz próprio (06/11/2026): o "Você" do primeiro pedido saiu quebrado ("vo"..."cê", o STT ouvia "Foi").
# O falante "abertura" (mesma voz, "estabilidade" explícita só para separar o pedaço) faz da batida 1 um pedido à parte;
# o resto da voz continua no cache. Os pedaços b01 e b02-17 foram gravados em motor/public/demo-3d/ep19/batidas/.
_r = json.load(open(sys.argv[1], encoding='utf-8'))
_r['vozes'] = {'abertura': {'estabilidade': 0.5}}
_r['batidas'][0]['falante'] = 'abertura'
json.dump(_r, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
