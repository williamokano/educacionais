import json,re,sys,os,math
# Gera episodios/airfryer/roteiro.json (episódio 9, "como fritar batata sem fritura", versão 2: 30 batidas) a partir da tabela de cenas de tasks/roteiro-airfryer.md.
# As falas vêm sempre do .md; as cenas, os cartões e os efeitos ficam aqui. Uso (da raiz do repositório):
#   python3 tasks/geradores/airfryer.py episodios/airfryer/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/airfryer/roteiro.json --mudo  (o render lê o episode.json que ele grava)
# REGRA: o nome do aparelho só aparece em rótulo, cartão ou texto de tela a partir da batida 26 (a fala dá o nome na 26).
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-airfryer.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==30,len(falas)
NLEVE=[f.count('[leve]') for f in falas]   # trecho máximo de cada batida = número de [leve]

# ---------- cenário em ESCALA REAL (as mesmas constantes de motor/banco/series/explicadores/cozinha*.tsx) ----------
# o Zeca tem ~1,7 m; bancada 0,9 m; fogão (x -1,0..-0,2) com o forno embaixo das bocas e a panela na boca da esquerda (x -0,8);
# a caixinha / airfryer fica na bancada em x 0,45; o micro-ondas em x 1,2.
CY=0.9; XS=-0.6; XB=0.45; XM=1.2
M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
def T(cx,ty,D,fov=50,el=0.14):
    """Câmera de frente, a D metros, olhando o ponto (cx, ty) do plano do corte. Em escala real: com D ≈ 2,3 a 3,4 m o Zeca (1,7 m) cabe inteiro."""
    return dict(pos=[cx,round(ty+el*D,3),D],alvo=[cx,ty,0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
def rota(*ks): return [dict(p=p,**c) for p,c in ks]

# ---------- cartões ----------
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
termo=lambda txt,de,para,dur,tr=0,x=10: dict(tipo="termometro",trecho=tr,de=de,para=para,dur=dur,texto=txt,x=x,y=60)
cron=lambda de,ate,tr=0: dict(tipo="cronometro",trecho=tr,de=de,ate=ate)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))

# ---------- gente (o Zeca é desenhado pelo próprio cenário) ----------
G=lambda x=0,z=0.3,rot=0,acao="em-pe",exp="neutro",**k: dict(id="zeca",x=x,z=z,rot=rot,acao=acao,exp=exp,**k)
ZF=lambda x,acao,exp,**k: G(x,0.3,-1.0,acao,exp,**k)       # de frente para a esquerda (para o fogão ou a bancada), inteiro

# ---------- estados reutilizáveis ----------
def OV(forno,**k): return M(dict(forno=forno,bandeja=1,pilha=True,res=0.5,vent=1,fan=1,sai=1),k)   # forno em cena (sai=1: a caixinha já está na bancada)
FOGAOV=lambda **k: M(dict(forno=0,bandeja=1,pilha=True,res=0.5,vent=0,fan=0,sai=0,porta=0),k)      # o forno do próprio fogão (sem ventilador até a batida 9)
DOURADA=0.46
BC=dict(porta=0,cesto=1,gaveta=1,doura=DOURADA,brilho=0.7)
B2=dict(forno=2,bandeja=1,pilha=True,cesto=1,gaveta=1,brilho=0.7,porta=0,resPos=1,vent=1,fan=1,sai=1)
AF=dict(forno=2,corpo=1,painel=1,bandeja=1,pilha=True,cesto=1,gaveta=1,doura=DOURADA,brilho=0.7,resPos=1,sai=1,fan=1,vent=1)
AF2=M(AF,pilha=False)

cenas={}
# ===== 1-4: a panela no fogão =====
cenas[1]=dict(fogo=1,chia=V(0.7,1),bolhas=V(0.2,1,0.3,1),cai=V(0,1.4,0.04,0.5),espirra=V(0,1,0.3,0.5),
  camera=cam(T(-0.6,0.85,3.2),T(-0.6,0.85,2.9)),
  gente=[G(-0.1,0.3,-1.2,acao=[[0.3,"mexendo","concentrado"],[1,"mexendo","dor"]],queima=V(0,0.95,0.38,0.62),braco="E")],c=[])
cenas[2]=dict(fogo=1,chia=1,bolhas=1,cai=1.4,espirra=1,sujo=V(0,1,0.1,0.9),
  camera=cam(T(-0.6,0.85,3.1),T(-0.6,0.85,2.8)),
  gente=[G(-0.1,0.3,-1.2,acao="mexendo",exp="dor",queima=0.95,oleoBraco=V(0,1,0.1,0.8),manchas=V(0,1,0.2,0.9),braco="E")],c=[])
cenas[3]=dict(fogo=0.5,chia=V(1,0.2,0.4,0.9),bolhas=V(1,0.1,0.4,0.9),cai=1.4,tampa=V(0,1,0.08,0.5),espirra=V(1,0,0.2,0.65),sujo=V(1,0,0.55,0.98),
  camera=cam(T(-0.5,0.8,2.9),T(-0.5,0.8,2.7)),
  gente=[G(-0.3,0.3,-1.2,acao="em-pe",exp="alivio",manchas=V(1,0,0.55,0.98))],c=[],etiq=["tampa@0.3"],etiqS=0.4)
cenas[4]=dict(fogo=0.5,chia=0.6,bolhas=0.4,cai=1.4,tampa=V(1,0,0.0,0.3),saida=V(0,1,0.4,0.95),guardanapo=V(0,1,0.3,0.45),mancha=V(0,1,0.7,1),
  camera=cam(T(-0.25,0.8,3.4),T(-0.25,0.8,3.2)),gente=[G(0.45,0.3,-1.2,acao="mao-na-testa",exp="tenso")],c=[])
# ===== 5-10: o forno do fogão =====
SC=T(-0.45,0.5,3.4)
cenas[5]=FOGAOV(panela=V(1,0,0.0,0.25),fogo=V(0.5,0,0,0.25),bandeja=V(0,1,0.35,0.75),porta=V(0,1,0.55,0.9),luzForno=V(0,1,0.7,1),
  camera=cam(T(-0.4,0.62,3.8),T(-0.4,0.62,3.6)),
  gente=[G(0.05,0.3,-1.0,acao=[[0.3,"em-pe","concentrado"],[0.8,"mexendo","concentrado"],[1,"em-pe","concentrado"]],exp="concentrado")],c=[])
cenas[6]=FOGAOV(porta=1,luzForno=1,panela=0,seca=V(0,1),doura=V(0,0.08),camera=cam(T(-0.4,0.62,3.7),T(-0.4,0.62,3.5)),gente=[ZF(0.05,"bracos-cruzados","cansado")],c=[cron("0:00","0:25",0)])
cenas[7]=FOGAOV(panela=0,luzForno=V(1,0.3,0,0.2),porta=V(1,0,0,0.12),seca=V(1,0.1,0.4,0.8),doura=V(0.08,DOURADA,0.45,1),brilho=V(0,0.7,0.4,0.7),garrafa=V(0,1,0.02,0.2),fio=V(0,1,0.2,0.4),
  camera=cam(T(-0.45,0.62,3.4),T(-0.45,0.58,3.0)),gente=[ZF(0.0,"explicando","eureka")],c=[],etiq=["fio@0.3"],etiqS=0.3)
cenas[8]=FOGAOV(panela=0,solo=1,pilha=False,doura=0.2,setasDe=0.12,capa=V(0,1,0,0.2),camera=cam(T(-0.6,0.45,1.7),T(-0.6,0.45,1.5)),gente=[],
  c=[termo("BATATA",0.12,0.36,5.5,0)],etiq=["capa@0.45"],etiqS=0.2)
cenas[9]=FOGAOV(panela=0,solo=1,pilha=False,doura=V(0.2,0.3,0.2,1),setasDe=0.0,vent=V(0,1,0,0.35),fan=V(0,1,0,0.3),capa=V(1,0,0.3,0.75),camera=cam(T(-0.6,0.5,1.8),T(-0.6,0.5,1.6)),gente=[],
  c=[termo("BATATA",0.35,0.85,3.5,0)],etiq=["ventilador@0.2"],etiqS=0.22)
cenas[10]=FOGAOV(panela=0,vent=1,fan=1,doura=0.3,setas="fraco",camera=cam(T(-0.4,0.62,3.7),T(-0.4,0.62,3.5)),gente=[ZF(0.05,"mao-na-testa","cansado")],c=[cron("0:00","0:40",0)])
# ===== 11-12: a caixinha =====
cenas[11]=M(FOGAOV(panela=0,vent=1,fan=1,doura=V(0.3,0.36)),forno=V(0,1,0.05,0.5),sai=V(0,1,0.45,0.95),setas="forte",
  camera=cam(T(0.15,0.7,4.8),T(0.25,0.75,4.2)),
  gente=[G(x=V(0.1,1.05,0.0,0.4),z=0.3,rot=V(1.3,-1.0,0.3,0.45),acao=[[0.4,"andando","sorriso"],[1,"explicando","sorriso"]],exp="sorriso")],c=[termo("FORNO",0.2,0.95,2.6,1)])
cenas[12]=OV(1,porta=0,doura=0.5,expo=0,frio=1,setas="topo",camera=cam(T(0.5,1.1,2.0),T(0.5,1.1,1.8)),gente=[ZF(1.6,"cocando-cabeca","cansado")],c=[],etiq=["cru@0.3"],etiqS=0.25)
# ===== 13-16: cesto, casca × meio, pinga, gaveta =====
cenas[13]=OV(1,porta=0,cesto=V(0,1,0.0,0.5),doura=V(0.5,DOURADA,0.45,0.9),expo=V(0,1,0.5,0.9),frio=V(1,0,0.5,0.9),setas="laco",setasDe=0.33,brilho=0.7,
  camera=cam(T(0.45,1.02,1.5),T(0.45,1.02,1.35)),gente=[],c=[],etiq=["cesto@0.3"],etiqS=0.22)
cenas[14]=OV(1,**BC,fatia=V(0,1,0,0.2),fatiaTam=1.0,pen=V(0.1,2.4,0.2,0.75),fantasma=V(0,1,0.25,0.4),penF=V(0.08,0.5,0.3,1.0),
  camera=cam(T(0.36,1.05,1.9),T(0.36,1.05,1.75)),gente=[],c=[termo("CENTRO",0.2,0.85,4.0,1)],etiq=["casca@0.12"],etiqS=0.2)
cenas[15]=OV(1,porta=0,cesto=1,doura=DOURADA,brilho=0.7,pinga=V(0,1,0,0.3),mancha1=V(0,1,0.2,1),camera=cam(T(0.45,1.0,1.5),T(0.45,1.0,1.35)),gente=[],c=[])
cenas[16]=OV(1,porta=0,cesto=1,doura=DOURADA,brilho=0.7,pinga=1,gaveta=V(0,1,0.05,0.5),mancha1=V(1,0,0.4,0.7),camera=cam(T(0.45,1.0,1.5),T(0.45,1.0,1.35)),
  gente=[],c=[],etiq=["gaveta@0.15"],etiqS=0.2)
# ===== 17-20: resistência, termostato =====
cenas[17]=OV(1,**BC,resPos=0,res=0.6,dist=V(0,1,0.3,0.5),camera=cam(T(0.5,1.1,2.0),T(0.5,1.1,1.85)),gente=[ZF(1.15,"bracos-cruzados","cansado")],c=[cron("0:00","0:15",0)])
cenas[18]=OV(V(1,2,0,0.45),**BC,resPos=V(0,1,0.3,0.8),res=V(0.6,0.95,0.3,0.8),vent=1,setas="quente",setasDe=0.7,camera=cam(T(0.5,1.1,1.9),T(0.42,1.08,1.3)),
  gente=[ZF(1.5,"explicando","sorriso")],c=[],etiq=["resistencia@0.45"],etiqS=0.2)
cenas[19]=M(B2,res=V(0.6,1,0,0.8),temp=V(0.45,1.12,0,1),termo=True,linha=1,doura=V(DOURADA,0.8,0.15,1),fumaca=V(0,1,0.45,1),
  camera=cam(T(0.4,1.08,1.25),T(0.4,1.08,1.15)),gente=[ZF(1.5,"surpreso","preocupado")],c=[cron("0:00","0:30",0)])
cenas[20]=M(B2,termostato=True,termo=True,linha=1,sensor=V(0,1,0,0.25),doura=DOURADA,camera=cam(T(0.4,1.08,1.25),T(0.4,1.08,1.15)),gente=[ZF(1.4,"apontando","eureka")],c=[],etiq=["termostato@0.1"],etiqS=0.15)
# ===== 21-23: esquecer, temporizador, resultado =====
cenas[21]=M(B2,res=0.55,doura=V(DOURADA,1,0.0,0.6),fumaca=V(0,1,0.1,0.6),relogio=True,relogioVel=0.9,sensor=1,
  camera=cam(T(0.5,1.15,1.3),T(0.5,1.15,1.2)),gente=[G(x=V(1.0,2.8,0.12,0.9),z=0.3,rot=1.4,acao="andando",exp="preocupado")],c=[])
cenas[22]=M(B2,painel=V(0,1,0,0.2),contagem=V(5,0,0.2,0.52),res=V(0.95,0,0.5,0.58),vent=V(1,0,0.5,0.58),sino=V(0,1,0.56,0.62),doura=DOURADA,sensor=1,
  camera=cam(T(0.5,1.15,1.3),T(0.5,1.15,1.2)),
  gente=[G(x=V(2.8,1.05,0.5,0.95),z=0.3,rot=-1.4,acao=[[0.92,"andando","eureka"],[1,"em-pe","eureka"]],exp="eureka")],c=[],etiq=["temporizador@0.05"],etiqS=0.22)
cenas[23]=M(B2,painel=1,doura=DOURADA,vapor=V(0,1,0.3,1),partida=V(0,1,0.25,0.55),res=0.4,
  camera=cam(T(0.5,1.05,1.2),T(0.5,1.05,1.05)),gente=[G(1.3,0.3,-0.7,acao=[[0.5,"pensando","sorriso"],[1,"comemorando","sorriso"]],exp="sorriso",segura="palito",braco="D")],c=[])
# ===== 24-25: revelação e resumo =====
cenas[24]=M(AF,corpo=V(0,1,0,0.35),painel=V(0,1,0.1,0.4),destaque=V(0,1,0.34,1),puxaPulso=[0.4,0.8],res=0.5,
  camera=cam(T(0.45,1.0,1.2),T(0.45,1.0,1.1)),gente=[G(0.72,0.0,-0.6,"comemorando","sorriso",y=0.9,esc=0.26)],
  c=[rot("AIRFRYER",1,40,130)],etiq=["afVentilador@0.36-0.56","afResistencia@0.5-0.72","afCesto@0.66-0.88","afGaveta@0.82"],etiqS=0.17,etiqYmax=0.3,etiqK=0.6)
cenas[25]=M(AF,res=V(0.4,0.9,0,0.3),setas="quente",setasDe=0.2,camera=cam(T(0.45,1.0,1.45),T(0.45,1.0,1.3)),gente=[ZF(1.45,"explicando","sorriso")],c=[],
  etiq=["afVentilador@0.28-0.62","afResistencia@0.55"],etiqS=0.17,etiqK=0.65)
# ===== 26-28: o papel manteiga =====
cenas[26]=M(AF2,papel=V(0,1,0.15,0.55),papelEntra=V(0,1,0.15,0.55),res=0.5,vent=0.4,camera=cam(T(0.42,1.0,1.3),T(0.42,1.0,1.2)),
  gente=[G(-0.42,0.3,1.1,acao="mexendo",exp="alerta")],c=[dict(tipo="atencao",trecho=1,y=40)])
cenas[27]=M(AF2,papel=1,ventoPapel=V(0,1,0.0,0.55),fogoPapel=V(0,1,0.55,1),res=1,vent=1,setasDe=0.0,camera=cam(T(0.45,1.05,1.25),T(0.45,1.08,1.1)),
  gente=[],c=[])
cenas[28]=M(AF2,pilha=True,papel=1,doura=0.12,queda=V(0,1,0.0,0.4),qtd=V(1,0,0.5,0.62),marcas="ambas",marcaK=V(0,1,0.12,0.22),marcaK2=V(0,1,0.62,0.72),res=0.2,vent=0,
  camera=cam(T(0.45,1.0,1.3),T(0.45,1.0,1.2)),gente=[G(1.05,0.3,-1.0,"em-pe","alivio")],c=[],etiq=["pesado@0.15-0.52","vazio@0.64"],etiqS=0.17)
# ===== 29-30: o gancho e as chamadas =====
cenas[29]=M(AF,res=0.3,micro=V(0,1,0.25,0.5),interroga=V(0,1,0.5,1),camera=cam(T(0.95,0.95,3.7),T(0.95,0.95,3.4)),
  gente=[G(1.42,0.3,-0.4,"pensando","pensativo")],c=[])
cenas[30]=M(AF,res=0.3,micro=1,interroga=0,camera=cam(T(0.95,2.25,5.0),T(0.95,2.25,4.8)),
  gente=[G(1.42,0.3,-0.4,"comemorando","sorriso")],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE","o que você faz na sua",1),chamada("compartilhar","COMPARTILHE",None,2),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",4)])

# (som, trecho, volume[, em]) — só nomes que existem em motor/pipeline/sfx.py; o trecho nunca passa do número de [leve] da fala
SFX={
1:[("chiado",0,0.5),("pop",0,0.6,0.5),("estalo",1,0.6),("impacto_seco",2,0.35)],
2:[("chiado",0,0.5),("pop",0,0.5,0.4),("estalo",1,0.5),("chiado",2,0.4),("pop",2,0.4,0.5)],
3:[("whoosh",0,0.5),("impacto_seco",0,0.5,0.45)],
4:[("pop",0,0.5),("agua",1,0.45),("papel",1,0.4,0.5)],
5:[("whoosh",0,0.5),("rangido",1,0.5),("clique",1,0.6,0.9),("zumbido",1,0.22,0.3)],
6:[("tique_relogio",0,0.35),("sopro",1,0.3),("rangido",2,0.3)],
7:[("agua",0,0.35),("chiado",1,0.4),("ding",2,0.5)],
8:[("pop",0,0.5),("sopro",1,0.4),("tique",2,0.4)],
9:[("whoosh",0,0.5),("zumbido",1,0.3),("sopro",2,0.5)],
10:[("sopro",0,0.3),("rangido",1,0.3),("tique_relogio",2,0.35)],
11:[("rangido",0,0.45),("whoosh",1,0.5),("ding",2,0.4)],
12:[("estalo",0,0.4),("pop",1,0.4)],
13:[("arrastar",0,0.4),("whoosh",1,0.5),("clique",2,0.5),("sopro",3,0.5),("ding",4,0.5)],
14:[("tique_relogio",0,0.3),("pop",1,0.4),("bips",2,0.3),("ding",3,0.5)],
15:[("agua",0,0.4),("pop",1,0.4)],
16:[("arrastar",0,0.5),("clique",0,0.5,0.9),("agua",0,0.3,1.1)],
17:[("pop",0,0.4),("tique_relogio",1,0.35)],
18:[("whoosh",0,0.5),("zumbido",1,0.35),("sopro",2,0.45)],
19:[("tique",0,0.4),("bips",0,0.4,0.8),("chiado",1,0.4),("estalo",1,0.4,0.5)],
20:[("clique",0,0.5),("clique",1,0.5),("clique",2,0.5),("clique",3,0.5),("ding",0,0.4,0.6)],
21:[("passos",0,0.4),("tique_relogio",1,0.4),("chiado",1,0.3)],
22:[("tique",0,0.4),("bips",2,0.5),("ding",2,0.6,0.5),("passos_rapidos",3,0.4)],
23:[("estalo",0,0.5),("pop",1,0.5,0.5),("ding",1,0.5)],
24:[("whoosh",0,0.4),("pop",0,0.5,0.4),("jingle",1,0.5),("ding",1,0.5,0.6),("rangido",1,0.4,1.2)],
25:[("sopro",0,0.4),("zumbido",1,0.35),("clique",2,0.4)],
26:[("papel",0,0.55),("bips",1,0.5),("estalo",1,0.4,0.5)],
27:[("sopro",0,0.5),("papel",0,0.5,0.5),("estalo",1,0.5),("batimento_rapido",1,0.4)],
28:[("impacto",0,0.5),("ding",0,0.5,0.4),("pop",1,0.5)],
29:[("pop",0,0.5),("ding",1,0.5,0.6),("pop",2,0.5)],
30:[("pop",0,0.5),("pop",1,0.5),("pop",2,0.5),("ding",4,0.6)],
}
AMB={1:("fogo",0.15),5:("nenhuma",0),17:("drone",0.1),22:("nenhuma",0),26:("drone",0.12),28:("nenhuma",0),29:("dia",0.08)}

# confere que todo som existe na biblioteca e que nenhum trecho passa do número de [leve]
reg=open(os.path.join(AQUI,'..','..','motor','pipeline','sfx.py'),encoding='utf-8').read().split('REGISTRO = {')[1]
validos=set(re.findall(r'^\s+"([a-z_]+)":\s+\(',reg,re.M))
for i,l in SFX.items():
    for sf in l:
        assert sf[0] in validos,(i,sf[0])
        assert sf[1]<=NLEVE[i-1],(i,sf)
for i,(sn,v) in AMB.items(): assert sn=="nenhuma" or sn in validos,(i,sn)
for i,c in ((i,cc) for i,d in cenas.items() for cc in [d['c']]):
    for cartao in c:
        if 'trecho' in cartao: assert cartao['trecho']<=NLEVE[i-1],(i,cartao)
assert set(cenas)==set(range(1,31)) and set(SFX)==set(range(1,31))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    if d.get('camera')=={}: d.pop('camera')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"cozinha",**d}
    if i in AMB:
        sn,v=AMB[i]
        cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2],**({"em":sf[3]} if len(sf)>3 else {})} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})

# a palavra do aparelho só pode aparecer em cena (rótulo, cartão, texto de tela) a partir da batida 24 (a da revelação)
for i,b in enumerate(bat,1):
    cena=json.dumps(b["cena"],ensure_ascii=False).lower()
    if i<24: assert "airfryer" not in cena and "air fryer" not in cena,(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":9,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
efeitos=sum(len(v) for v in SFX.values())
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',efeitos,'efeitos')
