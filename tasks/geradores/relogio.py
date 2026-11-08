import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/relogio/roteiro.json (episódio 24, "como um relógio de pulso anda certinho sem pilha?") a partir de tasks/roteiro-relogio.md (v2, 17 batidas, aprovada).
# Uso (da raiz): python3 tasks/geradores/relogio.py episodios/relogio/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/relogio/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/relogio.tsx (+ relogio-mec.tsx, a matemática do trem e do escape). REGRA: "relógio" só a partir da batida 15.
B = Base('roteiro-relogio.md', 'relogio', 24, 17)
_pre = lambda pat: r'^\W*' + pat.lstrip('^')
_WE = lambda i, pat, fim=False: B.W(i, _pre(pat), fim)  # estimativa (sem voz)
W = _WE
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep24) em vez da estimativa por posição.
_EPD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep24')
DUR_EST = {4: 11.0, 5: 12.0, 8: 15.5, 9: 11.0, 12: 14.5, 13: 12.5, 14: 11.5, 15: 6.5}
_bt = []
_END = 0
def _fim_bt(i):  # a batida vai do início dela até o início da próxima (a última, até o cartão final)
    return _bt[i]['start'] if i < len(_bt) else _END
if os.path.exists(os.path.join(_EPD, 'narration.wav')) and os.path.exists(os.path.join(_EPD, 'episode.json')):
    _j0 = json.load(open(os.path.join(_EPD, 'episode.json'), encoding='utf-8')); _END = _j0.get('endcardStart', 0); _bt = _j0.get('beats', [])
    if len(_bt) == 17 and _bt[0].get('words') and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 18)):
        def W(i, pat, fim=False):
            ps, ws = B.palavras_de(i), _bt[i - 1]['words']
            b0, b1 = _bt[i - 1]['start'], _fim_bt(i)
            for k, w in enumerate(ps):
                if re.search(_pre(pat), w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
    else: _bt = []
def dur(i):
    if _bt: return round(_fim_bt(i) - _bt[i - 1]['start'], 3)
    return DUR_EST.get(i, round(max(2.4, len(B.palavras_de(i)) / 2.9), 1))
r3 = lambda v: round(v, 3)
OF = dict(tipo="oficina")


def Z(x=1.85, z=2.3, rot=-0.35, **k): return G(x=x, z=z, rot=rot, **k)
def CM(cx=0.2, ty=3.3, D=11.5, x0=2.4, el=0.1, fov=50): return T(cx, ty, D, fov, el, x0=x0)
def cm(de, para): return cam(de, para)


# estado de cada fase (o que já foi montado)
TORRE = dict(torre=1, placa=1)
DRUM = dict(fonte=1, mola=0, trem=1, ptC=1)
cenas = {}

# ---- 1: quintal, a sombra some
nu = W(1, '^nublou')
cenas[1] = M(tipo="quintal", nuvem=V(0, 1, r3(nu - 0.05), r3(nu + 0.1)),
             camera=cm(T(1.0, 1.9, 14.0, 50, 0.16, x0=3.6), T(0.6, 1.7, 10.6, 50, 0.12, x0=2.4)),
             gente=[Z(x=-0.2, z=2.6, rot=0.35, acao=[(0.5, "andando"), (1, "em-pe")], exp="surpreso", pose=[(0.5, {}), (1, ESPANTO)]),
                    dict(quem="chefe", x=2.3, z=0.9, rot=-0.7, acao="bracos-cruzados", exp="sorriso", gravata=True)])

# ---- 2: ampulheta e o vigia que cochila
cenas[2] = M(tipo="ampulheta", areia=V(0, 1, 0.12, 0.66),
             camera=cm(T(0.9, 2.3, 13.0, 50, 0.12, x0=3.2), T(0.9, 2.2, 11.5, 50, 0.1, x0=2.6)),
             gente=[Z(x=-0.6, z=2.4, rot=0.4, acao=[(0.55, "explicando", "sorriso"), (1, "em-pe", "preocupado")]),
                    dict(quem="vigia", x=2.35, y=0.06, z=0.6, rot=-0.5, acao="sentado", exp="sorriso", pose={"cabeca.x": 0.55, "ombroE.x": -0.3, "ombroD.x": -0.3})],
             c=[rot("AMPULHETA", 0, 40, 84)])

# ---- 3: pêndulo, o Zeca perde a conta
ct = W(3, '^contar'); oi = W(3, '^oitavo')
cenas[3] = M(tipo="pendulo", cont=V(0, 8, r3(ct), r3(oi + 0.05)),
             camera=cm(T(1.0, 1.4, 6.4, 50, 0.12, x0=2.2), T(0.5, 2.3, 12.5, 50, 0.1, x0=2.8)),
             gente=[Z(x=-0.7, z=2.2, rot=0.4, acao="explicando", exp="surpreso", pose=[(0.5, {}), (1, ESPANTO)])],
             c=[rot("PÊNDULO", 0, 40, 84)])

# ---- 4: peso + engrenagens + ponteiro; o peso despenca
pw = W(4, '^peso'); en = W(4, '^engrenagens'); po = W(4, '^ponteiro'); de = W(4, '^despenca')
cenas[4] = M(OF, torre=V(0, 1, 0.0, 0.05), placa=V(0, 1, 0.0, 0.05), fonte=V(0, 1, r3(pw - 0.03), r3(pw + 0.14)), mola=0, trem=V(0, 1, r3(en - 0.03), r3(en + 0.16)),
             ptC=V(0, 1, r3(po - 0.03), r3(po + 0.08)), livre=1, queda=V(0, 1, r3(de), 0.97), hm=0.0,
             etiq=["peso@%s-0.5" % r3(pw), "engren@%s-0.7" % r3(en)], etiqS=1.0, etiqK=1.0,
             camera=cm(CM(0.2, 3.2, 9.0, 2.8, 0.1), CM(0.3, 3.4, 13.5, 2.4, 0.1)),
             gente=[Z(x=1.9, z=2.9, acao="explicando", exp="surpreso", pose=[(r3(de), {}), (1, ESPANTO)])],
             c=[rot("5 S", B.NLEVE[3], 40, 90)])

# ---- 5: roda de dentes e âncora (o dedo empurra a âncora)
dn = W(5, '^dentes'); an = W(5, '^âncora')
cenas[5] = M(OF, TORRE, DRUM, queda=0, livre=0, esc=V(0, 1, r3(dn - 0.02), r3(dn + 0.14)), anc=V(0, 1, r3(an - 0.02), r3(an + 0.14)), ptE=V(0, 1, r3(dn), r3(dn + 0.1)), reg=0,
             bat=V(0, 1.3, r3(an + 0.1), r3(an + 0.2)), amp=1, dedo=V(0, 1, r3(an + 0.06), r3(an + 0.14)), hm=0.0,
             etiq=["escape@%s-0.55" % r3(dn), "ancora@%s-0.99" % r3(an)], etiqS=1.0, etiqK=0.9,
             camera=cm(CM(-0.3, 3.1, 8.6, 2.0, 0.1), CM(-0.8, 3.0, 6.4, 1.4, 0.1)),
             gente=[Z(x=1.3, z=1.6, acao="explicando", exp="surpreso")])

# ---- 6: o pêndulo comanda; perde força e para
D6 = dur(6)
bat6 = 2.0
t6 = 0.62 * D6
ust6 = math.floor(0.5 + bat6 * t6) + 0.5
p6 = r3((ust6 - 0.5) / bat6 / D6)
cenas[6] = M(OF, TORRE, DRUM, queda=0, livre=0, esc=1, anc=1, ptE=1, pend=V(0, 1, 0.0, 0.1), reg=0, bat=bat6, amp=KF((0, 1), (p6, 1), (r3(min(p6 + 0.3, 0.97)), 0.05), (1, 0.05)), ustop=ust6,
             luz=V(0, 0.5, 0.0, 1.0), hm=0.0,
             camera=cm(CM(-0.5, 2.9, 10.0, 2.6, 0.1), CM(-1.0, 2.8, 7.4, 2.2, 0.1)),
             gente=[Z(acao="explicando", exp="sorriso", pose=[(r3(p6), {}), (1, ESPANTO)])])

# ---- 7: o empurrãozinho; o peso chega ao chão
D7 = dur(7)
bat7 = 2.0
cg = W(7, '^chão')
t7 = cg * D7 - 0.2
ust7 = math.floor(0.5 + bat7 * t7) + 0.5
p7 = r3((ust7 - 0.5) / bat7 / D7)
cenas[7] = M(OF, TORRE, DRUM, esc=1, anc=1, ptE=1, pend=1, reg=0, bat=bat7, amp=KF((0, 1), (p7, 1), (r3(min(p7 + 0.08, 0.99)), 0.05), (1, 0.05)), ustop=ust7, setas=V(0, 1, 0.0, 0.08), hm=0.0,
             livre=KF((0, 0), (r3(cg - 0.03), 0), (r3(cg - 0.02), 1), (1, 1)), queda=V(0, 1, r3(cg - 0.02), r3(min(cg + 0.18, 0.97))),
             luz=0.5,
             camera=cm(CM(0.0, 3.2, 12.5, -2.8, 0.1), CM(0.3, 3.2, 12.5, 2.8, 0.12)),
             gente=[Z(acao=[(r3(cg - 0.02), "comemorando"), (1, "em-pe")], exp="sorriso", pose=[(r3(cg - 0.02), BRACOS_CIMA), (1, ESPANTO)])])

# ---- 8: suba o peso (corda); troque o peso por uma mola; as engrenagens encolhem
su = W(8, '^suba'); mo = W(8, '^mola'); en8 = W(8, '^encolhem'); mas8 = W(8, '^parados')
cenas[8] = M(OF, torre=V(1, 0, r3(mo - 0.03), r3(mo + 0.1)), placa=1, fonte=1, mola=V(0, 1, r3(mo), r3(mo + 0.12)), trem=1, ptC=1, esc=1, anc=1, ptE=1, pend=1, reg=0,
             livre=KF((0, 1), (r3(su + 0.2), 1), (r3(su + 0.21), 0), (1, 0)), queda=V(1, 0, r3(su), r3(su + 0.2)),
             bat=KF((0, 0), (r3(su + 0.2), 0), (r3(su + 0.25), 2.0), (1, 2.0)), amp=1, corda=0.8,
             ms=V(1.0, 0.8, r3(en8 - 0.02), r3(en8 + 0.18)), hm=0.0,
             etiq=["mola@%s-0.99" % r3(mo)], etiqS=1.0, etiqK=1.0,
             camera=cm(CM(0.0, 3.3, 11.0, 2.4, 0.1), CM(0.2, 3.3, 11.2, 2.2, 0.1)),
             gente=[Z(acao=[(r3(su + 0.2), "explicando"), (r3(mas8), "cocando-cabeca"), (1, "comemorando")], exp="sorriso", pose=[(r3(mas8), {}), (1, BRACOS_CIMA)])],
             c=[rot("30 CM", B.NLEVE[7], 40, 90)])

# ---- 9: troque o pêndulo pela roda de balanço com espiral; a mola enfraquece
rb = W(9, '^roda'); en9 = W(9, '^enfraquece')
cenas[9] = M(OF, placa=1, fonte=1, mola=1, trem=1, ptC=1, esc=1, anc=1, ptE=1, pend=V(1, 0, r3(rb - 0.05), r3(rb + 0.02)), bal=V(0, 1, r3(rb), r3(rb + 0.16)), reg=1,
             bat=KF((0, 0), (r3(rb + 0.05), 0), (r3(rb + 0.12), 2.4), (r3(en9), 2.4), (r3(en9 + 0.2), 2.0), (1, 2.0)), amp=KF((0, 1), (r3(en9), 1), (r3(en9 + 0.25), 0.7), (1, 0.7)),
             corda=V(0.7, 0.3, r3(en9), 0.95), ms=V(0.8, 0.7, 0.55, 0.9), hm=0.0,
             etiq=["roda@%s-0.5" % r3(rb), "espiral@%s-0.99" % r3(W(9, '^espiral'))], etiqS=1.0, etiqK=0.95,
             camera=cm(CM(0.7, 3.2, 10.0, 2.0, 0.1), CM(0.3, 3.1, 8.2, 1.6, 0.1)),
             gente=[Z(x=1.1, z=1.6, acao="explicando", exp="sorriso", pose=[(r3(en9), {}), (1, ESPANTO)])],
             c=[rot("6 CM", B.NLEVE[8], 40, 90)])

# ---- 10: a espiral manda no ritmo; o regulador adianta
rg = W(10, '^regulador')
cenas[10] = M(OF, placa=1, fonte=1, mola=1, trem=1, ptC=1, esc=1, anc=1, ptE=1, bal=1, reg=1, marc=1, reguV=V(0, 1, r3(rg - 0.04), r3(rg + 0.06)), regu=V(0, 1, r3(rg + 0.05), r3(rg + 0.3)),
              bat=2.0, amp=0.9, corda=V(0.45, 0.3, 0.0, 0.5), ms=0.7, hm=0.0,
              etiq=["regulador@%s-0.99" % r3(rg)], etiqS=1.0, etiqK=0.95,
              camera=cm(CM(0.7, 3.2, 9.6, 2.0, 0.1), CM(0.3, 3.1, 8.4, 1.6, 0.1)),
              gente=[Z(x=1.1, z=1.6, acao="explicando", exp="sorriso")])

# ---- 11: peças minúsculas se gastam; rubis
gs = W(11, '^gastam'); ru = W(11, '^rubis')
cenas[11] = M(OF, placa=1, fonte=1, mola=1, trem=1, ptC=1, esc=1, anc=1, ptE=1, bal=1, reg=1, reguV=1, regu=1, bat=2.4, amp=0.9, corda=0.5, hm=0.0,
              ms=V(0.7, 0.6, 0.0, 0.3),
              fagulha=KF((0, 0), (r3(gs - 0.05), 0), (r3(gs + 0.03), 1), (r3(ru - 0.02), 1), (r3(ru + 0.04), 0), (1, 0)), rub=V(0, 1, r3(ru), 0.97),
              etiq=["rubis@%s-0.99" % r3(ru)], etiqS=1.0, etiqK=0.95,
              camera=cm(CM(0.7, 3.2, 9.6, 2.0, 0.1), CM(0.3, 3.1, 7.8, 1.5, 0.1)),
              gente=[Z(x=1.1, z=1.6, acao="explicando", exp="sorriso", pose=[(r3(ru), {}), (1, ESPANTO)])],
              c=[rot("4 CM", B.NLEVE[10], 40, 90)])

# ---- 12: ponteiros (hora, minuto e segundo ligados ao trem, 12:1)
md = W(12, '^ponteiros'); mi = W(12, '^minutos'); hr = W(12, '^horas'); sg = W(12, '^segundos')
BASE12 = dict(placa=1, fonte=1, mola=1, trem=1, esc=1, anc=1, bal=1, reg=1, reguV=1, regu=1, rub=1, bat=2.4, amp=0.9, corda=0.5, ms=0.6)
cenas[12] = M(OF, BASE12, ptC=V(1, 0, r3(md - 0.05), r3(md)), ptE=V(1, 0, r3(md - 0.05), r3(md)), mostr=V(0, 1, r3(md - 0.03), r3(md + 0.1)), mw=V(0, 1, r3(md - 0.02), r3(md + 0.16)), pont=V(0, 1, r3(md + 0.14), r3(md + 0.26)),
              hm=0.1333, hh=0.8444, hs=0.0,
              ff=KF((0, 0), (r3(mi - 0.04), 0), (r3(mi + 0.02), 0.02), (r3(sg - 0.02), 0.02), (r3(sg + 0.1), 0.9), (r3(min(sg + 0.5, 0.99)), 1.4), (1, 1.4)),
              etiq=["horas@%s-%s" % (r3(hr), r3(mi + 0.02)), "minutos@%s-%s" % (r3(mi), r3(sg)), "segundos@%s-0.99" % r3(sg)], etiqS=1.0, etiqK=0.9,
              camera=cm(CM(0.0, 3.0, 8.6, 2.2, 0.12), CM(0.0, 3.0, 7.8, 1.6, 0.12)),
              gente=[Z(x=1.6, z=2.0, acao="explicando", exp="sorriso")],
              c=[rot("12 : 1", B.NLEVE[11], 40, 96)])

# ---- 13: a coroa (gira = dar corda, puxa = acertar a hora)
cr = W(13, '^coroa'); gi = W(13, '^gire'); pu = W(13, '^puxe')
BASE13 = dict(BASE12, mostr=1, mw=1, pont=1, cor=1, hm=0.1333, hh=0.8444, hs=0.0, bat=2.4)
cenas[13] = M(OF, BASE13, cor=V(0, 1, r3(cr - 0.02), r3(cr + 0.08)),
              gW=V(0, 3, r3(gi), r3(gi + 0.22)), puxa=KF((0, 0), (r3(pu - 0.02), 0), (r3(pu + 0.08), 1), (0.93, 1), (0.99, 0), (1, 0)), gS=KF((0, 0), (r3(pu + 0.1), 0), (0.88, 2), (1, 2)),
              corda=V(0.3, 0.8, r3(gi), r3(gi + 0.22)),
              etiq=["coroa@%s-%s" % (r3(cr), r3(gi)), "gira@%s-%s" % (r3(gi), r3(pu)), "puxa@%s-0.9" % r3(pu)], etiqS=1.0, etiqK=0.9,
              camera=cm(CM(0.9, 3.2, 10.5, 2.4, 0.12), CM(1.3, 3.2, 7.6, 2.6, 0.14)),
              gente=[Z(x=2.0, z=0.8, rot=-0.45, acao="explicando", exp="sorriso")])

# ---- 14: o vidro desce de cima; a caixa fecha; pulseira
vd = W(14, '^vidro'); pl = W(14, '^pulso')
BASE14 = dict(BASE13, cor=1)
cenas[14] = M(OF, BASE14, mesa=V(0, 1, 0.0, 0.1), incl=V(0, 1, 0.0, 0.2), mx=V(0, 1.1, 0.0, 0.2), my=V(4.0, 2.0, 0.0, 0.2), mz=V(-0.3, 0.6, 0.0, 0.2), ms=0.5,
              caixa=V(0, 1, 0.18, 0.3), vidro=KF((0, 0.0), (r3(vd - 0.02), 0.0), (r3(vd + 0.3), 1.0), (1, 1.0)), pulseira=V(0, 1, r3(pl - 0.02), r3(pl + 0.12)),
              gW=3, gS=2, puxa=0, etiq=["vidro@%s-0.9" % r3(vd)], etiqS=1.0, etiqK=0.95,
              camera=cm(T(1.1, 1.8, 6.2, 50, 0.55, x0=2.4), T(0.9, 1.6, 11.0, 50, 0.7, x0=1.0)),
              gente=[Z(x=-1.7, z=2.0, rot=0.4, acao="explicando", exp="sorriso")])

# ---- 15: revelação, o relógio no pulso
cenas[15] = M(OF, BASE14, mostr=1, mw=1, pont=1, cor=1, caixa=1, pulseira=1, vidro=1, gW=3, gS=2, puxa=0, ms=0.045, mx=1.76, my=1.15, mz=2.5, rotY=-0.2,
              etiq=["relogio@0.05-0.99"], etiqS=1.0, etiqK=0.9,
              camera=cm(T(1.6, 1.3, 3.6, 50, 0.05, x0=1.6), T(0.8, 1.6, 7.4, 50, 0.1, x0=1.6)),
              gente=[Z(x=1.4, z=2.2, rot=-0.2, acao="em-pe", exp="sorriso", pose={"ombroE.x": -1.2, "ombroE.z": 0.1, "cotoveloE.x": -1.0, "maos": 0.3}),
                     dict(quem="chefe", x=-1.0, z=1.0, rot=0.5, acao="bracos-cruzados", exp="sorriso", gravata=True)],
              c=[rot("RELÓGIO", 0, 40, 96)])

# ---- 16: gancho do farol
cenas[16] = M(tipo="mar", luzMar=V(0, 1, 0.45, 0.7),
              camera=cm(T(-1.2, 1.8, 10.0, 50, 0.1, x0=3.0), T(-1.2, 1.8, 8.6, 50, 0.1, x0=2.4)),
              gente=[Z(x=0.9, z=2.4, rot=-0.9, acao="em-pe", exp="surpreso", pose=APONTA_E)])

# ---- 17: fecho
cenas[17] = M(OF, BASE14, mostr=1, mw=1, pont=1, cor=1, caixa=1, pulseira=1, vidro=1, gW=3, gS=2, puxa=0, ms=0.55, mx=0.0, my=3.7, mz=-0.3, hm=0.1333, hh=0.8444,
              camera=cm(CM(0.0, 3.0, 12.0, 0.0, 0.05), CM(0.0, 3.0, 11.5, 0.0, 0.05)),
              gente=[Z(x=-1.5, z=2.0, rot=0.3, acao="em-pe", exp="sorriso", pose=APONTA_D)],
              c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "ATRASADO", 1), chamada("compartilhar", "COMPARTILHE", "pra quem sempre chega atrasado", 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {i: [("pop", 0, 0.35)] for i in range(1, 18)}
SFX.update({1: [("whoosh", 0, 0.4), ("estalo", 1, 0.4)], 4: [("clique", 0, 0.4), ("queda_energia", 3, 0.4)], 5: [("tique", 1, 0.4), ("tique", 2, 0.35)], 6: [("tique_relogio", 1, 0.4), ("tique_relogio", 2, 0.4)], 7: [("tique_relogio", 0, 0.4), ("impacto", 3, 0.5)],
            11: [("ding", 2, 0.4)], 13: [("clique", 1, 0.4), ("clique", 2, 0.4)], 14: [("vidro", 1, 0.5)], 15: [("jingle", 0, 0.5)], 17: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.5)]})
# Tique-taque discreto (volume baixo, em loop com fade) SÓ nas batidas em que o mecanismo anda (8 a 14); as engrenagens, só cliques baixos nessas batidas.
AMB = {i: (("tique_relogio", 0.05) if 8 <= i <= 14 else ("nenhuma", 0)) for i in range(1, 18)}
for _i in (8, 9, 12): SFX[_i] = SFX[_i] + [("clique", 1, 0.12)]
B.salvar(cenas, SFX, AMB, {i: dur(i) for i in range(1, 18)}, proibido=('relógio', 'relogio'), ate=15)

# Abertura com pedido de voz próprio (08/11/2026): no primeiro pedido o "Você" saiu cortado ("Vê chegou", STT ouvia "Vestigou").
# O falante "abertura" (mesma voz, "estabilidade" explícita só para separar o pedaço) faz da batida 1 um pedido à parte.
_r = json.load(open(sys.argv[1], encoding='utf-8'))
_r['vozes'] = {'abertura': {'estabilidade': 0.5}}
_r['batidas'][0]['falante'] = 'abertura'
json.dump(_r, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
