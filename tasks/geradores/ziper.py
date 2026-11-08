import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/ziper/roteiro.json (episódio 21, "como dois pedaços de pano se prendem num puxão?") a partir da tabela de cenas de tasks/roteiro-ziper.md (v2, 17 batidas).
# Uso (da raiz): python3 tasks/geradores/ziper.py episodios/ziper/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/ziper/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/ziper.tsx (+ ziper-mec.tsx: o encaixe dos dentes é calculado em função da posição do carrinho; campos no topo do ziper.tsx).
# REGRA: o nome "zíper" só aparece a partir da batida 14 (fala, rótulos, cartões).
B = Base('roteiro-ziper.md', 'ziper', 21, 17)
W = B.W
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep21) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep21', 'episode.json')
_bt = []
_END = 0
def _fim_bt(i):  # a batida vai do início dela até o início da próxima (a última, até o cartão final)
    return _bt[i]['start'] if i < len(_bt) else _END
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0); _bt = _j0.get('beats', [])
    if len(_bt) == 17 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0 and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 18)):
        def W(i, pat, fim=False):
            ps, ws = B.palavras_de(i), _bt[i - 1]['words']
            b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
            for k, w in enumerate(ps):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
def dur(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return {5: 11.0, 14: 3.4}.get(i, round(max(2.4, len(B.palavras_de(i)) / 2.9), 1))
CX = 60.0
YS0, YS1, P0 = 0.98, 3.45, 1.05


def F(ys):
    """altura do carrinho (m) -> campo `fecha` 0..1"""
    return round((ys - YS0) / (YS1 - YS0), 4)


def K(p, az, el, D, t, fov=48, sobe=0.07):
    """chave de câmera em órbita: olha para t a D metros, `az`/`el` em graus; o assunto sobe na tela (acima da legenda)"""
    return [round(p, 3), az, el, D, t[0], round(t[1] - sobe * D, 3), t[2], fov]


def engine(keys, rel=0.0, ys=1.5):
    """câmera padrão do motor a partir da primeira e da última chave (reserva; o cenário usa as chaves)"""
    def O(k):
        _, az, el, D, tx, ty, tz, fov = k
        a, e = math.radians(az), math.radians(el)
        c = (tx, ty + rel * ys, tz)
        return pt([c[0] + D * math.sin(a) * math.cos(e), c[1] + D * math.sin(e), c[2] + D * math.cos(a) * math.cos(e)], c, fov)
    return cam(O(keys[0]), O(keys[-1]))


def CAM(keys, rel=0, ys=1.5):
    return dict(camK=keys, camRel=rel, camera=engine(keys, rel, ys))


def Z(x=-0.95, z=0.7, rotOff=-0.15, **k):
    return G(x=x, z=z, rot=0.0, olha=True, rotOff=rotOff, **k)


TAB = 2.9
RX = 0.55
ZX, ZZ = -1.3, 0.55
DENTES = dict(dentes=1, g0=0.15)
cenas = {}

# 1 ---- abertura: corredor, o botão voa e cai na sopa do chefe
b1 = W(1, '^botão'); v1 = W(1, '^voa')
cenas[1] = M(palco="corredor", botaoV=V(0, 1, round(v1 - 0.02, 3), round(v1 + 0.2, 3)),
  gente=[G(x=KF((0, CX - 3.4), (0.8, CX + 8.3), (1, CX + 8.5)), z=0.3, rot=1.0, acao="surpreso", exp="surpreso", corre=KF((0, 1), (0.74, 1), (0.84, 0), (1, 0)), seg=1,
          pose=[(0.8, {}), (1, {"ombroE.z": 0.6, "ombroD.z": -0.6, "cotoveloE.x": -0.6, "cotoveloD.x": -0.6, "maos": 1})])],
  **CAM([K(0.0, 48, 5, 4.4, (CX - 1.9, 1.05, 0.3)), K(0.4, 50, 7, 4.6, (CX + 3.4, 1.05, 0.3)), K(0.62, 36, 9, 5.8, (CX + 7.2, 1.1, 0.1)), K(0.8, 20, 10, 6.8, (CX + 9.0, 1.15, 0)), K(1.0, 10, 11, 7.2, (CX + 9.7, 1.2, -0.1))]))

# 2 ---- botão: um por um, frestas; ganchos
stairs = [(0.0, 0.0), (0.06, 0.0)]
for i in range(7):
    y = 1.0 + 0.4 * i
    f = F(y + 0.05)
    a = 0.07 + i * 0.046
    stairs += [(round(a, 3), stairs[-1][1]), (round(a + 0.025, 3), f)]
stairs += [(0.52, stairs[-1][1]), (0.6, 0.0), (0.7, 0.0), (1.0, 0.95)]
fr2 = W(2, '^fresta'); h2 = W(2, '^ganchos')
cenas[2] = M(botoes=KF((0, 1), (round(h2 - 0.05, 3), 1), (round(h2 + 0.02, 3), 0)), ganchos=V(0, 1, round(h2 - 0.02, 3), round(h2 + 0.06, 3)), fecha=KF(*stairs),
  frestas=KF((0, 0), (round(fr2 - 0.04, 3), 0), (round(fr2 + 0.04, 3), 1), (round(h2 - 0.06, 3), 1), (round(h2 - 0.01, 3), 0), (1, 0)),
  etiq=["botoes@0.02-0.3", "ganchos@%s-0.99" % round(h2 + 0.03, 3)], etiqS=1.0,
  **CAM([K(0, -26, 8, 5.9, (-0.3, 2.3, 0)), K(0.5, -20, 10, 5.5, (-0.3, 2.3, 0)), K(1, -6, 10, 5.2, (-0.3, 2.3, 0))]), gente=[Z(acao="em-pe", exp="surpreso")])

# 3 ---- dentes que se alternam
t3 = W(3, '^dentes'); m3 = W(3, '^mãos');
cenas[3] = M(ganchos=KF((0, 1), (round(t3 - 0.06, 3), 1), (round(t3 + 0.04, 3), 0)), g0=V(0, 0.15, round(t3 - 0.06, 3), round(t3 + 0.04, 3)),
  dentes=V(0, 1, round(t3 - 0.03, 3), round(t3 + 0.3, 3)), fecha=KF((0, 0.0), (round(t3 - 0.05, 3), 0.52), (1, 0.52)), maos=V(0, 1, round(m3 - 0.12, 3), round(m3 + 0.04, 3)),
  etiq=["dentes@%s-0.99" % round(t3 + 0.34, 3)], etiqS=1.0,
  **CAM([K(0, 24, 8, 5.8, (-0.3, 2.2, 0)), K(0.45, 22, 10, 5.2, (-0.3, 2.0, 0)), K(1, 14, 12, 4.9, (-0.3, 1.9, 0))]), gente=[Z(acao="explicando", exp="sorriso")])

# 4 ---- carrinho com canal em Y (órbita curta)
c4 = W(4, '^carrinho'); r4 = W(4, '^separa'); sub4 = W(4, '^entram'); p4 = W(4, '^Puxando')
f4a, f4b, f4c = F(1.75), F(3.0), F(2.2)
cenas[4] = M(DENTES, solto=V(0, 1, 0.02, 0.2), carrinho=1, mont=V(0, 1, round(c4 - 0.04, 3), round(c4 + 0.2, 3)), raioxC=V(0, 1, round(c4 + 0.16, 3), round(c4 + 0.26, 3)), setaY=V(0, 1, round(c4 + 0.26, 3), round(c4 + 0.34, 3)), tab=TAB,
  fecha=KF((0, f4a), (round(sub4 - 0.02, 3), f4a), (round(p4 - 0.04, 3), f4b), (1, f4c)), etiq=["carrinho@%s-0.6" % round(c4 + 0.2, 3), "y@%s-0.99" % round(c4 + 0.36, 3)], etiqS=0.7,
  **CAM([K(0, -30, 12, 5.4, (-0.3, -0.2, 0)), K(0.35, -14, 14, 4.8, (-0.25, 0.1, 0)), K(0.7, 14, 12, 4.8, (-0.25, 0.1, 0)), K(1, 24, 12, 5.0, (-0.3, -0.1, 0))], rel=1, ys=f4a * (YS1 - YS0) + YS0),
  gente=[Z(x=-0.95, z=0.5, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])

# 5 ---- macro: dente por dente
f5a, f5b, f5c = F(1.7), F(2.55), F(2.0)
cenas[5] = M(DENTES, carrinho=1, raioxC=0.85, tab=TAB, fecha=KF((0, f5a), (0.1, f5a), (0.76, f5b), (0.8, f5b), (1, f5c)), etiq=["zig@0.62-0.82"], etiqS=1.0, etiqK=0.6,
  **CAM([K(0, 40, 24, 2.3, (0.02, 0.12, 0), 44), K(0.2, 22, 16, 1.55, (0.0, -0.02, 0.0), 44), K(0.45, -22, 10, 1.35, (0.0, -0.02, 0.0), 44), K(0.62, -38, 8, 1.3, (0.0, -0.05, 0.0), 44), K(0.78, 3, 28, 1.9, (0.0, 0.0, 0.0), 44), K(1, 34, 15, 2.1, (0.0, 0.0, 0), 44)], rel=1, ys=f5a * (YS1 - YS0) + YS0))

# 6 ---- a fita segura os dentes
f6 = F(2.55)
cenas[6] = M(DENTES, carrinho=1, raioxC=RX, tab=TAB, fecha=f6, cai=V(0, 1, 0.03, 0.3), dsolta=V(0, 1, 0.03, 0.3), fita=V(0, 1, 0.32, 0.62), costura=V(0, 1, 0.6, 0.93),
  etiq=["fita@0.34-0.62"], etiqS=1.0,
  **CAM([K(0, -22, 7, 6.8, (-0.3, 1.9, 0)), K(0.3, -12, 8, 6.4, (-0.3, 1.9, 0)), K(0.5, 18, 12, 4.4, (-0.2, 2.0, 0)), K(0.66, 26, 14, 3.0, (0.0, 2.2, 0.0)), K(1, 10, 10, 5.2, (-0.3, 2.5, 0))]), gente=[Z(x=-0.95, acao="explicando", exp="sorriso")])
cenas[6]['cai'] = KF((0, 0), (0.03, 0), (0.28, 1), (0.34, 1), (0.62, 0), (1, 0))
cenas[6]['dsolta'] = 1

# 7 ---- grampo: puxam os lados, só o carrinho solta
g7 = W(7, '^grampo'); s7 = W(7, '^só'); b7 = W(7, '^barriga')
cenas[7] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, tab=TAB, fecha=KF((0, F(2.7)), (round(s7 - 0.02, 3), F(2.7)), (round(s7 + 0.12, 3), F(1.5)), (round(b7 - 0.04, 3), F(1.5)), (round(b7 + 0.08, 3), F(2.7)), (1, F(2.7))),
  forca=KF((0, 0), (0.06, 1), (round(s7 - 0.04, 3), 1), (round(s7 + 0.02, 3), 0), (round(b7 - 0.02, 3), 0), (round(b7 + 0.05, 3), 1), (1, 1)), corte=V(0, 1, round(g7 - 0.2, 3), round(g7 - 0.08, 3)), etiq=["grampo@%s-%s" % (round(g7 - 0.04, 3), round(s7 + 0.0, 3))], etiqS=1.0,
  **CAM([K(0, -4, 5, 7.8, (0.0, 2.1, 0)), K(0.5, 0, 5, 7.6, (0.0, 2.1, 0)), K(1, 6, 6, 7.4, (0.0, 2.1, 0))]), gente=[Z(x=-0.95, acao="surpreso", exp="surpreso", pose=[(round(b7 - 0.05, 3), {}), (1, {"ombroE.x": -0.9, "ombroD.x": -0.9, "cotoveloE.x": -1.3, "cotoveloD.x": -1.3, "ombroE.z": 0.15, "ombroD.z": -0.15, "maos": 0.5, "tronco.x": -0.15})])])

# 8 ---- batente
v8 = W(8, '^Ponha'); n8 = W(8, '^ele')
cenas[8] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, tab=TAB, fecha=KF((0, F(2.4)), (0.2, 1.0), (0.5, 1.0), (round(v8 + 0.1, 3), 1.0), (round(v8 + 0.25, 3), 1.0), (round(n8 + 0.12, 3), F(2.6)), (0.88, 1.0), (0.94, 0.985), (1, 1.0)),
  voa=KF((0, 0), (0.2, 0), (0.46, 1), (round(v8 + 0.12, 3), 1), (round(v8 + 0.26, 3), 0), (1, 0)), batentes=V(0, 1, round(v8 + 0.04, 3), round(v8 + 0.3, 3)), etiq=["batente@%s-0.99" % round(v8 + 0.3, 3)], etiqS=1.0,
  **CAM([K(0, -22, 6, 6.6, (-0.3, 2.6, 0)), K(0.3, -10, 8, 6.6, (-0.3, 2.8, 0)), K(0.62, 14, 10, 5.6, (-0.3, 3.0, 0)), K(0.8, 24, 14, 3.0, (0.1, 3.5, 0.1)), K(1, 30, 14, 2.6, (0.1, 3.55, 0.1))]), gente=[Z(x=-0.95, acao="explicando", exp="sorriso")])

# 9 ---- o carrinho escorrega; trava
t9 = W(9, '^trava'); r9 = W(9, '^rua')
K9 = [K(0, -18, 6, 7.0, (0.25, 2.4, 0)), K(round(r9 + 0.1, 3), -22, 8, 6.4, (0.1, 2.2, 0)), K(round(t9 - 0.02, 3), -34, 10, 3.0, (0.0, 1.9, 0), 46), K(1, -52, 12, 1.8, (-0.1, 1.95, 0.1), 44)]
cenas[9] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, batentes=1, tab=TAB, janela=1, raioxC=V(RX, 0.85, round(t9 - 0.1, 3), round(t9 + 0.05, 3)),
  fecha=KF((0, 1.0), (0.1, 1.0), (round(r9 + 0.02, 3), F(1.9)), (round(t9 - 0.04, 3), F(1.9)), (1, F(1.9))), alinha=V(0, 1, round(t9 - 0.02, 3), round(t9 + 0.1, 3)), trava=V(0, 1, round(t9 + 0.1, 3), round(t9 + 0.26, 3)),
  etiq=["trava@%s-0.99" % round(t9 + 0.14, 3)], etiqS=1.0, **CAM(K9), gente=[Z(x=1.0, z=0.9, rotOff=0.1, acao="surpreso", exp="surpreso")])

# 10 ---- a camisa enroscada (Looney Tunes)
j10 = W(10, '^pulinho')
cenas[10] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, trava=1, tab=TAB, fecha=F(1.55), camisa=V(0, 1, 0.04, 0.22), estrelas=KF((0, 0), (round(j10 - 0.02, 3), 0), (round(j10 + 0.04, 3), 1), (round(j10 + 0.2, 3), 0.7), (1, 0)),
  **CAM([K(0, -18, 7, 5.4, (-0.3, 1.5, 0)), K(0.5, -10, 8, 4.8, (-0.3, 1.5, 0.1)), K(round(j10 - 0.03, 3), 8, 6, 4.4, (-0.3, 1.4, 0.2)), K(1, 14, 6, 4.6, (-0.3, 1.4, 0.2))]),
  gente=[Z(x=-0.95, z=0.65, rotOff=0.5, acao="surpreso", exp="surpreso",
           y=KF((0, 0), (round(j10 - 0.04, 3), 0), (round(j10 + 0.04, 3), 0.45), (round(j10 + 0.12, 3), 0), (round(j10 + 0.18, 3), 0.28), (round(j10 + 0.24, 3), 0), (1, 0)),
           sq=KF((0, 0), (round(j10 - 0.05, 3), 0), (round(j10 - 0.01, 3), -1), (round(j10 + 0.04, 3), 0), (round(j10 + 0.12, 3), 1), (round(j10 + 0.16, 3), 0), (1, 0)),
           verm=V(0, 1, round(j10 - 0.02, 3), round(j10 + 0.1, 3)))])

# 11 ---- pino e caixa: a jaqueta abre inteira
p11 = W(11, '^pino'); cx11 = W(11, '^caixa'); i11 = W(11, '^entra'); a11 = W(11, '^abre')
cenas[11] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, trava=1, tab=TAB, jaqueta=V(0, 1, 0.0, 0.1),
  fecha=KF((0, F(1.55)), (0.12, F(1.55)), (0.26, 0.0), (round(i11 + 0.12, 3), 0.0), (round(i11 + 0.3, 3), F(2.3)), (round(a11 - 0.03, 3), F(2.3)), (round(a11 + 0.1, 3), 0.0), (1, 0.0)),
  caixa=V(0, 1, round(p11 - 0.04, 3), round(p11 + 0.12, 3)), sep=KF((0, 0), (0.24, 0), (0.32, 1), (round(i11 - 0.05, 3), 1), (round(i11 + 0.08, 3), 0), (round(a11 + 0.06, 3), 0), (round(a11 + 0.2, 3), 1), (1, 1)),
  sepY=KF((0, 0), (0.24, 0), (0.32, 1), (round(i11 + 0.06, 3), 1), (round(i11 + 0.16, 3), 0), (round(a11 + 0.1, 3), 0), (round(a11 + 0.2, 3), 1), (1, 1)),
  etiq=["pino@%s-%s" % (round(p11 + 0.0, 3), round(i11 + 0.1, 3)), "caixa@%s-%s" % (round(cx11 + 0.0, 3), round(i11 + 0.1, 3))], etiqS=1.0, etiqK=0.8,
  **CAM([K(0, -24, 8, 6.2, (-0.3, 2.1, 0)), K(0.3, -22, 10, 5.4, (-0.2, 1.5, 0)), K(0.6, 18, 14, 3.4, (0.1, 1.0, 0)), K(0.85, 20, 12, 5.2, (-0.3, 1.9, 0)), K(1, 8, 8, 6.2, (-0.4, 2.2, 0))]),
  gente=[Z(x=-0.95, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])

# 12 ---- espiral de plástico
e12 = W(12, '^Troque'); d12 = W(12, '^dobra')
cenas[12] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, trava=1, tab=TAB, jaqueta=1, fecha=F(2.5), espiral=V(0, 1, round(e12 + 0.0, 3), round(e12 + 0.3, 3)), costE=V(0, 1, round(e12 + 0.26, 3), round(e12 + 0.5, 3)), dobra=V(0, 1, round(d12 - 0.06, 3), round(d12 + 0.1, 3)),
  etiq=["espiral@%s-0.99" % round(e12 + 0.3, 3)], etiqS=1.0,
  **CAM([K(0, -28, 8, 6.2, (-0.3, 2.5, 0)), K(0.16, 26, 10, 2.8, (0.0, 1.7, 0)), K(0.45, -22, 8, 2.9, (0.0, 1.8, 0)), K(1, 10, 8, 5.4, (-0.4, 2.2, 0))]), gente=[Z(x=-0.95, acao="explicando", exp="sorriso")])

# 13 ---- a jaqueta abre e fecha num puxão
cenas[13] = M(DENTES, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, trava=0, tab=TAB, jaqueta=1, espiral=1, costE=1, dobra=0.3, sopa=V(0, 1, 0.5, 0.6),
  fecha=KF((0, F(2.5)), (0.2, F(1.1)), (0.42, F(1.1)), (0.68, F(2.9)), (1, F(2.9))),
  **CAM([K(0, -8, 6, 6.8, (-0.1, 2.3, 0)), K(1, 6, 6, 6.4, (-0.1, 2.3, 0))]), gente=[Z(x=-0.95, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])

# 14 ---- revelação
cenas[14] = M(DENTES, costE=1, dsolta=1, fita=1, costura=1, carrinho=1, batentes=1, tab=TAB, jaqueta=1, espiral=1, dobra=0.15, fecha=F(2.9), raioxC=1, setaY=0, etiq=["ziper@0.5-0.99"], etiqS=1.0,
  **CAM([K(0, 10, 58, 4.4, (-0.2, 2.9, 0.4)), K(0.55, 14, 22, 6.2, (-0.3, 2.3, 0)), K(1, 0, 4, 7.0, (-0.3, 2.2, 0))]), gente=[Z(x=-0.95, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])

# 15 ---- as patentes velhas
cenas[15] = M(DENTES, patente="1851", patente2="1893", patX=-0.46, patX2=0.46, patE=0.56, patK=V(0, 1, 0.0, 0.12), patS=V(0, 1, round(W(15, '^nunca') - 0.02, 3), round(W(15, '^nunca') + 0.08, 3)),
  patK2=V(0, 1, round(W(15, '^Whitcomb') - 0.04, 3), round(W(15, '^Whitcomb') + 0.06, 3)), patS2=V(0, 1, round(W(15, '^emperrava') - 0.02, 3), round(W(15, '^emperrava') + 0.06, 3)),
  dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, tab=TAB, jaqueta=1, espiral=1, costE=1, fecha=F(2.9),
  **CAM([K(0, 0, 4, 6.8, (0.0, 2.1, 0)), K(1, 0, 5, 6.4, (0.0, 2.15, 0))]), gente=[Z(x=-0.9, z=2.0, acao="explicando", exp="sorriso")],
  c=[rot("1851", 1, 40, 96), rot("1893", 2, 150, 96)])

# 16 ---- Sundbäck e o nome
cenas[16] = M(DENTES, patente="1913", patX=-0.4, patE=0.6, patK=V(0, 1, 0.0, 0.1), patS=V(0, 1, round(W(16, '^foi') + 0.0, 3), round(W(16, '^foi') + 0.1, 3)), galocha=V(0, 1, round(W(16, '^galocha') - 0.2, 3), round(W(16, '^galocha') - 0.1, 3)),
  dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, tab=TAB, jaqueta=1, espiral=1, costE=1, fecha=F(2.9), etiq=["zipper@%s-0.99" % round(W(16, '^nome') + 0.02, 3)], etiqS=1.0,
  **CAM([K(0, 0, 4, 6.4, (0.0, 1.9, 0.5)), K(1, -8, 6, 5.6, (0.2, 1.7, 0.5))]), gente=[Z(x=-0.95, z=2.4, acao="explicando", exp="sorriso")],
  c=[rot("1913", 0, 40, 96), rot("1923", 2, 150, 96)])

# 17 ---- fecho e gancho: o pano que segura gente caindo
cenas[17] = M(DENTES, costE=1, dsolta=1, fita=1, costura=1, carrinho=1, raioxC=RX, batentes=1, tab=TAB, jaqueta=1, espiral=1, fecha=KF((0, F(1.1)), (0.4, F(2.9)), (1, F(2.9))), pano=V(0, 1, 0.2, 1.0), janela=2,
  **CAM([K(0, -22, 7, 6.4, (0.7, 2.3, 0)), K(1, -8, 6, 6.0, (0.8, 2.3, 0))]), gente=[Z(x=0.95, z=1.1, acao="em-pe", exp="sorriso", pose=APONTA_D)],
  c=[chamada("curtir", "CURTA", None, 0), chamada("compartilhar", "COMPARTILHE", "pra quem vive com o zíper aberto", 1), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 2)])

SFX = {1: [("whoosh", 0, 0.4), ("clique", 1, 0.4), ("pop", 2, 0.4)], 2: [("tique", 0, 0.3), ("pop", 1, 0.35), ("tique", 2, 0.3), ("clique", 3, 0.4), ("clique", 4, 0.4)], 3: [("clique", 0, 0.4), ("tique", 1, 0.3), ("pop", 2, 0.35), ("ding", 3, 0.4)],
  4: [("pop", 1, 0.4), ("clique", 2, 0.35), ("clique", 3, 0.35), ("ding", 4, 0.4), ("whoosh", 5, 0.3)], 5: [("clique", 1, 0.3), ("clique", 2, 0.3), ("clique", 3, 0.3), ("clique", 4, 0.35), ("whoosh", 5, 0.35)],
  6: [("estalo", 0, 0.4), ("pop", 1, 0.35), ("tique", 2, 0.3), ("ding", 3, 0.35)], 7: [("estalo", 0, 0.35), ("clique", 1, 0.45), ("pop", 2, 0.35), ("whoosh", 3, 0.3)], 8: [("whoosh", 0, 0.4), ("pop", 1, 0.4), ("clique", 2, 0.45), ("ding", 3, 0.35)],
  9: [("whoosh", 0, 0.35), ("pop", 1, 0.3), ("clique", 3, 0.5), ("ding", 4, 0.35)], 10: [("zumbido", 0, 0.3), ("estalo", 2, 0.45), ("pop", 3, 0.45)], 11: [("clique", 0, 0.4), ("pop", 1, 0.35), ("clique", 2, 0.5), ("whoosh", 3, 0.35)],
  12: [("pop", 0, 0.35), ("whoosh", 1, 0.35), ("ding", 2, 0.35), ("pop", 3, 0.3)], 13: [("whoosh", 0, 0.4), ("clique", 1, 0.4), ("pop", 2, 0.3)], 14: [("ding", 0, 0.5)], 15: [("pop", 0, 0.4), ("estalo", 1, 0.45), ("pop", 2, 0.4), ("zumbido", 4, 0.3)],
  16: [("pop", 0, 0.4), ("ding", 1, 0.4), ("pop", 2, 0.4)], 17: [("pop", 0, 0.5), ("pop", 1, 0.5), ("ding", 2, 0.5)]}
AMB = {i: ("nenhuma", 0) for i in range(1, 18)}
B.salvar(cenas, SFX, AMB, {i: dur(i) for i in range(1, 18)}, proibido=('zíper', 'ziper', 'zipper'), ate=14)
