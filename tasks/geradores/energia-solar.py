import json,re,sys
md=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','roteiro-energia-solar.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==17,len(falas)
Z=lambda acao="relaxado",exp="sorriso": dict(id="zeca",acao="sentado+"+acao,expressao=exp,pos=[-2.65,0.05],rot=1.15,fala=False)
E=lambda acao="mexendo",exp="concentrado": dict(id="eletricista",acao=acao,expressao=exp,pos=[4.16,-0.4],rot=-1.57,elev=2.25,fala=False)
rot=lambda txt,tr=0,y=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}))
med=lambda txt,cor="#ffd23f",tr=0,x=130,y=40: dict(tipo="medida",texto=txt,cor=cor,x=x,y=y,trecho=tr)
onda=lambda modo,rotulo,tr=0,titulo=None,cor="#ffd23f": dict(tipo="onda",modo=modo,rotulo=rotulo,trecho=tr,cor=cor,**({"titulo":titulo} if titulo else {}))
cam=lambda de=None,para=None: {k:v for k,v in (("de",de),("para",para)) if v}
S=dict(placas=6)
D=dict(direto=True,placas=1,stringbox=0,offgrid=1)
cenas={
1:dict(**S,hora=0.5,rede={"de":1,"para":0,"ini":0.3,"fim":0.35},tv={"de":1,"para":0,"ini":0.4,"fim":0.42},lampada={"de":1,"para":0,"ini":0.4,"fim":0.42},led="vermelho",camera=cam("casa"),p=[Z("surpreso","surpreso")],c=[rot("POR QUÊ?",2)]),
2:dict(**S,tv=0,camera=cam("casa","telhado"),p=[Z("pensando","pensativo")],c=[]),
3:dict(**D,tv=0,camera=cam("tv"),p=[Z("cocando-cabeca","pensativo")],c=[med("PLACA ~40 V · TV 220 V","#ffd23f",2)]),
4:dict(direto=True,placas={"de":1,"para":6,"ini":0.05,"fim":0.45},stringbox=0,offgrid=1,tv=0,camera=cam("telhado"),p=[Z("cocando-cabeca","pensativo")],c=[med("6 PLACAS ≈ 240 V","#ffd23f",1)]),
5:dict(direto=True,placas=6,stringbox=0,offgrid=1,tv=0,camera=cam("fio"),p=[Z("relaxado","pensativo")],c=[onda("retacurva","PLACA: UM SENTIDO · TOMADA: VAI E VOLTA",0,"PLACA × TOMADA")]),
6:dict(**S,stringbox=0,offgrid=1,tv={"de":0,"para":1,"ini":0.6,"fim":0.65},camera=cam("aparelhos","sala"),p=[Z("relaxado","sorriso")],c=[rot("INVERSOR",0)]),
7:dict(**S,hora={"de":0.6,"para":1.0},noite={"de":0,"para":0.8,"ini":0.1,"fim":0.5},forcaSol={"de":1,"para":0,"ini":0.1,"fim":0.4},tv={"de":1,"para":0,"ini":0.3,"fim":0.33},offgrid={"de":1,"para":0,"ini":0.65,"fim":0.85},camera=cam("casa"),p=[Z("relaxado","cansado")],c=[]),
8:dict(**S,hora=0.5,exporta=1,camera=cam("casa","rua"),p=[Z()],c=[]),
9:dict(**S,bidirecional=True,exporta={"de":1,"para":-1,"ini":0.35,"fim":0.55},noite={"de":0,"para":1,"ini":0.35,"fim":0.55},hora=0.95,camera=cam("medidor","casa"),p=[Z("relaxado","alivio")],c=[rot("RELÓGIO BIDIRECIONAL",0),dict(tipo="conta",texto="TAXA MÍNIMA",fica=0.2,trecho=3,y=420)]),
10:dict(**S,bidirecional=True,rede={"de":1,"para":0,"ini":0.35,"fim":0.4},tv={"de":1,"para":0,"ini":0.6,"fim":0.62},lampada={"de":1,"para":0,"ini":0.6,"fim":0.62},camera=cam("casa"),p=[Z("surpreso","surpreso")],c=[]),
11:dict(**S,bidirecional=True,rede=0,tv=0,led="vermelho",camera=cam("poste"),p=[Z("surpreso","surpreso"),E()],c=[]),
12:dict(**S,bidirecional=True,rede=0,tv=0,led="vermelho",faisca=True,exporta=1,camera=cam("poste"),p=[Z(),E("surpreso","medo")],c=[med("DESLIGA SOZINHO","#ff5a3c",3)]),
13:dict(**S,bidirecional=True,hibrido=True,bateria={"de":0.3,"para":0.9},carga=1,camera=cam("bateria"),p=[Z()],c=[rot("BATERIA",1)]),
14:dict(**S,bidirecional=True,hibrido=True,bateria=0.9,carga=-1,rede=0,chave={"de":0,"para":1,"ini":0.2,"fim":0.3},tv={"de":0,"para":1,"ini":0.45,"fim":0.5},lampada={"de":0,"para":1,"ini":0.45,"fim":0.5},camera=cam("chave"),p=[Z("relaxado","sorriso"),E()],c=[]),
15:dict(**S,bidirecional=True,hibrido=True,nublado=1,rede=0,chave=1,bateria={"de":0.6,"para":0.05,"ini":0.15,"fim":0.6},carga=-1,gerador={"de":0,"para":1,"ini":0.75,"fim":0.8},camera=cam("casa","gerador"),p=[Z("relaxado","preocupado")],c=[rot("GERADOR",3)]),
16:dict(**S,hibrido=True,controlador=True,bateria=0.8,gerador=0,offgrid={"de":0,"para":1,"ini":0.35,"fim":0.55},camera=cam("rua"),p=[Z()],c=[rot("OFF-GRID",2)]),
17:dict(**S,hibrido=True,bateria=0.8,bidirecional=True,camera=cam("sala","inversor"),p=[Z("pensando","pensativo")],c=[rot("SIGA PRA VER",3)]),
}
SFX={1:[("queda_energia",1,0.6),("impacto",2,0.5)],3:[("pop",1,0.6)],4:[("pop",0,0.5),("impacto",2,0.5)],5:[("whoosh",0,0.5)],6:[("clique",0,0.8),("ding",2,0.6)],
7:[("queda_energia",1,0.4),("clique",2,0.6)],8:[("whoosh",2,0.6)],9:[("ding",2,0.6)],10:[("queda_energia",2,0.6)],12:[("raio",1,0.6),("bips",3,0.5)],
13:[("pop",1,0.6)],14:[("clique",1,0.9)],15:[("trovao",0,0.4),("motor",3,0.45)],16:[("whoosh",2,0.6)],17:[("pop",3,0.7)]}
AMB={1:("dia",0.3),7:("noite",0.25),8:("dia",0.3),9:("noite",0.25),10:("dia",0.3),15:("chuva",0.3),16:("dia",0.3)}
bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); p=d.pop('p'); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"solar",**d,"personagens":p}
    if any(x["id"]=="eletricista" for x in p): cena["escada"]=True
    if c: cena["cartoes"]=c
    if i in AMB: cena["ambiencia"]={"som":AMB[i][0],"volume":AMB[i][1]}
    if i in SFX: cena["sfx"]=[{"som":a,"trecho":t,"volume":v} for a,t,v in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":5,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s')
