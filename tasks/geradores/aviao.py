import json,re,sys,os,math
# Gera episodios/aviao/roteiro.json (episódio 16, "como um avião de 80 toneladas fica no ar", tema: a asa) a partir da tabela de cenas de tasks/roteiro-aviao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/aviao.py episodios/aviao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/aviao/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/aviao.tsx (veja a lista de campos no topo). Palcos: campo x = 0 · túnel x = 60 · carro x = 120 · pista x = 180 · céu x = 240.
# REGRA: o nome "asa" só aparece na batida 16 (fala, rótulo, cartão). Antes é "a placa" e "a curva".
# FÍSICA: o ar dobra para BAIXO atrás da placa; o ar de cima NÃO chega junto com o de baixo (batida 10). O avião voa para a esquerda do quadro.
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-aviao.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==20,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

def palavras_de(i):
    t=re.sub(r'\[[a-z]+\]','',falas[i-1]).replace('*','').replace('_','')
    return t.split()
def W(i,pat,fim=False):
    """progresso (0..1 da batida) em que a palavra que casa com `pat` começa (ou termina, com fim=True)"""
    ps=palavras_de(i)
    for k,w in enumerate(ps):
        if re.search(pat,w,re.I): return round((k+(1 if fim else 0))/len(ps),3)
    raise AssertionError((i,pat))

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
KF=lambda *pares: [list(p) for p in pares]
def pt(pos,alvo,fov=50): return dict(pos=[round(v,3) for v in pos],alvo=[round(v,3) for v in alvo],fov=fov)
def T(cx,ty,D,fov=50,el=0.08,x0=None,up=0.2,z0=0.0):
    """câmera olhando para (cx, ., z0) a D metros; o assunto (cx, ty) cai no terço de cima do quadro (`up` = fração da meia-altura)"""
    h=D*math.tan(math.radians(fov/2))
    ay=ty-up*h
    return pt([x0 if x0 is not None else cx,ay+el*D,z0+D],[cx,ay,z0],fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
def G(x=0.0,z=3.4,rot=0.0,acao="em-pe",exp="sorriso",**k): return dict(x=x,z=z,rot=rot,acao=acao,exp=exp,**k)

OLHA_CEU={"cabeca.x":-0.55,"ombroE.x":-0.2,"ombroD.x":-0.2}
EMPURRA={"ombroE.x":-1.25,"ombroD.x":-1.25,"cotoveloE.x":-0.2,"cotoveloD.x":-0.2,"ombroE.z":0.05,"ombroD.z":-0.05,"tronco.x":0.28,"maos":0.5}
MAOS_CIMA={"ombroE.x":-1.0,"ombroD.x":-1.0,"cotoveloE.x":-1.0,"cotoveloD.x":-1.0,"ombroE.z":0.5,"ombroD.z":-0.5,"maos":1}
SUSTO={"ombroE.z":0.9,"ombroD.z":-0.9,"ombroE.x":-0.4,"ombroD.x":-0.4,"cotoveloE.x":-0.5,"cotoveloD.x":-0.5,"maos":1,"tronco.x":-0.12}
VIRA_E=-math.pi/2

cenas={}
# 1: o avião cruza o céu visto de baixo; o Zeca no campo olha para cima; barra 80 t ao lado de um caminhão
cenas[1]=M(aviao=True,aviaoX=V(40,-40),aviaoY=26,aviaoZ=-52,barra=V(0,1,0.35,0.9),caminhao=True,
  camera=cam(pt([-3.5,1.0,10.5],[0.5,9.5,-26],58),pt([-2.0,1.0,10.5],[-0.5,10.5,-26],58)),
  gente=[G(-1.0,3.5,0.5,"em-pe","surpreso",pose=OLHA_CEU)],c=[])
# 2: asas de pena nos braços; bate, pula e cai sentado
cenas[2]=M(
  camera=cam(pt([-2.2,1.9,8.2],[0.2,1.2,0],50),pt([-1.5,1.9,7.2],[0.2,1.0,0],50)),
  gente=[G(0,2.4,0.3,[(0.55,"em-pe","animado"),(1,"sentado","surpreso")],"sorriso",penas=True,bate=[0.2,0.58],y=KF((0,0),(0.5,0),(0.58,0.6),(0.7,0),(0.82,-0.34),(1,-0.34)),
    pose=[(0.58,{}),(1,{"ombroE.z":0.5,"ombroD.z":-0.5,"ombroE.x":-0.3,"ombroD.x":-0.3})])],c=[])
# 3: asas de pena do tamanho do avião, paradas; o Zeca suado ao lado
cenas[3]=M(aviao=True,aviaoPenas=True,aviaoX=-4,aviaoY=2.0,aviaoZ=-14,
  camera=cam(pt([11.0,2.6,25.0],[-3,3.0,-8],52),pt([10.0,2.4,23.0],[-3,3.2,-8],52)),
  gente=[G(7.4,18.5,0.6,"em-pe","cansado",suor=1.0,penas=True,pose={"ombroE.z":0.5,"ombroD.z":-0.5,"ombroE.x":-0.2,"ombroD.x":-0.2,"cotoveloE.x":-0.2,"cotoveloD.x":-0.2})],c=[])
# 4: entra a placa presa à cabine curta com motor; o Zeca empurra o conjunto para a frente
mx4=W(4,'^placa')
cenas[4]=M(modelo="placa",modeloX=V(1.5,-4.0,0.0,1.0),helice=V(0.2,1.0),empurra=True,etiq=["placaM@%s"%mx4],etiqS=0.9,etiqK=0.9,
  camera=cam(pt([-1.2,1.9,6.6],[0.2,1.0,0],55),pt([-5.0,1.9,6.6],[-3.4,1.0,0],55)),
  gente=[G(V(4.0,-1.9,0.0,1.0),0.0,VIRA_E,"andando","sorriso",pose=EMPURRA)],c=[])
# 5: túnel: o ar passa reto pela placa deitada; a força é zero; o conjunto fica no chão
cenas[5]=M(palco="tunel",modelo="placa",anguloAtaque=0,sobe=0,linhasAr=V(0,1,0.0,0.4),forca0=True,etiq=["placa@0.1-0.9"],etiqS=1.0,
  camera=cam(T(0.0,2.0,8.4,50,0.06,x0=1.4,up=0.18),T(0.0,2.0,7.6,50,0.06,x0=1.0,up=0.18)),c=[])
# 6: o carro andando; o Zeca de passageiro põe o braço para fora e inclina a mão
cenas[6]=M(palco="carro",mao=V(0,0.32,0.45,0.95),maoSobe=0,linhasAr=V(0,0.5,0.6,1.0),carroVel=1,
  camera=cam(pt([-4.6,1.9,2.6],[-0.8,0.9,0.2],46),pt([-2.7,1.3,1.5],[-1.1,0.9,0.1],46)),c=[])
# 7: o ar bate, dobra para baixo e a mão sobe; seta vermelha de força
cenas[7]=M(palco="carro",mao=0.32,maoSobe=V(0,1,W(7,'^mão'),0.95),linhasAr=1,setasForca=V(0,0.34,W(7,'^mão')-0.05,0.95),carroVel=1,
  camera=cam(pt([-2.7,1.3,1.5],[-1.1,0.9,0.1],46),pt([-2.3,1.25,1.25],[-1.1,0.95,0.1],46)),
  c=[rot("AR PRA BAIXO",1,40,92)])
# 8: ângulo grande demais: o ar solta, a força some, o modelo cai
cenas[8]=M(palco="tunel",modelo="placa",anguloAtaque=V(0.3,0.62,0.12,0.55),sobe=V(0.5,0.0,0.55,0.95),linhasAr=1,solta=V(0,1,0.3,0.6),setasForca=V(1.2,0,0.1,0.5),
  camera=cam(T(0.0,2.0,7.8,50,0.06,x0=1.0,up=0.18),T(0.0,1.8,7.8,50,0.06,x0=1.2,up=0.18)),
  c=[rot("SOLTA",1,40,96)])
# 9: arredonda o dorso; as linhas contornam e saem apontando para baixo; a força cresce
cenas[9]=M(palco="tunel",anguloAtaque=V(0.12,0.12),curva=V(0,1,W(9,'^arredonde'),W(9,'^cima',True)),sobe=V(0,0.9,0.5,0.95),linhasAr=1,
  setasAr=V(0,1,W(9,'^dobrado'),0.97),setasForca=V(0,1.1,W(9,'^dobrado'),0.97),
  camera=cam(T(0.0,2.2,7.8,50,0.06,x0=1.2,up=0.18),T(0.0,2.4,7.6,50,0.06,x0=1.0,up=0.18)),
  gente=[G(-1.95,2.3,0.35,"explicando","eureka",pose=MAOS_CIMA)],
  c=[rot("CURVA",0,40,96)])
# 10: o mito: duas bolinhas de ar saem juntas e chegam em tempos diferentes
cenas[10]=M(palco="tunel",anguloAtaque=0.12,curva=1,sobe=0.9,linhasAr=0.9,bolas=V(0,1,W(10,'^alcan'),0.97),mito=V(0,1,W(10,'^mito'),W(10,'^mito')+0.18),
  camera=cam(T(0.0,2.5,7.8,50,0.06,x0=1.0,up=0.18),T(0.0,2.5,7.4,50,0.06,x0=0.8,up=0.18)),c=[])
# 11: em cima o ar corre mais rápido e a pressão cai; embaixo é maior; a diferença empurra a placa para cima
cenas[11]=M(palco="tunel",anguloAtaque=0.12,curva=1,sobe=V(0.9,1.4),linhasAr=1,pressao=V(0,1,W(11,'^pressão'),W(11,'^pressão')+0.2),setasForca=V(0.6,1.4,W(11,'^diferença'),0.97),
  etiq=["pressao@%s-0.78"%W(11,'^pressão')],etiqS=1.0,
  camera=cam(T(0.0,2.5,8.4,50,0.06,x0=1.0,up=0.18),T(0.0,2.7,8.0,50,0.06,x0=0.8,up=0.18)),c=[])
# 12: ar pra baixo e pressão são o mesmo efeito: as duas somam numa só seta de força
cenas[12]=M(palco="tunel",anguloAtaque=0.12,curva=1,sobe=1.4,linhasAr=0.8,pressao=0.9,setasAr=V(0,1,0.05,0.5),setasForca=V(1.0,1.9,W(12,'^mesmo'),0.97),
  camera=cam(T(0.0,2.7,8.4,50,0.06,x0=1.0,up=0.18),T(0.0,2.9,8.2,50,0.06,x0=0.8,up=0.18)),
  c=[])
# 13: parada, não levanta nada; então corra: dobra a velocidade, a força quadruplica
cenas[13]=M(palco="pista",modelo="curva",modeloX=V(0,-30,W(13,'^corra'),1.0),velocimetro=V(0.0,0.62,W(13,'^corra'),0.98),forca=V(0,1.0,W(13,'^dobre'),0.98),peso=1.2,x4=V(0,1,W(13,'^quadruplica'),0.98),
  camera=cam(pt([-5.5,2.3,7.5],[0,1.4,0],50),pt([-5.0,2.3,7.5],[0,1.4,0],50)),
  gente=[G(2.5,-2.5,-0.3,[(0.5,"em-pe","cansado"),(1,"em-pe","surpreso")],"sorriso")],c=[])
# 14: corra até a força passar do peso: a roda dianteira desgruda
cenas[14]=M(palco="pista",modelo="curva",modeloX=V(-30,-90),nariz=V(0,0.35,0.5,0.9),modeloY=V(0,0.12,0.6,1.0),velocimetro=V(0.62,1.0),forca=V(0.8,1.7),peso=1.2,
  camera=cam(pt([-5.0,2.3,7.5],[0,1.4,0],50),pt([-5.5,2.4,7.5],[0,1.5,0],50)),c=[])
# 15: no fim da pista levanta o nariz: mais inclinação, mais força; ele sobe
cenas[15]=M(palco="pista",modelo="curva",modeloX=V(-90,-150),nariz=V(0.35,1.0,0.0,0.6),modeloY=V(0.12,2.6,0.3,1.0),velocimetro=1.0,forca=V(1.7,2.2),peso=1.2,
  camera=cam(pt([-5.5,2.4,7.5],[0,1.5,0],50),pt([-5.5,3.6,8.0],[0,2.7,0],50)),c=[])
# 16: o modelo ganha o rótulo ASA; o título sobe; o avião grande entra ao fundo
cenas[16]=M(palco="pista",modelo="curva",modeloX=-100,modeloY=V(2.6,3.0),nariz=0.55,velocimetro=1.0,forca=2.2,peso=1.2,aviao=True,aviaoX=V(28,8),aviaoY=15,aviaoZ=-42,
  etiq=["asa@%s-0.95"%W(16,'^asa')],etiqS=1.0,
  camera=cam(pt([-5.5,3.4,8.0],[0,3.0,0],50),pt([-4.8,3.4,7.2],[0,3.1,0],50)),
  gente=[G(-100+3.4,-1.0,-0.5,"comemorando","sorriso")],
  c=[rot("ASA",1,40,110)])
# 17: voo reto: peso e sustentação iguais, empuxo e arrasto iguais
cenas[17]=M(palco="ceu",aviaoX=0,aviaoY=30,aviaoZ=0,setas4=V(0,1,0.25,0.7),
  camera=cam(T(0,31,64,50,0.0,x0=-14,up=0.12),T(0,31,58,50,0.0,x0=-8,up=0.12)),c=[])
# 18: a câmera sobe até a asa; o ar dobra para baixo atrás dela
cenas[18]=M(palco="ceu",aviaoX=0,aviaoY=30,aviaoZ=0,setas4=V(1,0,0.0,0.3),corteAsa=V(0,1,0.25,0.5),
  camera=cam(T(0,31,58,50,0.0,x0=-8,up=0.12),pt([5.0,35.0,17.0],[2.65,29.4,6.4],50)),c=[])
# 19: o avião se inclina numa curva e some entre nuvens; ? sobe e vira lâmpada
cenas[19]=M(palco="ceu",aviaoX=V(0,-90),aviaoY=V(30,44),aviaoZ=V(0,-150),aviaoRoll=V(0,0.6),aviaoYaw=V(0,0.5),interroga=V(0,1,0.45,0.98),
  camera=cam(T(-4,33,62,50,0.0,x0=-8,up=0.12),T(-10,35,62,50,0.0,x0=-12,up=0.12)),c=[])
# 20: o avião e o Zeca de frente; as quatro chamadas entram uma a uma
cenas[20]=M(aviao=True,aviaoX=V(30,14),aviaoY=26,aviaoZ=-58,
  camera=cam(pt([-1.8,1.5,7.8],[0.6,4.6,-8],56),pt([-1.4,1.5,7.0],[0.6,4.4,-8],56)),
  gente=[G(0.2,2.4,0.15,"acenando","sorriso")],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE MITO","se já ouviu que o ar de cima precisa alcançar o de baixo",1),chamada("compartilhar","COMPARTILHE","com quem acha que avião só boia",2),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",3)])

PALCO_X={"campo":0,"tunel":60,"carro":120,"pista":180,"ceu":240}
for d in cenas.values():
    ox=PALCO_X[d.get("palco","campo")]
    if ox:
        for k in ("de","para"):
            if k in d["camera"]:
                d["camera"][k]["pos"][0]=round(d["camera"][k]["pos"][0]+ox,3)
                d["camera"][k]["alvo"][0]=round(d["camera"][k]["alvo"][0]+ox,3)

SFX={
1:[("vento",0,0.35),("whoosh",1,0.4),("pop",2,0.4)],
2:[("pop",0,0.4),("whoosh",1,0.4),("impacto_seco",2,0.5)],
3:[("pop",0,0.4),("respiracao",1,0.4)],
4:[("pop",0,0.4),("motor",1,0.35)],
5:[("vento",0,0.35),("pop",1,0.3),("ding",2,0.3)],
6:[("carro_passando",0,0.4),("pop",1,0.4)],
7:[("whoosh",0,0.4),("ding",1,0.45),("pop",2,0.4)],
8:[("rangido",0,0.4),("impacto_seco",1,0.5),("whoosh",2,0.4)],
9:[("pop",0,0.4),("whoosh",1,0.4),("ding",2,0.45),("ding",3,0.4)],
10:[("pop",0,0.4),("carimbo",1,0.5)],
11:[("whoosh",0,0.4),("pop",1,0.4),("ding",2,0.45),("whoosh",3,0.4)],
12:[("ding",0,0.45),("jingle",2,0.45)],
13:[("pop",0,0.4),("motor",1,0.4),("whoosh",2,0.4),("ding",3,0.5)],
14:[("motor",0,0.4),("ding",1,0.5)],
15:[("whoosh",0,0.4),("pop",1,0.4),("ding",2,0.5)],
16:[("jingle",0,0.5),("pop",1,0.5)],
17:[("whoosh",0,0.4),("pop",1,0.4),("ding",2,0.45)],
18:[("whoosh",0,0.4),("ding",1,0.5),("pop",2,0.4)],
19:[("pop",0,0.4),("whoosh",1,0.4),("ding",2,0.45)],
20:[("pop",0,0.5),("pop",1,0.45),("pop",2,0.45),("ding",3,0.55)],
}
AMB={i:("vento",0.12) for i in range(1,21)}
for i in (5,8,9,10,11,12): AMB[i]=("nenhuma",0)
for i in (4,13,14,15,16): AMB[i]=("dia",0.1)

reg=open(os.path.join(AQUI,'..','..','motor','pipeline','sfx.py'),encoding='utf-8').read().split('REGISTRO = {')[1]
validos=set(re.findall(r'^\s+"([a-z_0-9]+)":\s+\(',reg,re.M))
for i,l in SFX.items():
    for sf in l:
        assert sf[0] in validos,(i,sf[0])
        assert sf[1]<=NLEVE[i-1],(i,sf,NLEVE[i-1])
for i,(sn,v) in AMB.items(): assert sn=="nenhuma" or sn in validos,(i,sn)
for i,d in cenas.items():
    for cartao in d['c']:
        if 'trecho' in cartao: assert cartao['trecho']<=NLEVE[i-1],(i,cartao,NLEVE[i-1])
assert set(cenas)==set(range(1,21)) and set(SFX)==set(range(1,21))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"aviao",**d}
    sn,v=AMB.get(i,("vento",0.1))
    cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
for i,b in enumerate(bat,1):
    txt=(b["texto"]+json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False)).lower()
    if i<16: assert not re.search(r'\basa\b|"asa|asa@',txt),(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":16,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
