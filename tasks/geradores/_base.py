import json, re, sys, os
# Apoio comum dos geradores dos rascunhos 19+ (submarino, cadeado, ...). Cada gerador faz:
#   from _base import *; B = Base('roteiro-xxx.md', 'cenario', 19, N)   # lê as falas da tabela do .md
#   ... define cenas[i], SFX, AMB, DUR ...; B.salvar(cenas, SFX, AMB, DUR, nome_proibido=(...), ate=16)
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

M = lambda *ds, **k: {**{kk: v for d in ds for kk, v in d.items()}, **k}
V = lambda de, para, ini=None, fim=None: dict(de=de, para=para, **({"ini": ini} if ini is not None else {}), **({"fim": fim} if fim is not None else {}))
KF = lambda *pares: [list(p) for p in pares]
def pt(pos, alvo, fov=50): return dict(pos=[round(v, 3) for v in pos], alvo=[round(v, 3) for v in alvo], fov=fov)
def T(cx, ty, D, fov=50, el=0.0, x0=None, z0=0.0, sobe=0.07):
    """câmera olhando para (cx, ty, z0) a D metros em z; `el` sobe a câmera (fração de D); `x0` desloca a câmera; o assunto sobe na tela, acima da legenda"""
    ty = ty - sobe * D
    return pt([x0 if x0 is not None else cx, ty + el * D, z0 + D], [cx, ty, z0], fov)
cam = lambda de=None, para=None, **k: {**{kk: v for kk, v in (("de", de), ("para", para)) if v}, **k}
rot = lambda txt, tr=0, y=40, tam=84: dict(tipo="rotulo", texto=txt, trecho=tr, y=y, tamanho=tam)
chamada = lambda icone, txt, sub=None, tr=0: dict(tipo="chamada", icone=icone, texto=txt, trecho=tr, **({"sub": sub} if sub else {}))
def G(x=0.0, z=2.6, rot=0.0, acao="em-pe", exp="sorriso", **k): return dict(x=x, z=z, rot=rot, acao=acao, exp=exp, **k)

def _final(v):
    """valor de um campo animado no fim da batida (número, V(de, para) ou lista de chaves [[p, valor], ...])"""
    if isinstance(v, (int, float)): return v
    if isinstance(v, dict): return v.get('para')
    if isinstance(v, (list, tuple)) and v and isinstance(v[-1], (list, tuple)): return v[-1][-1]
    return None


def _estado_final(g):
    """ação, pose, inclinação e posição do personagem no fim da batida (para a próxima partir dali)"""
    acao = g.get('acao', 'em-pe')
    if isinstance(acao, (list, tuple)): acao = acao[-1][1]
    pose = g.get('pose') or {}
    if isinstance(pose, (list, tuple)): pose = pose[-1][1]
    est = dict(acao=acao, pose=dict(pose))
    for k in ('x', 'y', 'z', 'rot', 'incl'):
        v = _final(g.get(k))
        if v is not None: est[k] = v
    return est


def suavizar(cenas, duracoes=None, dist=2.5, entrada=0.3):
    """Continuidade do Zeca entre batidas (cada batida é uma cena nova, então ele recomeçaria na pose da cena).
    `cenas` = lista de cenas na ordem (dicts com 'gente' e, se houver, 'cenario'). Para cada personagem que continua
    na batida seguinte (mesmo índice em `gente` e mesmo `quem`), grava nela `ant` = estado final da anterior; o motor
    parte dessa pose e a desfaz com ease nos primeiros `entrada` s em TODAS as juntas, e desliza a posição (x/y/z/rot)
    se o personagem não se afastou mais que `dist` m (o corte de câmera continua sendo o único salto). Desligue num
    personagem com suave=False. `salvar()` já chama isto; chame à mão só em geradores que não usam Base."""
    for i in range(1, len(cenas)):
        antes, agora = cenas[i - 1].get('gente') or [], cenas[i].get('gente') or []
        for k, g in enumerate(agora):
            if k >= len(antes) or g.get('ant') or g.get('suave') is False: continue
            a = antes[k]
            if (a.get('quem') or 'zeca') != (g.get('quem') or 'zeca') or 'de' in g: continue
            est = _estado_final(a)
            if duracoes: est['dur'] = duracoes[i - 1]
            mesmo = cenas[i - 1].get('cenario') == cenas[i].get('cenario')
            xa, za, xn, zn = est.get('x'), est.get('z'), _final(g.get('x')), _final(g.get('z'))
            est['mover'] = bool(mesmo and None not in (xa, za, xn, zn) and ((xa - xn) ** 2 + (za - zn) ** 2) ** 0.5 <= dist)
            g['ant'] = est
            if entrada != 0.3: g['entradaDur'] = entrada
    for c in cenas:
        for g in c.get('gente') or []: g.pop('suave', None)


SEGURA = {"ombroE.x": -0.95, "ombroD.x": -0.95, "cotoveloE.x": -0.65, "cotoveloD.x": -0.65, "ombroE.z": -0.2, "ombroD.z": 0.2, "maos": 0.2}
ABRE = {"ombroE.z": 1.2, "ombroD.z": -1.2, "cotoveloE.z": 0.2, "cotoveloD.z": -0.2, "maos": 1}
BRACOS_CIMA = {"ombroE.x": -0.4, "ombroD.x": -0.4, "ombroE.z": 2.4, "ombroD.z": -2.4, "cotoveloE.z": 0.3, "cotoveloD.z": -0.3, "maos": 1}
MAO_QUEIXO = {"ombroD.x": -0.95, "ombroD.z": 0.4, "cotoveloD.x": -2.35, "cotoveloD.z": 0.15, "ombroE.z": 0.12, "cotoveloE.x": -0.18, "maos": 0.4}
MAOS_CABECA = {"ombroE.x": -1.2, "ombroD.x": -1.2, "cotoveloE.x": -2.3, "cotoveloD.x": -2.3, "ombroE.z": 0.5, "ombroD.z": -0.5, "maos": 0.6}
OLHA_CIMA = {"cabeca.x": -0.45, "ombroE.z": 0.12, "ombroD.z": -0.12}
APONTA_D = {"ombroD.x": -1.2, "ombroD.z": -0.5, "cotoveloD.x": -0.1, "dedo": 1, "ombroE.z": 0.12, "cotoveloE.x": -0.18}
APONTA_E = {"ombroE.x": -1.2, "ombroE.z": 0.5, "cotoveloE.x": -0.1, "dedo": 1, "ombroD.z": -0.12, "cotoveloD.x": -0.18}
ESPANTO = {"ombroE.z": 0.5, "ombroD.z": -0.5, "cotoveloE.x": -0.5, "cotoveloD.x": -0.5, "maos": 1}


class Base:
    def __init__(self, md, cenario, ep, n, serie_nome="DEMO 3D"):
        self.cenario, self.ep, self.n = cenario, ep, n
        txt = open(os.path.join(AQUI, '..', md), encoding='utf-8').read()
        tab = txt.split('## Tabela de cenas')[1].split('\n## ')[0]
        self.falas = [re.match(r'\| \d+ \| (.+?) \| ', l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ', l)]
        assert len(self.falas) == n, (len(self.falas), n)
        self.NLEVE = [f.count('[leve]') for f in self.falas]

    def palavras_de(self, i):
        t = re.sub(r'\[[a-z]+\]', '', self.falas[i - 1]).replace('*', '').replace('_', '')
        return t.split()

    def W(self, i, pat, fim=False):
        """progresso (0..1 da batida) em que a palavra que casa com `pat` começa (ou termina, com fim=True)"""
        ps = self.palavras_de(i)
        for k, w in enumerate(ps):
            if re.search(pat, w, re.I): return round((k + (1 if fim else 0)) / len(ps), 3)
        raise AssertionError((i, pat))

    def salvar(self, cenas, SFX, AMB, DUR, proibido=(), ate=0, saida=None, suave=True):
        n, NL = self.n, self.NLEVE
        reg = open(os.path.join(AQUI, '..', '..', 'motor', 'pipeline', 'sfx.py'), encoding='utf-8').read().split('REGISTRO = {')[1]
        validos = set(re.findall(r'^\s+"([a-z_0-9]+)":\s+\(', reg, re.M))
        for i in SFX:
            SFX[i] = [(sf[0], min(sf[1], NL[i - 1]), sf[2]) + tuple(sf[3:]) for sf in SFX[i]][:NL[i - 1] + 2]
            for sf in SFX[i]: assert sf[0] in validos, (i, sf[0])
        for i, (sn, v) in AMB.items(): assert sn == "nenhuma" or sn in validos, (i, sn)
        for i, d in cenas.items():
            for cartao in d.get('c', []):
                if 'trecho' in cartao: assert cartao['trecho'] <= NL[i - 1], (i, cartao, NL[i - 1])
        assert set(cenas) == set(range(1, n + 1)), set(range(1, n + 1)) - set(cenas)
        bat = []
        for i, f in enumerate(self.falas, 1):
            d = dict(cenas[i]); c = d.pop('c', [])
            palavras = len(re.sub(r'\[[a-z]+\]', '', f).split())
            cena = {"cenario": self.cenario, **d}
            sn, v = AMB.get(i, ("nenhuma", 0))
            cena["ambiencia"] = "nenhuma" if sn == "nenhuma" else {"som": sn, "volume": v}
            if c: cena["cartoes"] = c
            cena["sfx"] = [{"som": s[0], "trecho": s[1], "volume": s[2], **({"em": round(max(0.0, s[3]), 3)} if len(s) > 3 else {})} for s in SFX.get(i, [])]
            bat.append({"texto": f, "duracao": DUR.get(i, round(max(2.4, palavras / 2.9), 1)), "cena": cena})
        if suave: suavizar([b['cena'] for b in bat], [b['duracao'] for b in bat])
        for i, b in enumerate(bat, 1):
            txt = (b["texto"] + json.dumps({k: v for k, v in b["cena"].items() if k in ("cartoes", "etiq")}, ensure_ascii=False)).lower()
            if i < ate:
                for nome in proibido: assert nome not in txt, (i, nome)
        r = {"slug": "demo-3d", "serie": "DEMO 3D", "episodio": self.ep, "voz": {"tts": "elevenlabs", "id": "RGymW84CSmfVugnA5tvA", "modelo": "eleven_v4", "idioma": "pt", "velocidade": 1.2}, "cartaoFinal": None, "batidas": bat}
        saida = saida or sys.argv[1]
        os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
        json.dump(r, open(saida, 'w'), ensure_ascii=False, indent=1)
        print(len(bat), 'batidas', round(sum(b['duracao'] for b in bat), 1), 's', sum(len(v) for v in SFX.values()), 'efeitos')
