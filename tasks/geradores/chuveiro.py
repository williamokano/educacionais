import json,re,sys
md=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','roteiro-chuveiro.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==20,len(falas)
Z=lambda acao="em-pe",exp="sorriso",**k: dict(id="zeca",acao=acao,expressao=exp,pos=[-2.6,-0.75],rot=0,fala=False,**k)
rot=lambda txt,tr=0,y=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}))
med=lambda txt,cor="#ff7a2e",tr=0,x=130,y=40: dict(tipo="medida",texto=txt,cor=cor,x=x,y=y,trecho=tr)
cam=lambda de=None,para=None: {k:v for k,v in (("de",de),("para",para)) if v}
B,E,S="bomba","eletrico","solar"
cenas={
1:dict(aquecimento=E,camera=cam("banheiro"),p=[Z()],c=[med("~1/4 DA CONTA DE LUZ","#ff5a3c",1)]),
2:dict(aquecimento=E,camera=cam("casa","banheiro"),p=[Z()],c=[]),
3:dict(aquecimento=E,camera=cam("canos","chuveiro"),p=[Z()],c=[rot("SÓ ÁGUA FRIA",1)]),
4:dict(aquecimento=E,camera=cam("chuveiro"),p=[Z()],c=[med("ATÉ 7.500 W = 750 LEDs","#ff5a3c",0,110)]),
5:dict(aquecimento=E,camera=cam("pessoa"),p=[Z("em-pe","pensativo")],c=[dict(tipo="comparacao",itens=[dict(texto="RESISTÊNCIA",valor=1,rotulo="1 kWh",cor="#ff8a3d"),dict(texto="BOMBA DE CALOR",valor=2.5,rotulo="2 a 3 kWh",cor="#5bd47a")],trecho=1)]),
6:dict(aquecimento=E,gigante=True,camera=cam("gigante"),p=[Z("em-pe","surpreso")],c=[]),
7:dict(aquecimento=B,quente={"de":0,"para":1},canoQuente=0,camera=cam("boiler"),p=[Z()],c=[rot("BOILER",3)]),
8:dict(aquecimento=B,camera=cam("casa","banheiro"),p=[Z("em-pe","alivio")],c=[]),
9:dict(aquecimento=B,canoQuente={"de":0,"para":1,"ini":0.5,"fim":0.7},camera=cam("casa-alta","canos"),p=[Z()],c=[rot("ÁGUA FRIA · ÁGUA QUENTE",2)]),
10:dict(aquecimento=B,paredeAberta=True,camera=cam("misturador"),p=[Z()],c=[rot("MISTURADOR",0)]),
11:dict(aquecimento=B,esfria={"de":0,"para":0.8},camera=cam("area"),p=[Z()],c=[]),
12:dict(aquecimento=B,esfria=1,quente={"de":1,"para":0.15,"ini":0,"fim":0.6},apoio={"de":0,"para":1,"ini":0.7,"fim":0.8},camera=cam("boiler-perto"),p=[Z("tremendo","cansado")],c=[rot("RESISTÊNCIA DE RESERVA",3)]),
13:dict(aquecimento=S,camera=cam("laje","placa"),p=[Z()],c=[rot("AQUECEDOR SOLAR",1)]),
14:dict(aquecimento=S,camera=cam("placa-perto"),p=[Z()],c=[]),
15:dict(aquecimento=S,camera=cam("termossifao"),p=[Z()],c=[]),
16:dict(aquecimento=S,camera=cam("termossifao"),p=[Z()],c=[rot("TERMOSSIFÃO",1)]),
17:dict(aquecimento=S,nublado={"de":0,"para":1,"ini":0,"fim":0.4},camera=cam("placa"),p=[Z()],c=[]),
18:dict(aquecimento=S,camera=cam("casa-alta"),p=[Z("em-pe","sorriso")],c=[med("~70% MENOS ENERGIA","#5bd47a",1)]),
19:dict(aquecimento=S,fotovoltaica=True,camera=cam("laje","placa"),p=[Z("pensando","pensativo")],c=[]),
20:dict(aquecimento=S,fotovoltaica=True,camera=cam("casa-alta"),p=[Z("em-pe","sorriso")],c=[rot("SIGA PRA VER",2)]),
}
SFX={1:[("chuveiro",0,0.5),("agua",1,0.5)],2:[("pop",2,0.5)],3:[("agua",1,0.5)],4:[("impacto",0,0.6)],5:[("ding",1,0.5)],6:[("impacto",1,0.6),("whoosh",0,0.5)],
7:[("pop",3,0.6)],8:[("ding",1,0.6)],9:[("agua",2,0.5)],10:[("clique",1,0.8)],11:[("sopro",2,0.6)],12:[("zumbido",3,0.4)],
13:[("whoosh",0,0.5),("pop",1,0.6)],16:[("ding",1,0.6)],17:[("trovao",0,0.35)],18:[("ding",1,0.6)],19:[("pop",3,0.6)],20:[("pop",2,0.7)]}
AMB={1:("vento",0.25),13:("dia",0.3),17:("chuva",0.3),18:("dia",0.3)}
bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); p=d.pop('p'); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"banho",**d,"personagens":p}
    if c: cena["cartoes"]=c
    if i in AMB: cena["ambiencia"]={"som":AMB[i][0],"volume":AMB[i][1]}
    if i in SFX: cena["sfx"]=[{"som":a,"trecho":t,"volume":v} for a,t,v in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":4,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas', sum(b['duracao'] for b in bat),'s')
