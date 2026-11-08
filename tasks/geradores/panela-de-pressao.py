import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import *
# Gera episodios/panela-de-pressao/roteiro.json (episódio 13, v2: "como montar uma panela que cozinha feijão em minutos") a partir da tabela de cenas de tasks/roteiro-panela-de-pressao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/panela-de-pressao.py episodios/panela-de-pressao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/panela-de-pressao/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/panela.tsx (campos no topo). Panela na boca do fogão em x = -0,8 (centro ~ (-0,8; 1,03; -0,12)); teto em y = 2,5.
# REGRA: o nome "panela de pressão" só aparece a partir da batida 20 (fala, rótulo, cartão). NUNCA gore: o Zeca só leva susto ou fica sujo de feijão.
B = Base('roteiro-panela-de-pressao.md', 'panela', 13, 27)
W = B.W
# Com a voz gravada, W usa o tempo real de cada palavra (progresso dentro da batida) em vez da estimativa por posição.
_EPJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motor', 'public', 'demo-3d', 'ep13', 'episode.json')
if os.path.exists(_EPJ):
    _bt = json.load(open(_EPJ, encoding='utf-8')).get('beats', [])
    if len(_bt) == 27 and _bt[0].get('words') and _bt[0]['words'][0]['end'] - _bt[0]['words'][0]['start'] > 0:
        _est = B.W
        def W(i, pat, fim=False):
            ps, ws = B.palavras_de(i), _bt[i - 1]['words']
            if len(ps) != len(ws): return _est(i, pat, fim)
            b0, b1 = _bt[i - 1]['start'], _bt[i - 1]['end']
            for k, w in enumerate(ps):
                if re.search(pat, w, re.I): return round(((ws[k]['end'] if fim else ws[k]['start']) - b0) / (b1 - b0), 3)
            raise AssertionError((i, pat))
        def DURREAL(i): return round(_bt[i - 1]['end'] - _bt[i - 1]['start'], 3)


def O(c, D, az=-30, el=10, fov=50, sobe=0.07):
    """câmera em órbita: olha para c a D metros, `az` graus para o lado (negativo = pela esquerda), `el` graus de elevação; o assunto sobe na tela (acima da legenda)"""
    a, e = math.radians(az), math.radians(el)
    ty = c[1] - sobe * D
    return pt([c[0] + D * math.sin(a) * math.cos(e), ty + D * math.sin(e), c[2] + D * math.cos(a) * math.cos(e)], [c[0], ty, c[2]], fov)


PC = (-0.8, 1.05, -0.12)   # a panela
CW = (-0.62, 1.0, 0.0)     # panela + Zeca
TAMPA_NAS_MAOS = {"ombroE.x": -1.1, "ombroD.x": -1.1, "cotoveloE.x": -0.4, "cotoveloD.x": -0.4, "ombroE.z": -0.1, "ombroD.z": 0.1, "maos": 0.2, "tronco.x": 0.3}
AGACHA = {"ombroE.x": -2.5, "ombroD.x": -2.5, "cotoveloE.x": -1.3, "cotoveloD.x": -1.3, "tronco.x": 0.55, "cabeca.x": 0.3}
RECUA = {"ombroE.x": -1.7, "ombroD.x": -1.7, "cotoveloE.x": -0.6, "cotoveloD.x": -0.6, "tronco.x": -0.25, "maos": 0.9}


def Z(L=0.3, z=0.5, **k):
    """Zeca à frente da bancada; x e rot são calculados pela câmera de cada batida (ele fica ao lado do assunto, inteiro e voltado para a câmera)"""
    return G(zc=True, L=L, z=z, **k)


BASE = dict(vidro=True, janela=1, relogio=1, relogioV=0.04, gas=1.6)
FECHADA = M(BASE, tampa=1, borracha=1)
COM_FURO = M(FECHADA, peso=1, semPeso=True)
COM_PESO = M(FECHADA, peso=1, pesoUp=0)
COM_RES = M(COM_PESO, reserva=1)
TUDO = M(COM_RES, trava=1)

cenas = {}
cenas[1] = M(BASE, semTampa=True, gas=1.5, bolhas=0.5, quente=0.5, fumaca=0.4, relogioV=V(0.1, 1.6, 0.05, 0.5), relogioTxt=[[0, "8 H"], [round(W(1, '^Onze') - 0.02, 3), "11 H"]],
  camera=cam(O(CW, 3.2, -42, -5), O(CW, 2.7, -20, 6)), gente=[Z(acao="bracos-cruzados", exp="surpreso")])
cenas[2] = M(BASE, relogio=0, semTampa=True, gas=1.6, bolhas=1, quente=0.8, fumaca=0.6, termo=1, temp=V(60, 100, 0, 0.3), relogioTxt=[[0, "1 H"]],
  camera=cam(O((-0.95, 1.05, -0.1), 2.0, -32, 10), O((-0.95, 1.05, -0.1), 1.8, -22, 8)), c=[rot("100 °C", 1, 40, 100)])
cenas[3] = M(BASE, termo=1, temp=100, bolhas=1, quente=0.8, tampa=V(0, 1, 0.08, W(3, '^aperte')), fumaca=0.3,
  camera=cam(O(CW, 2.6, -38, 8), O(CW, 2.4, -22, 12)), gente=[Z(acao="explicando", exp="sorriso", pose=[(0.4, {}), (1, TAMPA_NAS_MAOS)])])
cenas[4] = M(BASE, tampa=1, bolhas=1, quente=0.8, vapor=1, treme=V(0.2, 0.7, 0.1, 0.6),
  camera=cam(O((-0.8, 1.1, -0.1), 1.8, 38, 14), O((-0.8, 1.1, -0.1), 1.55, 28, 20)))
cenas[5] = M(BASE, relogio=0, tampa=1, bolhas=1, quente=0.8, borracha=V(0, 1, 0.1, 0.4), vapor=V(1, 0, 0.35, 0.6),
  camera=cam(O((-0.8, 1.1, -0.1), 1.45, -30, 28), O((-0.8, 1.1, -0.1), 1.3, -38, 22)), c=[rot("BORRACHA", 0, 40, 100)])
cenas[6] = M(FECHADA, bolhas=0.6, quente=0.8, pressao=V(0, 1, 0.15, 0.4), pTampa=V(0, 1, 0.1, 0.35),
  camera=cam(O(PC, 2.6, 35, 12), O(PC, 2.4, 24, 14)), gente=[Z(acao="surpreso", exp="surpreso")])
cenas[7] = M(FECHADA, relogio=0, termo=1, temp=V(100, 120, 0.1, 0.85), bolhas=1, quente=V(0.8, 1, 0, 0.6), pressao=1, pTampa=1,
  camera=cam(O((-0.95, 1.1, -0.1), 1.7, -34, 12), O((-0.95, 1.1, -0.1), 1.5, -24, 10)), c=[rot("120 °C", 1, 40, 100)])
cenas[8] = M(FECHADA, termo=1, temp=120, bolhas=1, quente=1, pressao=1, pTampa=0.4, feijao=V(0, 1, 0.05, 0.6), relogioV=V(0.3, 3.0, 0, 0.8), gas=1.4,
  camera=cam(O(CW, 3.9, -36, 6, sobe=0.1), O(CW, 3.5, -16, 12, sobe=0.1)), gente=[Z(acao="comemorando", exp="sorriso")])
v9 = round(W(9, '^explode') + 0.02, 3)
cenas[9] = M(FECHADA, termo=0, bolhas=1, quente=1, feijao=1, pressao=1, pTampa=1, estufa=V(0, 1, 0.08, v9), treme=V(0.2, 1, 0.1, v9), vapor=V(0, 0.8, 0.5, v9),
  boomP=v9,
  camera=cam(O((-0.8, 1.45, -0.12), 2.8, -32, -8, sobe=0.09), O((-0.8, 1.55, -0.12), 2.6, -20, -4, sobe=0.09)), gente=[Z(L=1.0, z=0.9, acao="surpreso", exp="surpreso", pose=[(0.4, {}), (1, AGACHA)])])
cenas[10] = M(BASE, tampa=1, feijao=1, bolhas=1, quente=1, boomP=0, boomOff=round((1 - v9) * (DURREAL(9) if 'DURREAL' in globals() else 6.5), 3),
  camera=cam(O((-0.7, 1.4, 0.0), 3.3, -25, 0, sobe=0.04), O((-0.7, 1.35, 0.0), 3.0, 18, 4, sobe=0.04)), gente=[Z(acao="surpreso", exp="surpreso", pose=AGACHA, coberto=V(0, 1, 0.3, 0.85))])
cenas[11] = M(COM_FURO, peso=V(0, 1, 0.08, 0.3), tampa=1, bolhas=1, quente=1, chia=V(0, 1, 0.3, 0.6), fumaca=0.3, relogio=1,
  camera=cam(O((-0.76, 1.22, -0.1), 1.2, 34, 32), O((-0.76, 1.22, -0.1), 1.0, 22, 36)))
cenas[12] = M(COM_FURO, bolhas=0.5, quente=0.8, chia=1, pTampa=V(1, 0, 0.05, 0.4), pressao=V(1, 0, 0.05, 0.4), relogioV=V(0.1, 1.8, 0.4, 1.0), gas=1.6,
  camera=cam(O(CW, 2.6, -32, 8), O(CW, 2.4, -22, 10)), gente=[Z(acao="bracos-cruzados", exp="surpreso")])
VC = (-0.48, 1.3, 0.0)
cenas[13] = M(COM_PESO, peso=V(0, 1, 0.0, 0.2), pesoUp=0, bolhas=0.8, quente=1, pressao=0.4, valvula=V(0, 1, 0.2, 0.5), valvUp=0, relogio=0,
  camera=cam(O(VC, 2.6, -36, 10), O(VC, 2.3, -26, 8)), c=[rot("VÁLVULA", 1, 40, 100)])
cenas[14] = M(COM_PESO, bolhas=1, quente=1, pressao=1, valvula=1, valvUp=[[0, 0], [0.5, 0], [0.85, 1], [1, 1]], pesoUp=[[0, 0], [0.5, 0], [0.85, 1], [1, 1]], relogio=0,
  camera=cam(O(VC, 2.3, -26, 8), O(VC, 1.95, -12, 12)))
cenas[15] = M(COM_PESO, bolhas=1, quente=1, pressao=1, valvula=1, relogio=0,
  valvUp=[[0, 1], [0.28, 0.85], [0.45, 1], [0.6, 0.2], [0.7, 0], [1, 0]], pesoUp=[[0, 1], [0.28, 0.85], [0.45, 1], [0.6, 0.2], [0.7, 0], [1, 0]],
  chia=[[0, 1], [0.5, 1], [0.7, 0.2], [1, 0.1]],
  camera=cam(O(VC, 1.95, -12, 12), O(VC, 1.8, 20, 8)))
cenas[16] = M(COM_PESO, bolhas=1, quente=1, pressao=1, pTampa=1, valvula=1, valvUp=0, entope=V(0, 1, 0.08, 0.4), valvEntope=V(0, 1, 0.08, 0.4), relogio=0,
  camera=cam(O(VC, 2.1, 28, 10), O(VC, 1.9, 16, 12)))
cenas[17] = M(COM_RES, bolhas=1, quente=1, pressao=1, entope=1, valvEntope=1, valvula=1, vres=V(0, 1, 0.0, 0.2), reserva=V(0, 1, 0.0, 0.2), resUp=V(0, 1, 0.3, 0.55), relogio=0,
  camera=cam(O(VC, 2.0, 10, 12), O(VC, 1.8, -14, 10)), c=[rot("RESERVA", 1, 40, 100)])
cenas[18] = M(COM_RES, bolhas=1, quente=1, pressao=1, tampa=V(1, 0.9, 0.2, 0.5), jato=V(0, 1, W(18, '^jorra') - 0.1, W(18, '^jorra') + 0.12), vapor=0.4, relogio=0,
  camera=cam(O((-0.6, 1.05, 0.0), 1.9, -8, 48), O((-0.6, 1.05, 0.0), 1.6, 10, 56)),
  gente=[Z(L=0.5, z=0.35, acao="em-pe", exp="surpreso", pose=[(0.45, TAMPA_NAS_MAOS), (1, RECUA)])])
cenas[19] = M(COM_RES, bolhas=1, quente=1, pressao=1, trava=V(0, 1, 0.0, 0.2), travaUp=V(0, 1, 0.55, 0.7), travaDesce=V(0, 1, 0.85, 0.97),
  valvula=1, vpino=V(0, 1, 0.0, 0.2), vres=1, valvUp=0, vpinoUp=[[0, 0], [0.5, 0], [0.62, 1], [0.84, 1], [0.97, 0]], relogio=0,
  camera=cam(O(VC, 2.3, 30, 10), O(VC, 2.0, 18, 12)), c=[rot("TRAVA", 1, 40, 100)])
cenas[20] = M(TUDO, relogio=0, bolhas=1, quente=1, feijao=1, gas=1.2, destaque=V(0, 1, 0.05, 0.85), pTampa=0.4,
  camera=cam(O(CW, 4.1, -48, 8, sobe=0.1), O(CW, 3.6, -10, 14, sobe=0.1)), gente=[Z(acao="comemorando", exp="sorriso")], c=[rot("PANELA DE PRESSÃO", 1, 54, 76)])
cenas[21] = M(TUDO, bolhas=1, quente=1, feijao=1, gas=1.2, raiox=V(0.4, 0.9, 0.0, 0.3), destaque=V(0, 1, 0.1, 0.9), pTampa=0.6,
  camera=cam(O((-0.8, 1.15, -0.1), 1.9, 32, 22), O((-0.8, 1.15, -0.1), 1.7, 44, 26)))
cenas[22] = M(TUDO, bolhas=1, quente=1, feijao=1, gas=1.0, chia=1, pesoUp=1, pesoOsc=True, valvula=1, vpino=1, vres=1, valvUp=[[0, 0.9], [0.5, 1], [1, 0.9]], valvOsc=True, relogio=0,
  camera=cam(O((-0.45, 1.3, 0.0), 2.3, -28, 8), O((-0.45, 1.3, 0.0), 2.0, -18, 8)), c=[rot("NÃO É PERIGO", 0, 40, 84)])
cenas[23] = M(TUDO, bolhas=1, quente=1, feijao=1, gas=V(1.6, 0.35, 0.3, 0.7), chia=1, pesoUp=1, pesoOsc=True, valvula=1, vpino=1, vres=1, valvUp=V(1, 0.35, 0.3, 0.8), valvOsc=True, relogio=0,
  camera=cam(O((-0.6, 1.15, -0.1), 2.7, 30, 6), O((-0.6, 1.15, -0.1), 2.4, 22, 4)), c=[rot("BAIXE O FOGO", 1, 40, 84)])
cenas[24] = M(TUDO, tampa=1, gas=1.2, bolhas=1, quente=1, feijao=1, relogio=0, nivel=[[0, 0.3], [0.3, 0.667], [0.5, 0.667], [0.72, 0.97], [1, 0.97]], nivelMax=V(0, 1, 0.1, 0.3),
  espuma=V(0, 1, 0.7, 0.95), xis=V(0, 1, 0.75, 0.9), valvula=V(0, 1, 0.7, 0.85), valvEntope=V(0, 1, 0.8, 0.95), vpino=1, vres=1,
  camera=cam(O((-0.55, 1.1, 0.0), 2.4, -30, 10), O((-0.55, 1.1, 0.0), 2.1, -16, 12)), c=[rot("MÁXIMO 2/3", 0, 40, 96)])
cenas[25] = M(TUDO, gas=1.0, chia=1, pesoUp=1, pesoOsc=True, bolhas=1, quente=1, feijao=1, prato=V(0, 1, 0.3, 0.7),
  camera=cam(O(CW, 2.7, -28, 8), O(CW, 2.5, -12, 10)), gente=[Z(acao="acenando", exp="sorriso")])
cenas[26] = M(TUDO, gas=0, prato=1, vaoGeladeira=True, interroga=V(0, 1, 0, 0.6), geladeira=V(0, 1, 0.5, 0.9),
  camera=cam(O((1.0, 1.1, 0.0), 4.3, 24, 6), O((1.1, 1.1, 0.0), 3.8, 4, 6)), gente=[Z(L=0.8, z=0.5, acao="explicando", exp="sorriso")])
cenas[27] = M(TUDO, gas=1.0, chia=1, pesoUp=1, pesoOsc=True, bolhas=1, quente=1, feijao=1, prato=1,
  camera=cam(O((-0.6, 1.15, 0.0), 3.0, -14, 8), O((-0.6, 1.15, 0.0), 2.7, 6, 10)), gente=[Z(L=-0.3, acao="acenando", exp="sorriso")],
  c=[chamada("curtir", "CURTA", None, 0), chamada("comentar", "COMENTE", "o que você cozinha na pressão", 1), chamada("compartilhar", "COMPARTILHE", None, 2), chamada("seguir", "SIGA", "PRA SABER COMO AS COISAS FUNCIONAM", 3)])

for i, d in cenas.items():  # posiciona o Zeca pela câmera
    for g in d.get('gente', []):
        if not g.pop('zc', False): continue
        de, pa = d['camera']['de'], d['camera']['para']
        de['fov'] = pa['fov'] = 60  # quadro mais largo: Zeca inteiro
        pos = [(de['pos'][k] + pa['pos'][k]) / 2 for k in range(3)]; al = [(de['alvo'][k] + pa['alvo'][k]) / 2 for k in range(3)]
        az = math.atan2(pos[0] - al[0], pos[2] - al[2])
        L = g.pop('L') * (1 if az < 0 else -1); z = g['z']
        g['x'] = round(al[0] + (L + (z - al[2]) * math.sin(az)) / math.cos(az), 3); g['rot'] = round(max(-1.2, min(1.2, az * 0.8)), 3)

SFX = {
    1: [("pop", 0, 0.4), ("tique_relogio", 1, 0.3), ("estalo", 3, 0.35)],
    2: [("sopro", 0, 0.35), ("tique", 1, 0.4)],
    3: [("clique", 0, 0.45), ("pop", 1, 0.35)],
    4: [("chiado", 0, 0.4), ("rangido", 1, 0.3)],
    5: [("pop", 0, 0.4), ("clique", 1, 0.45), ("ding", 2, 0.4)],
    6: [("sopro", 0, 0.35), ("batimento_rapido", 2, 0.3)],
    7: [("ding", 0, 0.4), ("chiado", 1, 0.3)],
    8: [("whoosh", 0, 0.4), ("ding", 1, 0.5)],
    9: [("batimento_rapido", 0, 0.4), ("rangido", 1, 0.45), ("impacto", 3, 0.6)],
    10: [("estalo", 0, 0.4), ("pop", 1, 0.4)],
    11: [("clique", 0, 0.45), ("chiado", 1, 0.35)],
    12: [("sopro", 0, 0.35), ("tique_relogio", 2, 0.3)],
    13: [("pop", 0, 0.4), ("clique", 1, 0.45)],
    14: [("sopro", 0, 0.35), ("rangido", 2, 0.35)],
    15: [("chiado", 0, 0.4), ("chiado", 2, 0.3), ("clique", 3, 0.4)],
    16: [("estalo", 0, 0.4), ("pop", 1, 0.4)],
    17: [("clique", 0, 0.4), ("ding", 1, 0.45)],
    18: [("rangido", 0, 0.4), ("sopro", 2, 0.5)],
    19: [("clique", 0, 0.5), ("ding", 1, 0.45), ("pop", 3, 0.4)],
    20: [("jingle", 0, 0.5), ("pop", 1, 0.5)],
    21: [("pop", 0, 0.4), ("pop", 1, 0.4), ("pop", 2, 0.4), ("ding", 3, 0.45)],
    22: [("chiado", 0, 0.35), ("sopro", 1, 0.3)],
    23: [("clique", 0, 0.4), ("ding", 1, 0.4)],
    24: [("pop", 0, 0.4), ("estalo", 2, 0.4)],
    25: [("pop", 0, 0.4), ("ding", 1, 0.4)],
    26: [("whoosh", 0, 0.4), ("ding", 1, 0.5)],
    27: [("pop", 0, 0.5), ("pop", 1, 0.5), ("pop", 2, 0.5), ("ding", 3, 0.6)],
}
AMB = {i: ("fogo", 0.1) for i in range(1, 27)}
AMB[26] = ("nenhuma", 0)
AMB[27] = ("fogo", 0.08)
DUR = {1: 7.0, 9: 6.5, 10: 4.5, 13: 4.0, 14: 6.0, 15: 11.0, 16: 5.5, 17: 6.0, 18: 6.0, 19: 8.0, 20: 5.0, 21: 5.0, 22: 6.0, 23: 6.0, 24: 8.5, 26: 5.0, 27: 8.0}
B.salvar(cenas, SFX, AMB, DUR, proibido=('panela de press',), ate=20)
