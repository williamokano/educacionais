import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/descarga/roteiro.json (episódio 17, "por que o cheiro não volta quando você dá descarga?") a partir da tabela de cenas de tasks/roteiro-descarga.md (v4).
# Uso (da raiz): python3 tasks/geradores/descarga.py episodios/descarga/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/descarga/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/banheiro.tsx (lista de campos no topo). Encanamento no plano z = -0,15; buraco do piso em x = 0; a vinheta de 1596 fica em x = 60.
# REGRA: o nome "vaso sanitário" só aparece a partir da batida 13 (fala, rótulo, cartão).
B = Base('roteiro-descarga.md', 'banheiro', 17, 16)
W = B.W
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep17) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep17', 'episode.json')
_bt = []
_END = 0
def _fim_bt(i):  # a batida vai do início dela até o início da próxima (a última, até o cartão final)
    return _bt[i]['start'] if i < len(_bt) else _END
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0)
    _bt = _j0.get('beats', [])
    if len(_bt) == 16 and _bt[0].get('words') and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 17)):
        def W(i, pat, fim=False):
            ps_, ws = B.palavras_de(i), _bt[i - 1]['words']
            b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
            for k, w in enumerate(ps_):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
def dur(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return round(max(2.4, len(B.palavras_de(i)) / 2.9), 1)
def EM(i, frac):
    """(trecho, em) para um som cair na fração `frac` da batida i"""
    if not _bt: return 1, 0.0
    b = _bt[i - 1]; t = b['start'] + frac * dur(i)
    k = max(j for j, st in enumerate(b['segmentStarts']) if st <= t + 1e-6)
    return k, round(t - b['segmentStarts'][k], 3)
def SF(som, i, frac, vol): k, e = EM(i, frac); return (som, k, vol, e)
def r3(x): return round(x, 3)
def ps(i, pat, d=0.0, fim=False): return r3(min(0.995, max(0.0, W(i, pat, fim) + d)))
def Tb(cx, ty, D, fov=50, el=0.0, x0=None): return T(cx, ty, D, fov, el, x0, 0.0, 0.0)

SEGURA = {"ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -0.65, "cotoveloD.x": -0.65, "ombroE.z": -0.28, "ombroD.z": 0.28, "maos": 0.2}
DERRAMA = {"ombroE.x": -1.3, "ombroD.x": -1.3, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "ombroE.z": -0.25, "ombroD.z": 0.25, "tronco.x": 0.18, "maos": 0.2}
NARIZ = {"ombroD.x": -1.6, "cotoveloD.x": -2.5, "ombroD.z": -0.15, "cotoveloD.z": 0.3, "maos": 0.3, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "cabeca.x": 0.08}
PUXA = {"ombroD.x": -1.5, "cotoveloD.x": -0.25, "ombroD.z": 0.1, "maos": 0.4, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "tronco.x": 0.05}
POLEGAR = {"ombroD.x": -1.25, "cotoveloD.x": -1.5, "ombroD.z": -0.12, "maos": 0.05, "ombroE.z": 0.12, "cotoveloE.x": -0.18}
CANSADO = {"tronco.x": 0.28, "cabeca.x": 0.2, "ombroE.x": -0.6, "ombroD.x": -0.6, "cotoveloE.x": -0.3, "cotoveloD.x": -0.3, "maos": 0.2}
OLHA_BAIXO = {"cabeca.x": 0.45, "tronco.x": 0.12, "ombroE.z": 0.12, "ombroD.z": -0.12, "cotoveloE.x": -0.18, "cotoveloD.x": -0.18}
BARRIGA = {"ombroE.x": -0.55, "ombroD.x": -0.55, "cotoveloE.x": -1.7, "cotoveloD.x": -1.7, "ombroE.z": -0.1, "ombroD.z": 0.1, "tronco.x": 0.32, "maos": 0.3, "joelhoE.x": 0.2, "joelhoD.x": 0.2}
CORRE = {"ombroE.x": 0.0, "cotoveloE.x": -1.2, "tronco.x": 0.15}
SUSTO = {"ombroE.z": 0.7, "ombroD.z": -0.7, "cotoveloE.x": -1.4, "cotoveloD.x": -1.4, "maos": 1, "tronco.x": -0.15}
DESVIA = {"cabeca.y": 0.9, "ombroE.x": -0.6, "ombroD.x": -0.6, "cotoveloE.x": -1.6, "cotoveloD.x": -1.6, "ombroE.z": -0.2, "ombroD.z": 0.2}
PEDRA = {"ombroD.x": -1.4, "cotoveloD.x": -1.0, "ombroD.z": -0.1, "maos": 0.0, "ombroE.z": 0.12, "cotoveloE.x": -0.18}
FRENTE = 1.2

BASE = dict(piso=1)
BP = M(BASE, buraco=1, bacia=1, tampaAgua=1)
CAIXA = M(BP, caixa=1, descida=1)
BOIA = M(CAIXA, torneira=1, boia=1)
ALVO = dict(alvoX=0.3, alvoY=0.32)

cenas = {}
# 1: a trilha: dor de barriga, só mato; os mosquitos aprovam a moita (roda e aplauso)
ap1 = ps(1, '^aprovou')
cenas[1] = M(mata=True, aplauso=V(0, 1, ps(1, '^Só'), r3(ps(1, '^Só') + 0.05)),
  camera=cam(pt([2.0, 9.0, 9.5], [0.0, 1.2, 0], 50), pt([-1.4, 1.9, 4.8], [0.1, 1.15, 0], 50)),
  gente=[G(x=0.0, z=0.4, rot=0.25, acao="em-pe", exp="medo", pose=BARRIGA)])
# 2: casinha e buraco no quintal, de noite e na chuva; o Zeca corre com a lanterna
fl2 = ps(2, '^escorregar')
cenas[2] = M(quintal=True, luz=0.5, chuva=1, flash=KF((0, 0), (r3(ps(2, '^chuva') - 0.02), 0), (r3(ps(2, '^chuva') + 0.01), 1), (r3(ps(2, '^chuva') + 0.06), 0), (r3(fl2 - 0.03), 0), (r3(fl2), 1), (r3(fl2 + 0.05), 0), (1, 0)),
  camera=cam(pt([-3.4, 2.1, 7.4], [-1.6, 1.0, 0], 52), pt([2.2, 2.1, 7.2], [1.0, 1.0, 0], 52)),
  gente=[G(x=[[0, -2.6], [0.9, 2.3], [1, 2.3]], z=1.3, rot=1.2, acao=[(0.9, "andando", "surpreso"), (1, "em-pe", "medo")], vel=2.4, pose=[(0.9, CORRE), (1, {})])])
# 3: o buraco dentro de casa, num balde coberto; ninguém quer levar
b3 = ps(3, '^carregar'); p3 = ps(3, '^ocupado')
zx = [[0, -2.2], [0.3, -0.55], [1, -0.55]]
cenas[3] = M(BASE, piso=0, buraco=0, baldeTampa=1, baldeX=[[0, -1.82], [0.3, -0.17], [1, -0.17]], baldeY=0.8, baldeZ=0.18, baldeAgua=0.5, baldeVazio=False,
  camera=cam(Tb(0.2, 0.9, 5.4, 52, 0.0, -0.6), Tb(0.2, 0.9, 5.0, 52, 0.0, -0.3)),
  gente=[G(x=zx, z=0.2, rot=FRENTE, acao=[(0.3, "andando", "sorriso"), (b3, "em-pe", "neutro"), (1, "em-pe", "cansado")], pose=[(0.3, SEGURA), (1, SEGURA)]),
         G(id="mae", x=0.9, z=0.2, rot=-1.0, acao="em-pe", exp="sorriso", pose=DESVIA),
         G(id="pai", x=1.6, z=0.25, rot=-0.9, acao="em-pe", exp="sorriso", pose=DESVIA)])
# 4: buraco no piso, cano reto até o esgoto; balde de água e tudo desce
b4 = ps(4, '^buraco'); c4 = ps(4, '^cano'); d4 = ps(4, '^despeje')
cenas[4] = M(piso=V(0, 1, r3(b4 - 0.04), r3(b4 + 0.14)), curva=0, buraco=1, cheiro=0,
  baldeX=KF((0, -0.23), (1, -0.23)), baldeY=0.82, baldeZ=0.18, baldeInc=V(0, 1, d4, r3(d4 + 0.1)), baldeAgua=V(1, 0.1, d4, r3(d4 + 0.2)),
  jato=KF((0, 0), (d4, 0), (r3(d4 + 0.06), 1), (r3(d4 + 0.18), 0), (1, 0)), escoa=KF((0, 0), (r3(d4 + 0.06), 0), (r3(d4 + 0.12), 1), (0.97, 1), (1, 0)), escoaVel=1.3,
  etiq=["cano@%s-0.99" % r3(c4 + 0.02)], etiqS=1.0,
  camera=cam(Tb(0.3, 0.1, 4.6, 50, 0.0, -0.2), Tb(0.3, 0.1, 4.4, 50, 0.0, -0.1)),
  gente=[G(x=-0.62, z=0.0, rot=FRENTE, acao="em-pe", exp="sorriso", pose=[(d4, SEGURA), (r3(d4 + 0.2), DERRAMA), (1, SEGURA)])])
# 5: o ar do esgoto sobe pelo cano reto e invade o banheiro
c5 = ps(5, '^sobe')
cenas[5] = M(BASE, curva=0, buraco=1, cheiro=V(0, 1, r3(c5 + 0.05), r3(c5 + 0.4)), arCano=1, arBarra=0,
  camera=cam(Tb(0.3, 0.3, 4.6, 50, 0.0, 0.0), Tb(0.3, 0.3, 4.3, 50, 0.0, 0.2)),
  gente=[G(x=[[0, -0.5], [0.4, -0.5], [0.7, -1.1], [1, -1.2]], z=0.0, rot=0.9, acao=[(0.4, "em-pe", "sorriso"), (1, "em-pe", "medo")], pose=[(0.4, {}), (0.55, NARIZ), (1, NARIZ)])])
# 6: a bacia de louça em raio-X, com a curva em S dentro; a água parada vira tampa; o cheiro bate nela e volta
b6 = ps(6, '^bacia'); s6 = ps(6, '^curva'); p6 = ps(6, '^presa'); a6 = ps(6, '^tampa')
cenas[6] = M(BASE, buraco=1, bacia=V(0, 1, b6, r3(b6 + 0.1)), tampaAgua=V(0, 1, p6, r3(p6 + 0.1)), cheiro=V(1, 0, p6, a6), arCano=1, arBarra=V(0, 1, a6, r3(a6 + 0.05)),
  etiq=["curva@%s-%s" % (r3(s6 + 0.04), r3(p6)), "agua@%s-0.99" % r3(p6 + 0.05)], etiqS=1.0,
  camera=cam(Tb(-0.05, 0.3, 5.4, 50, 0.0, -0.1), Tb(0.3, -0.08, 2.9, 50, 0.3, 0.9)),
  gente=[G(x=-0.7, z=0.0, rot=0.9, acao=[(a6, "em-pe", "medo"), (1, "em-pe", "eureka")], pose=[(a6, NARIZ), (1, {})])])
# 7: o balde cansa; a caixa de água lá em cima, a tampa de borracha; alavanca e a água despenca pela borda da bacia
cx7 = ps(7, '^caixa'); t7 = ps(7, '^tampa'); l7 = ps(7, '^alavanca'); d7 = ps(7, '^despenca')
cenas[7] = M(BP, caixa=V(0, 1, cx7, r3(cx7 + 0.12)), descida=V(0, 1, cx7, r3(cx7 + 0.2)), nivelCaixa=KF((0, 1), (r3(l7 + 0.1), 1), (r3(d7 + 0.04), 0.12)),
  baldeX=KF((0, -0.23), (cx7, -0.23), (r3(cx7 + 0.1), -0.8), (1, -0.8)), baldeY=0.5, baldeZ=0.18, baldeInc=V(0.3, 0.3), baldeAgua=0.2, jato=KF((0, 0.22), (r3(cx7 - 0.05), 0.2), (cx7, 0), (1, 0)), **ALVO,
  escoa=KF((0, 0.25), (cx7, 0.25), (r3(cx7 + 0.05), 0), (r3(l7 + 0.1), 0), (r3(l7 + 0.2), 0.8), (0.97, 0.8), (1, 0)), escoaVel=1.2,
  alavanca=V(0, 1, l7, r3(l7 + 0.08)), tampaBorracha=KF((0, 0), (l7, 0), (r3(l7 + 0.08), 1), (1, 1)), descidaAgua=KF((0, 0), (r3(l7 + 0.08), 0), (r3(l7 + 0.14), 1), (0.95, 1), (1, 0)), aro=KF((0, 0), (r3(l7 + 0.12), 0), (r3(l7 + 0.2), 1), (0.95, 1), (1, 0)),
  tampaAgua=KF((0, 1), (r3(l7 + 0.2), 1), (r3(d7 + 0.04), 1.12), (1, 1.0)), etiq=["caixa@%s-%s" % (r3(cx7 + 0.03), r3(t7)), "tampa@%s-%s" % (r3(t7 + 0.01), r3(l7))], etiqS=1.0,
  camera=cam(Tb(-0.1, 0.62, 4.0, 50, 0.0, -0.3), Tb(-0.15, 0.7, 3.4, 50, 0.0, -0.3)),
  gente=[G(x=-0.9, z=0.0, rot=FRENTE, acao=[(cx7, "em-pe", "cansado"), (l7, "em-pe", "eureka"), (1, "em-pe", "eureka")], pose=[(cx7, CANSADO), (r3(l7 - 0.04), {}), (r3(l7 + 0.1), PUXA), (r3(d7), PUXA), (1, {})])])
# 8: a caixa vazia; a torneira aberta transborda; o Zeca corre; a boia fecha a torneira sozinha
tn = ps(8, '^torneira'); tr8 = ps(8, '^transborda'); b8 = ps(8, '^boia')
cenas[8] = M(CAIXA, tampaBorracha=0, nivelCaixa=KF((0, 0.1), (tn, 0.1), (r3(tr8 + 0.04), 1.0), (r3(b8 - 0.02), 1.0), (r3(b8 + 0.1), 0.88), (1, 0.88)),
  torneira=V(0, 1, tn, r3(tn + 0.1)), transborda=KF((0, 0), (tr8, 0), (r3(tr8 + 0.08), 1), (r3(b8 - 0.02), 1), (r3(b8 + 0.08), 0), (1, 0)), boia=V(0, 1, b8, r3(b8 + 0.1)), etiq=["boia@%s-0.99" % r3(b8 + 0.02)], etiqS=1.0,
  camera=cam(Tb(-0.2, 0.85, 3.8, 50, 0.0, -0.3), Tb(-0.2, 0.85, 3.5, 50, 0.0, -0.25)),
  gente=[G(x=[[0, -0.9], [0.55, -0.9], [0.68, -0.55], [r3(b8 - 0.02), -0.55], [r3(b8 + 0.1), -0.85], [1, -0.85]], z=0.15, rot=1.0, acao=[(tr8, "em-pe", "sorriso"), (b8, "andando", "medo"), (1, "comemorando", "sorriso")], vel=1.6)])
# 9: e se a boia falhar: o ladrão leva o excesso para a bacia, e o chão fica seco
f9 = ps(9, '^falhar'); l9 = ps(9, '^ladrão')
cenas[9] = M(BOIA, falha=1, ladrao=V(0, 1, l9, r3(l9 + 0.1)), nivelCaixa=KF((0, 0.6), (r3(f9 - 0.1), 0.66), (r3(l9 + 0.05), 0.93), (1, 0.95)), descidaAgua=V(0, 1, r3(l9 + 0.12), r3(l9 + 0.2)),
  etiq=["ladrao@%s-0.99" % r3(l9 + 0.02)], etiqS=1.0,
  camera=cam(Tb(-0.2, 0.85, 3.9, 50, 0.0, -0.3), Tb(-0.17, 0.82, 2.9, 50, 0.0, -0.2)),
  gente=[G(x=-0.8, z=0.15, rot=0.9, acao=[(l9, "em-pe", "medo"), (1, "em-pe", "alivio")])])
# 10: descarga em raio-X, parte 1: a água entra pela borda, escorre, enche a curva e chega à crista
bo10 = ps(10, '^borda'); d10 = ps(10, '^corre'); e10 = ps(10, '^enche')
BOIA10 = M(BOIA, ladrao=1, nivelCaixa=KF((0, 0.9), (0.1, 0.9), (0.95, 0.2)))
cenas[10] = M(BOIA10, tampaBorracha=KF((0, 0), (0.08, 1), (1, 1)), descidaAgua=KF((0, 0), (0.08, 1), (1, 1)), aro=KF((0, 0), (r3(bo10 - 0.02), 0), (r3(bo10 + 0.05), 1), (1, 1)),
  tampaAgua=KF((0, 1), (r3(bo10 + 0.1), 1.03), (r3(d10), 1.1), (r3(e10 + 0.1), 1.24), (1, 1.32)), remoinho=V(0, 0.4, r3(d10), 1), furo=V(0, 1, r3(bo10 + 0.02), r3(bo10 + 0.1)), empurra=V(0, 1, r3(d10), r3(d10 + 0.08)), etiq=["jato@%s-0.99" % r3(bo10 + 0.12)], etiqS=1.0,
  camera=cam(Tb(0.3, 0.3, 2.7, 50, 0.1, 0.5), Tb(0.3, 0.22, 1.7, 50, 0.2, 0.8)),
  gente=[G(x=-1.15, z=0.0, rot=0.8, acao="em-pe", exp="surpreso", pose=PUXA)])
# 11: descarga, parte 2: passou da crista, o tubo enche e puxa; o nível cai; o ar entra e faz glub
pu11 = ps(11, '^puxa'); s11 = ps(11, '^some'); g11 = ps(11, '^glub')
cenas[11] = M(BOIA10, nivelCaixa=KF((0, 0.2), (1, 0.1)), tampaBorracha=KF((0, 1), (0.55, 1), (0.62, 0)), descidaAgua=KF((0, 1), (0.55, 1), (0.62, 0)), aro=KF((0, 1), (0.5, 1), (0.62, 0)), furo=KF((0, 1), (0.5, 1), (0.62, 0)), empurra=KF((0, 1), (r3(pu11 + 0.1), 1), (r3(s11), 0), (1, 0)),
  tampaAgua=KF((0, 1.32), (r3(pu11), 1.32), (r3(s11 + 0.1), 0.45), (r3(g11), 0.2), (1, 0.18)),
  sifao=KF((0, 0), (r3(pu11 - 0.05), 0), (r3(pu11 + 0.1), 0.35), (r3(g11 - 0.02), 1.0), (1, 1.0)), cauda=KF((0, 0), (r3(g11 - 0.02), 0), (r3(g11 + 0.18), 1.0), (1, 1.0)),
  puxa=KF((0, 0), (r3(pu11 - 0.02), 0), (r3(pu11 + 0.08), 1), (r3(g11), 1), (r3(g11 + 0.1), 0), (1, 0)), setas=KF((0, 0), (r3(pu11), 0), (r3(pu11 + 0.06), 1), (r3(g11 - 0.04), 1), (r3(g11 + 0.04), 0), (1, 0)),
  remoinho=KF((0, 1), (r3(s11 + 0.2), 1), (r3(g11), 0), (1, 0)), glub=V(0, 1, r3(g11 - 0.04), r3(g11 + 0.08)), etiq=["sifao@%s-0.99" % r3(pu11 + 0.02)], etiqS=1.0,
  camera=cam(Tb(0.3, 0.22, 1.7, 50, 0.2, 0.8), Tb(0.2, -0.05, 2.3, 50, 0.4, 0.5)),
  gente=[G(x=-1.15, z=0.0, rot=0.8, acao="em-pe", exp="eureka")])
# 12: a bacia quase seca; o tubinho curto leva a água da torneira ao ladrão, que desce à bacia e refaz a tampa
c12 = ps(12, '^cheiro'); t12 = ps(12, '^tubinho'); d12 = ps(12, '^desce'); r12 = ps(12, '^refaz')
cenas[12] = M(BOIA, ladrao=1, nivelCaixa=V(0.1, 0.9, d12, 0.97), tampaAgua=KF((0, 0.2), (d12, 0.2), (r3(r12 + 0.02), 1.0), (1, 1.0)),
  arCano=V(0, 1, 0.05, 0.2), arBarra=V(0, 1, r3(d12 + 0.05), r3(d12 + 0.1)), cheiro=KF((0, 0), (r3(c12 - 0.02), 0), (r3(c12 + 0.1), 1), (d12, 1), (r3(r12 + 0.02), 0), (1, 0)),
  tubinho=V(0, 1, t12, r3(t12 + 0.12)), tubinhoAgua=V(0, 1, d12, r3(d12 + 0.04)), descidaAgua=V(0, 0.45, d12, r3(d12 + 0.05)), aro=V(0, 0.5, d12, r3(d12 + 0.05)), etiq=["tubinho@%s-0.99" % r3(t12 + 0.02)], etiqS=1.0,
  camera=cam(Tb(0.05, 0.62, 4.2, 50, 0.08, -0.5), Tb(0.1, 0.6, 2.9, 50, 0.1, -0.1)),
  gente=[G(x=-1.0, z=0.1, rot=0.9, acao=[(c12, "em-pe", "sorriso"), (d12, "em-pe", "medo"), (1, "em-pe", "eureka")], pose=[(c12, {}), (d12, NARIZ), (1, {})])])
# 13: o respiro: um cano que sobe até o telhado e deixa o ar entrar; a água da tampa não é puxada
r13 = ps(13, '^respiro'); t13 = ps(13, '^telhado'); a13 = ps(13, '^ar$')
cenas[13] = M(BOIA, ladrao=1, tubinho=1, nivelCaixa=0.9, telhado=V(0, 1, 0.02, 0.25), respiro=V(0, 1, r13, r3(t13 + 0.06)), arResp=V(0, 1, r3(t13 + 0.08), r3(a13 + 0.05)), escoa=V(0.7, 0.7), escoaVel=1.1,
  arCano=0, etiq=["respiro@%s-0.99" % r3(r13 + 0.04)], etiqS=1.0,
  camera=cam(Tb(0.9, 0.9, 7.4, 50, 0.0, 0.3), Tb(1.1, 2.0, 4.2, 50, 0.0, 0.9)),
  gente=[G(x=-0.9, z=0.1, rot=0.9, acao="em-pe", exp="alivio")])
# 14: revelação: piso e solo viram opacos, a louça e a caixa acoplada; carimbo 1596; mosquitos vão embora (sem emprego)
cv14 = ps(14, '^com')
cenas[14] = M(BOIA, ladrao=1, tubinho=1, nivelCaixa=0.9, flor=True, piso=V(1, 0, 0.02, 0.4), vaso=V(0, 1, 0.04, 0.48), destaque=V(0, 1, r3(cv14 - 0.05), r3(cv14 + 0.12)),
  etiq=["vasoCaixa@0.45-0.99", "vasoBoia@0.58-0.99", "vasoSifao@0.68-0.99"], etiqS=1.0,
  camera=cam(pt([1.9, 1.5, 4.3], [0.05, 0.55, -0.15], 50), pt([0.9, 1.3, 4.6], [0.05, 0.55, -0.15], 50)),
  gente=[G(x=-0.9, z=-0.1, rot=0.8, acao="comemorando", exp="sorriso")], c=[rot("VASO SANITÁRIO", 1, 18, 72)])
# 15: o vaso inteiro; uma gota vira cachoeira; o ponto de interrogação vira lâmpada
FIM = M(BOIA, ladrao=1, tubinho=1, piso=0, vaso=1, flor=True, nivelCaixa=0.9)
c15 = ps(15, '^cidade')
cenas[15] = M(FIM, cachoeira=V(0, 1, ps(15, '^água'), r3(ps(15, '^água') + 0.1)), interroga=V(0, 1, r3(c15 - 0.1), r3(c15 + 0.1)), lampada=V(0, 1, ps(15, '^Siga'), r3(ps(15, '^Siga') + 0.12)),
  camera=cam(Tb(0.0, 0.85, 4.6, 50, 0.04, -0.1), Tb(0.0, 0.85, 4.2, 50, 0.04, -0.05)),
  gente=[G(x=-0.6, z=-0.2, rot=0.7, acao="em-pe", exp="sorriso", pose=POLEGAR)])
# 16: fecho com as chamadas
cenas[16] = M(FIM,
  camera=cam(Tb(0.0, 0.85, 3.8, 50, 0.04, -0.1), Tb(0.0, 0.85, 3.6, 50, 0.04, -0.05)),
  gente=[G(x=0.62, z=-0.2, rot=-0.7, acao="em-pe", exp="sorriso", pose=POLEGAR)],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "glub", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

# enquadramento largo para o Zeca (x ~ -0,7) e o encanamento aparecerem inteiros
for i, (ty, D) in {4: (0.25, 5.4), 5: (0.3, 5.4), 7: (0.6, 4.9), 8: (0.65, 4.9), 9: (0.65, 4.8)}.items():
    cenas[i]['camera'] = cam(Tb(-0.05, ty, D, 50, 0.0, -0.15), Tb(-0.05, ty, D - 0.25, 50, 0.0, -0.05))
SFX = {i: [] for i in range(1, 17)}
SFX[1] = [("whoosh", 0, 0.35), SF("zumbido", 1, ps(1, '^mosquito'), 0.3)]
SFX[2] = [SF("trovao", 2, ps(2, '^chuva'), 0.5), SF("passos_rapidos", 2, ps(2, '^correndo'), 0.35), SF("estalo", 2, fl2, 0.4)]
SFX[3] = [("pop", 0, 0.35), SF("tosse", 3, ps(3, '^ocupado'), 0.3), SF("pop", 3, b3, 0.3)]
SFX[4] = [("pop", 0, 0.4), SF("agua", 4, d4 + 0.03, 0.5), SF("agua", 4, ps(4, '^desce'), 0.4)]
SFX[5] = [SF("sopro", 5, c5, 0.35), SF("respiracao", 5, ps(5, '^banheiro'), 0.4)]
SFX[6] = [SF("pop", 6, b6, 0.4), SF("agua", 6, p6, 0.4), SF("ding", 6, a6, 0.45)]
SFX[7] = [SF("rangido", 7, cx7, 0.3), SF("clique", 7, l7, 0.45), SF("agua", 7, r3(l7 + 0.1), 0.55)]
SFX[8] = [SF("agua", 8, tn, 0.5), SF("pop", 8, tr8, 0.4), SF("clique", 8, r3(b8 + 0.08), 0.4)]
SFX[9] = [("pop", 0, 0.4), SF("clique", 9, f9, 0.4), SF("agua", 9, r3(l9 + 0.1), 0.4)]
SFX[10] = [("pop", 0, 0.4), SF("agua", 10, bo10, 0.5), SF("whoosh", 10, d10, 0.4)]
SFX[11] = [SF("whoosh", 11, pu11, 0.4), SF("agua", 11, r3(pu11 + 0.03), 0.5), SF("pop", 11, g11, 0.55)]
SFX[12] = [SF("sopro", 12, c12, 0.35), SF("pop", 12, t12, 0.4), SF("agua", 12, d12, 0.35), SF("ding", 12, r12, 0.45)]
SFX[13] = [SF("pop", 13, r13, 0.4), SF("sopro", 13, a13, 0.4), SF("ding", 13, 0.97, 0.4)]
SFX[14] = [SF("sino", 14, ps(14, '^vaso'), 0.4), SF("pop", 14, ps(14, '^caixa'), 0.4), SF("jingle", 14, ps(14, '^mosquito'), 0.4)]
SFX[15] = [("pop", 0, 0.4), SF("agua", 15, ps(15, '^água'), 0.4), SF("ding", 15, ps(15, '^Siga'), 0.45)]
SFX[16] = [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.6)]
# ambiência: nada contínuo grave (lição do elevador); só ar discreto nas duas primeiras batidas, com fade
AMB = {i: ("nenhuma", 0) for i in range(1, 17)}
AMB[1] = ("passaros", 0.06)
AMB[2] = ("chuva", 0.05)
durs = {i: dur(i) for i in range(1, 17)}
B.salvar(cenas, SFX, AMB, durs, proibido=('vaso',), ate=14)
