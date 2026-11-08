import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/para-raios/roteiro.json (episódio 15, "como uma casa aguenta um raio de 300 milhões de volts?") a partir da tabela de cenas de tasks/roteiro-para-raios.md (v2, 17 batidas).
# Uso (da raiz): python3 tasks/geradores/para-raios.py episodios/para-raios/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/para-raios/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/pararaios.tsx (campos no topo). Palcos: casa x = 0 · franklin x = 120 · mapa x = 180.
# REGRA: o nome "para-raios" só aparece a partir da batida 12 (fala, rótulo, cartão).
B = Base('roteiro-para-raios.md', 'pararaios', 15, 17)
W = B.W
# Com a voz gravada, W, Wn e dur usam o tempo real de cada palavra/batida (episode.json de ep15) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep15', 'episode.json')
_bt = []
if os.path.exists(_EPJ):
    _bt = json.load(open(_EPJ, encoding='utf-8')).get('beats', [])
    if not (len(_bt) == 17 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0): _bt = []

def Wn(i, pat, n=1, fim=False):
    """progresso em que começa (ou termina) a n-ésima palavra que casa com `pat` (tempo real das palavras quando há voz)"""
    ps = B.palavras_de(i); c = 0
    ws = _bt[i - 1]['words'] if _bt and len(_bt[i - 1]['words']) == len(ps) else None
    for k, w in enumerate(ps):
        if re.search(pat, w, re.I):
            c += 1
            if c == n:
                if ws:
                    b0, b1 = _bt[i - 1]['start'], _bt[i - 1]['end']
                    return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
                return round((k + (1 if fim else 0)) / len(ps), 3)
    raise AssertionError((i, pat, n))
def W(i, pat, fim=False): return Wn(i, pat, 1, fim)
def dur(i):
    if _bt: return round(_bt[i - 1]['end'] - _bt[i - 1]['start'], 3)
    return round(max(2.4, len(B.palavras_de(i)) / 2.9), 1)

def orb(alvo, az, d, el=10, fov=50, up=0.0, dx=0.0, kd=1.3):
    d = d * kd
    """câmera a `d` m do alvo, azimute `az` (graus, + = lado direito) e elevação `el`; `up` baixa o alvo (o assunto sobe no quadro)"""
    a, e = math.radians(az), math.radians(el)
    al = [alvo[0] + dx, alvo[1] - up, alvo[2]]
    return pt([al[0] + d * math.sin(a) * math.cos(e), al[1] + d * math.sin(e), al[2] + d * math.cos(a) * math.cos(e)], al, fov)

CRUZADOS = {}
OLHA_CEU = {"cabeca.x": -0.55, "ombroE.x": -0.2, "ombroD.x": -0.2}
GOLPE = {"ombroE.x": -1.3, "ombroD.x": -1.3, "cotoveloE.x": -0.2, "cotoveloD.x": -0.2, "tronco.x": 0.3, "maos": 0.2}
VIRA_E = -math.pi / 2
HA = dict(haste=1)
CA = M(HA, cabo=1)
CO = M(CA, terra=1)
KIT = M(CO, rede=1, protetor=1)   # o conjunto completo

def Vz(x=0.0, z=3.4, rot=0.3, acao="em-pe", exp="sorriso", **k): return G(x=x, z=z, rot=rot, acao=acao, exp=exp, **k)
def Viz(x=1.2, z=3.5, rot=-0.2, acao="bracos-cruzados", exp="sorriso", **k): return G(x=x, z=z, rot=rot, acao=acao, exp=exp, quem="vizinho", esc=1.0, **k)

cenas = {}
# 1: tempestade; o vizinho de braços cruzados; o raio acerta o telhado dele duas vezes; fumaça e cabelo em pé
r1 = Wn(1, '^cai$', 2); r2 = W(1, '^novo'); fu = W(1, '^fumegando')
cenas[1] = M(raio=V(0, 1, round(r1 - 0.03, 3), round(r1 + 0.18, 3)), raio2=V(0, 1, round(r2 - 0.04, 3), round(r2 + 0.16, 3)), fumaca=V(0, 1, round(r1 + 0.1, 3), 1.0), pisca=V(0, 1, round(r1 + 0.05, 3), 0.8), luz=1,
  camera=cam(orb([0, 1.6, 3.5], -12, 7.0, -4, 55, kd=1), orb([0, 3.2, 1.0], -38, 13.0, 20, 52)),
  gente=[Viz(1.2, 3.5, -0.25, cabeloPe=KF((0, 0), (round(r1 + 0.02, 3), 0), (round(r1 + 0.06, 3), 0.4), (round(r2 + 0.02, 3), 0.4), (round(r2 + 0.08, 3), 1), (1, 1)), estrelas=KF((0, 0), (round(r2 + 0.04, 3), 0), (round(r2 + 0.1, 3), 1), (1, 1)),
             acao=[(round(r1 + 0.06, 3), "bracos-cruzados", "sorriso"), (1, "surpreso", "surpreso")]),
         Vz(-1.3, 3.6, 0.4, "em-pe", "surpreso", pose=OLHA_CEU)], c=[])
# 2: galochas; o relâmpago acende o chão e elas dão um pulinho; rótulo 300 MILHÕES DE VOLTS
g2 = W(2, '^300')
cenas[2] = M(raio=V(0, 1, round(g2 + 0.02, 3), round(g2 + 0.2, 3)), alvo="chao", choque=KF((0, 0), (round(g2 + 0.06, 3), 0), (round(g2 + 0.09, 3), 1), (round(g2 + 0.28, 3), 0.15), (1, 0)), choqueCor="azul", choqueX=0.5, choqueZ=3.6, luz=1,
  camera=cam(orb([0.5, 0.55, 3.6], 38, 5.2, 10, 50, kd=1), orb([0.5, 0.6, 3.6], 28, 4.8, 8, 50, kd=1)),
  gente=[Vz(0.5, 3.6, 0.4, galochas=True, pulo=KF((0, 0), (round(g2 + 0.07, 3), 0), (round(g2 + 0.09, 3), 1), (round(g2 + 0.3, 3), 0.7), (round(g2 + 0.4, 3), 0), (1, 0)),
          acao=[(round(g2 + 0.07, 3), "em-pe", "sorriso"), (1, "em-pe", "surpreso")])],
  c=[rot("300 MILHÕES DE VOLTS", 1, 40, 70)])
# 3: a haste sobe na cumeeira; o raio cai nela e o telhado fica intacto
h3 = W(3, '^haste'); n3 = W(3, '^nela')
cenas[3] = M(haste=V(0, 1, h3, round(h3 + 0.13, 3)), escada=1, raio=V(0, 1, round(n3 - 0.03, 3), round(n3 + 0.18, 3)), alvo="haste", luz=1, etiq=["haste@%s" % round(h3 + 0.08, 3)], etiqS=0.9,
  camera=cam(orb([-1.0, 3.6, 0.8], 30, 10.5, 12, 52), orb([-0.8, 4.0, 0.8], 24, 9.0, 14, 52)),
  gente=[Vz(-2.4, 3.0, 0.3, [(round(n3 - 0.04, 3), "apontando"), (1, "comemorando")], "sorriso", y=2.55)], c=[])
# 4: a corrente entra na haste e escapa pela casa; as lâmpadas piscam
e4 = W(4, '^escapa')
cenas[4] = M(HA, raio=V(0, 1, 0.0, 0.2), alvo="haste", espalha=V(0, 1, round(e4 - 0.02, 3), round(e4 + 0.3, 3)), fiacao=V(0, 1, W(4, '^paredes'), round(W(4, '^fiação') + 0.1, 3)), pisca=V(0, 1, W(4, '^lâmpadas'), 0.97), luz=1,
  camera=cam(orb([0, 3.3, 1.0], -28, 11.5, 12, 50), orb([0, 3.3, 1.0], -20, 10.0, 12, 50)),
  gente=[Vz(-4.3, 3.4, 0.45, "em-pe", "surpreso", pose={"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -1.2, "cotoveloD.x": -1.2, "maos": 1})], c=[])
# 5: fio fino da haste ao chão; esquenta, fica vermelho e derrete como vela
f5 = W(5, '^fio'); q5 = W(5, '^passa'); d5 = W(5, '^derrete')
cenas[5] = M(HA, fio=V(0, 1, f5, round(W(5, '^chão') + 0.03, 3)), calor=V(0, 1, q5, round(W(5, '^vermelho', fim=True) + 0.02, 3)), derrete=V(0, 1, round(d5 - 0.03, 3), 1.0), luz=1,
  camera=cam(orb([2.2, 2.7, 2.4], 34, 10.0, 10, 50), orb([2.7, 2.2, 2.4], 30, 5.2, 8, 50)),
  gente=[Vz(4.6, 3.4, -0.35, "explicando", "sorriso")], c=[])
# 6: cabo grosso por fora até o chão; só encosta na terra: a corrente fica presa na ponta
c6 = W(6, '^cabo'); e6 = W(6, '^encosta')
cenas[6] = M(HA, cabo=V(0, 1, c6, round(W(6, '^chão', fim=True) - 0.02, 3)), onda=V(0, 1, round(e6 - 0.1, 3), round(e6 + 0.12, 3)), acumula=V(0, 1, round(e6 + 0.06, 3), 0.9), pisca=V(0, 1, round(e6 + 0.2, 3), 0.95), luz=1,
  etiq=["cabo@%s" % round(c6 + 0.06, 3)], etiqS=0.9,
  camera=cam(orb([2.7, 1.9, 2.5], 36, 9.5, 8, 50), orb([2.8, -0.2, 3.9], 26, 7.0, 5, 50)),
  gente=[Vz(5.0, 3.5, VIRA_E + 0.4, "explicando", "sorriso")], c=[])
# 7: uma haste enterrada; a terra seca conduz mal; quem pisa perto leva choque nos pés
t7 = W(7, '^enterre'); p7 = W(7, '^pisa'); a7 = W(7, '^acumula')
cenas[7] = M(CA, unica=True, terra=V(0, 1, t7, round(t7 + 0.14, 3)), onda=V(0, 1, round(W(7, '^Mas') - 0.0, 3), round(W(7, '^Mas') + 0.2, 3)), choque=KF((0, 0), (round(a7 - 0.02, 3), 0), (round(a7 + 0.1, 3), 1), (1, 1)), choqueX=2.9, choqueZ=3.7, luz=1,
  camera=cam(orb([3.3, 0.5, 3.7], 32, 8.2, 14, 50), orb([3.4, 0.4, 3.7], 26, 5.8, 14, 50)),
  gente=[Vz(V(5.6, 3.7, 0.0, round(p7 - 0.02, 3)), 3.6, 0.3, [(round(p7 - 0.02, 3), "andando", "sorriso"), (1, "em-pe", "surpreso")], pulo=KF((0, 0), (round(p7 + 0.02, 3), 0), (round(p7 + 0.05, 3), 1), (1, 0.9)), estrelas=KF((0, 0), (round(p7 + 0.03, 3), 0), (round(p7 + 0.08, 3), 1), (1, 1)))],
  c=[])
# 8: várias hastes em volta; a corrente abre em leque; o choque nos pés diminui
t8 = W(8, '^enterre'); l8 = W(8, '^espalha'); h8 = W(8, '^hastes')
cenas[8] = M(CA, terra=V(0, 1, t8, round(W(8, '^cabo', fim=True) - 0.02, 3)), onda=V(0, 1, round(l8 - 0.04, 3), round(l8 + 0.12, 3)), leque=V(0, 1, round(l8 - 0.0, 3), 0.97), choque=V(0.9, 0.1, round(l8, 3), 0.95), choqueX=2.9, choqueZ=3.7, luz=1,
  etiq=["aterra@%s" % round(h8 + 0.04, 3)], etiqS=0.9,
  camera=cam(pt([-0.6, 0.3, 12.0], [1.8, -0.8, 4.0], 50), pt([6.4, 0.3, 11.2], [3.8, -0.8, 4.0], 50)),
  gente=[Vz(5.2, 3.5, VIRA_E + 0.5, "em-pe", "sorriso", pose=[(0.16, {}), (0.26, GOLPE), (0.34, {}), (0.44, GOLPE), (0.52, {}), (1, {})])], c=[])
# 9: raio-X da casa: faísca azul entre o cano e a caixa de fios; o Zeca na cozinha dá um pulinho
s9 = W(9, '^faísca')
cenas[9] = M(CO, raiox=V(0, 1, 0.0, 0.12), cano=V(0, 1, 0.0, 0.12), faisca=V(0, 1, round(s9 - 0.03, 3), round(s9 + 0.03, 3)), luz=1,
  camera=cam(orb([0.5, 1.4, -0.6], -24, 8.6, 10, 50), orb([0.5, 1.4, -0.6], -18, 7.6, 10, 50)),
  gente=[Vz(-1.5, -0.2, 0.3, pulo=KF((0, 0), (round(s9 + 0.0, 3), 0), (round(s9 + 0.03, 3), 0.5), (round(s9 + 0.18, 3), 0), (1, 0)),
          acao=[(round(s9 - 0.02, 3), "em-pe", "sorriso"), (1, "surpreso", "surpreso")])], c=[])
# 10: fios verdes ligam cano, coluna e quadro ao aterramento; as faíscas somem; setas "sobem juntas"
l10 = W(10, '^ligue'); t10 = W(10, '^todo$'); q10 = W(10, '^luz')
cenas[10] = M(CO, raiox=1, cano=1, ligaTudo=V(0, 1, l10, round(q10 + 0.06, 3)), faisca=V(1, 0, round(q10, 3), round(q10 + 0.1, 3)), sobem=V(0, 1, round(Wn(10, '^todo', 1) - 0.02, 3), round(Wn(10, '^todo', 1) + 0.1, 3)), luz=1,
  camera=cam(orb([0.5, 1.1, -0.3], -22, 8.6, 12, 50), orb([0.5, 1.1, -0.3], -14, 6.6, 14, 50)),
  gente=[Vz(-1.6, -0.2, 0.3, "explicando", "sorriso")], c=[])
# 11: o raio cai na rede da rua; o pico corre pelo fio até as tomadas; o protetor desvia o pico para o aterramento
t11 = W(11, '^tomadas'); p11 = W(11, '^protetor'); d11 = W(11, '^desvia')
cenas[11] = M(CO, rede=1, protetor=V(0, 1, round(p11 - 0.02, 3), round(p11 + 0.07, 3)), raio=V(0, 1, 0.12, 0.3), alvo="poste", pico=V(0, 1, 0.2, round(t11 + 0.04, 3)), estoura=KF((0, 0), (round(t11 - 0.02, 3), 0), (round(t11 + 0.02, 3), 1), (round(p11 - 0.04, 3), 1), (round(p11 + 0.02, 3), 0), (1, 0)),
  raio2=V(0, 1, round(d11 - 0.1, 3), round(d11 + 0.1, 3)), alvo2="poste", pico2=V(0, 1, round(d11 - 0.02, 3), round(d11 + 0.17, 3)), luz=1, etiq=["protetor@%s" % round(p11 + 0.05, 3)], etiqS=0.9,
  camera=cam(orb([-5.2, 4.2, 0.6], 22, 12.0, 8, 50), orb([-2.6, 2.4, 1.0], 28, 9.0, 10, 50)),
  gente=[Vz(-4.4, 3.5, 0.5, "em-pe", "sorriso")], c=[])
# 12: revelação: plano aberto do conjunto; os rótulos acendem; entra o nome
cenas[12] = M(KIT, destaque=V(0, 1, 0.14, 0.92), etiq=["haste@0.3-0.52", "cabo@0.42-0.7", "aterra@0.54-0.85", "protetor@0.66-0.97"], etiqS=1.0, etiqK=0.8, etiqYmax=0.45, luz=1,
  camera=cam(orb([-0.5, 1.8, 1.5], -34, 17.0, 6, 52), orb([-0.5, 1.8, 1.5], 22, 20.0, 36, 52)),
  gente=[Vz(-1.6, 3.4, 0.2, "comemorando", "sorriso")], c=[rot("PARA-RAIOS", 0, 40, 100)])
# 13: o raio cai na haste de novo; o caminho brilha até a terra; a casa de pé e acesa
i13 = W(13, '^impede'); k13 = W(13, '^caminho'); m13 = W(13, '^mesmo')
cenas[13] = M(KIT, raio=V(0, 1, round(i13 - 0.02, 3), round(i13 + 0.2, 3)), raio2=V(0, 1, round(m13 - 0.03, 3), round(m13 + 0.2, 3)), alvo="haste", alvo2="haste",
  onda=KF((0, 0), (round(k13 - 0.04, 3), 0), (round(k13 + 0.16, 3), 1), (round(k13 + 0.17, 3), 0), (round(m13 - 0.02, 3), 0), (round(m13 + 0.18, 3), 1), (1, 1)),
  leque=KF((0, 0), (round(m13 + 0.1, 3), 0), (0.98, 1), (1, 1)), luz=1,
  camera=cam(orb([1.2, 2.6, 1.2], -26, 14.0, 12, 50), orb([1.8, 1.8, 1.4], -18, 12.0, 8, 50)),
  gente=[Vz(-4.4, 3.4, 0.45, "explicando", "sorriso")], c=[])
# 14: gravura de Franklin; só o ano na tela
cenas[14] = M(palco="franklin", raio=V(0, 1, 0.45, 0.85), camera=cam(pt([121.0, 2.4, 15.0], [121.0, 2.2, 0], 44), pt([121.0, 2.4, 13.2], [121.0, 2.2, 0], 44)), c=[rot("1752", 0, 40, 100)])
# 15: o Brasil à noite, raios por todo lado
cenas[15] = M(palco="mapa", flashes=V(0.35, 1, 0.0, 0.5), camera=cam(pt([176.0, 12.5, 12.0], [180, 0, 0.6], 50), pt([184.0, 11.0, 11.0], [180, 0, 0.6], 50)), c=[rot("BRASIL", 0, 40, 100)])
# 16: o vizinho de braços cruzados com o telhado fumegando; o Zeca olha pro céu; um avião cruza; entra uma interrogação
a16 = W(16, '^avião')
cenas[16] = M(fumaca=1, luz=1, aviao=V(0, 1, round(a16 - 0.05, 3), 0.97), lampada=V(0, 1, round(a16 + 0.02, 3), round(a16 + 0.1, 3)),
  camera=cam(orb([0, 3.6, 2.5], -20, 12.0, 10, 50, 0), orb([0, 4.4, 2.5], -14, 11.0, 12, 50)),
  gente=[Viz(1.5, 3.5, -0.3, cabeloPe=1), Vz(-1.5, 3.6, 0.4, "em-pe", "surpreso", pose=OLHA_CEU)], c=[])
# 17: o Zeca de frente; entram as quatro chamadas
cenas[17] = M(luz=1, camera=cam(pt([0.0, 3.0, 10.1], [0.0, 2.7, 3.4], 46), pt([0.0, 2.95, 9.6], [0.0, 2.7, 3.4], 46)),
  gente=[Vz(0.0, 3.4, 0.0, "acenando", "sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "RAIO", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {
1: [("trovao", 0, 0.6), ("raio", 1, 0.55), ("raio", 2, 0.55), ("estalo", 3, 0.4)],
2: [("pop", 0, 0.4), ("raio", 1, 0.55), ("trovao", 1, 0.5)],
3: [("pop", 0, 0.4), ("metal", 1, 0.5), ("raio", 3, 0.6), ("ding", 3, 0.4)],
4: [("raio", 0, 0.55), ("zumbido", 1, 0.4), ("pisca", 2, 0.5)],
5: [("pop", 0, 0.4), ("zumbido", 1, 0.4), ("chiado", 2, 0.4)],
6: [("pop", 0, 0.4), ("metal", 1, 0.45), ("estatica", 2, 0.4)],
7: [("pop", 0, 0.4), ("impacto_seco", 1, 0.5), ("estalo", 3, 0.5)],
8: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("chiado", 3, 0.35)],
9: [("estatica", 0, 0.4), ("estalo", 1, 0.5), ("pop", 2, 0.4)],
10: [("pop", 0, 0.4), ("ding", 2, 0.45), ("whoosh", 3, 0.35)],
11: [("raio", 1, 0.55), ("estalo", 1, 0.5), ("pop", 2, 0.45), ("whoosh", 3, 0.4)],
12: [("jingle", 0, 0.5)],
13: [("raio", 0, 0.55), ("whoosh", 1, 0.4), ("raio", 3, 0.5), ("ding", 4, 0.45)],
14: [("papel", 0, 0.4), ("carimbo", 1, 0.4)],
15: [("trovao", 0, 0.5), ("raio", 1, 0.4)],
16: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("ding", 2, 0.45)],
17: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.55)],
}
# Raio e trovão sincronizados com o clarão: o clarão está em 40% da janela ini..fim do raio; o chiado do "raio" (0,5 s) termina com o estalo, então começa 0,4 s antes;
# o trovão chega 0,35 s depois. `em` é relativo ao início da batida (trecho 0).
def clarao(i, k='raio'):
    v = cenas[i][k]; return (v['ini'] + 0.4 * (v['fim'] - v['ini'])) * dur(i)
def RAIO(i, k='raio', vol=0.55): return ("raio", 0, vol, clarao(i, k) - 0.4)
def TROVAO(i, k='raio', vol=0.5, atraso=0.35): return ("trovao", 0, vol, clarao(i, k) + atraso)
SFX[1] = [RAIO(1), RAIO(1, 'raio2'), TROVAO(1, 'raio', 0.6, 0.5), ("estalo", 3, 0.4)]
SFX[2] = [("pop", 0, 0.4), RAIO(2), TROVAO(2)]
SFX[3] = [("pop", 0, 0.4), ("metal", 1, 0.5), RAIO(3), ("ding", 3, 0.4)]
SFX[4] = [RAIO(4), ("zumbido", 1, 0.4), ("pisca", 2, 0.5)]
SFX[11] = [RAIO(11), ("estalo", 1, 0.5), ("pop", 2, 0.45), RAIO(11, 'raio2', 0.5), ("whoosh", 3, 0.4)]
SFX[13] = [RAIO(13), ("whoosh", 1, 0.4), RAIO(13, 'raio2', 0.5), ("ding", 4, 0.45)]
AMB = {i: ("chuva", 0.12) for i in range(1, 12)}
AMB.update({i: ("chuva", 0.1) for i in (13, 16, 17)})
AMB.update({12: ("nenhuma", 0), 14: ("nenhuma", 0), 15: ("nenhuma", 0)})
DUR = {i: dur(i) for i in range(1, 18)}
B.salvar(cenas, SFX, AMB, DUR, proibido=('para-raios', 'pararaios'), ate=12)
