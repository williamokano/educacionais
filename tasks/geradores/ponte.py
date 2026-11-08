import sys, os, math, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/ponte/roteiro.json (episódio 23, "como uma ponte segura um caminhão sem cair?", v2 de 17 batidas) a partir de tasks/roteiro-ponte.md.
# Uso (da raiz): python3 tasks/geradores/ponte.py episodios/ponte/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/ponte/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/ponte.tsx (campos no topo). REGRA: "ponte" só a partir da batida 15 (fala e cartão).
B = Base('roteiro-ponte.md', 'ponte', 23, 18)
# Com a voz gravada, W e a duração usam o tempo real de cada palavra/batida (episode.json de ep23) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep23', 'episode.json')
_bt = []; _END = 0
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0); _bt = _j0.get('beats', [])
    if not (len(_bt) == 18 and _bt[0].get('words') and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 19))): _bt = []
def _fim_bt(i): return _bt[i]['start'] if i < len(_bt) else _END
def W(i, pat, fim=False):
    ps = B.palavras_de(i)
    for k, w in enumerate(ps):
        if re.search(pat, w, re.I):
            if not _bt: return round((k + (1 if fim else 0)) / len(ps), 3)
            ws = _bt[i - 1]['words']; b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
            return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
    raise AssertionError((i, pat))
R = lambda x: round(x, 3)
def orb(alvo, az, d, el=8, fov=50, up=0.0):
    a, e = math.radians(az), math.radians(el)
    al = [alvo[0], alvo[1] - up, alvo[2]]
    return pt([al[0] + d * math.sin(a) * math.cos(e), al[1] + d * math.sin(e), al[2] + d * math.cos(a) * math.cos(e)], al, fov)
BRACOS_CIMA = {"ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, "maos": 1}
ESPANTO = {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 1}
MAOS_CABECA = {"ombroE.x": -1.2, "ombroD.x": -1.2, "cotoveloE.x": -2.3, "cotoveloD.x": -2.3, "ombroE.z": 0.5, "ombroD.z": -0.5, "maos": 0.6}
JOINHA = {"ombroD.x": -1.5, "cotoveloD.x": -0.4, "maos": 0.2, "ombroE.z": 0.12}
FILMA = {"ombroE.x": -1.5, "ombroD.x": -1.5, "cotoveloE.x": -0.9, "cotoveloD.x": -0.9, "maos": 0.3}
EQUILIBRA = {"ombroE.z": 1.3, "ombroD.z": -1.3, "cotoveloE.z": 0.2, "cotoveloD.z": -0.2, "maos": 1}
BOCA = {"ombroD.x": -1.0, "ombroD.z": 0.35, "cotoveloD.x": -2.3, "maos": 0.4, "ombroE.z": 0.12}
APONTA = {"ombroD.x": -1.2, "ombroD.z": -0.5, "cotoveloD.x": -0.1, "dedo": 1, "ombroE.z": 0.12}
def Z(x, y=0.0, z=2.0, rot=0.9, acao="em-pe", exp="sorriso", **k): return G(x=x, y=y, z=z, rot=rot, acao=acao, exp=exp, **k)
def Ent(x, y=0.0, z=1.0, rot=-0.9, acao="em-pe", exp="sorriso", **k): return G(x=x, y=y, z=z, rot=rot, acao=acao, exp=exp, quem="entregador", **k)
def dur_est(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return max(2.4, round(len(B.palavras_de(i)) / 2.9, 1))
MACH_CIMA = {"ombroE.x": -2.6, "ombroD.x": -2.6, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "ombroE.z": -0.34, "ombroD.z": 0.34, "maos": 0.2}
MACH_BAIXO = {"ombroE.x": -1.1, "ombroD.x": -1.1, "cotoveloE.x": -0.35, "cotoveloD.x": -0.35, "ombroE.z": -0.34, "ombroD.z": 0.34, "maos": 0.2}
MACH_REPOUSO = {"ombroE.x": -0.5, "ombroD.x": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "ombroE.z": -0.3, "ombroD.z": 0.3, "maos": 0.2}
PEGA = {"ombroE.x": -1.3, "ombroD.x": -1.3, "cotoveloE.x": -0.3, "cotoveloD.x": -0.3, "ombroE.z": -0.25, "ombroD.z": 0.25, "maos": 1}
SEGURA_P = {"ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -0.65, "cotoveloD.x": -0.65, "ombroE.z": -0.2, "ombroD.z": 0.2, "maos": 0.2}
Z_CAL = 1.25
ESQ = lambda m=2.6: -(m + 1.3)
ZL = lambda m=2.6: -(m + 0.35)
DIR = lambda m=2.6: (m + 1.5)

cenas = {}
# 1: só o rio e a margem vazia; o Zeca derruba uma árvore a machadadas (lascas, folhas) e o tronco liso deita sobre o rio e rola
j1 = W(1, '^joinha'); c1 = W(1, '^Corte'); d1 = dur_est(1)
s2p = lambda sec: sec / d1
H1 = [R(c1 + 0.025), R(c1 + 0.085), R(c1 + 0.145)]
q0, q1 = R(H1[2] + 0.03), R(H1[2] + 0.12)
f1 = W(1, '^fome')
pz1 = [(R(H1[0] - s2p(0.3)), MACH_CIMA), (R(H1[0] + s2p(0.1)), MACH_BAIXO), (R(H1[1] - s2p(0.3)), MACH_CIMA), (R(H1[1] + s2p(0.1)), MACH_BAIXO),
       (R(H1[2] - s2p(0.3)), MACH_CIMA), (R(H1[2] + s2p(0.15)), MACH_BAIXO), (R(q1 + 0.03), ESPANTO), (R(f1 - 0.02), MACH_REPOUSO), (1, ESPANTO)]
cenas[1] = M(arvore=1, queda=KF((0, 0), (q0, 0), (q1, 1), (1, 1)), golpes=H1, qIni=q0, qFim=q1, rola=KF((0, 0), (q1, 0), (R(W(1, '^rola') - 0.02), 0), (1, 1.0)), moto=1, ondas=1,
  camera=cam(orb([-0.4, 2.2, 0.0], 24, 19.0, 8), orb([-1.8, 1.6, 0.0], 16, 15.5, 7)),
  gente=[Z(-5.05, z=0.2, rot=1.45, acao=[(R(f1 - 0.02), "em-pe", "sorriso"), (1, "em-pe", "cansado")], pose=pz1, item="machado"), Ent(DIR(), z=1.2, rot=-0.8, pose=[(R(j1 - 0.02), {}), (1, JOINHA)])])
# 2: o Zeca sobe no tronco, equilibra, cai (plof!), anda pela água de frente até a margem (vira para voltar) e sai encharcado; o entregador filma
s2 = W(2, '^sobe'); p2 = W(2, '^plof'); b2 = W(2, '^banho'); e2 = W(2, '^esfriando')
cenas[2] = M(tronco=1, rola=KF((0, 0), (R(s2 + 0.05), 0), (R(p2), 1.6), (1, 1.6)), moto=1, splash=V(0, 1, R(p2 + 0.01), R(p2 + 0.14)), splashX=-0.6, ondas=1,
  camera=cam(orb([-0.5, -0.8, 0.5], 22, 11.0, 4), orb([-0.3, -0.9, 0.5], 14, 10.0, 4)),
  gente=[Z(KF((0, ESQ()), (R(s2), ESQ()), (R(s2 + 0.1), -0.6), (R(p2 + 0.05), -0.6), (R(e2), -2.3), (R(e2 + 0.07), ESQ()), (1, ESQ())),
           y=KF((0, 0), (R(s2), 0), (R(s2 + 0.1), 0.62), (R(p2 - 0.01), 0.62), (R(p2 + 0.05), -3.2), (R(e2), -3.2), (R(e2 + 0.07), 0), (1, 0)),
           z=KF((0, 1.4), (R(s2), 1.4), (R(s2 + 0.1), 0.1), (R(p2 + 0.05), 0.1), (R(p2 + 0.1), 1.4), (1, 1.4)),
           rot=KF((0, 0.9), (R(p2 + 0.05), 0.9), (R(p2 + 0.1), -0.9), (R(e2 + 0.04), -0.9), (R(e2 + 0.1), 0.3), (1, 0.3)),
           acao=[(R(s2), "em-pe", "sorriso"), (R(p2 + 0.06), "em-pe", "surpreso"), (R(e2 + 0.07), "andando", "medo"), (1, "tremendo", "medo")],
           pose=[(R(s2), {}), (R(p2), EQUILIBRA), (R(e2 - 0.02), BRACOS_CIMA), (1, {})]),
         Ent(DIR(), pose=[(R(W(2, '^filma') - 0.02), {}), (1, FILMA)])])
# 3: a tábua apoiada nas duas margens; o Zeca atravessa, pega a pizza, VIRA (giro com passos) e volta de frente; chega o caminhão e a tábua entorta
t3 = W(3, '^tábua'); c3 = W(3, '^caminhão'); e3 = W(3, '^entorta'); pg = W(3, '^pegar')
cenas[3] = M(tabua=V(0, 1, R(t3), R(t3 + 0.08)), furgao=V(0, 1, R(c3 - 0.03), R(c3 - 0.02)), cx=KF((0, 8), (R(c3 - 0.03), 7.5), (R(e3 - 0.02), 0.0), (1, 0.0)), sag=KF((0, 0.05), (R(c3), 0.05), (R(e3 + 0.04), 1.15), (1, 1.15)), moto=1,
  etiq=["tabua@%s-0.55" % R(t3 + 0.03)], etiqS=1.0,
  camera=cam(orb([0.0, -0.3, 0.0], 24, 15.0, 8), orb([0.0, -0.7, 0.0], 18, 12.5, 8)),
  gente=[Z(KF((0, ESQ()), (R(t3 + 0.06), ESQ()), (R(pg - 0.02), 3.2), (R(pg + 0.1), 3.2), (R(c3 - 0.03), ESQ()), (1, ESQ())), y=KF((0, 0), (1, 0)), z=KF((0, 1.4), (1, 1.4)),
           rot=KF((0, 0.9), (R(pg + 0.03), 0.9), (R(pg + 0.11), -0.9), (1, -0.9)),
           acao=[(R(t3 + 0.06), "em-pe", "sorriso"), (R(pg - 0.02), "andando", "sorriso"), (R(pg + 0.03), "em-pe", "sorriso"), (R(e3 - 0.01), "andando", "alivio"), (1, "em-pe", "surpreso")],
           pose=[(R(pg - 0.02), {}), (R(pg + 0.03), PEGA), (R(e3 - 0.02), SEGURA_P), (1, ESPANTO)], item="pizza", itemIni=R(pg + 0.06), itemFim=R(e3)), Ent(DIR(), pose=JOINHA)])
# 4: a tábua grossa aguenta o caminhão; mas é pesada, cara e, com as margens longe, fica fraca
g4 = W(4, '^grossa'); p4 = W(4, '^pesada'); l4 = W(4, '^longe')
cenas[4] = M(tabua=1, grossa=V(0.12, 0.85, R(g4), R(g4 + 0.1)), furgao=1, cx=0.0, sag=KF((0, 0.2), (R(g4 + 0.1), 0.15), (R(l4), 0.2), (1, 1.0)), meia=V(2.6, 4.4, R(l4 - 0.02), R(l4 + 0.2)), peso=V(0, 1, R(p4), R(p4 + 0.05)), caro=V(0, 1, R(W(4, '^fortuna') - 0.06), R(W(4, '^fortuna'))),
  camera=cam(orb([-1.2, -0.2, 0.0], 22, 16.0, 8), orb([-1.2, -0.4, 0.0], 18, 18.5, 8)),
  gente=[Z(V(ZL(), ZL(4.4), R(l4 - 0.02), R(l4 + 0.2)), exp="preocupado", pose=MAOS_CABECA)])
# 5: barras finas em triângulos; o quadrado deforma, o triângulo não; o furgão passa sem ceder
b5 = W(5, '^barras'); q5 = W(5, '^triângulo'); m5 = W(5, '^muda')
cenas[5] = M(meia=4.4, tabua=V(1, 0, R(b5 - 0.03), R(b5 + 0.03)), trelica=V(0, 1, R(b5), R(b5 + 0.18)), esforco=V(0, 1, R(W(5, '^empurra') - 0.04), R(W(5, '^empurra') + 0.1)), mini=V(0, 1, R(q5 - 0.04), R(q5 + 0.05)), furgao=1, cx=KF((0, -7), (R(m5), -7), (1, 5)), sag=0.0,
  etiq=["trian@%s-0.97" % R(b5 + 0.06)], etiqS=1.0,
  camera=cam(orb([-1.2, 0.8, 0.0], 24, 19.0, 8), orb([-1.2, 0.6, 0.0], 18, 15.0, 8)),
  gente=[Z(ZL(4.4), exp="surpreso", pose=ESPANTO)])
# 6: o vão cresce; um pilar sobe do leito no meio e a estrutura repousa nele; raio-X mostra a armadura dentro do concreto
w6 = W(6, '^largo'); p6 = W(6, '^pilar'); d6 = W(6, '^dois')
cenas[6] = M(meia=V(4.4, 6.0, R(w6 - 0.02), R(w6 + 0.15)), trelica=1, pilar=V(0, 1, R(p6), R(p6 + 0.15)), furgao=0, etiq=["pilar@%s-0.75" % R(p6 + 0.05)], etiqS=1.0,
  raiox=KF((0, 0), (R(d6 + 0.02), 0), (R(d6 + 0.09), 0.95), (0.97, 0.95), (1, 0)),
  camera=cam(orb([-2.6, -0.8, 0.0], 22, 21.0, 8), orb([0.0, -2.2, 0.3], 20, 10.0, 6)),
  gente=[Z(V(ZL(4.4), ZL(6.0), R(w6 - 0.02), R(w6 + 0.15)), exp="alivio")])
# 7: o rio enche, escava a areia, o pilar tomba com a estrutura (sem gente); a câmera treme
e7 = W(7, '^enche'); t7 = W(7, '^tomba')
cenas[7] = M(meia=6.0, trelica=1, pilar=1, cheia=V(0, 1, R(e7), R(e7 + 0.2)), tomba=V(0, 1, R(t7 - 0.05), R(t7 + 0.08)), treme=KF((0, 0), (R(t7 - 0.04), 0), (R(t7 + 0.02), 1), (R(t7 + 0.1), 0), (1, 0)),
  camera=cam(orb([-2.6, -1.4, 0.0], 18, 17.0, 5), orb([-2.6, -1.4, 0.0], 14, 15.5, 5)),
  gente=[Z(ZL(6.0), exp="medo", pose=MAOS_CABECA)])
# 8: estacas até a rocha: corte do leito em raio-X; o pilar sem estacas fica descalço e tomba; o pilar sobre estacas e sapata fica firme
es8 = W(8, '^estacas'); ro8 = W(8, '^rocha'); fu8 = W(8, '^fundação'); pi8 = W(8, '^pilar')
cenas[8] = M(meia=6.0, cheia=1, solo=1, cava=KF((0, 0.05), (0.35, 0.7), (0.9, 1.0), (1, 1.0)), raiox=KF((0, 0), (R(es8 - 0.03), 0), (R(es8 + 0.05), 0.9), (1, 0.9)),
  estacas=V(0, 1, R(es8 + 0.02), R(es8 + 0.34)), bloco=V(0, 1, R(es8 + 0.35), R(es8 + 0.6)), tomba2=V(0, 1, R(pi8 + 0.02), R(pi8 + 0.2)),
  etiq=["areia@%s-0.34" % R(es8 - 0.06), "rocha@%s-0.5" % R(ro8 - 0.02), "estacas@%s-0.55" % R(es8 + 0.05), "fund@%s-0.8" % R(fu8)], etiqS=1.0, etiqK=0.8,
  camera=cam(orb([0.0, -5.0, 0.0], 14, 13.0, 4), orb([0.0, -5.3, 0.0], 8, 12.0, 4)),
  gente=[Z(ZL(6.0), exp="alivio", pose=ESPANTO)])
# 9: sem pilar, um arco de pedra: cada pedra aperta a vizinha; trânsito de carros e caminhões; órbita curta na vitória
a8 = W(9, '^arco'); ap8 = W(9, '^aperta'); ro9 = W(9, '^romanos')
cenas[9] = M(meia=4.4, arco=V(0, 1, R(a8 + 0.02), R(a8 + 0.2)), compressao=V(0, 1, R(ap8), R(ap8 + 0.08)), via=V(0, 1, R(ro9 - 0.04), R(ro9 - 0.02)), transito=V(0, 1, R(ro9 - 0.02), R(ro9 + 0.05)), etiq=["arco@%s-0.97" % R(a8 + 0.04)], etiqS=1.0,
  camera=cam(orb([-1.2, -0.8, 0.0], 8, 15.0, 8), orb([-1.2, -0.8, 0.0], 52, 15.5, 12)),
  gente=[Z(ZL(4.4) - 0.8, y=KF((0, 0), (R(ro9 - 0.04), 0), (R(ro9 - 0.02), 0.27), (1, 0.27)), z=KF((0, 2.0), (R(ro9 - 0.04), 2.0), (R(ro9 - 0.02), Z_CAL), (1, Z_CAL)), acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])
# 10: o arco empurra pros lados e, sem apoio, abre; blocos enormes nas pontas seguram
e9 = W(10, '^empurra'); a9 = W(10, '^abre'); b9 = W(10, '^blocos')
cenas[10] = M(meia=4.4, arco=1, empurra=V(0, 1, R(e9), R(e9 + 0.06)), abre=KF((0, 0), (R(a9 - 0.04), 0), (R(a9 + 0.08), 0.8), (R(b9 - 0.02), 0.8), (R(b9 + 0.1), 0), (1, 0)), blocos=V(0, 1, R(b9 - 0.02), R(b9 + 0.12)), etiq=["blocos@%s-0.97" % R(b9 + 0.08)], etiqS=1.0,
  camera=cam(orb([-2.6, -1.0, 0.0], 22, 15.5, 8), orb([-2.6, -1.0, 0.0], 16, 15.0, 8)),
  gente=[Z(ZL(4.4) - 0.8, z=2.15, exp="surpreso", pose=[(R(b9), ESPANTO), (1, {})])])
# 11: o rio vira baía; duas torres em pórtico (vazadas, a pista passa entre as pernas) sobem; cabos principais e pendurais seguram o caminho; âncoras de concreto; setas de tração (vista aérea); chega o trânsito
t10 = W(11, '^pendure'); c10 = W(11, '^cabos'); r10 = W(11, '^torres'); a10 = W(11, '^ancorados')
cenas[11] = M(meia=V(4.4, 8.0, 0.0, R(t10 + 0.05)), arco=V(1, 0, 0.0, 0.08), blocos=V(1, 0, 0.0, 0.08), via=1, torres=V(0, 1, R(r10 - 0.08), R(r10 + 0.08)), cabos=V(0, 1, R(c10 - 0.02), R(c10 + 0.2)), estrada=V(0, 1, R(c10), R(c10 + 0.15)), transito=V(0, 1, R(c10 + 0.12), R(c10 + 0.2)), ancora=V(0, 1, R(a10 - 0.02), R(a10 + 0.08)), puxa=V(0, 1, R(a10 + 0.06), R(a10 + 0.14)),
  etiq=["cabos@%s-0.55" % R(c10 + 0.04), "torres@%s-0.97" % R(r10 + 0.05)], etiqS=1.0, etiqK=0.85,
  camera=cam(pt([2.0, 15.0, 19.0], [-3.0, 0.5, 0.0], 50), pt([0.0, 7.0, 21.0], [-3.0, 1.0, 0.0], 50)),
  gente=[Z(V(ZL(4.4) - 0.8, -12.5, 0.0, R(t10 + 0.05)), y=0.27, z=Z_CAL, exp="surpreso", pose=ESPANTO)])
# 12: cabos retos direto da torre ao caminho, em leque; somem as âncoras; travelling seguindo um caminhão que atravessa
d11 = W(12, '^direto')
cenas[12] = M(meia=8.0, torres=1, cabos=V(1, 0, R(d11 - 0.04), R(d11 + 0.06)), estrada=1, via=1, transito=1, heroi=V(-10.5, 10.5), ancora=V(1, 0, R(d11 - 0.06), R(d11 + 0.02)), leque=V(0, 1, R(d11), R(d11 + 0.2)), etiq=["leque@%s-0.6" % R(d11 + 0.1)], etiqS=1.0, etiqK=0.85,
  camera=cam(pt([-12.0, 3.8, 11.5], [-10.5, 1.2, 0.0], 50), pt([9.0, 3.8, 11.5], [10.5, 1.2, 0.0], 50)),
  gente=[Z(-12.5, y=0.27, z=Z_CAL, acao="explicando", exp="sorriso")])
# 13: o vento torce a pista pendurada (maquete sem gente nem carro) e ela desaba (1940); depois a pista vazada e lisa deixa o vento passar
v12 = W(13, '^vento'); d12 = W(13, '^derrubou'); l12 = W(13, '^vazado')
cenas[13] = M(meia=8.0, torres=1, cabos=1, pista=1, ventoV=V(0, 1, R(v12), R(v12 + 0.06)), torce=KF((0, 0), (R(v12 + 0.02), 0), (R(v12 + 0.2), 1), (R(d12), 1), (R(d12 + 0.04), 0.0), (1, 0.15)), desaba=KF((0, 0), (R(d12 - 0.02), 0), (R(d12 + 0.12), 1), (R(l12 - 0.03), 1), (R(l12 - 0.02), 0), (1, 0)), vazado=V(0, 1, R(l12 - 0.02), R(l12)), treme=KF((0, 0), (R(d12 - 0.02), 0), (R(d12 + 0.04), 1), (R(d12 + 0.14), 0), (1, 0)),
  camera=cam(orb([-3.4, 1.2, 0.0], 24, 21.0, 8), orb([-3.4, 1.2, 0.0], 18, 18.5, 8)),
  gente=[Z(ZL(8.0), exp=[(0, "medo")][0][1], pose=ESPANTO)], c=[rot("1940", 1, 40, 100)])
# 14: a passarela cheia de gente no mesmo passo balança; os amortecedores acalmam
a13 = W(14, '^amortecedores')
cenas[14] = M(meia=5.0, povo=1, balanco=KF((0, 0.05), (0.15, 0.15), (R(a13 - 0.05), 0.45), (R(a13 + 0.1), 0.03), (1, 0.02)), amort=V(0, 1, R(a13), R(a13 + 0.1)), etiq=["amort@%s-0.97" % R(a13 + 0.05)], etiqS=1.0,
  camera=cam(orb([0.0, 0.2, 0.0], 30, 16.5, 12), orb([0.0, 0.2, 0.0], 26, 15.5, 12)),
  gente=[Z(ESQ(5.0), acao="em-pe", exp="surpreso", pose=EQUILIBRA)])
# 15: close da junta de dilatação de AÇO (dedos entrelaçados, parafusada nos dois lados): ao sol o aço estica e o vão fecha (dedos entram); à noite encolhe e o vão abre
s14 = W(15, '^esquenta'); n14 = W(15, '^noite'); j14 = W(15, '^junta')
cenas[15] = M(junta=1, calor=KF((0, 0.0), (R(s14), 0.0), (R(s14 + 0.12), 1.0), (R(n14 - 0.02), 1.0), (R(n14 + 0.1), -1.0), (R(j14), -1.0), (R(j14 + 0.1), 0.0), (1, 0.0)), noite=KF((0, 0), (R(n14 - 0.02), 0), (R(n14 + 0.1), 1), (R(j14), 1), (R(j14 + 0.1), 0), (1, 0)), meia=5.0, ondas=0, etiq=["junta@%s-0.97" % R(j14 + 0.04)], etiqS=1.0, etiqK=0.8,
  camera=cam(orb([0.0, 0.3, 0.0], 22, 8.0, 22), orb([0.0, 0.3, 0.0], 12, 7.0, 20)),
  gente=[Z(2.8, z=3.4, rot=-0.5, acao="explicando", exp="sorriso", esc=0.9)])
# 16: revelação: a travessia completa ao entardecer, com trânsito; o entregador atravessa pela calçada e entrega a pizza; o Zeca (na calçada, longe dos cabos) morde e faz careta
x15 = W(16, '^pizza')
cenas[16] = M(meia=8.0, torres=1, cabos=1, estrada=1, via=1, transito=1, ancora=1, entardecer=1,
  camera=cam(orb([0.0, 1.2, 0.0], 14, 16.0, 6), pt([6.0, 13.0, 24.0], [0.0, 1.5, 0.0], 52)),
  gente=[Ent(V(DIR(8.0), 0.0, 0.05, R(x15 - 0.02)), y=0.27, z=Z_CAL, rot=-1.5707, acao=[(R(x15 - 0.02), "andando", "sorriso"), (1, "em-pe", "sorriso")], pose=[(R(x15 - 0.02), SEGURA_P), (1, {})], item="pizza", itemFim=R(x15 - 0.01)),
         Z(-1.2, y=0.27, z=Z_CAL, rot=1.2, acao="comemorando", exp="sorriso", pose=[(R(x15 - 0.02), BRACOS_CIMA), (R(x15 + 0.04), SEGURA_P), (1, BOCA)], item="pizza", itemIni=R(x15 - 0.01), itemFim=R(x15 + 0.12))], c=[rot("PONTE", 1, 40, 100)])
# 17: o Zeca olha o pôr do sol; um relógio enorme surge no fundo; interrogação
r16 = W(17, '^relógio')
cenas[17] = M(meia=8.0, torres=1, cabos=1, estrada=1, via=1, transito=1, ancora=1, entardecer=1, relogio=V(0, 1, R(r16 - 0.03), R(r16 + 0.1)), interroga=V(0, 1, R(W(17, '^Siga') - 0.1), R(W(17, '^Siga'))),
  camera=cam(orb([-2.0, 2.0, 0.0], 20, 18.0, 8), orb([-2.0, 2.2, 0.0], 14, 16.5, 8)),
  gente=[Z(-1.2, y=0.27, z=Z_CAL, rot=0.7, acao="em-pe", exp="pensativo", pose={"cabeca.x": -0.1})])
# 18: o Zeca de frente na calçada da travessia (entre os pendurais, abaixo do cabo); as quatro chamadas
cenas[18] = M(meia=8.0, torres=1, cabos=1, estrada=1, via=1, transito=1, ancora=1, entardecer=1,
  camera=cam(pt([0.0, 3.0, 7.4], [0.0, 2.7, 0.0], 46), pt([0.0, 2.95, 7.0], [0.0, 2.7, 0.0], 46)),
  gente=[G(x=0.0, y=0.27, z=Z_CAL, rot=0.0, acao="acenando", exp="sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "PIZZA", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])
SFX = {
1: [("pop", 0, 0.4), ("impacto_seco", 2, 0.5), ("estalo", 2, 0.35), ("agua", 3, 0.35), ("pop", 4, 0.35), ("estalo", 5, 0.3)],
2: [("pop", 0, 0.35), ("whoosh", 1, 0.4), ("agua", 2, 0.55), ("pop", 4, 0.3)],
3: [("pop", 0, 0.4), ("pop", 1, 0.35), ("impacto_seco", 2, 0.5), ("estalo", 3, 0.5)],
4: [("pop", 0, 0.4), ("impacto_seco", 1, 0.4), ("pop", 2, 0.35)],
5: [("metal", 0, 0.4), ("clique", 1, 0.4), ("ding", 2, 0.4)],
6: [("pop", 0, 0.35), ("pop", 1, 0.4), ("impacto_seco", 2, 0.4)],
7: [("agua", 0, 0.4), ("estalo", 1, 0.5), ("impacto_seco", 2, 0.55)],
8: [("pop", 0, 0.4), ("impacto_seco", 1, 0.5), ("metal", 2, 0.4), ("ding", 3, 0.4)],
9: [("pop", 0, 0.4), ("clique", 1, 0.4), ("ding", 2, 0.4)],
10: [("pop", 0, 0.35), ("estalo", 1, 0.45), ("impacto_seco", 2, 0.4), ("ding", 3, 0.4)],
11: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("metal", 2, 0.4)],
12: [("pop", 0, 0.4), ("clique", 1, 0.4)],
13: [("vento", 0, 0.5), ("estalo", 1, 0.55), ("impacto_seco", 1, 0.5), ("ding", 3, 0.4)],
14: [("pop", 0, 0.4), ("pop", 1, 0.35), ("ding", 3, 0.4)],
15: [("pop", 0, 0.4), ("tique", 1, 0.3), ("ding", 3, 0.4)],
16: [("jingle", 0, 0.5)],
17: [("pop", 0, 0.4), ("sino_longe", 1, 0.4)],
18: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.55)],
}
AMB = {i: ("passaros", 0.05) for i in range(1, 18)}
AMB.update({13: ("vento", 0.08), 15: ("nenhuma", 0), 18: ("passaros", 0.04)})
B.salvar(cenas, SFX, AMB, {i: dur_est(i) for i in range(1, 19)} if _bt else {}, proibido=('ponte',), ate=16)
