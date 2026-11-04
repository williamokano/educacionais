import json,re,sys,os,math
# Gera episodios/elevador/roteiro.json (episódio 14, "como o elevador não cai quando a corda arrebenta") a partir da tabela de cenas de tasks/roteiro-elevador.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/elevador.py episodios/elevador/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/elevador/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/elevador.tsx (veja a lista de campos no topo). Poço em x = 0 (cabine), polia em x = 0,7, contrapeso em x = 1,4; a demo de 1854 fica em x = 40.
# REGRA: o nome "elevador" só aparece a partir da batida 17 (fala, rótulo, cartão).
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-elevador.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==22,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

def palavras_de(i):
    t=re.sub(r'\[[a-z]+\]','',falas[i-1]).replace('*','').replace('_','')
    return t.split()
def W(i,pat,fim=False):
    """progresso (0..1 da batida) em que a palavra que casa com `pat` começa (ou termina, com fim=True); as palavras têm a mesma duração no rascunho mudo"""
    ps=palavras_de(i)
    for k,w in enumerate(ps):
        if re.search(pat,w,re.I): return round((k+(1 if fim else 0))/len(ps),3)
    raise AssertionError((i,pat))

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
KF=lambda *pares: [list(p) for p in pares]   # chaves [progresso, valor]: abre e fecha na mesma batida
def T(cx,ty,D,fov=50,el=0.1,x0=None,z=None):
    return dict(pos=[round(x0 if x0 is not None else cx,3),round(ty+el*D,3),z if z is not None else D],alvo=[cx,ty,0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
FIXA=lambda cx,ty,D,fov=50,x0=None: cam(T(cx,ty,D,fov,x0=x0),T(cx,ty,D-0.1,fov,x0=x0))
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
LR=lambda D,f=0.08: round(f*D,2)   # raio da lupa ~ 17% da largura visível (lupa pequena)

# pessoas: o Zeca (id padrão) e os extras
def G(id="zeca",x=0.0,z=0.0,rot=0.0,acao="em-pe",exp="sorriso",**k): return dict(id=id,x=x,z=z,rot=rot,acao=acao,exp=exp,**k)
NP=lambda **k: G(naPlat=True,**k)   # sobre a plataforma: x, z e y relativos ao piso
VIRA_E=-math.pi/2   # de frente para -x (para a corda)
GRAB={"ombroE.x":-1.0,"ombroD.x":-1.0,"cotoveloE.x":-0.4,"cotoveloD.x":-0.4,"ombroE.z":0.1,"ombroD.z":-0.1,"maos":0.3}
APOIA={"ombroE.x":-1.1,"ombroD.x":-1.1,"cotoveloE.x":-0.3,"cotoveloD.x":-0.3,"ombroE.z":0.05,"ombroD.z":-0.05,"maos":0.3,"tronco.x":0.12}
RECUA={"ombroE.x":-1.7,"ombroD.x":-1.7,"cotoveloE.x":-0.6,"cotoveloD.x":-0.6,"tronco.x":-0.25,"maos":0.9}
POLEGAR={"ombroD.x":-1.25,"cotoveloD.x":-1.5,"ombroD.z":-0.12,"maos":0.05,"ombroE.z":0.12,"cotoveloE.x":-0.18}
ERGUE={"ombroE.x":-2.6,"ombroD.x":-2.6,"cotoveloE.x":-0.4,"cotoveloD.x":-0.4,"tronco.x":-0.15,"maos":0.2}
GOLPE={"ombroE.x":-1.3,"ombroD.x":-1.3,"cotoveloE.x":-0.2,"cotoveloD.x":-0.2,"tronco.x":0.35,"maos":0.2}
BAIXO={"ombroE.x":-0.7,"ombroD.x":-0.7,"cotoveloE.x":-0.5,"cotoveloD.x":-0.5,"maos":0.3}
CHAPEU={"ombroD.z":-2.4,"cotoveloD.z":-0.3,"ombroD.x":-0.3,"maos":1}
CAIDO={"tronco.x":0.4,"cabeca.x":0.35,"ombroE.x":0.1,"ombroD.x":0.1,"cotoveloE.x":-0.15,"cotoveloD.x":-0.15}

# camadas de estado (acumulam: cada peça só entra quando a fala a introduz)
OBRA=dict(plat=0.9)
COM_MOLA=M(OBRA,mola=1,trilhos=1)
MOTORIZADO=M(COM_MOLA,sala=1,motor=1,aco=1,sulcos=1)
COM_CW=M(MOTORIZADO,cw=1)
PREDIO=M(COM_CW,predio=1,sala=1,cordas=4,mola=0)
AJUDANTES=lambda puxa=1: [G("ajudante",2.0,0,VIRA_E,"em-pe","cansado" if puxa==0 else "sorriso",puxa=puxa),G("ajudante2",2.65,0,VIRA_E,"em-pe","cansado" if puxa==0 else "sorriso",puxa=puxa)]

cenas={}
# 1: obra, plataforma sobe puxada pelos ajudantes; os fios da corda desfiam
cenas[1]=M(OBRA,plat=V(0.9,2.6),ajuda=1,desfia=V(0,1,0.3,0.9),
  camera=cam(T(0.85,2.5,7.0,50,0.08,x0=-1.3,z=7.2),T(0.85,3.6,6.6,50,0.08,x0=-0.9,z=6.8)),
  gente=[NP(x=0,z=0.15,rot=0.25,acao=[(0.55,"em-pe","sorriso"),(1,"surpreso","surpreso")],pose=[(0.55,GRAB),(1,{})])]+
        [dict(g,suor=0.6) for g in AJUDANTES(1)],c=[])
# 2: a corda arrebenta (a plataforma despenca e para antes do chão)
a=W(2,'arrebenta',False)
cenas[2]=M(OBRA,plat=2.8,ajuda=1,corte=V(0,1,a,round(a+0.07,3)),corteAt=2.8,corteOff=1.2,quedaIni=round(a+0.08,3),quedaFim=1.0,quedaD=2.15,
  etiq=["corda@%s-%s"%(W(2,'^corda'),W(2,'^e$')),"polia@%s-%s"%(W(2,'^polia'),W(2,'^Quando'))],etiqS=0.9,etiqK=1.0,
  camera=cam(T(0.7,5.9,6.4,50,0.05,x0=-1.4,z=6.6),T(0.7,4.0,7.4,50,0.05,x0=-1.3,z=7.6),tremor=True),
  gente=[NP(x=0,z=0.15,rot=0.2,acao="em-pe",exp="medo",pose=GRAB)]+[G("ajudante",2.0,0,VIRA_E,"surpreso","surpreso"),G("ajudante2",2.65,0,VIRA_E,"surpreso","surpreso")],c=[])
# 3: mola em arco + trilhos com dentes; lupa na mola esticada
D3=4.6
cenas[3]=M(OBRA,plat=0.8,ajuda=0,mola=V(0,1,W(3,'^uma$'),W(3,'^arco')),trilhos=V(0,1,W(3,'^trilhos'),W(3,'^dentes',True)),
  lupa=V(0,1,W(3,'^esticada'),W(3,'^pela')),lupaX=-0.45,lupaY=4.05,lupaR=LR(D3,0.07),lupaModo="mola",
  etiq=["mola@%s"%W(3,'^mola'),"trilho@%s"%W(3,'^trilhos')],etiqS=0.8,
  camera=cam(T(0.1,3.0,D3,50,0.08,x0=-0.9,z=D3),T(0.1,3.0,D3-0.4,50,0.08,x0=-0.7,z=D3-0.4)),
  gente=[NP(x=0,z=0.1,rot=0.1,acao="explicando",exp="sorriso")],c=[])
# 4: a corda arrebenta, a mola solta e as pontas entram nos dentes; a plataforma desce um palmo e para
D4=5.4
c4=W(4,'arrebenta',True)
cenas[4]=M(COM_MOLA,plat=2.4,corte=V(0,1,round(c4-0.04,3),round(c4+0.06,3)),corteAt=2.4,corteOff=0.9,freia=V(0,1,round(c4+0.04,3),round(c4+0.2,3)),freiaD=0.28,
  lupa=1,lupaX=-0.85,lupaY=5.9,lupaR=0.4,lupaModo="mola",etiq=["trava@%s"%W(4,'^travam')],etiqS=0.8,
  camera=cam(T(-0.1,4.9,D4,50,0.05,x0=-0.8,z=D4),T(-0.1,4.8,D4-0.3,50,0.05,x0=-0.6,z=D4-0.3)),
  gente=[NP(x=0,z=0.1,rot=0.1,acao="surpreso",exp="eureka")],c=[])
# 5: feira de 1854, Palácio de Cristal: o homem na plataforma, o ajudante ergue o machado e corta a corda
cenas[5]=M(feira=True,trilhos=1,mola=1,plat=1.6,corteLado="dir",corte=V(0,1,0.84,0.97),machado=V(0,1,W(5,'^cortar'),W(5,'^corda$',True)),
  camera=cam(T(40.8,2.1,11.5,56,0.12,x0=41.2,z=11.5),T(40.7,2.1,8.8,52,0.08,x0=41.0,z=8.8)),
  gente=[NP(id="casaca",x=0,z=0.1,rot=0.1,acao="acenando",exp="sorriso"),
         G("ajudante",2.2,0,VIRA_E,"em-pe","sorriso",pose=[(W(5,'^cortar'),BAIXO),(round(W(5,'^cortar')+0.1,3),ERGUE),(W(5,'^corda$',True),GOLPE),(1,BAIXO)])],c=[])
# 6: a plataforma desce um palmo e para; o povo aplaude; o Zeca sorri no meio do povo
cenas[6]=M(feira=True,trilhos=1,mola=1,plat=1.6,corteLado="dir",corte=1,freia=V(0,1,0.02,0.3),freiaD=0.28,aplauso=V(0,1,0.25,0.6),
  camera=cam(T(40.7,1.9,8.6,52,0.05,x0=40.8,z=8.8),dict(pos=[40.3,2.4,7.0],alvo=[40.5,2.3,0.8],fov=52)),
  gente=[NP(id="casaca",x=0,z=0.1,rot=0.1,acao="acenando",exp="sorriso"),G("ajudante",2.2,0,VIRA_E,"surpreso","sorriso"),
         G("zeca",-0.5,2.3,0,"comemorando","sorriso")],c=[])
# 7: puxar na mão cansa (plataforma carregada não sobe)
cenas[7]=M(COM_MOLA,plat=0.9,ajuda=1,carga=V(0,1,0.05,0.35),
  camera=cam(T(1.1,1.9,7.4,50,0.08,x0=-1.3,z=7.6),T(1.1,1.9,6.8,50,0.08,x0=-1.0,z=7.0)),
  gente=[NP(id="mulher",x=-0.35,z=0.3,rot=0.15,acao="em-pe",exp="surpreso"),NP(id="homemB",x=0.3,z=0.3,rot=-0.15,acao="em-pe",exp="surpreso"),
         G("ajudante",2.0,0,VIRA_E,[(1,"em-pe","cansado")],"cansado",puxa=V(1,0,0.5,0.6),suor=1,incl=V(0,0.35,0.5,0.7)),
         G("ajudante2",2.65,0,VIRA_E,"em-pe","cansado",puxa=V(1,0,0.5,0.6),suor=1,incl=V(0,0.35,0.5,0.7))],c=[])
# 8: motor na polia, corda de aço presa nos sulcos; a plataforma sobe sozinha
D8=6.2
cenas[8]=M(COM_MOLA,sala=1,motor=V(0,1,0.05,0.22),plat=V(2.2,4.3,0.18,1.0),aco=V(0,1,W(8,'^aço',False),W(8,'^aço',True)),sulcos=V(0,1,W(8,'^sulcos'),W(8,'^sulcos',True)),
  lupa=V(0,1,W(8,'^sulcos'),W(8,'^por$')),lupaX=-0.45,lupaY=9.9,lupaR=0.45,lupaModo="sulcos",
  etiq=["motor@%s-%s"%(W(8,'^motor'),W(8,'^A$')),"polia@%s-%s"%(W(8,'^polia'),W(8,'^corda'))],etiqS=0.8,
  camera=cam(T(0.7,7.4,D8,50,0.04,x0=-0.5,z=D8),T(0.7,7.2,D8-0.5,50,0.04,x0=-0.2,z=D8-0.5)),
  gente=[],c=[])
# 9: o motor levanta tudo e esquenta
cenas[9]=M(MOTORIZADO,plat=V(4.3,4.7),carga=1,esforco=V(0,1,0.25,0.7),etiq=["motor@0.05-0.4"],etiqS=0.8,
  camera=cam(T(0.7,6.4,6.8,50,0.04,x0=-0.6,z=6.8),T(0.7,6.6,6.2,50,0.04,x0=-0.3,z=6.2)),
  gente=[NP(id="mulher",x=-0.35,z=0.3,rot=0.15,acao="em-pe",exp="surpreso"),NP(id="homemB",x=0.3,z=0.3,rot=-0.15,acao="em-pe",exp="surpreso")],
  c=[dict(tipo="comparacao",titulo="ESFORÇO DO MOTOR",itens=[dict(texto="SEM PESO",valor=2.7,rotulo="ALTO",cor="#ff6a3a")],trecho=2,y=40)])
# 10: o bloco de ferro desce e se pendura do outro lado; o Zeca apoia a mão nele
cenas[10]=M(MOTORIZADO,plat=5.0,cw=V(0,1,0.1,0.45),etiq=["contrapeso@%s"%W(10,'^peso')],etiqS=0.8,
  camera=cam(T(1.5,1.5,5.0,50,0.06,x0=0.6,z=5.0),T(1.5,1.4,4.6,50,0.06,x0=0.9,z=4.6)),
  gente=[G("zeca",2.35,0.1,VIRA_E,[(0.4,"em-pe","sorriso"),(1,"em-pe","eureka")],"sorriso",pose=[(0.45,{}),(1,APOIA)])],c=[])
# 11: gangorra: um sobe, o outro desce; o esforço do motor encolhe
cenas[11]=M(COM_CW,plat=V(0.6,3.6,0.02,0.9),etiq=[],
  camera=cam(T(0.7,3.0,8.0,50,0.0,x0=-0.5,z=8.0),T(0.7,3.0,8.0,50,0.0,x0=0.2,z=8.0)),
  gente=[NP(x=0,z=0.1,rot=0.1,acao="em-pe",exp="sorriso")],
  c=[dict(tipo="comparacao",titulo="ESFORÇO DO MOTOR",itens=[dict(texto="SEM PESO",valor=2.7,rotulo="ALTO",cor="#ff6a3a"),dict(texto="COM PESO",valor=0.8,rotulo="BAIXO",cor="#5bd47a")],trecho=2,y=40)])
# 12: de uma para quatro cordas; um fio trançado rompe e a corda segura
D12=5.6
cenas[12]=M(COM_CW,plat=2.6,cordas=V(1,4,W(12,'^várias'),W(12,'^cordas',True)),lupa=V(0,1,W(12,'^trançados',False)-0.12,W(12,'^trançados',False)),lupaX=0.55,lupaY=5.2,lupaR=LR(D12,0.11),lupaModo="corda",rompe=V(0,1,0.88,0.98),
  etiq=["cordas@%s-%s"%(W(12,'^várias'),W(12,'^cada'))],etiqS=0.8,
  camera=cam(T(0.4,5.4,D12,50,0.05,x0=-3.0,z=D12+1.0),T(0.4,5.5,D12-0.4,50,0.05,x0=-2.6,z=D12+0.6)),
  gente=[NP(x=0,z=0.1,rot=0.1,acao="explicando",exp="sorriso")],c=[])
# 13: raio-X do poço: a plataforma desce depressa, setas vermelhas
cenas[13]=M(PREDIO,raiox=1,plat=V(5.0,2.4,0.12,0.95),veloz=V(0,1,0.2,0.4),mola=V(1,0,0,0.2),
  camera=cam(T(0.5,5.0,8.0,50,0.0,x0=-1.4,z=8.0),T(0.5,3.4,7.4,50,0.0,x0=-1.2,z=7.4),tremor=True),
  gente=[NP(x=0,z=0.15,rot=0.1,acao="surpreso",exp="surpreso",pose=GRAB)],c=[])
# 14: regulador de velocidade aciona a trava, as garras apertam os trilhos e a plataforma para
cenas[14]=M(PREDIO,raiox=1,regOn=V(0,1,0.02,0.16),reg=V(0,1,0.4,0.5),plat=V(5.0,2.9,0.32,0.58),freia=V(0,1,0.6,0.75),freiaD=0.45,garras=V(0.05,1,0.55,0.62),fagulha=V(0,1,0.6,0.9),
  etiq=["regulador@%s-%s"%(W(14,'^regulador'),W(14,'^passou')),"trava@%s"%W(14,'^trava')],etiqS=0.8,
  camera=cam(T(-0.3,5.3,8.8,50,0.0,x0=-1.6,z=8.8),T(-0.2,4.6,8.0,50,0.0,x0=-1.2,z=8.0),tremor=False),
  gente=[NP(x=0,z=0.15,rot=0.1,acao="em-pe",exp="surpreso",pose=GRAB)],c=[])
# 15: prédio de 3 andares; no segundo, a porta abre e mostra o poço escuro; o Zeca recua
P15=W(15,'^Abriu')
cenas[15]=M(PREDIO,regOn=1,garras=0.05,frente=1,plat=5.0,porta2=V(0,1,P15,round(P15+0.14,3)),
  camera=cam(T(0.1,3.6,7.6,50,0.04,x0=-0.4,z=7.6),T(0.1,3.6,7.0,50,0.04,x0=-0.2,z=7.0)),
  gente=[G("zeca",-0.8,V(1.5,2.0,P15,round(P15+0.2,3)),0.5,"em-pe","sorriso",y=2.5,pose=[(P15,{}),(1,RECUA)])],c=[])
# 16: trava das portas: o pino prende a porta; a plataforma chega, o pino solta, a porta abre; só sobe com tudo fechado
cenas[16]=M(PREDIO,regOn=1,garras=0.05,frente=1,raiox=0.7,
  plat=KF((0,5.0),(0.22,5.0),(0.5,2.5),(0.9,2.5),(1.0,4.2)),
  pino=KF((0,1),(0.5,1),(0.58,0),(0.78,0),(0.86,1),(1,1)),
  porta2=KF((0,0),(0.58,0),(0.7,1),(0.78,1),(0.86,0),(1,0)),
  cabine=0.0,
  lupa=V(0,1,0.04,0.18),lupaX=-1.0,lupaY=5.5,lupaR=0.5,lupaModo="pino",
  etiq=["pino@0.02-0.3","porta@0.5-0.72"],etiqS=0.8,
  camera=cam(T(0.1,3.7,7.6,50,0.04,x0=-0.4,z=7.6),T(0.1,3.6,7.0,50,0.04,x0=-0.2,z=7.0)),
  gente=[],c=[])
# 17: a plataforma vira cabine fechada (elevador!); as peças piscam
cenas[17]=M(PREDIO,regOn=1,garras=0.05,plat=2.5,cabine=V(0,1,0.05,0.5),destaque=V(0,1,0.4,1.0),
  camera=cam(T(0.35,3.0,7.2,50,0.04,x0=-0.6,z=7.2),T(0.35,3.0,6.6,50,0.04,x0=-0.3,z=6.6)),
  gente=[G("zeca",-1.05,1.5,0.3,"comemorando","sorriso")],
  c=[rot("ELEVADOR",1,40,110)])
# 18: o prédio inteiro, peça por peça
cenas[18]=M(PREDIO,regOn=1,garras=0.05,plat=2.5,cabine=1,
  etiq=["cabine@%s-%s"%(W(18,'^cabine'),W(18,'^cordas')),"cordas@%s-%s"%(W(18,'^cordas'),W(18,'^contrapeso')),"contrapeso@%s-%s"%(W(18,'^contrapeso'),W(18,'^trilhos')),"trilho@%s-%s"%(W(18,'^trilhos'),W(18,'^trava')),"trava@%s"%W(18,'^trava')],etiqS=0.85,
  camera=cam(T(0.5,3.4,6.6,50,0.04,x0=-1.0,z=6.6),T(0.5,3.3,6.1,50,0.04,x0=-0.7,z=6.1)),
  gente=[],c=[])
# 19: a cabine sobe, o contrapeso desce; as cordas arrebentam e a trava agarra
c19=W(19,'^arrebentar',True)
cenas[19]=M(PREDIO,regOn=1,cabine=1,plat=KF((0,0.8),(c19,3.4),(1,3.4)),corte=V(0,1,round(c19,3),round(c19+0.08,3)),corteAt=3.4,corteOff=1.2,
  garras=V(0.05,1,round(c19,3),round(c19+0.08,3)),freia=V(0,1,round(c19+0.04,3),round(c19+0.2,3)),freiaD=0.3,fagulha=V(0,1,round(c19+0.06,3),0.97),
  etiq=["trava@%s"%W(19,'^trava')],etiqS=0.8,
  camera=cam(T(0.5,4.4,7.0,50,0.0,x0=-1.2,z=7.0),T(0.5,4.8,6.4,50,0.0,x0=-0.9,z=6.4)),
  gente=[],c=[])
# 20: o Zeca dentro da cabine, polegar para cima
cenas[20]=M(PREDIO,regOn=1,garras=0.05,plat=0.0,cabine=1,cabPorta=V(0,1,0.0,0.15),
  camera=cam(T(0.0,1.35,4.3,45,0.1,x0=0.5,z=4.3),T(0.0,1.35,3.9,45,0.1,x0=0.25,z=3.9)),
  gente=[NP(x=0,z=0.0,rot=0.0,acao="em-pe",exp="sorriso",pose=POLEGAR)],c=[])
# 21: o ponto de interrogação sobe e vira uma escada rolante
cenas[21]=M(PREDIO,regOn=1,garras=0.05,plat=0.0,cabine=1,interroga=V(0,1,0.0,0.45),escada=V(0,1,0.42,0.62),
  camera=cam(T(-2.4,2.4,9.4,50,0.05,x0=-1.9,z=9.4),T(-2.5,2.4,8.6,50,0.05,x0=-2.1,z=8.6)),
  gente=[],c=[])
# 22: fecho com as chamadas
cenas[22]=M(PREDIO,regOn=1,garras=0.05,plat=0.0,cabine=1,cabPorta=0,
  camera=cam(T(0.4,2.5,7.2,50,0.04,x0=-0.6,z=7.2),T(0.4,2.5,6.8,50,0.04,x0=-0.3,z=6.8)),
  gente=[],
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE","o andar mais alto onde você já foi",1),chamada("compartilhar","COMPARTILHE",None,2),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",3)])

SFX={
1:[("whoosh",0,0.35),("estalo",1,0.55)],
2:[("pop",0,0.4),("pop",2,0.4),("estalo",3,0.5),("impacto",4,0.6)],
3:[("pop",0,0.4),("metal",2,0.45),("clique",2,0.4)],
4:[("estalo",0,0.5),("pop",1,0.4),("metal",2,0.55)],
5:[("pop",0,0.4),("whoosh",1,0.4),("estalo",2,0.5)],
6:[("impacto_seco",0,0.5),("jingle",1,0.45)],
7:[("respiracao",0,0.4),("rangido",1,0.4)],
8:[("pop",0,0.4),("motor",1,0.45),("rangido",2,0.4)],
9:[("motor",0,0.4),("zumbido",1,0.3),("chiado",2,0.35)],
10:[("whoosh",0,0.4),("impacto",1,0.5),("ding",2,0.4)],
11:[("rangido",0,0.4),("rangido",1,0.4),("ding",2,0.45)],
12:[("pop",1,0.4),("clique",2,0.4),("estalo",2,0.3)],
13:[("whoosh",0,0.4),("batimento_rapido",1,0.4)],
14:[("pop",0,0.4),("tique",1,0.4),("metal",3,0.55)],
15:[("porta",1,0.5),("coracao",2,0.4)],
16:[("clique",0,0.4),("porta",1,0.5),("porta",2,0.4)],
17:[("jingle",0,0.5),("ding",1,0.5),("pop",1,0.4)],
18:[("pop",0,0.4),("pop",1,0.4),("pop",2,0.4),("ding",3,0.45)],
19:[("elevador",0,0.35),("estalo",1,0.5),("metal",2,0.55)],
20:[("pop",0,0.4),("ding",1,0.45),("ding",2,0.4)],
21:[("whoosh",0,0.4),("ding",1,0.5)],
22:[("pop",0,0.5),("pop",1,0.5),("pop",2,0.5),("ding",4,0.6)],
}
AMB={}
for i in range(1,8): AMB[i]=("dia",0.08)
for i in range(8,13): AMB[i]=("motor",0.1)
AMB[5]=("cidade",0.08); AMB[6]=("cidade",0.08)
for i in range(13,23): AMB[i]=("zumbido",0.06)
AMB[17]=("nenhuma",0); AMB[22]=("nenhuma",0)

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

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"elevador",**d}
    sn,v=AMB[i]
    cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
for i,b in enumerate(bat,1):
    txt=(b["texto"]+json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False)).lower()
    if i<17: assert 'elevador' not in txt,(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":14,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
