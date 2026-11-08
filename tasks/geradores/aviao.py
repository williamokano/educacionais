import copy,json,re,sys,os,math
# Gera episodios/aviao/roteiro.json (episódio 16, "como um avião de 80 toneladas fica no ar, ": asa, fuselagem, turbina, cauda, comandos, flap, cabine; UM vídeo só, versão 5 (22 batidas, estol no fim, sem janelas)) a partir da tabela de cenas de tasks/roteiro-aviao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/aviao.py episodios/aviao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/aviao/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/aviao.tsx (veja a lista de campos no topo). Palcos: campo x = 0 · túnel x = 60 · carro x = 120 · pista x = 180 · céu x = 240 · janela x = 300.
# REGRA: o nome "asa" só aparece na batida 7 (fala, rótulo, cartão). Antes é "a placa" e "a curva".
# TOMADAS: `tomadas` = cortes dentro da batida (palco e câmera próprios; "ate" é o fim da tomada em trecho "tK"). `zecaTela`: o Zeca de reação preso à câmera (sempre inteiro, sobre uma nuvenzinha).
# FÍSICA: o ar dobra para BAIXO atrás da placa; o ar de cima NÃO chega junto com o de baixo (batida 10). O avião voa para a esquerda do quadro.
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-aviao.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==22,len(falas)
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

K=lambda *pares: [list(p) for p in pares]   # chaves [[progresso, valor], ...]
AX,AY=0.0,30.0   # avião grande no palco do céu


# --- tempo por TRECHO (o corte segue a voz: "tK" = início do trecho K da batida, "tK+0.1" = 10% da batida depois) ---
SEGS=[[re.sub(r'\[[a-z]+\]','',x).replace('*','').replace('_','').split() for x in f.split('[leve]')] for f in falas]
def Sg(i,pat):
    for k,ws in enumerate(SEGS[i-1]):
        if any(re.search(pat,w,re.I) for w in ws): return k
    raise AssertionError((i,pat))
def ST(i,pat,off=0.0): return "t%d%s"%(Sg(i,pat),("%+.3f"%off) if off else "")   # início do trecho que contém a palavra
def EN(i,pat,off=0.0): return "t%d%s"%(Sg(i,pat)+1,("%+.3f"%off) if off else "")  # fim desse trecho

MAOS_CAB={"ombroE.x":-1.2,"ombroD.x":-1.2,"cotoveloE.x":-2.3,"cotoveloD.x":-2.3,"ombroE.z":0.5,"ombroD.z":-0.5,"maos":0.6}
SEGURA_COPO={"ombroD.x":-1.15,"cotoveloD.x":-1.2,"ombroD.z":-0.1,"ombroE.x":-0.1,"maos":0.5}
TOSSE={"ombroD.x":-1.5,"cotoveloD.x":-2.0,"ombroD.z":0.2,"cabeca.x":0.25,"tronco.x":0.18,"maos":0.3}
def ZT(sx=-0.68,sy=-0.14,h=0.34,acao="em-pe",exp="sorriso",**k): return dict(sx=sx,sy=sy,h=h,acao=acao,exp=exp,**k)

cenas={}
# 1: o avião cruza o céu visto de cima; o Zeca no campo, com mala, olha para cima; a câmera desce até ele; barra 80 t (trecho 3)
t3_=ST(1,'^Só')
cenas[1]=M(aviao=True,aviaoX=V(36,-36),aviaoY=V(21,19),aviaoZ=-50,barra=K((0,0),(t3_,0),(ST(1,'^Só',0.12),1),(1,1)),caminhao=True,
  camera=cam(pt([-4,8,11],[1.0,6.0,-22],58),pt([-2.6,2.0,6.0],[1.4,3.2,-6],56)),
  gente=[G(-0.6,-3.2,0.3,"em-pe","surpreso",pose=OLHA_CEU,mala=True)],c=[])
# 2: PIADA: asas de pena nos braços (trecho 1); "Ops." (2): cai sentado; "Pesado demais" (3): a câmera recua continuamente (o avião já está ao fundo) e as asas DO ZECA crescem até o tamanho de asa de avião, paradas
cenas[2]=M(aviao=True,aviaoX=-8,aviaoY=3.0,aviaoZ=-16,
  camera=cam(pt([-2.2,1.9,8.2],[0.2,1.2,0],50),pt([0.5,7.0,36.0],[0.0,4.0,0],52)),
  gente=[G(0,2.4,0.3,[(ST(2,'^Ops',-0.02),"em-pe","sorriso"),(ST(2,'^Ops',0.06),"sentado","surpreso"),(1,"em-pe","cansado")],"sorriso",penas=True,penaEsc=K((0,1),(ST(2,'^Ops',0.04),1),(ST(2,'^Pesado',0.1),8),(1,8)),suor=K((0,0),(ST(2,'^Pesado'),0),(1,1.0)),bate=[ST(2,'^penas'),ST(2,'^Ops',-0.03)],
    y=K((0,0),(ST(2,'^penas',0.04),0),(ST(2,'^penas',0.10),0.6),(ST(2,'^penas',0.17),0),(ST(2,'^Ops',-0.03),-0.34),(ST(2,'^Ops',0.05),-0.34),(ST(2,'^Ops',0.11),0),(1,0)),
    pose=[(ST(2,'^Ops',-0.02),{}),(ST(2,'^Ops',0.06),{"ombroE.z":0.5,"ombroD.z":-0.5,"ombroE.x":-0.3,"ombroD.x":-0.3}),(ST(2,'^Pesado',0.02),{"ombroE.z":1.25,"ombroD.z":-1.25,"ombroE.x":-0.1,"ombroD.x":-0.1,"cotoveloE.x":-0.1,"cotoveloD.x":-0.1}),(1,{"ombroE.z":1.25,"ombroD.z":-1.25,"ombroE.x":-0.1,"ombroD.x":-0.1,"cotoveloE.x":-0.1,"cotoveloD.x":-0.1})])],c=[])
# 3: (campo) a placa parada entra, o motor empurra (trecho 1); (túnel) deitada, o ar passa reto e a força é zero (trecho 2)
cenas[3]=M(modelo="placa",modeloX=K((0,0.0),("t1",0.0),("t1+0.06",-0.1),("t2",-3.2),(1,-3.2)),helice=K((0,0.2),("t1",0.2),("t1+0.05",1.0),(1,1.0)),
  linhasAr=K((0,0),("t2",0),("t2+0.1",1),(1,1)),anguloAtaque=0,sobe=0,forca0=True,
  etiq=["placaM@t0+0.1-t2","placa@t2+0.05-1.0"],etiqS=1.0,
  tomadas=[dict(ate="t2",palco="campo",camera=dict(de=pt([0.6,1.9,6.8],[-0.1,1.1,0],55),para=pt([-2.6,1.9,6.4],[-1.5,1.1,0],55))),
           dict(ate=1,palco="tunel",camera=dict(de=T(0.0,2.0,8.4,50,0.06,x0=1.4,up=-0.12),para=T(0.0,2.0,7.6,50,0.06,x0=1.0,up=-0.12)))],
  zecaTela=[ZT(sx=-0.62,sy=-0.12,h=0.42,acao="em-pe",exp="surpreso",nuvem=False)],c=[])
# 4: (túnel) incline a placa (trecho 0); (carro) a mão pra fora da janela (1): o ar dobra pra baixo (2) e a mão sobe (3)
cenas[4]=M(modelo="placa",anguloAtaque=K((0,0),("t0+0.15",0),("t0+0.55",0.14),(1,0.14)),sobe=0,linhasAr=K((0,1),(1,1)),
  mao=K((0,0),("t1",0),("t1+0.08",0.32),(1,0.32)),maoSobe=K((0,0),("t3",0),("t3+0.15",1),(1,1)),carroVel=1,setasForca=K((0,0),("t3",0),("t3+0.15",0.34),(1,0.34)),
  tomadas=[dict(ate="t1",palco="tunel",camera=dict(de=T(0.0,2.0,8.0,50,0.06,x0=1.3,up=-0.12),para=T(0.0,2.0,7.4,50,0.06,x0=1.0,up=-0.12))),
           dict(ate=1,palco="carro",camera=dict(de=pt([-4.6,1.9,2.6],[-0.8,0.9,0.2],46),para=pt([-3.3,1.5,2.6],[-1.1,0.95,0.1],46)))],
  zecaTela=[ZT(sx=-0.62,sy=-0.12,h=0.42,acao="explicando",exp="sorriso",pose=MAOS_CIMA,nuvem=False,ate="t1")],
  c=[dict(tipo="rotulo",texto="AR PRA BAIXO",trecho=2,y=40,tamanho=92)])
# 5: arredonde (0); o ar dobra pra baixo (1); a pressão em cima cai (2); o ar de cima não precisa alcançar o de baixo (3); mito (4)
cenas[5]=M(palco="tunel",modelo="placa",anguloAtaque=0.12,curva=K((0,0),("t0+0.03",0),("t1",1),(1,1)),sobe=K((0,0),("t1+0.05",0),("t1+0.2",0.9),("t2",0.9),("t2+0.12",1.4),(1,1.4)),linhasAr=1,
  setasAr=K((0,0),("t1",0),("t1+0.1",1),(1,1)),setasForca=K((0,0),("t1+0.2",0),("t2",0.6),("t2+0.12",1.4),(1,1.4)),
  pressao=K((0,0),("t2",0),("t2+0.1",1),("t3",1),("t3+0.06",0.25),(1,0.25)),
  bolas=K((0,0),("t3",0),("t4+0.12",1),(1,1)),mito=K((0,0),("t4",0),("t4+0.12",1),(1,1)),
  etiq=["pressao@t2+0.06-t3"],etiqS=1.0,
  camera=cam(T(0.0,2.4,8.2,50,0.06,x0=1.1,up=-0.12),T(0.0,2.6,7.6,50,0.06,x0=0.8,up=-0.12)),
  zecaTela=[ZT(sx=-0.62,sy=-0.12,h=0.42,acao="explicando",exp="eureka",pose=MAOS_CIMA,nuvem=False,de="t0+0.1")],
  c=[dict(tipo="rotulo",texto="CURVA",trecho=0,ateTrecho=2,y=-10,tamanho=96)])
# 6: parada não levanta (0); corra (1); no fim levante o nariz (2)
cenas[6]=M(palco="pista",modelo="curva",modeloX=K((0,0),("t1",0),("t2",-90),(1,-150)),velocimetro=K((0,0),("t1",0),("t2",0.8),(1,1.0)),forca=K((0,0),("t1",0),("t2",1.5),(1,2.2)),peso=1.2,
  nariz=K((0,0),("t2",0),(1,1.0)),modeloY=K((0,0),("t2",0),("t2+0.08",0.12),("t2+0.25",0.12),(1,2.6)),
  camera=cam(pt([-4.4,2.2,5.8],[0,1.4,0],50),pt([-4.2,3.4,6.0],[0,2.7,0],50)),
  gente=[G(2.5,-2.5,-0.3,[("t1","em-pe","cansado"),(1,"em-pe","surpreso")],"sorriso")],c=[])
# 7: o modelo ganha o rótulo ASA (1); o avião grande entra ao fundo; órbita curta na revelação; o Zeca comemora
cenas[7]=M(palco="pista",modelo="curva",modeloX=-100,modeloY=V(2.6,3.0),nariz=0.55,velocimetro=1.0,forca=2.2,peso=1.2,aviao=True,semCauda=True,aviaoX=V(28,8),aviaoY=15,aviaoZ=-42,
  camera=cam(pt([-6.2,3.0,6.6],[0,3.0,0],50),pt([5.6,3.8,7.4],[0,3.0,0],50)),
  gente=[G(-100+3.0,0.6,-0.55,"em-pe","eureka",pose=MAOS_CIMA,y=K((0,0),("t1",0),("t1+0.08",0.25),("t1+0.18",0),(1,0)))],
  c=[rot("ASA",1,40,110)])

# ---- avião grande no céu (palco "ceu"; coordenadas locais ao palco) ----
SEM=dict(semCauda=True)
SENTADO=dict(x=-1.78,y=29.62,z=0.78)
def ZECA(exp="sorriso",pose=None,de=None,suor=0,**k):
    d=dict(x=SENTADO["x"],y=SENTADO["y"],z=SENTADO["z"],rot=0.0,acao="sentado",exp=exp,esc=0.95,suor=suor,**k)
    if pose: d["pose"]=pose
    if de is not None: d["de"]=de
    return d
LARGO=lambda cx=-3.0,D=44,fov=62,up=-0.02,el=0.0: T(cx*0,30.6,D,fov,el,x0=cx,up=up)
# 8: só as asas; o corpo cresce em volta (raio-X: poltronas, gente, caixas) (1); fuselagem (2); o Zeca de reação some e ele aparece sentado
cenas[8]=M(palco="ceu",**SEM,aviaoEsc=1.0,aviaoX=AX,aviaoY=AY,aviaoZ=0,turb=0,fus=K((0,0),("t1",0),("t2",1),(1,1)),raiox=K((0,0),("t1+0.08",0),("t2+0.05",1),(1,1)),
  etiq=["fuselagem@t2-1.0"],etiqS=1.0,
  camera=cam(pt([9,35,34],[0,30,0],50),pt([-1.5,31.4,12.5],[-2.0,30.1,0],50)),
  zecaTela=[ZT(acao="em-pe",exp="surpreso",pose=OLHA_CEU,ate="t2+0.05")],
  gente=[ZECA(de="t2+0.05")],c=[])
# 9: não anda sozinho (0); turbina com pás que jogam o ar pra trás (1); o avião vai pra frente (2)
cenas[9]=M(palco="ceu",**SEM,aviaoEsc=1.0,aviaoX=AX,aviaoY=AY,aviaoZ=0,turb=K((0,0),("t1",0),("t1+0.1",1),(1,1)),ar=K((0,0),("t1+0.12",0),("t1+0.25",1),(1,1)),setaEmp=K((0,0),("t2",0),("t2+0.1",1),(1,1)),
  nuvVel=5,etiq=["turbina@t1+0.08-t2"],etiqS=1.0,
  camera=cam(pt([-12,28.2,19],[-1.5,28.9,4.5],50),pt([-8,28.2,17],[0.0,28.9,4.5],50)),
  zecaTela=[ZT(acao="em-pe",exp="sorriso",pose={"ombroE.x":-0.3})],c=[])
# 10: sobe sem parar (0 e 1); voo reto: iguais (2); 80 t penduradas (3)
cenas[10]=M(palco="ceu",**SEM,aviaoEsc=0.7,aviaoX=AX,aviaoY=AY,aviaoZ=0,aviaoPitch=K((0,-0.22),("t2-0.01",-0.22),("t2+0.05",0.0),(1,0)),nuvY=K((0,0),("t2",50),(1,50)),nuvVel=1.5,
  setas4=K((0,0),("t0+0.03",1),("t3",1),("t3+0.05",0),(1,0)),liftK=K((0,1.6),("t2-0.02",1.6),("t2+0.06",1.0),(1,1.0)),soVert=True,pendurado=K((0,0),("t3",0),("t3+0.1",1),(1,1)),
  camera=cam(LARGO(-3,44,62,-0.02),LARGO(-2,41,62,-0.02)),
  zecaTela=[ZT(acao="em-pe",exp="surpreso",pose=OLHA_CEU)],c=[])
# 11: TURBULÊNCIA: o ar sobe e desce (1-2); fique de cinto (3); o café do Zeca dança (4); o avião não (5), só balança (6); cartão de homenagem nos últimos 3 s
cenas[11]=M(palco="ceu",**SEM,aviaoEsc=0.5,aviaoX=AX,aviaoY=AY,aviaoZ=0,raiox=1,nuvVel=1.2,
  turbul=K((0,0),("t1",0),("t1+0.08",0.55),(1,0.55)),  camera=cam(pt([-0.6,31.4,22],[0.3,29.2,0],66),pt([-0.3,31.2,21],[0.3,29.2,0],66)),
  zecaTela=[ZT(sx=-0.62,sy=-0.24,h=0.38,acao="em-pe",exp="sorriso",pose=SEGURA_COPO,copo=K((0,0),("t3",0),("t4",1),(1,1)) )],c=[])
# 12: o nariz sobe sozinho (0) e o avião roda em torno das asas (1)
cenas[12]=M(palco="ceu",**SEM,aviaoEsc=0.7,aviaoX=AX,aviaoY=AY,aviaoZ=0,aviaoPitch=K((0,0),("t0+0.12",0),("t1+0.1",-1.0),(1,-1.9)),nuvVel=1.2,
  camera=cam(pt([-17,26.6,42],[0,31,0],58),pt([5,28.6,38],[0,31,0],58)),
  zecaTela=[ZT(acao="em-pe",exp="medo",pose={"ombroE.z":0.6,"ombroD.z":-0.6,"ombroE.x":-0.3,"ombroD.x":-0.3,"maos":1})],c=[])
# 13: aba deitada (0), aba em pé (1), cauda (2); o nariz sobe (3), o vento bate por baixo e empurra o rabo de volta (4)
cenas[13]=M(palco="ceu",aviaoEsc=0.78,aviaoX=AX,aviaoY=AY,aviaoZ=0,estH=K((0,0),("t0+0.12",0),("t1",1),(1,1)),estV=K((0,0),("t1",0),("t1+0.1",1),(1,1)),
  aviaoPitch=K((0,0),("t3",0),("t3+0.1",-0.3),("t4",-0.3),("t4+0.25",0),(1,0)),forcaCauda=K((0,0),("t3+0.08",0),("t3+0.2",1),("t4+0.3",1),(1,0)),
  etiq=["cauda@t2-t3"],etiqS=1.0,nuvVel=1.2,
  camera=cam(pt([34,37,30],[4,30.5,0],55),pt([47,34.5,7],[0,30.4,0],55)),
  zecaTela=[ZT(acao="em-pe",exp="concentrado",pose=OLHA_CEU)],c=[])
# 14: reto demais (0); profundor (1); aileron (2); leme (3). Três tomadas, uma por peça
cenas[14]=M(palco="ceu",aviaoEsc=0.78,aviaoX=AX,aviaoY=AY,aviaoZ=0,nuvVel=1.2,
  profV=K((0,0),("t1",0),("t1+0.08",1),(1,1)),profundor=K((0,0),("t1+0.1",0),("t1+0.3",0.5),("t1+0.6",-0.5),("t2",0),(1,0)),
  aviaoPitch=K((0,0),("t1+0.3",0),("t1+0.6",-0.18),("t2",0.1),("t2+0.1",0),(1,0)),
  ailV=K((0,0),("t2",0),("t2+0.08",1),(1,1)),aileron=K((0,0),("t2+0.1",0),("t2+0.3",0.5),(1,0.5)),aviaoRoll=K((0,0),("t2+0.2",0),("t3",0.28),(1,0.28)),
  lemeV=K((0,0),("t3",0),("t3+0.08",1),(1,1)),leme=K((0,0),("t3+0.1",0),("t3+0.3",0.5),(1,0.5)),aviaoYaw=K((0,0),("t3+0.1",0),("t3+0.5",-0.25),(1,-0.25)),
  etiq=["profundor@t1+0.04-t2","aileron@t2+0.04-t3","leme@t3+0.04-1.0"],etiqS=1.0,
  tomadas=[dict(ate="t2",palco="ceu",camera=dict(de=pt([38,38,16],[8,30.4,0],52),para=pt([32,37,14],[8,30.4,0],52))),
           dict(ate="t3",palco="ceu",camera=dict(de=pt([14,42,30],[2,30.2,7],52),para=pt([10,40,26],[2,30.2,8],52))),
           dict(ate=1,palco="ceu",camera=dict(de=pt([40,40,12],[10,30.8,0],52),para=pt([36,39,10],[10,30.8,0],52)))],
  zecaTela=[ZT(acao="em-pe",exp="sorriso",pose=OLHA_CEU)],c=[])
# 15: flap: desliza para trás e desce na asa; o avião pousa suave
cenas[15]=M(palco="ceu",aviaoEsc=0.78,aviaoX=AX,aviaoY=K((0,30),(1,27.5)),aviaoZ=0,profV=1,ailV=1,lemeV=1,flapV=K((0,0),("t0+0.1",0),("t0+0.2",1),(1,1)),flap=K((0,0),("t0+0.2",0),("t0+0.6",1),(1,1)),
  aviaoPitch=K((0,0),("t0+0.5",0),(1,0.1)),setaAsa=K((0,0),("t0+0.4",0),("t0+0.7",1),(1,1)),nuvY=K((0,0),(1,-16)),nuvVel=1.2,
  etiq=["flap@t0+0.18-1.0"],etiqS=1.0,
  camera=cam(pt([30,36,20],[5,29.4,8],50),pt([26,34,17],[4.5,29,8],50)),
  zecaTela=[ZT(acao="em-pe",exp="alivio",pose=OLHA_CEU)],c=[])
COMANDOS=dict(profV=1,ailV=1,lemeV=1,flapV=1)
# 16: suba bem alto (0): o céu escurece; lá em cima o ar é fino e gelado (1): corte raio-X, o Zeca tosse, com estrelinhas de tontura (2)
cenas[16]=M(palco="ceu",aviaoEsc=0.7,aviaoX=AX,aviaoY=AY,aviaoZ=0,**COMANDOS,aviaoPitch=K((0,-0.2),("t1",-0.2),("t1+0.05",0),(1,0)),nuvY=K((0,0),("t1",60),(1,60)),nuvVel=1.5,
  escuro=K((0,0),("t0+0.2",0),("t1",0.9),("t1+0.02",1),(1,1)),raiox=K((0,0),("t1-0.03",0),("t1",1),(1,1)),
  tomadas=[dict(ate="t1",palco="ceu",camera=dict(de=LARGO(-3,44,62,0.14),para=LARGO(-2,41,62,0.14))),
           dict(ate=1,palco="ceu",camera=dict(de=pt([0.5,31.4,11.5],[-1.5,30.0,0],50),para=pt([-0.4,31.0,10.0],[-1.7,30.0,0],50)))],
  zecaTela=[ZT(acao="em-pe",exp="surpreso",pose=OLHA_CEU,ate="t1")],
  gente=[ZECA("cansado",pose=TOSSE,suor=1.0,de="t1",tosse=1.0,tontura=1.0)],c=[])
# 17: feche a cabine (0); o motor amassa o ar e o esquenta (1); esfrie com o ar de fora (2); solte um pouco por uma saída (3)
cenas[17]=M(palco="ceu",aviaoEsc=1.0,aviaoX=AX,aviaoY=AY,aviaoZ=0,**COMANDOS,raiox=1,escuro=1,motorCorte=K((0,0),("t1-0.03",0),("t1+0.05",1),(1,1)),duto=K((0,0),("t1+0.05",0),("t3+0.12",1),(1,1)),
  etiq=["compressor@t1+0.02-t1+0.17","quente@t1+0.17-t2","frio@t2-t3","saida@t3-1.0"],etiqS=1.0,
  camera=cam(pt([-9,28.2,13],[-1.5,28.7,5.2],50),pt([5.5,32.5,16],[5.0,29.8,0],50)),
  gente=[ZECA("sorriso",de="t2")],c=[])
# 18: ESTOL (no fim): inclina demais (0); o ar solta (1); a força some (2); a asa de teste cai (3); carimbo ESTOL; o Zeca de mãos na cabeça
cenas[18]=M(palco="tunel",modelo="placa",anguloAtaque=K((0,0.14),("t0+0.2",0.14),("t0+0.7",0.62),(1,0.62)),sobe=K((0,0.6),("t3-0.02",0.6),("t3+0.22",0.0),(1,0.0)),linhasAr=1,
  solta=K((0,0),("t1",0),("t1+0.1",1),(1,1)),setasForca=K((0,1.0),("t1",1.0),("t2",0),(1,0)),carimboE=K((0,0),("t3",0),("t3+0.1",1),(1,1)),
  camera=cam(T(0.0,2.0,7.8,50,0.06,x0=1.0,up=-0.12),T(0.0,1.8,7.8,50,0.06,x0=1.2,up=-0.12)),
  zecaTela=[ZT(sx=-0.62,sy=-0.12,h=0.42,acao="em-pe",exp="medo",pose=MAOS_CAB,nuvem=False,de="t3")],
  c=[rot("SOLTA",1,-10,96)])
# 19: o avião avisa (1, ALARME); o piloto baixa o nariz (2): o ângulo diminui; o ar gruda de novo (3); a asa volta a levantar (4)
cenas[19]=M(palco="tunel",modelo="placa",anguloAtaque=K((0,0.62),("t2",0.62),("t2+0.12",0.14),(1,0.14)),sobe=0.6,linhasAr=1,
  solta=K((0,0.7),("t2",0.7),("t2+0.12",0.0),(1,0)),setasForca=K((0,0.3),("t2+0.1",0.3),("t3+0.1",1.2),(1,1.2)),
  camera=cam(T(0.0,2.2,8.2,50,0.06,x0=1.2,up=-0.12),T(0.0,2.4,7.6,50,0.06,x0=0.9,up=-0.12)),
  zecaTela=[ZT(sx=-0.62,sy=-0.12,h=0.42,acao="em-pe",exp="alivio",pose=MAOS_CIMA,nuvem=False,de="t3")],
  c=[dict(tipo="rotulo",texto="ALARME",trecho=1,ateTrecho=2,y=40,tamanho=100),rot("NARIZ PRA BAIXO",2,40,84)])
# 20: o avião completo sobe, voa reto, vira, pousa devagar (1) e leva gente (2); vista aérea que sobe; o Zeca comemora em primeiro plano
cenas[20]=M(aviao=True,aviaoX=V(34,4),aviaoY=K((0,24),("t1",24),("t1+0.3",32),("t1+0.6",32),(1,28)),aviaoZ=-50,**COMANDOS,aviaoPitch=K((0,0),("t1",0),("t1+0.2",-0.2),("t1+0.4",-0.05),("t1+0.75",0.0),(1,0.08)),
  aviaoRoll=K((0,0),("t1+0.4",0),("t1+0.6",0.3),("t1+0.8",0),(1,0)),aileron=K((0,0),("t1+0.4",0),("t1+0.6",0.5),("t1+0.8",0),(1,0)),profundor=K((0,0),("t1",0),("t1+0.2",0.4),("t1+0.4",0),(1,0)),
  camera=cam(pt([-1.8,1.5,7.8],[0.6,4.6,-8],56),pt([-3.2,9.0,13.5],[0.8,8.5,-16],58)),
  gente=[G(-1.5,1.2,0.15,"comemorando","eureka")],c=[])
# 21: o avião segue pro pôr do sol; o Zeca olha pra cima; interrogação vira lâmpada (1)
cenas[21]=M(aviao=True,poente=1,aviaoX=V(30,4),aviaoY=V(26,30),aviaoZ=-58,aviaoPitch=V(0,-0.1),**COMANDOS,interroga=K((0,0),("t1+0.05",0),(1,1)),
  camera=cam(pt([-1.8,1.5,7.8],[0.6,4.6,-8],56),pt([-1.4,1.5,7.0],[0.6,4.4,-8],56)),
  gente=[G(-1.5,1.2,0.15,"em-pe","surpreso",pose=OLHA_CEU)],c=[])
# 22: o avião e o Zeca de frente; as quatro chamadas entram uma a uma
cenas[22]=M(aviao=True,poente=1,aviaoX=V(30,14),aviaoY=26,aviaoZ=-58,**COMANDOS,
  camera=cam(pt([-1.8,1.5,7.8],[0.6,4.6,-8],56),pt([-1.4,1.5,7.0],[0.6,4.4,-8],56)),
  gente=[G(-1.5,1.2,0.15,"acenando","sorriso")],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE ESTOL","se já sabia que o avião avisa",1),chamada("compartilhar","COMPARTILHE","com quem tem medo de voar",2),chamada("seguir","SIGA","PRA VER COMO AS COISAS FUNCIONAM",3)])

PALCO_X={"campo":0,"tunel":60,"carro":120,"pista":180,"ceu":240,"janela":300}
def desloca(c,ox):
    for k in ("de","para"):
        if k in c and ox:
            c[k]["pos"][0]=round(c[k]["pos"][0]+ox,3)
            c[k]["alvo"][0]=round(c[k]["alvo"][0]+ox,3)
for d in cenas.values():
    if "tomadas" in d:
        for tm in d["tomadas"]: desloca(tm["camera"],PALCO_X[tm["palco"]])
    else:
        desloca(d["camera"],PALCO_X[d.get("palco","campo")])

SFX={
1:[("vento",0,0.35),("whoosh",2,0.4),("pop",3,0.4),("ding",4,0.4)],
2:[("pop",0,0.4),("whoosh",1,0.4),("impacto_seco",2,0.5),("pop",3,0.3)],
3:[("pop",0,0.4),("motor",1,0.35),("ding",2,0.3)],
4:[("whoosh",0,0.35),("vento",1,0.35),("pop",2,0.3),("ding",3,0.45)],
5:[("pop",0,0.4),("whoosh",1,0.4),("ding",2,0.45),("pop",3,0.4),("carimbo",4,0.5)],
6:[("pop",0,0.4),("motor",1,0.4),("whoosh",2,0.4)],
7:[("jingle",0,0.5),("pop",1,0.5)],
8:[("pop",0,0.4),("whoosh",1,0.4),("pop",2,0.4),("ding",2,0.45)],
9:[("pop",0,0.4),("motor",1,0.4),("whoosh",2,0.4)],
10:[("whoosh",0,0.4),("ding",1,0.45),("pop",2,0.4),("pop",3,0.4)],
11:[("vento",1,0.3),("whoosh",2,0.3),("pop",3,0.3)],
12:[("rangido",0,0.4),("whoosh",1,0.4)],
13:[("pop",0,0.4),("pop",1,0.4),("ding",2,0.45),("whoosh",3,0.4),("jingle",4,0.4)],
14:[("pop",1,0.4),("pop",2,0.4),("pop",3,0.4)],
15:[("pop",0,0.4)],
16:[("whoosh",0,0.35),("respiracao",1,0.4),("pop",2,0.3)],
17:[("pop",0,0.4),("motor",1,0.35),("whoosh",2,0.4),("ding",3,0.45)],
20:[("jingle",0,0.5),("whoosh",1,0.4),("pop",2,0.4)],
21:[("pop",0,0.4),("whoosh",1,0.4),("ding",2,0.45)],
22:[("pop",0,0.5),("pop",1,0.45),("pop",2,0.45),("ding",3,0.55)],
18:[("rangido",0,0.4),("whoosh",1,0.4),("pop",2,0.4),("impacto_seco",3,0.5)],
19:[("pop",1,0.4),("whoosh",2,0.35),("ding",3,0.45)],
}
AMB={i:("vento",0.12) for i in range(1,23)}
for i in (4,5,18,19): AMB[i]=("nenhuma",0)
for i in (3,6,7): AMB[i]=("dia",0.1)
for i in (11,): AMB[i]=("nenhuma",0)

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
assert set(cenas)==set(range(1,23)) and set(SFX)==set(range(1,23))

def dur(i,f):
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    d=palavras/2.85+0.25*NLEVE[i-1]
    return round(max(2.2,d),1)
bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    cena={"cenario":"aviao",**d}
    sn,v=AMB.get(i,("vento",0.1))
    cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    b={"texto":f,"duracao":dur(i,f),"cena":cena}
    if i>=12: b["falante"]="cont"   # só mantém a seed do pedido (cache): ver "vozes"
    if i==11:
        # pedido de voz próprio ("hom"); a pausa só vale entre pedidos. Depois dele vem a batida do cartão (11b), com voz sóbria.
        b["falante"]="hom"; b["pausa"]=0.25
    bat.append(b)
    if i==11:
        # 11b: cartão de homenagem ao Lito COM voz sóbria ("Turbulência não derruba avião.") e ambiência leve; mesma cena da 11, corte seco
        c2=copy.deepcopy(cena); fim=c2["camera"]["para"]
        c2["camera"]={"de":fim,"para":fim}
        c2["turbul"]=K((0,0.55),(1,0.55)); c2["homenagem"]=K((0,0),(0.1,1),(1,1))
        c2["zecaTela"][0]["copo"]=K((0,1),(1,1))
        c2["transicao"]="corte"; c2["ambiencia"]={"som":"vento","volume":0.07}; c2["sfx"]=[]
        bat.append({"texto":"[serious] [calm] Turbulência não derruba avião.","duracao":3.3,"cena":c2,"falante":"serio","pausa":0.87})
for i,b in enumerate(bat,1):
    txt=(b["texto"]+json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False)).lower()
    if i<7: assert not re.search(r'\basa\b|"asa|asa@',txt),(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":16,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"vozes":{"hom":{"seed":5},"serio":{"velocidade":1.0,"estabilidade":1.0},"cont":{"seed":-100}},"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
