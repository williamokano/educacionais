import sys, os, math, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/paraquedas/roteiro.json (episódio 22, "como um pano segura uma pessoa caindo do céu?", v4 de 16 batidas) a partir de tasks/roteiro-paraquedas.md.
# Uso (da raiz): python3 tasks/geradores/paraquedas.py episodios/paraquedas/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/paraquedas/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/paraquedas.tsx (campos no topo). Palcos: ceu x = 0 (o Zeca em queda livre, pés em y = 0) · rua x = 60 (prédio, amigo, guarda-chuva, fita).
# REGRA: "paraquedas" só a partir da batida 13 (fala e cartão). Ninguém bate no chão: a queda do amigo congela no meio do ar e rebobina.
B = Base('roteiro-paraquedas.md', 'paraquedas', 22, 16)
R = lambda x: round(x, 3)
def orb(alvo, az, d, el=10, fov=50, up=0.0, x0=0.0):
    a, e = math.radians(az), math.radians(el)
    al = [alvo[0] + x0, alvo[1] - up, alvo[2]]
    return pt([al[0] + d * math.sin(a) * math.cos(e), al[1] + d * math.sin(e), al[2] + d * math.cos(a) * math.cos(e)], al, fov)
ABRE = {"ombroE.z": 1.2, "ombroD.z": -1.2, "cotoveloE.z": 0.2, "cotoveloD.z": -0.2, "maos": 1}
QUEDA = dict(ABRE, **{"pernaE.z": 0.28, "pernaD.z": -0.28, "tronco.x": 0.12, "cabeca.x": -0.15})
PENDURADO = {"pernaE.x": -0.1, "pernaD.x": 0.1, "ombroE.x": -0.2, "ombroD.x": -0.2, "ombroE.z": 0.15, "ombroD.z": -0.15, "cotoveloE.x": -0.2, "cotoveloD.x": -0.2}
BRACOS_CIMA = {"ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, "maos": 1}
ESPANTO = {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 1}
OLHA_CEU = {"cabeca.x": -0.55, "ombroE.x": -0.2, "ombroD.x": -0.2}
SEGURA_CIMA = {"ombroE.x": -2.0, "ombroD.x": -2.0, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 0.3}
PUXA = {"ombroE.x": -1.6, "ombroD.x": -1.6, "cotoveloE.x": -0.7, "cotoveloD.x": -0.7, "maos": 0.4}
# Com a voz gravada, W/Wn e a duração usam o tempo real de cada palavra/batida (episode.json de ep22) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep22', 'episode.json')
_bt = []; _END = 0
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0); _bt = _j0.get('beats', [])
    if not (len(_bt) == 16 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0 and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 17))): _bt = []
def _fim_bt(i): return _bt[i]['start'] if i < len(_bt) else _END
def Wn(i, pat, n=1, fim=False):
    ps = B.palavras_de(i); c = 0
    for k, w in enumerate(ps):
        if re.search(pat, w, re.I):
            c += 1
            if c == n:
                if not _bt: return round((k + (1 if fim else 0)) / len(ps), 3)
                ws = _bt[i - 1]['words']; b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
                return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
    raise AssertionError((i, pat, n))
def W(i, pat, fim=False): return Wn(i, pat, 1, fim)
def dur(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return round(max(2.4, len(B.palavras_de(i)) / 2.9), 1)
RETOS = {"ombroE.x": -3.0, "ombroD.x": -3.0, "cotoveloE.x": -0.1, "cotoveloD.x": -0.1, "ombroE.z": 0.1, "ombroD.z": -0.1, "maos": 0.3}
def Zq(**k): return G(x=0.0, y=0.0, z=0.0, rot=0.0, **k)

# camadas
SKY = dict(vel=8, riscos=0)
CAIDA = lambda v: dict(vel=v, solo=-40)
PANO_ABERTO = dict(pano=1, forma=1, tam=2.2, cordas=1, arnes=1, furo=1)

cenas = {}
# 1: a rua; o amigo salta do segundo andar com o guarda-chuva; ele vira do avesso; a queda congela (PAUSA) e rebobina (fita)
p1 = W(1, '^pulou'); v1 = W(1, '^virou'); q1 = W(1, '^para'); r1 = W(1, '^Rebobine')
cenas[1] = M(palco="rua",
  amigoY=KF((0, 3.3), (R(p1 - 0.01), 3.3), (R(p1 + 0.07), 2.5), (R(q1 + 0.02), 1.65), (R(r1 - 0.01), 1.65), (R(r1 + 0.22), 3.3), (1, 3.3)),
  amigoZ=KF((0, 0.75), (R(p1 - 0.01), 0.75), (R(q1 + 0.02), 2.0), (R(r1 - 0.01), 2.0), (R(r1 + 0.22), 0.75), (1, 0.75)),
  guardaVira=KF((0, 0), (R(v1 - 0.02), 0), (R(v1 + 0.07), 1), (R(r1 + 0.1), 1), (R(r1 + 0.22), 0), (1, 0)),
  pausa=KF((0, 0), (R(q1), 0), (R(q1 + 0.03), 1), (1, 1)), rebob=KF((0, 0), (R(r1 - 0.0), 0), (R(r1 + 0.03), 1), (1, 1)),
  fita=KF((0, 0), (R(r1 - 0.0), 0), (R(r1 + 0.04), 1), (R(r1 + 0.26), 1), (R(r1 + 0.3), 0), (1, 0)),
  camera=cam(pt([64.6, 1.3, 9.8], [60.0, 2.8, 0.8], 50), pt([63.4, 3.0, 9.4], [60.0, 3.1, 0.8], 50)),
  gente=[G(x=2.3, z=3.8, rot=-0.45, acao="em-pe", exp="surpreso", pose=OLHA_CEU)])
# 2: queda livre, de frente, braços abertos; riscos de vento; cartão 190 km/h
cenas[2] = M(vel=V(45, 70, 0.0, 1.0), solo=V(-34, -30, 0.0, 1.0), riscos=1,
  camera=cam(orb([0, 1.9, 0], 24, 8.8, 26), orb([0, 1.9, 0], 14, 8.2, 10)),
  gente=[Zq(acao="em-pe", exp="surpreso", pose=QUEDA)])
# 3: o pano largo preso nele; setas de ar empurram pra cima; a queda fica lenta
a3 = W(3, '^pano'); ar3 = W(3, '^ar'); l3 = W(3, '^lenta')
cenas[3] = M(vel=KF((0, 55), (R(a3), 55), (R(l3), 24), (1, 20)), solo=-34, riscos=KF((0, 1), (R(l3), 0.2), (1, 0)), pano=V(0, 1, R(a3 - 0.03), R(a3 + 0.1)), forma=0, tam=1.7, ar=V(0, 1, R(ar3 - 0.02), R(ar3 + 0.08)),
  camera=cam(orb([0, 2.6, 0], 26, 10.5, 8), orb([0, 2.8, 0], 20, 8.8, 8)),
  gente=[Zq(acao="em-pe", exp="sorriso", pose=BRACOS_CIMA)])
# 4: o velame cresce em pulsos; o vento rasga uma ponta (cômico); náilon com trama anti-rasgo (lupa) para o rasgo
g4 = W(4, '^Aumente'); q4 = W(4, '^quanto'); r4 = W(4, '^rasga'); n4 = W(4, '^náilon'); t4 = W(4, '^trama'); v4 = W(4, '^velame')
cenas[4] = M(vel=V(22, 6, 0.0, 0.8), solo=-34, pano=1, forma=0, ar=1,
  tam=KF((0, 1.5), (R(g4), 1.5), (R(g4 + 0.07), 2.3), (R(q4 + 0.04), 2.3), (R(q4 + 0.12), 3.1), (R(r4 - 0.05), 3.1), (1, 3.1)),
  rasgo=KF((0, 0), (R(r4 - 0.0), 0), (R(r4 + 0.12), 1), (1, 1)), seda=KF((0, 1), (R(n4 - 0.03), 1), (R(n4 + 0.05), 0), (1, 0)), tecido=V(0, 1, R(n4), R(n4 + 0.06)),
  lupaTrama=V(0, 1, R(t4 - 0.05), R(t4 + 0.05)), trama=V(0, 1, R(t4), R(t4 + 0.1)), etiq=["antirasgo@%s-%s" % (R(t4 + 0.02), R(v4 - 0.02)), "pano@%s-0.99" % R(v4 + 0.01)], etiqS=1.0,
  camera=cam(orb([0, 3.0, 0], 38, 11.0, 8), orb([0.8, 3.6, 0], 22, 8.2, 10)),
  gente=[Zq(acao="explicando", exp="sorriso")])
# 5: o pano grande embola; cordas nas bordas até o arnês abrem o domo e dividem o peso
e5 = W(5, '^embola'); c5 = W(5, '^cordas'); a5 = W(5, '^arnês'); d5 = W(5, '^abrem')
cenas[5] = M(vel=8, solo=-34, pano=1, tam=2.2, forma=KF((0, 0.0), (R(c5 + 0.06), 0.0), (R(d5 + 0.1), 1.0), (1, 1.0)),
  embola=KF((0, 0), (R(e5 - 0.03), 0), (R(e5 + 0.07), 1), (R(c5 + 0.0), 1), (R(c5 + 0.12), 0), (1, 0)),
  cordas=V(0, 1, R(c5), R(c5 + 0.1)), arnes=V(0, 1, R(a5 - 0.03), R(a5 + 0.05)), etiq=["cordas@%s-0.97" % R(c5 + 0.03), "cordas2@%s-0.97" % R(c5 + 0.03), "arnes@%s-0.97" % R(a5 + 0.01)], etiqS=1.0,
  camera=cam(orb([0, 3.0, 0], -12, 10.8, 10), orb([0, 3.0, 0], 52, 10.8, 12)),
  gente=[Zq(acao="em-pe", exp="sorriso", pose=[(R(c5), ESPANTO), (1, PENDURADO)])])
# 6: sem buraco o domo chacoalha forte; abre-se a chaminé no meio do topo: parte do ar ainda bate no pano, o resto escapa, e o domo estabiliza
c6 = W(6, '^chacoalha'); f6 = W(6, '^chaminé'); e6 = W(6, '^estável')
cenas[6] = M(vel=7, solo=-34, pano=1, forma=1, tam=2.2, cordas=1, arnes=1, ar=1, furo=V(0, 1, R(f6 - 0.02), R(f6 + 0.06)), balanca=KF((0, 0.1), (R(c6), 0.15), (R(c6 + 0.15), 0.95), (R(f6 - 0.02), 1.0), (R(f6 + 0.14), 0.04), (1, 0.02)),
  gente=[Zq(acao="em-pe", exp=[(0, "preocupado")][0][1], pose=PENDURADO, enjoo=KF((0, 0.2), (R(c6 + 0.1), 1), (R(f6), 1), (R(f6 + 0.1), 0), (1, 0)))],
  etiq=["furo@%s-0.97" % R(f6 + 0.03)], etiqS=1.0, etiqK=0.9,
  camera=cam(orb([0, 3.6, 0], 24, 11.5, 10), orb([0, 4.4, 0], 18, 8.0, 42)))
# 7: o velame redondo vai pra onde o vento levar (telhado do vizinho); troque por dois panos com divisórias (células); o ar entra pela frente e enche célula por célula: vira uma asa
v7 = W(7, '^vento'); te7 = W(7, '^telhado'); d7 = W(7, '^dois'); p7 = W(7, '^panos'); c7 = W(7, '^células'); e7 = W(7, '^enche')
cenas[7] = M(vel=7, solo=-34, cordas=1, arnes=1, furo=1, forma=1, tam=2.2, pano=KF((0, 1), (R(d7 - 0.01), 1), (R(d7 + 0.05), 0), (1, 0)), vento=KF((0, 1), (R(d7), 1), (R(d7 + 0.05), 0), (1, 0)), gira=V(0, 0.6, 0.0, R(d7)), inclina=V(0, -0.12, 0.0, R(te7)), telhado=V(0, 1, R(te7 - 0.05), R(te7 + 0.1)),
  asa=KF((0, 0), (R(d7 + 0.01), 0), (R(d7 + 0.06), 1), (1, 1)), infla=KF((0, 0), (R(e7 - 0.03), 0), (R(e7 + 0.2), 1), (1, 1)), arAsa=V(0, 1, R(W(7, '^entra') - 0.02), R(W(7, '^entra') + 0.06)), perfil=V(0, 1, R(d7 - 0.01), R(d7 + 0.08)),
  etiq=["panos@%s-0.55" % R(p7 + 0.02), "celulas@%s-0.97" % R(c7 + 0.02)], etiqS=1.0, etiqK=0.9,
  camera=cam(orb([0, 3.6, 0], 12, 10.5, 10), orb([0, 4.4, 0], 72, 8.4, 22)),
  gente=[Zq(acao="em-pe", exp="medo", pose=[(R(te7 + 0.1), ESPANTO), (1, PENDURADO)])])
# 8: dois batoques acima da cabeça: puxe um e vira; puxe os dois e freia, pronto pro pouso
b8 = W(8, '^batoques'); u8 = Wn(8, '^Puxe', 1); u82 = Wn(8, '^Puxe', 2); l8 = W(8, '^pouso')
cenas[8] = M(asa=1, infla=1, cordas=1, arnes=1, batoques=V(0, 1, R(b8 - 0.02), R(b8 + 0.06)), puxaE=KF((0, 0), (R(u8), 0), (R(u8 + 0.08), 1), (R(u82 - 0.03), 1), (R(u82 - 0.0), 0.2), (R(u82 + 0.08), 1), (1, 1)), puxaD=KF((0, 0), (R(u82), 0), (R(u82 + 0.08), 1), (1, 1)),
  vel=KF((0, 8), (R(u82), 8), (R(u82 + 0.12), 3), (1, 1)), solo=KF((0, -26), (R(u82), -22), (R(l8), -4), (1, 0)), cidade=1, etiq=["batoques@%s-0.99" % R(b8 + 0.03)], etiqS=1.0,
  camera=cam(orb([0, 3.6, 0], -24, 13.0, 16), orb([0, 3.2, 0], -10, 12.0, 12)),
  gente=[Zq(acao="em-pe", exp="sorriso", pose=RETOS)])
# 9: a mochila nas costas: a câmera orbita até as costas do Zeca; o pano dobra na mochila; sem o pilotinho sai embolado (cômico); com ele, o pilotinho puxa o velame em ordem
d9 = W(9, '^Dobre'); m9 = W(9, '^mochila'); p9 = W(9, '^pilotinho'); t9 = W(9, '^tira')
cenas[9] = M(vel=8, solo=-34, giraMundo=KF((0, 0), (R(m9 + 0.02), 3.14159), (1, 3.14159)), asa=KF((0, 1), (R(d9), 1), (R(d9 + 0.06), 0), (R(t9 + 0.02), 0), (R(t9 + 0.08), 1), (1, 1)), infla=KF((0, 1), (R(d9), 1), (R(t9 + 0.02), 0), (R(t9 + 0.22), 1), (1, 1)), cordas=KF((0, 1), (R(d9 + 0.05), 0), (R(t9 + 0.12), 0), (R(t9 + 0.22), 1), (1, 1)), arnes=1, batoques=KF((0, 1), (R(d9 + 0.05), 0), (R(t9 + 0.2), 0), (R(t9 + 0.25), 1), (1, 1)),
  abreM=KF((0, 0), (R(m9 + 0.06), 0), (R(m9 + 0.12), 1), (1, 1)), bola=KF((0, 0), (R(m9 + 0.1), 0), (R(m9 + 0.16), 1), (R(p9 - 0.02), 1), (R(p9 + 0.03), 0), (1, 0)), piloto=V(0, 1, R(p9), R(p9 + 0.12)), sai=KF((0, 0), (R(t9), 0), (R(t9 + 0.2), 1), (1, 1)),
  etiq=["mochila@%s-%s" % (R(m9 + 0.05), R(p9 - 0.03)), "piloto@%s-0.97" % R(p9 + 0.04)], etiqS=1.0,
  camera=cam(orb([0, 1.9, 0], 0, 8.4, 8), orb([0, 2.2, 0], 0, 7.6, 10)),
  gente=[Zq(acao="em-pe", exp="sorriso", pose=PENDURADO)])
# 10: o tranco da abertura; o freio de abertura (quadrado) desliza pelas cordas e a abertura fica suave
t10 = W(10, '^tranco'); f10 = W(10, '^freio')
cenas[10] = M(giraMundo=KF((0, 3.14159), (0.2, 6.28318), (1, 6.28318)), vel=KF((0, 30), (R(t10 + 0.1), 30), (R(f10 + 0.1), 10), (1, 8)), solo=-34, asa=1, infla=KF((0, 0), (R(t10 - 0.04), 0), (R(t10 + 0.03), 1), (1, 1)), arAsa=0.0, cordas=1, arnes=1, freioVis=V(0, 1, R(f10 - 0.02), R(f10 + 0.05)), freio=KF((0, 0), (R(f10 + 0.05), 0), (0.9, 1), (1, 1)),
  etiq=["freio@%s-0.97" % R(f10 + 0.04)], etiqS=1.0,
  camera=cam(orb([0, 3.0, 0], 25, 9.6, 8), orb([0, 2.5, 0], 20, 6.8, 8)),
  gente=[Zq(acao="em-pe", exp="surpreso", pose=PENDURADO, tranco=KF((0, 0), (R(t10 - 0.02), 0), (R(t10 + 0.04), 1), (R(t10 + 0.18), 0), (1, 0)))])
# 11: o velame falha; a alça solta e ele voa; a reserva abre; travado de susto, o aparelho abre a reserva sozinho
f11 = W(11, '^falhar'); s11 = W(11, '^Solte'); r11 = W(11, '^reserva'); t11 = W(11, '^travar'); a11 = W(11, '^aparelho'); z11 = W(11, '^sozinho')
cenas[11] = M(vel=9, solo=-34, freioVis=KF((0, 1), (R(s11 + 0.05), 1), (R(s11 + 0.07), 0), (1, 0)), freio=1, asa=KF((0, 1), (R(s11 + 0.2), 1), (R(s11 + 0.21), 0), (1, 0)), infla=1, murcho2=V(0, 1, R(f11 - 0.02), R(f11 + 0.1)), soltaAsa=V(0, 1, R(s11 + 0.05), R(s11 + 0.25)), cordas=KF((0, 1), (R(s11 + 0.05), 1), (R(s11 + 0.06), 0), (1, 0)), arnes=1,
  peito=V(0, 1, R(s11 - 0.04), R(s11 + 0.03)), alca=KF((0, 0), (R(s11), 0), (R(s11 + 0.05), 1), (R(r11 + 0.05), 1), (R(r11 + 0.08), 0), (1, 0)), reserva=KF((0, 0), (R(r11 - 0.01), 0), (R(r11 + 0.1), 1), (R(t11 - 0.04), 1), (R(t11 - 0.0), 0), (R(z11 - 0.02), 0), (R(z11 + 0.08), 1), (1, 1)), aad=V(0, 1, R(a11 - 0.02), R(a11 + 0.08)),
  etiq=["reserva@%s-%s" % (R(r11 + 0.03), R(t11 - 0.02)), "auto@%s-0.99" % R(a11 + 0.03)], etiqS=1.0,
  camera=cam(orb([0, 2.6, 0], 22, 10.5, 8), orb([0.1, 2.0, 0], 14, 7.4, 8)),
  gente=[Zq(acao="em-pe", exp="preocupado", pose=[(R(s11), PENDURADO), (R(s11 + 0.06), RETOS), (R(t11 - 0.02), PENDURADO), (1, ESPANTO)])])
# 12: o Zeca desce sorrindo sob o velame; lá embaixo, na janela, o amigo olha pra cima
cenas[12] = M(asa=1, infla=1, cordas=1, arnes=1, batoques=1, freioVis=1, freio=1, peito=1, vel=3.0, solo=V(-14, -7, 0.0, 1.0), cidade=1, amigoSolo=V(0, 1, 0.0, 0.1), passaros=1,
  camera=cam(pt([4.5, 5.2, 10.0], [1.3, -1.0, -3.0], 50), pt([4.2, 2.6, 9.6], [1.3, -2.6, -3.0], 50)),
  gente=[Zq(acao="comemorando", exp="sorriso", pose=RETOS)])
# 13: revelação: o equipamento completo; rótulos acendem; entra o nome
cenas[13] = M(vel=V(10, 5, 0, 1), solo=-34, asa=1, infla=1, cordas=1, arnes=1, batoques=1, freioVis=1, freio=1, peito=1, aad=1, etiq=["velameAsa@0.12-0.4", "batoques@0.3-0.6", "arnes@0.45-0.75", "auto@0.6-0.9"], etiqS=1.0, etiqK=0.85,
  camera=cam(orb([0, 2.8, 0], 18, 9.8, 8), orb([0, 3.6, 0], 34, 17.5, 22)),
  gente=[Zq(acao="comemorando", exp="sorriso", pose=RETOS)], c=[rot("PARAQUEDAS", 0, 120, 100)])
# 14: Leonardo da Vinci (1485); PARA + CHUTE se juntam
f14 = W(14, '^francesa')
cenas[14] = M(solo=0, papel=KF((0, 0), (0.04, 1), (R(f14 - 0.02), 1), (R(f14 + 0.02), 0), (1, 0)), leonardo=KF((0, 0), (0.04, 1), (R(f14 - 0.02), 1), (R(f14 + 0.02), 0), (1, 0)), letras=V(0, 1, R(f14 + 0.04), R(f14 + 0.25)), passaros=0,
  camera=cam(orb([0, 2.6, 0], 16, 11.0, 6), orb([0, 2.8, 0], 8, 10.4, 6)),
  gente=[G(x=2.2, y=0, z=2.0, rot=-0.4, acao="explicando", exp="sorriso", esc=1.0)], c=[rot("1485", 0, 40, 96), rot("PARA + CHUTE", 3, 150, 80)])
# 15: a chaminé do topo (1804) e o náilon que trocou a seda (1942)
n15 = W(15, '^náilon'); ch15 = W(15, '^chaminé')
cenas[15] = M(vel=6, solo=-34, pano=1, forma=1, tam=2.2, cordas=1, arnes=1, furo=V(0, 1, R(ch15), R(ch15 + 0.08)), etiq=["furo@%s-0.6" % R(ch15 + 0.03)], etiqS=1.0, etiqK=0.8, etiqYmax=0.3, seda=KF((0, 1), (R(n15 - 0.03), 1), (R(n15 + 0.06), 0), (1, 0)),
  camera=cam(orb([0, 3.4, 0], 20, 11.0, 14), orb([0, 3.6, 0], 12, 9.8, 22)),
  gente=[Zq(acao="explicando", exp="sorriso", pose=PENDURADO)], c=[rot("1804", 0, 40, 96), rot("1942", 1, 40, 96)])
# 16: pouso tranquilo no gramado; uma ponte surge ao fundo; as chamadas
cenas[16] = M(solo=0, ponte=V(0, 1, 0.25, 0.55), passaros=1,
  camera=cam(pt([0.0, 3.0, 6.9], [0.0, 2.7, 0.0], 46), pt([0.0, 2.95, 6.5], [0.0, 2.7, 0.0], 46)),
  gente=[G(x=0.0, y=0, z=0.0, rot=0.0, acao="acenando", exp="sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "PONTE", 0), chamada("compartilhar", "COMPARTILHE", None, 1), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 2)])

# ---------- mostradores de ALTITUDE (m) e VELOCIDADE (km/h): números aproximados e de cena (ver Pendências do roteiro) ----------
def HUD(i, alt, vel, fade=None):
    cenas[i]["hudAlt"] = KF(*alt)
    cenas[i]["hudVel"] = KF(*vel)
    cenas[i]["hud"] = fade if fade is not None else 1
    cenas[i]["etiqYmax"] = 0.34
HUD(2, [(0, 4000), (1, 3600)], [(0, 0), (0.4, 188), (1, 192)], V(0, 1, 0.0, 0.08))
HUD(3, [(0, 3600), (1, 3200)], [(0, 192), (R(a3), 192), (R(l3), 104), (1, 98)])
HUD(4, [(0, 3200), (1, 2950)], [(0, 98), (R(q4 + 0.1), 80), (1, 60)])
HUD(5, [(0, 2950), (1, 2800)], [(0, 60), (R(e5), 62), (R(e5 + 0.08), 88), (R(c5 + 0.12), 46), (1, 34)])
HUD(6, [(0, 2800), (1, 2700)], [(0, 34), (R(c6), 38), (R(f6 - 0.02), 42), (R(f6 + 0.14), 26), (1, 24)])
HUD(7, [(0, 2700), (1, 2580)], [(0, 24), (1, 22)])
HUD(8, [(0, 2580), (1, 2500)], [(0, 22), (R(u82), 20), (R(u82 + 0.12), 11), (1, 9)])
HUD(9, [(0, 2500), (1, 1500)], [(0, 9), (R(d9), 10), (R(d9 + 0.25), 150), (R(m9 + 0.05), 190), (1, 192)])
HUD(10, [(0, 1500), (1, 1400)], [(0, 192), (R(t10 - 0.01), 192), (R(t10 + 0.04), 62), (R(t10 + 0.12), 50), (R(f10 + 0.1), 30), (1, 20)])
HUD(11, [(0, 1400), (1, 800)], [(0, 20), (R(f11 - 0.02), 20), (R(f11 + 0.1), 96), (R(s11 + 0.1), 100), (R(r11 + 0.12), 24), (R(t11 - 0.04), 24), (R(t11), 72), (R(z11 - 0.02), 74), (R(z11 + 0.1), 22), (1, 21)])
HUD(12, [(0, 800), (1, 40)], [(0, 21), (1, 15)])
HUD(13, [(0, 40), (1, 6)], [(0, 15), (1, 10)], KF((0, 1), (0.05, 1), (0.14, 0), (1, 0)))

SFX = {
1: [("vento", 0, 0.4), ("pop", 1, 0.4), ("estalo", 2, 0.4), ("carimbo", 3, 0.4)],
2: [("vento", 0, 0.45), ("whoosh", 1, 0.4), ("pop", 2, 0.35)],
3: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("ding", 2, 0.35)],
4: [("pop", 0, 0.35), ("whoosh", 1, 0.4), ("estalo", 4, 0.4), ("ding", 5, 0.4)],
5: [("estalo", 0, 0.4), ("pop", 1, 0.4), ("clique", 3, 0.4), ("whoosh", 4, 0.4)],
6: [("whoosh", 0, 0.4), ("pop", 3, 0.4), ("ding", 4, 0.4)],
7: [("whoosh", 0, 0.4), ("pop", 2, 0.4), ("clique", 3, 0.4), ("whoosh", 4, 0.45)],
8: [("pop", 0, 0.4), ("whoosh", 2, 0.4), ("whoosh", 3, 0.45), ("ding", 4, 0.4)],
9: [("pop", 0, 0.4), ("pop", 1, 0.4), ("whoosh", 3, 0.45)],
10: [("impacto_seco", 0, 0.5), ("pop", 1, 0.4), ("clique", 3, 0.4)],
11: [("estalo", 0, 0.4), ("pop", 1, 0.4), ("whoosh", 2, 0.45), ("pisca", 5, 0.45), ("whoosh", 6, 0.4)],
12: [("pop", 0, 0.35), ("jingle", 3, 0.4)],
13: [("jingle", 0, 0.5)],
14: [("papel", 0, 0.4), ("pop", 2, 0.4), ("ding", 3, 0.4)],
15: [("papel", 0, 0.35), ("ding", 1, 0.4)],
16: [("pop", 0, 0.5), ("pop", 1, 0.5), ("ding", 2, 0.55)],
}
AMB = {i: ("vento", 0.05) for i in range(2, 13)}
AMB.update({1: ("nenhuma", 0), 13: ("vento", 0.05), 14: ("nenhuma", 0), 15: ("vento", 0.04), 16: ("passaros", 0.05)})
B.salvar(cenas, SFX, AMB, {i: dur(i) for i in range(1, 17)} if _bt else {}, proibido=('paraquedas', 'para-quedas'), ate=13)
