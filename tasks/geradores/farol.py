import sys, os, math, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/farol/roteiro.json (episódio 25, "como a luz de uma torre chega a um navio a 30 quilômetros?", v2 de 15 batidas) a partir de tasks/roteiro-farol.md.
# Uso (da raiz): python3 tasks/geradores/farol.py episodios/farol/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/farol/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/farol.tsx. Palcos: costa x = 0 (mar, barco do Zeca em (-3,0,3), pedra, luau, torre em (6,0,-13)) · lanterna x = 60 (corte da lanterna e da escada).
# REGRA: "farol" só a partir da batida 13 (fala e cartão).
B = Base('roteiro-farol.md', 'farol', 25, 15)
W = B.W
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep25) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep25', 'episode.json')
_bt = []
_END = 0
def _fim_bt(i):  # a batida vai do início dela até o início da próxima (a última, até o cartão final)
    return _bt[i]['start'] if i < len(_bt) else _END
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0)
    _bt = _j0.get('beats', [])
    if len(_bt) == 15 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0 and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 16)):
        def W(i, pat, fim=False):
            ps, ws = B.palavras_de(i), _bt[i - 1]['words']
            b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
            for k, w in enumerate(ps):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
def dur(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return round(max(2.4, len(B.palavras_de(i)) / 2.9), 1)
R = lambda x: round(x, 3)
def orb(alvo, az, d, el=8, fov=50, up=0.0):
    a, e = math.radians(az), math.radians(el)
    al = [alvo[0], alvo[1] - up, alvo[2]]
    return pt([al[0] + d * math.sin(a) * math.cos(e), al[1] + d * math.sin(e), al[2] + d * math.cos(a) * math.cos(e)], al, fov)
ESPANTO = {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 1}
BRACOS_CIMA = {"ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, "maos": 1}
COCA = {"ombroD.z": -2.25, "ombroD.x": -0.35, "cotoveloD.x": -1.9, "cotoveloD.z": -0.9, "cabeca.z": 0.12}
BOCA = {"ombroD.x": -1.0, "ombroD.z": 0.35, "cotoveloD.x": -2.3, "maos": 0.4, "ombroE.z": 0.12}
APONTA = {"ombroD.x": -1.2, "ombroD.z": -0.5, "cotoveloD.x": -0.1, "dedo": 1, "ombroE.z": 0.12}
MAO_QUEIXO = {"ombroD.x": -0.95, "ombroD.z": 0.4, "cotoveloD.x": -2.35, "cotoveloD.z": 0.15, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "maos": 0.4}
def ZB(rot=0.35, **k): return G(x=0.0, y=0.0, z=0.0, rot=rot, **k)           # o Zeca no barco (a posição é a do barco)
def ZL(x, z=1.8, rot=0.7, **k): return G(x=x, y=0.0, z=z, rot=rot, **k)  # o Zeca na lanterna

cenas = {}
# 1: noite sem lua; o GPS morre; a pedra; o luau ao fundo
g1 = W(1, '^morreu'); l1 = W(1, '^luau')
cenas[1] = M(luau=1, gps=KF((0, 1), (R(g1 - 0.02), 1), (R(g1 + 0.03), 0), (1, 0)),
  camera=cam(pt([-3.8, 1.7, 8.8], [-3.0, 1.4, 3.0], 52), pt([-0.5, 1.9, 7.2], [2.5, 1.7, -3.0], 52)),
  gente=[ZB(acao="em-pe", exp="medo", pose=ESPANTO)])
# 2: a luz do luau some atrás de uma onda; a fogueira sobe numa torre
s2 = W(2, '^some'); t2 = W(2, '^torre')
cenas[2] = M(luau=1, onda=KF((0, 0), (R(s2 - 0.06), 0), (R(s2 + 0.04), 1), (R(s2 + 0.18), 0), (1, 0)), torre=V(0, 1, R(t2 - 0.02), R(t2 + 0.3)), fogoY=V(0, 1, R(t2 - 0.02), R(t2 + 0.3)), etiq=["torre@%s-0.99" % R(t2 + 0.04)], etiqS=1.0,
  camera=cam(pt([-4.0, 1.6, 9.0], [3.0, 2.0, -10.0], 52), pt([-2.0, 11.0, 4.0], [4.0, 9.5, -13.0], 52)),
  gente=[ZB(acao="em-pe", exp="alivio")])
# 3: lenha acabando, fumaça, chama tremendo; entra a lamparina (chama firme, sem fumaça)
l3 = W(3, '^lamparina')
cenas[3] = M(palco="lanterna", lenha=V(1, 0.3, 0.0, R(l3)), fumaca=V(0.2, 1, 0.1, R(l3 - 0.05)), treme=V(0.3, 1, 0.1, R(l3 - 0.04)), lamparina=V(0, 1, R(l3 - 0.02), R(l3 + 0.08)), etiq=["lamparina@%s-0.99" % R(l3 + 0.04)], etiqS=1.0,
  camera=cam(orb([60.0, 0.9, 0.0], 25, 8.5, 8), orb([60.0, 0.9, 0.0], 20, 7.8, 8)),
  gente=[ZL(-1.7, z=0.9, rot=0.6, exp="cansado")])
# 4: uma chama só ilumina pouco; o espelho curvo atrás manda a luz pro mar
e4 = W(4, '^espelho')
cenas[4] = M(palco="lanterna", lenha=0.0, fumaca=V(1, 0, 0.0, 0.1), lamparina=1, raios=KF((0, 1), (R(e4 - 0.02), 1), (R(e4 + 0.12), 2), (1, 2)), espelho=V(0, 1, R(e4 - 0.02), R(e4 + 0.1)), etiq=["espelho@%s-0.99" % R(e4 + 0.04)], etiqS=1.0,
  camera=cam(orb([59.4, 0.9, 0.0], 24, 9.0, 6), orb([59.4, 0.9, 0.0], 14, 8.0, 6)),
  gente=[ZL(-1.7, z=0.9, rot=0.7, acao="explicando", exp="sorriso")])
# 5: a lente junta a luz num feixe forte que cruza o mar até o barco
l5 = W(5, '^lente'); f5 = W(5, '^feixe')
cenas[5] = M(palco="lanterna", lamparina=1, espelho=1, lente=V(0, 1, R(l5), R(l5 + 0.1)), raios=3, feixeLongo=V(0, 1, R(f5 - 0.02), R(f5 + 0.2)), etiq=["lente@%s-0.99" % R(l5 + 0.05)], etiqS=1.0,
  camera=cam(orb([60.8, 0.9, 0.0], 24, 9.4, 6), orb([61.0, 0.9, 0.0], 18, 9.0, 6)),
  gente=[ZL(-1.7, z=0.9, rot=0.7, exp="surpreso", pose=ESPANTO)])
# 6: a lente maciça é grossa e pesada; cortada em anéis; o feixe passa de 30 km
g6 = W(6, '^grossa'); a6 = W(6, '^anéis')
cenas[6] = M(palco="lanterna", lamparina=1, espelho=1, lente=1, raios=3, feixeLongo=1, peso=KF((0, 0), (R(g6), 0), (R(g6 + 0.06), 1), (R(a6 - 0.0), 1), (R(a6 + 0.08), 0), (1, 0)), aneis=V(0, 1, R(a6), R(a6 + 0.15)), etiq=["aneis@%s-0.99" % R(a6 + 0.06)], etiqS=1.0,
  camera=cam(orb([61.2, 0.9, 0.0], 30, 8.4, 6), orb([61.0, 0.9, 0.0], 20, 10.0, 8)),
  gente=[ZL(-1.7, z=0.9, rot=0.7, acao="em-pe", exp="preocupado", pose=[(R(a6 + 0.1), MAO_QUEIXO), (1, BRACOS_CIMA)])], c=[rot(">30 km", 5, 40, 90)])
# 7: a lente gira; o feixe varre o mar em piscadas; o outro barco antes no escuro (órbita curta em volta da lanterna)
cenas[7] = M(torre=1, lanternaTopo=1, luau=1, feixe=1, gira=0.95, barco2=1,
  camera=cam(orb([2.0, 6.0, -6.0], -28, 27.0, 14), orb([2.0, 6.0, -6.0], 30, 27.0, 14)),
  gente=[ZB(acao="em-pe", exp="sorriso", pose=BRACOS_CIMA)])
# 8: cada torre com seu padrão de piscadas; a carta; o setor vermelho sobre a pedra e branco no canal
cenas[8] = M(torre=1, lanternaTopo=1, luau=1, feixe=0.4, gira=0.25, torres=V(0, 1, 0.0, 0.12), carta=V(0, 1, R(W(8, '^carta') - 0.05), R(W(8, '^carta') + 0.03)), setor=V(0, 1, R(W(8, '^Pinte') - 0.03), R(W(8, '^Pinte') + 0.12)), barco2=1,
  camera=cam(pt([-7.0, 3.2, 12.0], [2.0, 3.0, -8.0], 54), pt([-5.0, 3.6, 11.0], [2.0, 3.2, -8.0], 54)),
  gente=[ZB(acao="em-pe", exp="eureka", pose=[(R(W(8, '^carta')), {}), (1, {"ombroE.x": -1.3, "ombroD.x": -1.3, "cotoveloE.x": -0.7, "cotoveloD.x": -0.7})])], c=[rot("PADRÕES", 2, 40, 90), rot("VERMELHO = PERIGO", 7, 40, 60)])
# 9: a neblina esconde a luz; o sino/buzina; a luz não passa, o som passa; o barco vai pelo som
n9 = W(9, '^neblina'); s9 = W(9, '^sino'); v9 = W(9, '^vizinho')
cenas[9] = M(torre=1, lanternaTopo=1, luau=1, feixe=1, gira=0.9, neblina=V(0, 1, R(n9 - 0.02), R(n9 + 0.12)), sino=V(0, 1, R(s9 - 0.02), R(s9 + 0.08)), som=V(0, 1, R(s9 + 0.04), R(s9 + 0.12)), vizinhoTapa=V(0, 1, R(v9 - 0.02), R(v9 + 0.05)), barcoX=V(-3.0, 1.2, R(s9 + 0.1), 0.98), barco2=0,
  etiq=["sino@%s-0.99" % R(s9 + 0.05)], etiqS=1.0,
  camera=cam(pt([-7.0, 2.8, 12.0], [1.0, 4.0, -9.0], 54), pt([-4.0, 3.2, 10.0], [2.0, 5.0, -9.0], 54)),
  gente=[ZB(acao="em-pe", exp=[(0, "preocupado")][0][1], pose=[(R(W(9, '^som')), {}), (1, {})])])
# 10: a lente boia num banho prateado: um dedinho a empurra e ela gira sem parar
m10 = W(10, '^mercúrio')
cenas[10] = M(palco="lanterna", lamparina=1, espelho=1, lente=1, aneis=1, raios=0, mercurio=V(0, 1, R(m10 - 0.06), R(m10 + 0.08)), dedo=V(0, 1, R(m10 + 0.06), R(m10 + 0.1)), giraL=V(0.0, 0.7, R(m10 + 0.08), R(m10 + 0.2)), etiq=["mercurio@%s-0.99" % R(m10 + 0.04)], etiqS=1.0,
  camera=cam(orb([60.0, 0.3, 0.0], 22, 10.0, 18), orb([60.0, 0.1, 0.0], 14, 8.6, 18)),
  gente=[ZL(-1.7, z=0.9, rot=0.7, exp="surpreso", pose=ESPANTO)])
# 11: o guardião sobe a escada em caracol, dá corda, cansado; o motor gira a lente sozinho; ele toma café
c11 = W(11, '^corda'); m11 = W(11, '^motor')
def helice(u0, u1, n=8):
    a = lambda u: u * math.pi * 4
    xs = [(R(u0 + (u1 - u0) * i / n), R(math.cos(a(i / n)) * 2.0)) for i in range(n + 1)]
    zs = [(R(u0 + (u1 - u0) * i / n), R(math.sin(a(i / n)) * 2.0)) for i in range(n + 1)]
    ys = [(R(u0 + (u1 - u0) * i / n), R(-7.2 + 6.9 * i / n)) for i in range(n + 1)]
    rs = [(R(u0 + (u1 - u0) * i / n), R(-a(i / n))) for i in range(n + 1)]
    return xs, ys, zs, rs
xs, ys, zs, rs = helice(0.02, R(c11 + 0.08))
cenas[11] = M(palco="lanterna", lamparina=1, espelho=1, lente=1, aneis=1, mercurio=1, escada=1, giraL=KF((0, 0), (R(m11), 0), (R(m11 + 0.08), 0.7), (1, 0.7)), motor=V(0, 1, R(m11 - 0.02), R(m11 + 0.08)), etiq=["motor@%s-0.99" % R(m11 + 0.04)], etiqS=1.0,
  camera=cam(pt([56.0, -1.8, 13.0], [60.0, -3.0, 0.0], 54), pt([57.0, -1.4, 12.0], [60.0, -2.8, 0.0], 54)),
  gente=[G(x=KF(*xs, (1, xs[-1][1])), y=KF(*ys, (1, ys[-1][1])), z=KF(*zs, (1, zs[-1][1])), rot=KF(*rs, (1, rs[-1][1])), acao=[(R(c11 + 0.08), "andando", "cansado"), (R(m11 + 0.05), "em-pe", "cansado"), (1, "em-pe", "sorriso")], pose=[(R(m11 + 0.1), {}), (1, BOCA)], quem="b", esc=0.95),
         ZL(-3.2, z=2.6, rot=0.6, exp="sorriso", pose={"ombroD.x": -1.2, "ombroD.z": -0.5, "dedo": 1})])
# 12: painéis solares e LED; o contador de horas sobe; vista aérea descendo
s12 = W(12, '^painéis'); l12 = W(12, '^LED'); h12 = W(12, '^dezenas')
cenas[12] = M(palco="lanterna", espelho=1, lente=1, aneis=1, mercurio=1, motor=1, giraL=0.7, solar=V(0, 1, R(s12), R(s12 + 0.08)), led=V(0, 1, R(l12 - 0.01), R(l12 + 0.06)), lamparina=V(1, 0, R(l12 - 0.02), R(l12 + 0.03)), horas=V(0, 1, R(h12), 0.95), etiq=["solar@%s-0.5" % R(s12 + 0.03), "led@%s-0.99" % R(l12 + 0.04)], etiqS=1.0,
  camera=cam(pt([61.0, 10.5, 6.5], [60.0, 0.6, 0.0], 52), pt([62.0, 3.6, 8.0], [60.0, 0.8, 0.0], 52)),
  gente=[ZL(-1.7, z=0.9, rot=0.7, acao="em-pe", exp="sorriso", pose=BRACOS_CIMA)])
# 13: revelação: a torre completa acende; o feixe varre o mar; o luau acena e canta
cenas[13] = M(torre=1, lanternaTopo=1, luau=1, feixe=1, gira=0.7, barco2=1, luauPose="acena",
  camera=cam(orb([3.0, 7.0, -8.0], -12, 20.0, 8), pt([-8.0, 20.0, 30.0], [3.0, 3.0, -8.0], 56)),
  gente=[ZB(acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)], c=[rot("FAROL", 0, 40, 100)])
# 14: o Zeca no barco; um grande navio de aço no horizonte; interrogação
cenas[14] = M(torre=1, lanternaTopo=1, luau=1, feixe=1, gira=0.5, navio=V(0, 1, 0.1, 0.4), interroga=V(0, 1, R(W(14, '^Siga') - 0.1), R(W(14, '^Siga'))),
  camera=cam(pt([-4.5, 2.8, 12.5], [-4.0, 2.8, -8.0], 54), pt([-4.0, 3.0, 11.5], [-4.0, 3.0, -8.0], 54)),
  gente=[ZB(acao="em-pe", exp="pensativo", pose=MAO_QUEIXO, rot=-0.5)])
# 15: a torre e o Zeca de frente; as quatro chamadas
cenas[15] = M(torre=1, lanternaTopo=1, luau=1, feixe=1, gira=0.6,
  camera=cam(pt([-3.0, 3.6, 9.8], [-3.0, 3.1, 3.0], 46), pt([-3.0, 3.55, 9.4], [-3.0, 3.1, 3.0], 46)),
  gente=[ZB(acao="acenando", exp="sorriso", rot=0.0)],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "LUAU", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {
1: [("vento", 0, 0.4), ("pop", 1, 0.35), ("queda_energia", 2, 0.4), ("pop", 4, 0.3)],
2: [("agua", 0, 0.45), ("whoosh", 1, 0.4), ("pop", 2, 0.35), ("ding", 3, 0.35)],
3: [("estalo", 0, 0.35), ("pop", 3, 0.4), ("ding", 4, 0.35)],
4: [("pop", 0, 0.35), ("metal", 1, 0.4), ("clique", 2, 0.4)],
5: [("pop", 0, 0.35), ("metal", 1, 0.4), ("ding", 2, 0.4)],
6: [("impacto_seco", 0, 0.4), ("estalo", 1, 0.4), ("clique", 2, 0.4), ("ding", 4, 0.4)],
7: [("pop", 0, 0.35), ("whoosh", 1, 0.45), ("tique", 2, 0.35), ("ding", 3, 0.4)],
8: [("pop", 0, 0.35), ("tique", 2, 0.3), ("papel", 4, 0.4), ("ding", 7, 0.4)],
9: [("pop", 0, 0.35), ("sino_longe", 1, 0.5), ("ding", 3, 0.4)],
10: [("pop", 0, 0.35), ("metal", 1, 0.4)],
11: [("estalo", 0, 0.35), ("pop", 2, 0.4), ("clique", 3, 0.4)],
12: [("pop", 0, 0.4), ("ding", 1, 0.4), ("jingle", 3, 0.4)],
13: [("jingle", 0, 0.5), ("sino_longe", 1, 0.4)],
14: [("pop", 0, 0.4), ("ding", 2, 0.45)],
15: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.55)],
}
# ambiência discreta (lição do elevador): vento baixo só nas batidas do mar; o motor da lente só na batida do motor; o resto em "nenhuma"
AMB = {i: ("nenhuma", 0) for i in range(1, 16)}
for i in (1, 2, 7, 8, 9, 13): AMB[i] = ("vento", 0.035)
AMB[11] = ("motor", 0.035)
B.salvar(cenas, SFX, AMB, {i: dur(i) for i in range(1, 16)}, proibido=('farol', 'faróis'), ate=13)
