import json,re,sys
md=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','roteiro-abs.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==26,len(falas)
ZP=lambda z=0,acao="em-pe",exp="sorriso": dict(id="zeca",acao=acao,expressao=exp,pos=[12.2,z],rot=-1.5708,fala=False)
rot=lambda txt,tr=0,y=None,tam=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}),**({"tamanho":tam} if tam else {}))
fita=lambda tr=0,dur=1.8,txt="REBOBINANDO": dict(tipo="fita",trecho=tr,dur=dur,texto=txt)
term=lambda de,para,dur=3.5,tr=0,txt="CALOR": dict(tipo="termometro",trecho=tr,de=de,para=para,dur=dur,texto=txt,x=120,y=70)
roda=lambda modo,tr=0,tit=None: dict(tipo="roda",modo=modo,trecho=tr,x=130,y=60,**({"titulo":tit} if tit else {}))
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
C=lambda pos,alvo,fov=45: dict(pos=pos,alvo=alvo,fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
# câmeras que seguem o carro (carroZ muda)
SEG_A=C([2.6,2.8,-3],[0,0.9,-14],52)                 # atrás, no começo da derrapada
SEG_B=C([2.8,2.3,-13],[0,0.9,-30],50)                # atrás, perto do obstáculo
OMBRO=lambda z,al: C([14.6,1.6,z],[1.5,1.0,al],56)       # por cima do ombro do Zeca (ele fica em z-0.7), olhando a pista
cenas={
1:dict(carroZ=V(10,-24.9),carroX=V(0,0.3,0.4,1),guinada=V(0,0.16,0.4,1),giro=V(1,0,0.3,0.45),derrapa=V(0,1,0.35,0.5),obstZ=V(-8,-30,0,0.6),luzFreio=V(0,1,0.18,0.2),haz=False,camera=cam(C([2.6,2.8,15],[0,0.9,0],54),SEG_B),p=[],c=[rot("POR QUE ELE NÃO PAROU?",1,y=40,tam=64)]),
2:dict(reverso=True,carroZ=V(-24.9,10),carroX=V(0.3,0),guinada=V(0.16,0),giro=1,derrapa=V(1,0,0,0.5),obstZ=V(-30,-8,0.2,1),luzFreio=V(1,0,0.7,0.75),haz=False,camera=cam(SEG_B,C([2.6,2.8,15],[0,0.9,0],54)),p=[],c=[fita(0,2.4)]),
3:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=V(0,1,0.3,0.65),camera=cam("pedal"),etiq=["pedal","mestre@0.5"],p=[],c=[]),
4:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=0.4,camera=cam("oleo","roda"),etiq=["oleo","tambor@0.45"],p=[],c=[]),
5:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=V(0,1,0.3,0.6),giro=0.3,camera=cam("roda"),etiq=["tambor","sapata@0.3","cilindro@0.55"],p=[],c=[]),
6:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=1,giro=V(0.5,0.12,0.1,1),calor=V(0,0.12),camera=cam("roda","roda-perto"),etiq=["sapata","tambor"],p=[],c=[rot("ATRITO",1,y=60)]),
7:dict(carroZ=V(-2,-20),giro=V(1,0,0.2,1),camera=cam(OMBRO(-12,-6),OMBRO(-12,-20)),p=[ZP(-12.7,"em-pe","alivio")],c=[]),
8:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=1,giro=0.5,calor=V(0.1,1,0,0.9),camera=cam("roda"),p=[],c=[term(0.1,1,4.0,1)]),
9:dict(carroZ=0,corte=True,freio="tambor",pedal=1,giro=0.3,calor=1,fumaca=V(0,0.7,0.2,0.8),camera=cam("roda","roda-perto"),p=[],c=[]),
10:dict(carroZ=0,corte=True,freio="tambor",oleo=True,pedal=V(0.45,1,0.1,0.7),giro=0.3,calor=1,fumaca=0.6,camera=cam("pedal"),etiq=["pedal"],p=[],c=[rot("PEDAL NO FUNDO",1)]),
12:dict(carroZ=0,corte=True,freio="tambor",pedal=0.6,giro=0.6,calor=0.2,gotas=V(0,1,0.1,0.6),camera=cam("roda"),p=[],c=[]),
13:dict(reverso=True,carroZ=0,corte=True,freio="troca",troca=V(0,1,0.2,0.85),pedal=0,giro=0.2,camera=cam("roda"),etiq=["disco@0.7"],p=[],c=[fita(0,1.8)]),
14:dict(carroZ=0,corte=True,freio="disco",oleo=True,pedal=V(0,1,0.3,0.6),giro=0.4,camera=cam("roda"),etiq=["pinca@0.15","pastilha@0.35","disco@0.55"],p=[],c=[]),
15:dict(carroZ=0,corte=True,freio="disco",pedal=1,giro=0.7,calor=V(0.1,0.35),gotas=V(0,1,0.1,0.5),camera=cam("roda"),etiq=["disco"],p=[],c=[term(0.1,0.35,4.0,0)]),
16:dict(carroZ=V(-2,-22.6),giro=V(1,0,0.2,1),camera=cam(OMBRO(-12,-6),OMBRO(-12,-21)),p=[ZP(-12.7,"em-pe","alivio")],c=[]),
17:dict(carroZ=V(-7,-13),giro=V(1,0,0,0.25),derrapa=V(0,1,0.2,0.4),camera=cam(C([2.8,2.2,-4],[0,0.8,-16],50),C([2.5,2.0,-9],[0,0.8,-24],50)),p=[],c=[roda("travada",0)]),
18:dict(carroZ=V(-17,-25.8),giro=0,derrapa=1,batida=V(0,1,0.72,1),camera=cam(C([2.8,2.2,-9],[0,0.8,-22],50),C([2.6,1.8,-17],[0,0.8,-29],46),tremor=True),p=[],c=[]),
19:dict(reverso=True,carroZ=V(-25.8,-10),batida=V(1,0,0,0.4),giro=0,derrapa=V(1,0.5),esterco=V(0,-0.5,0.55,0.8),camera=cam(C([2.6,1.8,-17],[0,0.8,-29],46),C([-2.4,1.0,-8],[0,0.55,-13],40)),p=[],c=[fita(0,1.6),rot("RODA TRAVADA NÃO DIRIGE",2,tam=56)]),
20:dict(carroZ=V(-10,-20),carroX=V(0,1.6),guinada=V(0,-0.12,0,0.4),esterco=V(0,-0.35,0,0.3),giro=1,derrapa=0,camera=cam(C([4.4,1.3,-6],[0.6,0.7,-14],46),C([4.8,1.4,-14],[1.4,0.7,-22],46)),p=[],c=[rot("RODA GIRANDO DIRIGE",1,tam=56)]),
21:dict(carroZ=0,corte=True,freio="disco",oleo=True,pedal=V(1,0.2,0.1,0.4),giro=V(1,0,0.35,0.5),camera=cam("pedal","roda"),etiq=["pedal"],p=[],c=[]),
22:dict(carroZ=0,corte=True,freio="disco",oleo=True,pedal=1,giro=1,abs=True,camera=cam("roda","abs"),etiq=["sensor@0.3"],p=[],c=[]),
23:dict(carroZ=0,corte=True,freio="disco",oleo=True,pedal=1,giro=1,abs=True,ciclo=True,camera=cam("abs"),etiq=["controlador@0.1","valvulas@0.5"],p=[],c=[]),
24:dict(carroZ=0,corte=True,freio="disco",oleo=True,pedal=1,giro=1,abs=True,ciclo=True,camera=cam("roda","pedal"),p=[],c=[roda("ciclo",0),rot("VÁRIAS VEZES POR SEGUNDO",2,y=560,tam=52)]),
25:dict(carroZ=V(-6,-27),carroX=V(0,2.4),guinada=V(-0.14,0,0.35,0.95),esterco=V(-0.3,0,0.4,0.9),giro=0.9,camera=cam(C([-4.5,2.2,-4],[1,0.8,-16],50),C([-4.8,1.6,-18],[1.2,0.7,-28],44)),p=[],c=[]),
26:dict(carroZ=-27,carroX=2.4,giro=0,camera=cam(C([-5,1.6,-20],[1,0.8,-28],44),C([5,15,8],[0,0,-30],54)),p=[],c=[rot("ABS",1,tam=120)]),
27:dict(carroZ=-27,carroX=2.4,giro=0,camera=cam(C([5,15,8],[0,0,-30],54),C([-3,18,14],[0,0,-26],54)),p=[],c=[chamada("curtir","CURTA",0),chamada("comentar","COMENTE","se você sabia que o ABS faz o pedal tremer",1),chamada("compartilhar","COMPARTILHE",None,3),chamada("seguir","SIGA PRA MAIS",None,5)]),
}
SFX={1:[("freada",0,0.7)],2:[("whoosh_reverso",0,0.7),("estatica",0,0.4)],3:[("clique",1,0.6)],5:[("clique",1,0.6)],6:[("chiado",1,0.5)],
7:[("freada",0,0.5)],8:[("chiado",1,0.4)],10:[("bips",1,0.4)],11:[("chiado",1,0.5)],13:[("whoosh_reverso",0,0.7),("estatica",0,0.4)],14:[("clique",1,0.6)],
16:[("freada",0,0.5)],17:[("freada",1,0.7)],18:[("impacto",1,0.9)],19:[("whoosh_reverso",0,0.7),("estatica",0,0.4)],22:[("bips",1,0.5)],23:[("clique",1,0.6),("clique",2,0.6)],
24:[("metal",2,0.4)],25:[("freada",0,0.6)],26:[("ding",0,0.7)],27:[("pop",0,0.5),("pop",1,0.5),("pop",3,0.5),("ding",5,0.6)]}
bat=[]
chaves=[k for k in sorted(cenas) if k!=11]
assert len(chaves)==len(falas),(len(chaves),len(falas))
SFXn={chaves.index(k)+1 if False else k:v for k,v in SFX.items()}
for i,f in enumerate(falas,1):
    ki=chaves[i-1]; d=dict(cenas[ki]); p=d.pop('p'); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"pista",**d,"personagens":p,"ambiencia":{"som":"chuva","volume":0.18}}
    if c: cena["cartoes"]=c
    if ki in SFX: cena["sfx"]=[{"som":a,"trecho":t,"volume":v} for a,t,v in SFX[ki]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":7,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s')
