import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/cadeado/roteiro.json (episódio 20, "como um cadeado sabe qual é a chave certa?") a partir de tasks/roteiro-cadeado.md (v3).
# Uso (da raiz): python3 tasks/geradores/cadeado.py episodios/cadeado/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/cadeado/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/cadeado.tsx (+ cad-pecas.tsx, cad-gente.tsx, cad-maos.ts). Palcos: corpo x = 0 · cilindro x = 60 · rua x = 120 · vinheta x = 180.
# Posições de `gente` são RELATIVAS ao palco; as câmeras são absolutas (x0 do palco incluído). REGRA: "cadeado" só a partir da batida 15.
B = Base('roteiro-cadeado.md', 'cadeado', 20, 18)
W = B.W
# Com a voz gravada, W e dur usam o tempo real de cada palavra/batida (episode.json de ep20) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep20', 'episode.json')
_bt = []
def _fim_bt(i):  # a batida vai do início dela até o início da próxima (a última, até o cartão final)
    return _bt[i]['start'] if i < len(_bt) else _END
_END = 0
if os.path.exists(_EPJ):
    _j0 = json.load(open(_EPJ, encoding='utf-8')); _END = _j0.get('endcardStart', 0)
    _bt = json.load(open(_EPJ, encoding='utf-8')).get('beats', [])
    if len(_bt) == 18 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0 and all(len(B.palavras_de(i)) == len(_bt[i - 1]['words']) for i in range(1, 19)):
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
def r3(x): return round(x, 3)
def EM(i, frac):
    """(trecho, em) para um som cair na fração `frac` da batida i: trecho = último que já começou, em = segundos depois do início dele"""
    if not _bt: return 1, 0.0
    b = _bt[i - 1]; t = b['start'] + frac * dur(i)
    k = max(j for j, st in enumerate(b['segmentStarts']) if st <= t + 1e-6)
    return k, round(t - b['segmentStarts'][k], 3)
def ps(i, pat, d=0.0, fim=False): return r3(min(0.995, max(0.0, W(i, pat, fim) + d)))
def ZA(x=-1.1, z=1.2, rot=0.35, **k): return G(x=x, z=z, rot=rot, **k)
def ZB(x=1.5, z=1.2, rot=-0.35, **k): return G(x=x, z=z, rot=rot, **k)
def CA(cx=-0.3, ty=1.9, D=7.2, D1=6.4, x0=-1.8, x1=-1.2): return cam(T(cx, ty - 0.3, D, 50, 0.1, x0=x0), T(cx, ty - 0.3, D1, 50, 0.1, x0=x1))
def CB(D=8.8, D1=8.4, ty=3.2): return cam(T(59.7, ty, D, 50, 0.08, x0=59.7), T(59.7, ty, D1, 50, 0.08, x0=59.7))
def CR(cx0, ty0, D0, x00, cx1, ty1, D1, x01, el=0.05): return cam(T(120 + cx0, ty0, D0, 50, el, x0=120 + x00), T(120 + cx1, ty1, D1, 50, el, x0=120 + x01))
COMP = dict(suporte=1, hasteVis=1, trinco=1, corpoVis=1, cilVis=1)
PINOS = dict(palco="cilindro", pinosVis=1, molas=1)
EXT = {"ombroD.x": -1.2, "cotoveloD.x": -0.2, "maos": 0.5}
CORDA_MAO = {"ombroD.x": -0.85, "ombroD.z": -0.2, "cotoveloD.x": -1.25, "maos": 0.4, "cabeca.x": 0.12}
BOLSOS_A = {"ombroE.z": 0.3, "ombroD.z": -0.3, "ombroE.x": -0.3, "ombroD.x": -0.3, "cotoveloE.x": -0.95, "cotoveloD.x": -0.95, "maos": 1, "cabeca.x": 0.15}
BOLSOS_B = {"ombroE.z": 0.45, "ombroD.z": -0.45, "ombroE.x": -0.15, "ombroD.x": -0.45, "cotoveloE.x": -1.1, "cotoveloD.x": -0.8, "maos": 1, "cabeca.x": 0.1, "tronco.y": 0.12}
CHAVE_ALTA = {"ombroD.x": -1.5, "ombroD.z": -0.35, "cotoveloD.x": -0.7, "maos": 0.5, "dedo": 0}

cenas = {}
# 1: a bicicleta presa por uma CORDA no poste; o Zeca sai; o ladrão (Boneco3D de boné escuro) passa pela calçada, a corda se solta e ele sai pedalando; o Zeca volta e só acha o bilhete
v1 = ps(1, '^Voltou'); s1 = ps(1, '^sumiu'); b1 = ps(1, '^bilhete')
cenas[1] = M(palco="rua", transe=1,
  bx=KF((0, -0.15), (0.36, -0.15), (0.46, 0.9), (0.62, 7.6), (1, 7.6)),
  cortada=KF((0, 0), (0.339, 0), (0.34, 1), (1, 1)), snip=V(0, 1, 0.335, 0.4), monta=KF((0, 0), (0.35, 0), (0.38, 1), (1, 1)),
  amarra=KF((0, 1), (0.13, 1), (0.18, 0), (1, 0)), bilhete=V(0, 1, r3(b1 - 0.04), r3(b1 + 0.06)),
  camera=CR(-0.1, 1.2, 5.4, -0.8, 0.9, 1.2, 5.0, 0.9, 0.2),
  gente=[
    G(x=KF((0, 0.7), (0.16, 0.7), (0.34, -3.9), (0.5, -3.9), (0.68, 0.35), (1, 0.35)), z=KF((0, 0.75), (0.16, 0.75), (0.34, 0.95), (0.5, 0.95), (0.68, 0.9), (1, 0.9)),
      rot=KF((0, -0.3), (0.16, -0.3), (0.23, -1.35), (0.34, -1.35), (0.5, 1.35), (0.68, 1.35), (0.75, 0.15), (1, 0.15)), vel=2.1,
      acao=[(0.17, "em-pe", "sorriso"), (0.4, "andando", "sorriso"), (0.68, "andando", "sorriso"), (1, "em-pe", "surpreso")],
      pose=[(0.7, {}), (1, MAOS_CABECA)]),
    G(quem="ladrao", x=KF((0, -3.9), (0.3, -0.28), (0.36, -0.28), (0.46, 0.77), (0.62, 7.5), (1, 7.5)), y=KF((0, 0), (0.335, 0), (0.355, 0.8), (0.385, 0.46), (1, 0.46)),
      z=KF((0, -1.1), (0.14, -1.1), (0.27, 0.58), (0.34, 0.58), (0.385, 0.0), (1, 0.0)), rot=KF((0, 1.3), (0.3, 1.4), (0.4, 1.5708), (1, 1.5708)), vel=2.1,
      acao=[(0.34, "andando", "sorriso"), (1, "sentado", "sorriso")]),
  ])
# 2: algo que só você abra: a corda solta na mão; a bancada de oficina entra
cenas[2] = M(suporte=V(0, 1, 0.3, 0.6), cordaMao=1, camera=cam(T(-0.9, 1.7, 5.4, 50, 0.05, x0=-0.5), T(-0.9, 1.7, 4.9, 50, 0.05, x0=-0.8)),
  gente=[ZA(x=-0.9, z=1.6, rot=0.15, acao="em-pe", exp="pensativo", pose=CORDA_MAO)])
# 3: haste em U presa por um ferrolho: uma barra que desliza para dentro do furo da perna da haste (em corte), aparafusada na placa
h3 = ps(3, '^haste'); f3 = ps(3, '^ferrolho')
cenas[3] = M(suporte=V(0, 1, 0.0, 0.1), hasteVis=V(0, 1, r3(h3 - 0.03), r3(h3 + 0.12)), trinco=V(0, 1, r3(f3 - 0.03), r3(f3 + 0.14)), etiq=["haste@%s-%s" % (r3(h3 + 0.06), r3(f3)), "ferrolho@%s-0.99" % r3(f3 + 0.07)], etiqS=1.0,
  camera=CA(-0.4, 1.9, 6.8, 5.8, -1.8, -1.2), gente=[ZA(x=-1.3, z=1.8, rot=0.5, acao="explicando")])
# 4: qualquer um puxa o ferrolho (a mão grande) e a haste sobe
cenas[4] = M(suporte=1, hasteVis=1, trinco=1, mao=KF((0, 0), (0.2, 1), (0.74, 1), (0.9, 0)), trincoX=V(0, 1, 0.24, 0.52), abre=V(0, 1, 0.5, 0.78), camera=CA(-0.4, 1.9, 6.2, 5.6, -1.6, -1.0), gente=[ZA(x=-1.3, z=1.8, rot=0.5, exp="surpreso", pose=ESPANTO, acao="em-pe")])
# 5: o corpo fecha, o cilindro gira e o braço puxa o ferrolho; órbita curta
c5 = ps(5, '^cilindro'); g5 = ps(5, '^girando')
cenas[5] = M(my=0.5, bancada=0, suporte=1, hasteVis=1, trinco=1, corpoVis=V(0, 1, 0.05, 0.25), raiox=1, cilVis=V(0, 1, r3(c5 - 0.06), r3(c5 + 0.1)), placa=KF((0, 1), (0.28, 1), (0.36, 0), (1, 0)),
  giraX=KF((0, 0), (0.3, 0), (0.45, -0.8), (1, -0.8)), chaveNoCorpo=KF((0, 0), (r3(g5 - 0.3), 0), (r3(g5 - 0.05), 1), (1, 1)),
  gira=KF((0, 0), (g5, 0), (r3(g5 + 0.15), 1.0), (1, 1.0)), abre=KF((0, 0), (r3(g5 + 0.12), 0), (r3(g5 + 0.3), 1), (1, 1)),
  etiq=["cilindro@%s-0.99" % r3(c5)], etiqS=1.0, camera=cam(T(0.0, 2.1, 6.2, 50, -0.1, x0=-0.5), T(0.0, 1.9, 4.8, 50, -0.35, x0=0.3)), gente=[ZA(x=-1.0, z=1.9, rot=0.5, acao="explicando")])
# 6: qualquer chave gira o cilindro (até a do vizinho); pinos com molas atravessam a fresta e travam
c6 = ps(6, '^chave'); p6 = ps(6, '^pinos'); f6 = ps(6, '^fresta'); tr6 = ps(6, '^Trave'); vz6 = ps(6, '^vizinho')
cenas[6] = M(palco="cilindro", chaveTipo="lisa", kp="igual", corte=0, fresta=V(0, 1, r3(f6 - 0.05), r3(f6 + 0.08)), pinosVis=V(0, 1, r3(p6 - 0.04), r3(p6 + 0.12)), molas=V(0, 1, r3(p6 - 0.02), r3(p6 + 0.12)),
  chave=KF((0, 0), (0.18, 1), (r3(tr6 - 0.02), 1), (r3(tr6 + 0.1), 0), (1, 0)), gira=KF((0, 0), (0.26, 0), (0.36, 1.0), (0.44, 1.0), (0.54, 0), (1, 0)),
  etiq=["pinos@%s-%s" % (r3(p6 + 0.03), r3(f6)), "mola@%s-%s" % (r3(p6 + 0.06), r3(f6)), "fresta@%s-0.99" % r3(f6 + 0.03)], etiqS=1.0,
  camera=CB(9.0, 8.6), gente=[ZB(x=1.5, acao="explicando", exp="sorriso"),
    G(quem="vizinho", x=KF((0, -4.5), (r3(vz6 - 0.1), -4.5), (r3(vz6 + 0.04), -1.6), (1, -1.6)), z=1.2, rot=0.35, vel=1.2, acao=[(r3(vz6 + 0.04), "andando", "sorriso"), (1, "em-pe", "sorriso")], pose=[(r3(vz6 + 0.1), {}), (1, CHAVE_ALTA)])])
# 7: o pino inteiro ainda cruza a fresta; corta cada pino em dois
c7 = ps(7, '^dois')
cenas[7] = M(PINOS, kp="igual", fresta=1, corte=KF((0, 0), (r3(c7 - 0.02), 0), (r3(c7 + 0.08), 1), (1, 1)), empurra=KF((0, 0), (0.2, 0.3), (r3(c7 - 0.05), 0.3), (1, 0.3)), camera=CB(8.8, 8.4), gente=[ZB(exp="surpreso", pose=ESPANTO, acao="em-pe")])
# 8: a chave levanta os pinos de baixo até o corte ficar na fresta; o cilindro gira
l8 = ps(8, '^levanta'); g8 = ps(8, '^gira')
cenas[8] = M(PINOS, kp="igual", chaveTipo="certa", fresta=1, corte=1, chave=V(0, 1, r3(l8 - 0.02), r3(l8 + 0.22)), gira=KF((0, 0), (r3(g8 - 0.02), 0), (r3(g8 + 0.12), 1.2), (1, 1.2)),
  camera=cam(CB(9.0, 8.6)['de'], T(59.7, 3.2, 7.4, 50, 0.08, x0=59.7)), gente=[ZB(acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])
# 9: pinos iguais e chave lisa servem; tamanhos diferentes: só a chave certa
d9 = ps(9, '^Faça')
cenas[9] = M(PINOS, kp="dif", kp0="igual", muda=d9, chaveTipo="certa", tipo0="lisa", fresta=1, corte=1, chave=KF((0, 0), (0.15, 1), (r3(d9 - 0.02), 1), (r3(d9 + 0.02), 0.2), (r3(d9 + 0.18), 1), (1, 1)),
  gira=KF((0, 0), (0.25, 1.2), (r3(d9 - 0.04), 1.2), (r3(d9 + 0.02), 0), (0.9, 1.2), (1, 1.2)), etiq=["chave@%s-0.99" % r3(d9 + 0.1)], etiqS=1.0, camera=CB(8.8, 8.4), gente=[ZB(acao="pensando", exp="surpreso", pose=MAO_QUEIXO)])
# 10: um pino só, muita chave serve; cinco ou seis pinos, quase nenhuma serve na sua
c10 = ps(10, '^cinco')
cenas[10] = M(PINOS, kp="dif", chaveTipo="certa", fresta=1, corte=1, npin=KF((0, 1), (r3(c10 - 0.02), 1), (r3(c10 + 0.05), 5), (1, 5)), fila=KF((0, 0), (0.1, 1), (r3(c10 - 0.02), 1), (r3(c10 + 0.05), 0), (r3(c10 + 0.2), 1), (1, 1)), camera=CB(11.5, 11.0, 3.4), gente=[ZB(acao="explicando", exp="sorriso")])
# 11: o ladrão (Boneco3D de boné escuro) golpeia o corpo com o martelão; o corpo vira aço e o martelão faz barulho e só. A maquete está no chão, sem a bancada
a11 = ps(11, '^aço'); f11 = ps(11, '^força')
T11 = r3(max(0.1, f11 - 0.776 / dur(11)))  # 1º golpe (0,776 s depois do início do ciclo) cai na palavra "força"; depois um a cada 1,35 s
cenas[11] = M(COMP, my=-0.9, bancada=0, raiox=0.3, aco=V(0, 1, a11, r3(a11 + 0.08)), ferr="martelo", lin=V(0, 1, 0.02, T11), lrot=0.85, dist=1.08, hx=-0.55, golpe=KF((0, 0), (r3(T11 - 0.01), 0), (T11, 1), (1, 1)), golpeT0=T11,
  etiq=["aco@%s-0.99" % r3(a11 + 0.03)], etiqS=1.0, lg=dict(acao=[(r3(f11 + 0.1), "em-pe", "sorriso"), (1, "em-pe", "surpreso")]),
  camera=cam(T(-0.8, 1.4, 5.4, 50, 0.08, x0=-1.3), T(-0.8, 1.4, 5.0, 50, 0.08, x0=-1.0)))
# 12: o corta-vergalhão (hastes cruzadas, pivô) corta a haste fina; a haste grossa e temperada (fogo e água) não cede
a12 = ps(12, '^alicate'); t12 = ps(12, '^temperado'); fg12 = ps(12, '^fogo'); fr12 = ps(12, '^fria'); du12 = ps(12, '^duro')
cenas[12] = M(COMP, my=-0.9, bancada=0, raiox=0.3, aco=1, ferr="alicate", lin=V(0, 1, 0.01, r3(a12 - 0.05)), lrot=0.85, dist=1.5, ay=2.22,
  apr=KF((0, 0.8), (r3(a12 - 0.05), 0.8), (r3(a12 + 0.06), 0.0), (r3(t12 - 0.02), 0.0), (r3(t12 + 0.03), 0.8), (r3(du12 + 0.0), 0.8), (r3(du12 + 0.1), 0.0), (1, 0.0)),
  base=KF((0, 0.22), (r3(t12 - 0.01), 0.22), (r3(t12 + 0.01), 0.445), (1, 0.445)),
  ali=KF((0, 0.4), (r3(a12 + 0.06), 0.4), (r3(a12 + 0.14), 0.03), (r3(a12 + 0.24), 0.03), (r3(t12 - 0.01), 0.45), (r3(du12 + 0.1), 0.5), (r3(du12 + 0.16), 0.44), (1, 0.5)),
  corte=KF((0, 0), (r3(a12 + 0.13), 0), (r3(a12 + 0.24), 1), (1, 1)), hfVis=KF((0, 1), (r3(t12 - 0.02), 1), (r3(t12 + 0.02), 0), (1, 0)),
  hasteGrossa=V(0, 1, r3(t12 - 0.02), r3(t12 + 0.05)), quente=KF((0, 0), (r3(fg12 - 0.02), 0), (r3(fg12 + 0.04), 1), (r3(fr12 - 0.01), 1), (r3(fr12 + 0.08), 0), (1, 0)),
  treme=KF((0, 0), (r3(du12 + 0.1), 0), (r3(du12 + 0.14), 1), (1, 1)), batida=KF((0, 0), (r3(du12 + 0.1), 0), (r3(du12 + 0.11), 1), (1, 1)),
  etiq=["temperado@%s-0.99" % r3(t12 + 0.05)], etiqS=1.0, lg=dict(acao=[(r3(a12 + 0.24), "em-pe", "sorriso"), (r3(du12 + 0.1), "em-pe", "surpreso"), (1, "em-pe", "tenso")]),
  camera=cam(T(-0.8, 1.5, 5.4, 50, 0.08, x0=-1.3), T(-0.7, 1.5, 4.8, 50, 0.08, x0=-0.9)))
# 13: o protetor do corpo cobre a haste; a boca do corta-vergalhão não encontra onde morder
p13 = ps(13, '^protetor'); co13 = ps(13, '^morder')
cenas[13] = M(COMP, my=-0.9, bancada=0, raiox=0.3, aco=1, hasteGrossa=1, ferr="alicate", lin=1, lrot=0.85, dist=1.5, ay=2.3, protetor=V(0, 1, r3(p13 - 0.02), r3(p13 + 0.12)), base=0.56,
  apr=KF((0, 0.5), (0.1, 0.0), (0.2, 0.5), (0.3, 0.0), (0.4, 0.5), (r3(p13 + 0.1), 0.5), (r3(p13 + 0.2), 0.0), (1, 0.0)), ali=KF((0, 0.5), (0.2, 0.5), (0.3, 0.46), (0.45, 0.5), (1, 0.5)), treme=KF((0, 0), (r3(p13 + 0.2), 0), (r3(p13 + 0.25), 0.7), (1, 0.7)),
  batida=KF((0, 0), (r3(p13 + 0.2), 0), (r3(p13 + 0.21), 1), (1, 1)), lg=dict(acao=[(r3(p13 + 0.2), "em-pe", "surpreso"), (1, "em-pe", "cansado")]),
  etiq=["protetor@%s-0.99" % r3(p13 + 0.04)], etiqS=1.0, camera=cam(T(-0.5, 1.6, 6.2, 50, 0.08, x0=-1.8), T(-0.5, 1.6, 5.4, 50, 0.08, x0=-1.0)), gente=[ZA(x=1.2, z=1.4, rot=-0.4, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)])
# 14: pinos com formatos diferentes (cintura e serrilhado) entram nas câmaras, enroscam e travam
f14 = ps(14, '^formatos')
cenas[14] = M(PINOS, kp="dif", chaveTipo="errada", fresta=1, corte=1, formato=V(0, 1, r3(f14 - 0.03), r3(f14 + 0.2)), chave=V(0, 1, 0.5, 0.8), etiq=["formatos@%s-0.99" % r3(f14 + 0.05)], etiqS=1.0, camera=CB(8.8, 8.4), gente=[ZB(acao="explicando", exp="sorriso")])
# 15: o conjunto completo, na bancada; vista aérea que se afasta
cenas[15] = M(COMP, raiox=0.45, aco=1, hasteGrossa=1, protetor=1, my=0.45, placa=0, giraX=KF((0, -0.5), (1, 0)), chaveNoCorpo=V(0, 1, 0.0, 0.25),
  camera=cam(T(0.0, 2.1, 5.0, 50, -0.3, x0=-0.2), T(0.0, 2.0, 9.4, 50, 0.1, x0=-0.2)), gente=[ZA(x=-1.3, z=1.8, rot=0.5, acao="comemorando", exp="sorriso", pose=BRACOS_CIMA)], c=[rot("CADEADO", 0, 40, 84)])
# 16: tranca egípcia (4 mil anos) e a chave achatada de 1861
y16 = ps(16, '^1861')
cenas[16] = M(palco="vinheta", vinheta=0, chave1861=V(0, 1, r3(y16 - 0.04), r3(y16 + 0.08)), camera=cam(T(180.0, 2.4, 8.4, 50, 0.04), T(180.0, 2.4, 7.6, 50, 0.04)), gente=[G(x=1.15, z=1.8, rot=-0.3, acao="explicando", exp="sorriso")], c=[rot("4 MIL ANOS", 0, 40, 64), rot("1861", 2, 130, 90)])
# 17: cadeado romano de bronze ao lado do moderno
cenas[17] = M(palco="vinheta", vinheta=1, camera=cam(T(180.0, 2.0, 8.0, 50, 0.04), T(180.0, 2.0, 7.2, 50, 0.04)), gente=[G(x=1.15, z=1.8, rot=-0.3, acao="explicando", exp="sorriso")], c=[rot("ROMA", 0, 40, 84)])
# 18: gancho: a bicicleta presa por corrente e cadeado no entardecer, o Zeca procura a chave; chamadas
cenas[18] = M(palco="rua", transe=1, bx=-0.15, corda=0, corrente=V(0, 1, 0.0, 0.2), entardecer=V(0.6, 1, 0.0, 0.6), interroga=V(0, 1, 0.5, 0.65),
  camera=CR(0.3, 1.3, 6.6, -0.9, 0.7, 1.3, 6.0, 0.2, 0.2),
  gente=[G(x=-0.1, z=1.5, rot=0.45, acao=[(0.3, "em-pe", "sorriso"), (1, "em-pe", "surpreso")], pose=[(0.3, BOLSOS_A), (0.5, BOLSOS_B), (0.7, BOLSOS_A), (1, BOLSOS_B)])],
  c=[chamada("curtir", "CURTA", None, 0), chamada("compartilhar", "COMPARTILHE", "pra quem perde toda chave", 1), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 2)])

SFX = {1: [("whoosh", 0, 0.35), ("passos_rapidos", 1, 0.3)], 2: [("pop", 0, 0.35), ("clique", 1, 0.3)], 3: [("pop", 0, 0.35), ("metal", 1, 0.4), ("clique", 2, 0.4)], 4: [("pop", 0, 0.35), ("clique", 1, 0.4)],
  5: [("metal", 0, 0.4), ("clique", 1, 0.45), ("pop", 2, 0.35)], 6: [("pop", 0, 0.35), ("clique", 1, 0.4), ("metal", 2, 0.4)], 7: [("pop", 0, 0.35), ("clique", 1, 0.4)], 8: [("clique", 0, 0.4), ("metal", 1, 0.4), ("ding", 3, 0.45)],
  9: [("clique", 0, 0.4), ("pop", 1, 0.35), ("ding", 3, 0.4)], 10: [("pop", 0, 0.35), ("clique", 1, 0.4), ("ding", 3, 0.4)], 11: [("impacto", 1, 0.5), ("metal", 2, 0.5), ("estalo", 3, 0.4)], 12: [("metal", 1, 0.45), ("estalo", 2, 0.4), ("ding", 4, 0.4)],
  13: [("pop", 0, 0.35), ("metal", 1, 0.4), ("jingle", 2, 0.4)], 14: [("pop", 0, 0.35), ("clique", 1, 0.4)], 15: [("jingle", 0, 0.5), ("pop", 1, 0.4)], 16: [("pop", 0, 0.4), ("ding", 1, 0.4)], 17: [("pop", 0, 0.4), ("ding", 1, 0.4)],
  18: [("pop", 0, 0.5), ("pop", 1, 0.5), ("ding", 2, 0.6)]}
# sincronia fina (com a voz real): sons que caem num instante da imagem, em fração da batida
def SF(som, i, frac, vol): k, e = EM(i, frac); return (som, k, vol, e)
_h1 = T11 + 0.776 / dur(11); _dh = 1.35 / dur(11)
SFX[3] = [("pop", 0, 0.35), SF("metal", 3, f3 + 0.04, 0.4), SF("clique", 3, f3 + 0.12, 0.4)]
SFX[4] = [("pop", 0, 0.35), SF("clique", 4, 0.5, 0.4)]
SFX[5] = [("metal", 0, 0.4), SF("clique", 5, g5 + 0.1, 0.45), SF("clique", 5, g5 + 0.28, 0.4), ("pop", 2, 0.35)]
SFX[8] = [SF("clique", 8, l8 + 0.08, 0.4), SF("metal", 8, l8 + 0.18, 0.4), SF("ding", 8, g8 + 0.1, 0.45)]
SFX[11] = [("passos_rapidos", 0, 0.25), SF("impacto", 11, _h1, 0.55), SF("estalo", 11, _h1, 0.3), SF("impacto", 11, _h1 + _dh, 0.5), SF("impacto", 11, _h1 + 2 * _dh, 0.45), SF("metal", 11, _h1 + 3 * _dh, 0.4)]
SFX[12] = [SF("metal", 12, a12 + 0.1, 0.4), SF("estalo", 12, a12 + 0.14, 0.5), SF("ding", 12, t12 + 0.02, 0.35), SF("metal", 12, du12 + 0.11, 0.5)]
SFX[13] = [("pop", 0, 0.35), SF("metal", 13, p13 + 0.21, 0.5), SF("jingle", 13, 0.9, 0.4)]
AMB = {i: ("nenhuma", 0) for i in range(1, 19)}

# continuidade do Zeca entre batidas (pose suave); a posição só desliza dentro do mesmo palco (outro palco = corte de cena)
durs = [dur(i) for i in range(1, 19)]
suavizar([dict(gente=cenas[i].get('gente'), cenario=cenas[i].get('palco', 'corpo') + str(cenas[i].get('my', 0))) for i in range(1, 19)], durs)
B.salvar(cenas, SFX, AMB, {i: durs[i - 1] for i in range(1, 19)}, proibido=('cadeado',), ate=15, suave=False)
