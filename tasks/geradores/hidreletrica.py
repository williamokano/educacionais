import sys, os, math, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/hidreletrica/roteiro.json (episódio 18, "como a água de um rio acende a luz da sua casa?", v2 de 17 batidas) a partir de tasks/roteiro-hidreletrica.md.
# Uso (da raiz): python3 tasks/geradores/hidreletrica.py episodios/hidreletrica/roteiro.json ; depois: cd motor && python3 pipeline/narrar.py ../episodios/hidreletrica/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/usina.tsx (+ usina2.tsx: sala, bicicleta, grade, chaminé, escada, transformador). Mundo do palco "rio": o rio corre para +x; a sala fica na margem (x -5,6..-1,4; z 3,2..7,4).
# REGRA: "usina/hidrelétrica" só a partir da batida 14 (fala, rótulo, cartão).
B = Base('roteiro-hidreletrica.md', 'usina', 18, 17)
W = B.W

def orb(alvo, az, d, el=10, fov=50, up=0.0):
    a, e = math.radians(az), math.radians(el)
    al = [alvo[0], alvo[1] - up, alvo[2]]
    return pt([al[0] + d * math.sin(a) * math.cos(e), al[1] + d * math.sin(e), al[2] + d * math.cos(a) * math.cos(e)], al, fov)
R = lambda x: round(x, 3)
BRACOS_CIMA = {"ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, "maos": 1}
ESPANTO = {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 1}
MAO_QUEIXO = {"ombroD.x": -0.95, "ombroD.z": 0.4, "cotoveloD.x": -2.35, "cotoveloD.z": 0.15, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "maos": 0.4}
OLHA_CIMA = {"cabeca.x": -0.45, "ombroE.z": 0.12, "ombroD.z": -0.12}
APONTA_D = {"ombroD.x": -1.2, "ombroD.z": -0.5, "cotoveloD.x": -0.1, "dedo": 1, "ombroE.z": 0.12, "cotoveloE.x": -0.18}
COCA = {"ombroD.z": -2.25, "ombroD.x": -0.35, "cotoveloD.x": -1.9, "cotoveloD.z": -0.9, "cabeca.z": 0.12}
def Z(x, z, rot=0.5, acao="em-pe", exp="sorriso", **k): return G(x=x, z=z, rot=rot, acao=acao, exp=exp, **k)

# camadas (cada peça só entra quando a fala a introduz)
LAMP_RODA = dict(lampVis=1, lampX=0.55, lampZ=1.7, lampAlt=1.1)
PE = dict(barragem=1, turbX=2.0, turbY=0.7, turbVis=1, helice=1, plinto=0, comporta=-1, comportaY=3.0, comportaX=0.58, tuboForcado=1, aguaTubo=1, raiox=1, lago=3.3, lampModo="poste", lampVis=1)
VIVA = dict(giro=9, luz=1.2, fio=1, corrente=1, fluxoTurb=1, vazao=1.4, vazaoJus=1.4, saidaAgua=1)
CASA = dict(casa=1)

cenas = {}
# 1: sala; TV com o pênalti; a luz acaba; a câmera dá um dolly-in e voa pela janela até o rio
a1 = W(1, '^acaba')
tv1 = KF((0, 1), (R(a1 - 0.01), 1), (R(a1 + 0.012), 0), (1, 0))
cenas[1] = M(sala=True, tv=tv1, luzSala=tv1, vazao=1.8, folhas=1,
  camera=cam(pt([-3.0, 1.7, 10.8], [-4.0, 1.4, 3.2], 50), pt([-2.65, 1.55, 1.9], [-1.0, -0.1, -4.5], 50)),
  gente=[Z(-4.3, 6.0, 0.15, "comemorando", "sorriso", pose=[(R(a1), BRACOS_CIMA), (1, ESPANTO)]),
         Z(-3.6, 5.2, -0.15, "comemorando", "sorriso", quem="tio", esc=1.0, pose=[(R(a1), BRACOS_CIMA), (1, ESPANTO)]),
         Z(-4.6, 4.5, 0.25, "comemorando", "sorriso", quem="mae", esc=1.0, pose=[(R(a1), BRACOS_CIMA), (1, ESPANTO)]),
         Z(-3.7, 6.6, -0.25, "comemorando", "sorriso", quem="menino", esc=1.0, pose=[(R(a1), BRACOS_CIMA), (1, ESPANTO)])])
# 2: a bicicleta ligada à lâmpada; o tio pedala, cansa e desaba no guidão; a luz apaga
c2 = W(2, '^cansa'); p2 = W(2, '^apaga')
cenas[2] = M(LAMP_RODA, lampX=2.6, lampZ=2.9, lampAlt=1.25, bike=1, bikeX=0.5, bikeZ=3.4, bikeVel=KF((0, 6), (R(c2), 6), (R(c2 + 0.05), 0), (1, 0)),
  luz=KF((0, 1.0), (R(p2 - 0.03), 1.0), (R(p2 + 0.04), 0.0), (1, 0.0)), pisca=V(0, 1, R(c2), R(p2)), vazao=1.5,
  camera=cam(orb([0.9, 1.1, 3.2], 22, 9.5, 9), orb([0.9, 1.1, 3.2], 14, 8.6, 9)),
  gente=[Z(0.28, 3.4, math.pi / 2, "sentado", "cansado", quem="tio", esc=1.0, y=0.22, pedala=V(1, 0, R(c2), R(c2 + 0.05)),
           pose=[(R(c2), {}), (1, {"tronco.x": 0.95, "cabeca.x": 0.55, "ombroE.x": -1.3, "ombroD.x": -1.3})]),
         Z(-0.9, 4.0, 0.6, "explicando", "sorriso")])
# 3: a roda na água gira; a lâmpada continua apagada
r3 = W(3, '^roda')
cenas[3] = M(LAMP_RODA, luz=0, fio=1, vazao=1.6, rodaVis=V(0, 1, R(r3 - 0.02), R(r3 + 0.08)), rodaY=V(2.4, 0, R(r3 - 0.02), R(r3 + 0.1)), giro=KF((0, 0), (R(r3), 0), (R(r3 + 0.14), 0.9), (1, 0.9)),
  etiq=["roda@%s-0.95" % R(r3 + 0.03)], etiqS=1.0,
  camera=cam(orb([-0.9, 1.0, 1.6], 26, 10.5, 10), orb([-0.9, 1.0, 1.6], 20, 9.0, 10)),
  gente=[Z(-2.0, 3.3, 0.6, [(R(W(3, '^apagada')), "em-pe"), (1, "cocando-cabeca")], "sorriso")])
# 4: ímã no eixo e fio em volta (lupa); a lâmpada acende
i4 = W(4, '^ímãs'); f4 = W(4, '^fio'); e4 = W(4, '^eletricidade'); g4 = W(4, '^gerador'); l4 = W(4, '^acendeu')
cenas[4] = M(LAMP_RODA, vazao=1.6, rodaVis=1, giro=0.9, geradorVis=V(0, 1, R(i4 - 0.06), R(i4 + 0.05)), lupa=V(0, 1, R(i4 - 0.04), R(i4 + 0.1)), lupaX=-0.62, lupaY=2.5, lupaR=0.4,
  fio=1, corrente=V(0, 1, R(e4 - 0.03), R(e4 + 0.08)), luz=V(0, 1.0, R(l4 - 0.04), R(l4 + 0.05)),
  etiq=["ima@%s-0.99" % R(i4 + 0.02), "bobina@%s-0.99" % R(f4 + 0.02), "gerador@%s-0.99" % R(g4)], etiqS=1.0,
  camera=cam(orb([-0.9, 1.5, 1.6], 20, 10.5, 6), orb([-0.9, 1.6, 1.6], 14, 9.5, 6)),
  gente=[Z(-2.1, 3.4, 0.5, [(R(g4), "explicando"), (1, "comemorando")], "sorriso", pose=[(R(g4), {}), (1, BRACOS_CIMA)])])
# 5: a seca: o rio vira um fiozinho; a roda quase para; a lâmpada pisca fraca
cenas[5] = M(LAMP_RODA, rodaVis=1, geradorVis=1, fio=1, corrente=V(1, 0.15, 0.3, 0.9), nivelRio=V(1, 0.06, R(W(5, '^seca') - 0.08), R(W(5, '^fiozinho') + 0.1)), vazao=V(1.6, 0.2, 0.3, 0.9), folhas=V(1, 0, 0.2, 0.8),
  giro=V(5.0, 0.4, 0.3, 0.9), luz=KF((0, 1.0), (R(W(5, '^seca') - 0.05), 1.0), (R(W(5, '^fiozinho') + 0.1), 0.25), (1, 0.2)), pisca=V(0, 1, R(W(5, '^lâmpada') - 0.05), 1.0),
  camera=cam(orb([-0.9, 0.9, 1.4], 24, 10.5, 10), orb([-0.9, 0.9, 1.4], 18, 9.8, 10)),
  gente=[Z(-2.1, 3.4, 0.5, "em-pe", "preocupado", pose=MAO_QUEIXO)])
# 6: a barragem fecha o rio; o lago se junta atrás; setas mostram a diferença de altura (câmera aérea que abre)
b6 = W(6, '^barragem'); l6 = W(6, '^lago'); h6 = W(6, '^alta')
cenas[6] = M(vazao=1.5, rodaVis=V(1, 0, 0.0, 0.1), lampVis=0, barragem=V(0, 1, R(b6 + 0.02), R(l6 + 0.0)), lago=KF((0, -0.5), (R(l6), -0.5), (R(h6 + 0.05), 3.3), (1, 3.3)),
  vazaoJus=V(1.4, 0.3, R(l6), 0.95), alturaSetas=V(0, 1, R(h6 - 0.05), R(h6 + 0.08)), etiq=["barragem@%s-0.99" % R(b6 + 0.1)], etiqS=1.0, etiqK=0.85,
  camera=cam(pt([0.0, 10.5, 14.0], [1.0, 0.8, 0.0], 50), pt([3.4, 5.0, 11.5], [1.2, 1.6, 0.0], 50)),
  gente=[Z(-0.5, 3.0, 0.45, "explicando", "sorriso")])
# 7: o cano grosso desce a ladeira até a turbina (raio-X); a água acelera; a lâmpada fica forte
c7 = W(7, '^cano'); t7 = W(7, '^turbina'); e7 = W(7, '^empurra')
cenas[7] = M(PE, tuboForcado=V(0, 1, R(c7), R(t7 - 0.02)), aguaTubo=V(0, 1, R(c7 + 0.05), R(t7 + 0.05)), turbVis=V(0, 1, R(t7 - 0.02), R(t7 + 0.08)), helice=V(0, 1, R(t7), R(t7 + 0.1)), fluxoTurb=V(0, 1, R(t7 + 0.05), R(t7 + 0.2)),
  saidaAgua=V(0, 1, R(t7 + 0.1), R(t7 + 0.25)), giro=KF((0, 0), (R(t7), 0), (R(e7), 3.0), (1, 11)), fio=V(0, 1, R(t7 + 0.1), R(t7 + 0.2)), corrente=V(0, 1, R(t7 + 0.15), R(t7 + 0.3)), luz=V(0, 1.6, R(e7 - 0.1), 0.98), vazaoJus=0.5,
  etiq=["turbina@%s-0.99" % R(t7 + 0.04)], etiqS=1.0,
  camera=cam(orb([0.8, 2.2, 0.4], 18, 11.5, 12), orb([3.0, 1.5, 0.4], 18, 12.0, 12)),
  gente=[Z(1.2, 3.2, 0.5, [(R(e7), "explicando"), (1, "comemorando")], "sorriso", pose=[(R(e7), {}), (1, BRACOS_CIMA)])])
# 8: a água sai o tempo todo; a comporta desce na entrada e fecha o jato; sobe e o jato volta
o8 = W(8, '^comporta'); a8 = W(8, '^abre'); f8 = W(8, '^fecha')
cp8 = KF((0, -1), (R(o8 - 0.04), -1), (R(o8 + 0.04), 1), (R(a8 + 0.03), 1), (R(f8 - 0.0), 0), (R(f8 + 0.11), 0), (R(f8 + 0.16), 1), (1, 1))
cenas[8] = M(PE, VIVA, comporta=cp8, fluxoComporta=cp8, fluxoTurb=KF((0, 1), (R(a8 + 0.08), 1), (R(f8 + 0.04), 0), (R(f8 + 0.14), 0.0), (R(f8 + 0.2), 1), (1, 1)),
  saidaAgua=KF((0, 1), (R(f8 + 0.04), 1), (R(f8 + 0.1), 0), (R(f8 + 0.15), 0), (R(f8 + 0.2), 1), (1, 1)), luz=KF((0, 1.4), (R(f8 + 0.03), 1.4), (R(f8 + 0.1), 0.1), (R(f8 + 0.15), 0.1), (R(f8 + 0.22), 1.4), (1, 1.4)), giro=KF((0, 10), (R(f8 + 0.03), 10), (R(f8 + 0.1), 0.5), (R(f8 + 0.15), 0.5), (R(f8 + 0.22), 10), (1, 10)),
  etiq=["comporta@%s-0.99" % R(o8 + 0.02)], etiqS=1.0,
  camera=cam(orb([1.9, 2.0, 0.4], 20, 12.5, 12), orb([2.2, 1.9, 0.4], 14, 11.8, 12)),
  gente=[Z(1.2, 3.2, 0.5, [(R(o8 - 0.05), "pensando"), (1, "explicando")], "sorriso")])
# 9: o lago traz galho, lixo e um peixe; a grade na entrada do cano
g9 = W(9, '^grade')
cenas[9] = M(PE, VIVA, comporta=1, comportaY=3.0, galhos=V(0, 1, 0.05, R(g9 + 0.05)), peixeGrade=V(0, 1, R(W(9, '^peixe') - 0.05), R(g9 + 0.02)), grade=V(0, 1, R(g9), R(g9 + 0.1)),
  etiq=["grade@%s-0.99" % R(g9 + 0.04)], etiqS=1.0,
  camera=cam(orb([-0.9, 3.0, 0.6], 36, 10.0, 18), orb([-0.7, 3.0, 0.6], 28, 8.4, 16)),
  gente=[Z(-0.6, 2.9, 0.5, "em-pe", "surpreso", pose=[(R(g9 - 0.1), ESPANTO), (1, {})])])
# 10: fechar a comporta rápido: uma onda vermelha corre pelo cano e bate; a chaminé amortece
f10 = W(10, '^fechar'); b10 = W(10, '^bate'); c10 = W(10, '^chaminé')
cp10 = KF((0, 1), (R(f10 - 0.02), 1), (R(f10 + 0.04), 0), (1, 0))
cenas[10] = M(PE, VIVA, grade=1, comporta=cp10, fluxoComporta=cp10, golpe=V(0, 1, R(b10 - 0.1), 0.98), chamine=V(0, 1, R(c10 - 0.02), R(c10 + 0.08)), saidaAgua=cp10, fluxoTurb=cp10,
  etiq=["chamine@%s-0.99" % R(c10 + 0.05)], etiqS=1.0, etiqK=0.9,
  camera=cam(orb([0.5, 2.6, 0.4], 24, 11.0, 12), orb([1.6, 1.7, 0.4], 20, 10.0, 12)),
  gente=[Z(0.8, 3.4, 0.5, "em-pe", "surpreso", pose=[(R(b10 + 0.1), ESPANTO), (1, {})])])
# 11: chuva demais: o lago sobe; o vertedouro (toboágua) leva a sobra
t11 = W(11, '^transborda'); v11 = W(11, '^vertedouro')
cenas[11] = M(PE, VIVA, grade=1, comporta=1, chamine=1, cidade=0, chuva=V(0, 1, 0.0, R(t11 + 0.05)), vazao=2.2, vazaoJus=1.8, lago=KF((0, 3.3), (R(t11 - 0.05), 3.3), (R(t11 + 0.1), 3.74), (R(v11 + 0.3), 3.55), (1, 3.5)),
  vert=V(0, 1, R(v11 - 0.02), R(v11 + 0.2)), vertAgua=V(0, 1, R(v11 + 0.12), R(v11 + 0.3)), divisor=V(0, 1, R(v11 + 0.2), R(v11 + 0.35)),
  etiq=["vert@%s-0.99" % R(v11 + 0.03)], etiqS=1.0,
  camera=cam(orb([1.6, 1.8, -0.5], 30, 10.5, 16), orb([2.0, 1.4, -0.5], 18, 9.0, 12)),
  gente=[Z(2.4, 3.2, 0.5, "explicando", "sorriso")])
# 12: o peixe tenta subir a parede; a escada de degraus de água; ele pula de degrau em degrau
e12 = W(12, '^escada')
cenas[12] = M(PE, VIVA, grade=1, comporta=1, chamine=1, vert=1, vertAgua=0.5, lago=3.5, escada=V(0, 1, R(e12 - 0.02), R(e12 + 0.1)), peixeTenta=V(1, 0, 0.0, R(e12 + 0.04)), peixeSobe=V(0, 1, R(e12 + 0.1), 0.98),
  etiq=["escada@%s-0.99" % R(e12 + 0.1)], etiqS=1.7,
  camera=cam(orb([0.2, 1.5, 2.2], 38, 10.8, 24), orb([0.1, 1.6, 2.2], 32, 10.4, 22)),
  gente=[Z(1.0, 5.9, 0.6, "em-pe", "sorriso")])
# 13: o transformador sobe a tensão; as linhas de alta tensão levam a luz até a cidade
t13 = W(13, '^transformador'); l13 = W(13, '^linhas')
cenas[13] = M(PE, VIVA, CASA, grade=1, comporta=1, chamine=1, vert=1, vertAgua=0.5, lago=3.5, escada=1, trafo=V(0, 1, R(t13 - 0.02), R(t13 + 0.08)), torres=V(0, 1, R(l13 - 0.05), R(l13 + 0.2)), cidade=V(0, 1, R(l13 + 0.2), 0.92),
  etiq=["trafo@%s-0.5" % R(t13 + 0.03), "linhas@%s-0.99" % R(l13 + 0.03)], etiqS=1.0,
  camera=cam(orb([4.5, 2.2, 1.0], 20, 11.0, 14), pt([8.4, 5.4, 9.0], [11.0, 2.2, -8.0], 54)),
  gente=[Z(3.6, 3.2, -0.2, "explicando", "sorriso")])
# 14: revelação: o conjunto completo em vista aérea; entra o nome
cenas[14] = M(PE, VIVA, CASA, grade=1, comporta=1, chamine=1, vert=1, vertAgua=0.6, lago=3.45, escada=1, trafo=1, torres=1, cidade=1, interroga=0,
  etiq=["comporta@0.12-0.4", "tubo@0.24-0.6", "turbina@0.36-0.82", "vert@0.54-0.97", "casa@0.66-0.97"], etiqS=1.0, etiqK=0.8, etiqYmax=0.62,
  camera=cam(orb([2.4, 1.8, 0.0], 24, 10.5, 10), pt([4.2, 8.6, 17.0], [3.4, 1.2, -1.0], 52)),
  gente=[Z(-2.0, 3.0, 0.45, "comemorando", "sorriso", pose=BRACOS_CIMA)], c=[rot("USINA HIDRELÉTRICA", 1, 40, 66)])
# 15: o Brasil, Itaipu e a sala com o jogo na TV: cada trecho mostra um palco
cenas[15] = M(segs=["mapa", "itaipu", "sala", "sala"], sala=True, tv=1, luzSala=1, luzesMapa=V(0.3, 1, 0.0, 0.25), barraAgua=V(0, 1, R(W(15, '^mais') - 0.02), R(W(15, '^água'))), itaipu=V(0, 20, 0.28, 0.6), vazao=1.2,
  camera=cam(pt([0.0, 17.0, 12.0], [0.0, 0.0, 2.2], 50), pt([3.6, 2.8, 9.0], [0.0, 1.0, 2.2], 50)),
  gente=[Z(-4.2, 5.8, 0.2, "comemorando", "sorriso", pose=BRACOS_CIMA), Z(-3.4, 5.3, -0.1, "comemorando", "sorriso", quem="tio", esc=1.0, pose=BRACOS_CIMA)], c=[rot("20 × 700 MW", 1, 40, 60)])
# 16: o Zeca na sala; pela janela passa um submarino; sobe uma interrogação-lâmpada
cenas[16] = M(sala=True, tv=1, luzSala=1, vazao=1.6, sub=V(0, 1, 0.12, 0.8), interroga=V(0, 1, R(W(16, '^afunda') - 0.05), R(W(16, '^afunda') + 0.15)), lampadaMarca=V(0, 1, R(W(16, '^Siga') - 0.05), R(W(16, '^Siga') + 0.1)), interrogaX=-4.0, interrogaY=2.7, interrogaZ=5.2,
  camera=cam(orb([-3.4, 1.4, 4.6], 18, 10.0, 8), orb([-3.4, 1.4, 4.6], 8, 9.2, 8)),
  gente=[Z(-3.9, 5.4, 0.25, "em-pe", "sorriso", pose=APONTA_D)])
# 17: o Zeca de frente em frente à usina; quatro chamadas
cenas[17] = M(PE, VIVA, CASA, grade=1, comporta=1, chamine=1, vert=1, lago=3.45, escada=1, trafo=1, torres=1, cidade=1, entardecer=0.7,
  camera=cam(pt([1.8, 3.3, 10.2], [1.8, 2.9, 3.0], 46), pt([1.8, 3.25, 9.7], [1.8, 2.9, 3.0], 46)),
  gente=[Z(1.8, 3.0, 0.0, "acenando", "sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "LUZ", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

SFX = {
1: [("agua", 0, 0.45), ("queda_energia", 2, 0.5), ("pop", 3, 0.35)],
2: [("whoosh", 0, 0.4), ("pop", 1, 0.4), ("pisca", 2, 0.5)],
3: [("agua", 0, 0.4), ("pop", 1, 0.4), ("estalo", 2, 0.35)],
4: [("clique", 0, 0.4), ("pop", 1, 0.35), ("ding", 2, 0.5), ("jingle", 3, 0.45)],
5: [("agua", 0, 0.3), ("pisca", 1, 0.4)],
6: [("pop", 0, 0.4), ("agua", 1, 0.4), ("whoosh", 2, 0.35)],
7: [("pop", 0, 0.4), ("whoosh", 1, 0.4), ("zumbido", 2, 0.4)],
8: [("agua", 0, 0.35), ("pop", 1, 0.4), ("clique", 2, 0.4), ("agua", 3, 0.35)],
9: [("pop", 0, 0.4), ("pop", 1, 0.4), ("clique", 2, 0.4)],
10: [("clique", 0, 0.45), ("impacto_seco", 1, 0.55), ("pop", 2, 0.4)],
11: [("chuva", 0, 0.3), ("pop", 1, 0.4), ("whoosh", 2, 0.4), ("agua", 3, 0.4)],
12: [("pop", 0, 0.4), ("pop", 1, 0.4), ("agua", 2, 0.35), ("ding", 3, 0.4)],
13: [("pop", 0, 0.4), ("zumbido", 1, 0.4), ("whoosh", 2, 0.4), ("ding", 3, 0.45)],
14: [("jingle", 0, 0.5)],
15: [("pop", 0, 0.4), ("ding", 1, 0.45), ("pop", 2, 0.4), ("jingle", 3, 0.4)],
16: [("pop", 0, 0.4), ("ding", 1, 0.45), ("pop", 2, 0.45)],
17: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.55)],
}
AMB = {i: ("nenhuma", 0) for i in range(1, 18)}
for i in (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14): AMB[i] = ("passaros", 0.05)
AMB[11] = ("chuva", 0.1)
B.salvar(cenas, SFX, AMB, {}, proibido=('usina', 'hidrelétrica', 'hidreletrica'), ate=14)
