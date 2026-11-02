import json,re,sys
md=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','roteiro-inversor.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==20,len(falas)
Z=lambda acao="em-pe",exp="sorriso": dict(id="zeca",acao=acao,expressao=exp,pos=[-0.9,-0.85],rot=0.3,fala=False)
rot=lambda txt,tr=0,y=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}))
med=lambda txt,cor="#ffd23f",tr=0,x=130,y=40: dict(tipo="medida",texto=txt,cor=cor,x=x,y=y,trecho=tr)
def onda(modo,rotulo=None,tr=0,titulo=None,cor="#ffd23f",**k):
    d=dict(tipo="onda",modo=modo,trecho=tr,cor=cor,**k)
    if rotulo: d["rotulo"]=rotulo
    if titulo: d["titulo"]=titulo
    return d
cam=lambda de=None,para=None: {k:v for k,v in (("de",de),("para",para)) if v}
M311=["+311 V","−311 V"]
B=dict(fila=True,chaves1=1,bobina="pequena",rapido=1)            # bobina pequena, chaveando rápido
R=dict(B,retificador=True,capacitor=1)                            # + peça de um sentido só e balde
P2=dict(R,chaves2=True)                                           # + segunda ponte
ZS=lambda acao="relaxado",exp="sorriso": dict(id="zeca",acao="sentado+"+acao,expressao=exp,pos=[-2.65,0.05],rot=1.15,fala=False)
cenas={
1:dict(cenario="solar",placas=6,noite=1,forcaSol=0,hora=0.95,rede={"de":1,"para":0,"ini":0.25,"fim":0.3},tv={"de":1,"para":0,"ini":0.3,"fim":0.32},lampada={"de":1,"para":0,"ini":0.3,"fim":0.32},camera=cam("casa","sala"),p=[ZS("surpreso","surpreso")],c=[rot("ACABOU A LUZ",1)]),
2:dict(chaves1=0,tv=0,apagao=True,camera=cam("geral","bateria-tv"),p=[Z("cocando-cabeca","cansado")],c=[]),
3:dict(chaves1=0,tv=0,apagao=True,camera=cam("bateria-tv"),p=[Z("explicando","neutro")],c=[onda("retacurva","BATERIA: UM SENTIDO · TOMADA: VAI E VOLTA",0,"BATERIA × TOMADA")]),
4:dict(maos=True,troca=0,tv=0,apagao=True,camera=cam("maos"),p=[Z()],c=[]),
5:dict(maos=True,troca={"de":0,"para":1,"ini":0.3,"fim":0.45},tv=0,apagao=True,camera=cam("maos"),p=[Z("em-pe","surpreso")],c=[]),
6:dict(maos=True,trocaRapida={"de":0.05,"para":1},tv=0,apagao=True,camera=cam("maos"),p=[Z("comemorando","eureka")],c=[med("60 TROCAS POR SEGUNDO","#ffd23f",2)]),
7:dict(chaves1=1,par="alterna",tv=0,apagao=True,camera=cam("chaves"),p=[Z()],c=[dict(tipo="ponteh",simples=True,trecho=1,ritmo=0.6)]),
8:dict(chaves1=1,par="alterna",tv=0,apagao=True,camera=cam("bateria-tv"),p=[Z("pensando","pensativo")],c=[rot("PONTE H",0)]),
9:dict(chaves1=1,par="alterna",tv=0,apagao=True,camera=cam("bateria-tv"),p=[Z()],c=[onda("senoide","BATERIA 12 V · TOMADA: PICO DE 311 V",1,"A TOMADA",cor="#7fd3ff",alto=0.9,marcas=M311)]),
10:dict(fila=True,chaves1=1,bobina="grande",rapido=0,tv=0,apagao=True,camera=cam("fila","bobina"),p=[Z()],c=[rot("TRANSFORMADOR",2)]),
11:dict(fila=True,chaves1=1,bobina="grande",rapido=0,balanca=True,tv=0,apagao=True,camera=cam("bobina"),p=[Z("em-pe","preocupado")],c=[med("MAIS DE 6 kg","#ff5a3c",2)]),
12:dict(fila=True,chaves1=1,bobina="grande",balanca=True,rapido={"de":0,"para":1,"ini":0.15,"fim":0.25},encolhe={"de":0,"para":1,"ini":0.45,"fim":0.85},tv=0,apagao=True,camera=cam("bobina"),p=[Z("comemorando","eureka")],c=[med("40 MIL POR SEGUNDO","#ffd23f",1)]),
13:dict(**dict(B,retificador=True,capacitor={"de":0,"para":1,"ini":0.35,"fim":0.9}),tv=0,apagao=True,camera=cam("retificador"),p=[Z()],c=[onda("reta","311 V, LISO",3,"DEPOIS DO BALDE",alto=0.9)]),
14:dict(**P2,tv=0,apagao=True,camera=cam("ponte2"),p=[Z("cocando-cabeca","pensativo")],c=[]),
15:dict(**P2,tv={"de":0,"para":1,"ini":0.05,"fim":0.12},apagao=True,camera=cam("tv","fila"),p=[Z("comemorando","sorriso")],c=[]),
16:dict(**P2,tv=1,apagao=True,ventilador=True,ventQuente={"de":0,"para":1,"ini":0.2,"fim":0.6},camera=cam("ventilador"),p=[Z("em-pe","preocupado")],c=[onda("quadrada","DEGRAUS",2,"SAÍDA",alto=0.9,marcas=M311),dict(tipo="aguenta",motor="VENTILADOR",trecho=2,y=430)]),
17:dict(**P2,pwm=True,tv=1,apagao=True,ventilador=True,ventQuente=1,camera=cam("ponte2"),p=[Z("pensando","pensativo")],c=[onda("media","POUCO TEMPO: FRACO · MUITO: FORTE",1,"PISCA-PISCA")]),
18:dict(**P2,pwm=True,tv=1,apagao=True,ventilador=True,ventQuente=1,camera=cam("ponte2"),p=[Z("comemorando","eureka")],c=[onda("pulsos","A MÉDIA VIRA CURVA",0,"PISCA-PISCA")]),
19:dict(**P2,pwm=True,filtro=True,tv=1,apagao=True,ventilador=True,ventQuente={"de":1,"para":0,"ini":0.3,"fim":0.8},camera=cam("ventilador"),p=[Z()],c=[rot("FILTRO",0)]),
20:dict(**P2,pwm=True,filtro=True,tv=1,apagao=True,ventilador=True,ventQuente=0,camera=cam("fila"),p=[Z("explicando","sorriso")],c=[dict(tipo="circuito",destaque="percorre",trecho=0),rot("SIGA PRA MAIS",3,y=560)]),
}
SFX={1:[("queda_energia",1,0.6)],2:[("impacto",1,0.5)],4:[("pop",0,0.5)],5:[("clique",1,0.8)],6:[("whoosh",2,0.6)],7:[("clique",1,0.8)],
9:[("bips",1,0.5)],10:[("zumbido",2,0.35)],11:[("impacto",2,0.6)],12:[("whoosh",1,0.6)],13:[("ding",4,0.5)],14:[("pop",1,0.5)],
15:[("ding",0,0.7),("impacto",1,0.5)],16:[("chiado",0,0.5),("zumbido",1,0.4)],18:[("ding",1,0.6)],19:[("sopro",1,0.5)],20:[("pop",3,0.7)]}
AMB={1:("noite",0.25)}
bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); p=d.pop('p'); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cenario=d.pop('cenario','inversor')
    cena={"cenario":cenario,**d,"personagens":p}
    if c: cena["cartoes"]=c
    if i in AMB: cena["ambiencia"]={"som":AMB[i][0],"volume":AMB[i][1]}
    if i in SFX: cena["sfx"]=[{"som":a,"trecho":t,"volume":v} for a,t,v in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":6,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s')
