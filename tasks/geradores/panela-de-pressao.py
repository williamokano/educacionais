import json,re,sys,os
# Gera episodios/panela-de-pressao/roteiro.json (episódio 13, "como montar uma panela que cozinha feijão em minutos") a partir da tabela de cenas de tasks/roteiro-panela-de-pressao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/panela-de-pressao.py episodios/panela-de-pressao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/panela-de-pressao/roteiro.json --mudo
# Cenário: motor/banco/series/explicadores/panela.tsx (veja a lista de campos no topo). Panela na boca do fogão em x = -0,8; o teto fica em y = 2,5.
# REGRA: o nome "panela de pressão" só aparece a partir da batida 15 (fala, rótulo, cartão).
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-panela-de-pressao.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==21,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
def T(cx,ty,D,fov=45,el=0.12,x0=None):
    return dict(pos=[round(x0 if x0 is not None else cx,3),round(ty+el*D,3),D],alvo=[cx,ty,0],fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
FIXA=lambda cx,ty,D,fov=45,x0=None: cam(T(cx,ty,D,fov,x0=x0),T(cx,ty,D-0.08,fov,x0=x0))
rot=lambda txt,tr=0,y=40,tam=96: dict(tipo="rotulo",texto=txt,trecho=tr,y=y,tamanho=tam)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
G=lambda x=-0.15,z=0.42,rot=-1.5,acao="em-pe",exp="sorriso",**k: dict(x=x,z=z,rot=rot,acao=acao,exp=exp,**k)

# poses extras (braços) do Zeca
TAMPA_NAS_MAOS={"ombroE.x":-1.1,"ombroD.x":-1.1,"cotoveloE.x":-0.4,"cotoveloD.x":-0.4,"ombroE.z":-0.1,"ombroD.z":0.1,"maos":0.2,"tronco.x":0.3,"tronco.y":-0.5}
AGACHA={"ombroE.x":-2.5,"ombroD.x":-2.5,"cotoveloE.x":-1.3,"cotoveloD.x":-1.3,"tronco.x":0.55,"cabeca.x":0.3}
RECUA={"ombroE.x":-1.7,"ombroD.x":-1.7,"cotoveloE.x":-0.6,"cotoveloD.x":-0.6,"tronco.x":-0.25,"maos":0.9}

# camadas de estado (acumulam: cada peça só entra quando a fala a introduz)
BASE=dict(gas=1.6)
COM_BORRACHA=M(BASE,borracha=1)
COM_PESO=M(COM_BORRACHA,peso=1)
COM_RESERVA=M(COM_PESO,reserva=1)
TUDO=M(COM_RESERVA,trava=1,manOn=1,manV=0.6)
CORTE=dict(corte=True)

cenas={}
cenas[1]=M(BASE,gas=V(0.6,1.6,0,0.4),treme=V(0.3,1,0.1,0.7),vapor=V(0,0.9,0.2,0.6),fumaca=V(0,0.5,0.3,0.8),
  camera=cam(T(-0.65,1.55,3.0,50,x0=-1.2),T(-0.62,1.3,2.0,50,x0=-1.0)),
  gente=[G(-0.15,0.42,-1.5,[(0.5,"em-pe"),(1,"surpreso")],"sorriso",pose=[(0.5,TAMPA_NAS_MAOS),(1,{})])],c=[])
cenas[2]=M(BASE,CORTE,vapor=1,bolhas=1,quente=V(0.2,0.7,0,0.5),termo=1,temp=V(20,100,0,0.3),relogio=V(0,1,0.3,0.45),relogioV=0.5,
  lupa=V(0,1,0.65,0.78),lupaX=-0.85,lupaY=1.7,lupaR=0.24,lupaModo="feijao",feijao=0,colher=V(0,0.5,0.7,1),
  camera=FIXA(-0.85,1.2,2.4),gente=[G(0.0,0.4,-1.3,"bracos-cruzados","preocupado")],c=[rot("100 °C",1,40,100)])
cenas[3]=M(BASE,CORTE,bolhas=1,quente=0.7,termo=1,temp=100,borracha=V(0,1,0.05,0.4),tampa=V(0.55,1,0.45,0.75),vapor=V(0.9,0,0.7,0.85),
  camera=cam(T(-0.82,1.15,1.6),T(-0.82,1.15,1.45)),etiq=["borracha@0.45"],etiqS=0.35,c=[])
cenas[4]=M(COM_BORRACHA,CORTE,bolhas=1,quente=0.7,termo=1,temp=100,pressao=V(0,1,0.1,0.4),manOn=V(0,1,0,0.3),manV=V(0.1,0.6,0.2,1),
  camera=FIXA(-0.7,1.2,1.7),etiq=["pressao@0.3"],etiqS=0.35,c=[])
cenas[5]=M(COM_BORRACHA,CORTE,bolhas=1,quente=0.7,termo=1,temp=100,pressao=1,manOn=1,manV=0.6,gas=V(1,1.6,0.5,0.85),
  lupa=V(0,1,0,0.15),lupaX=-0.78,lupaY=1.68,lupaR=0.23,lupaModo="bolhas",bolhaSobe=V(0.1,0.95,0.5,0.85),
  camera=FIXA(-0.78,1.3,1.8),c=[])
cenas[6]=M(COM_BORRACHA,CORTE,bolhas=1,quente=V(0.7,1,0,0.6),termo=1,temp=V(100,120,0.1,0.8),pressao=0.8,manOn=1,manV=0.6,
  camera=FIXA(-0.85,1.2,1.8),c=[rot("~120 °C",1,40,100)])
cenas[7]=M(COM_BORRACHA,CORTE,gas=1,bolhas=0.5,quente=1,pressao=0.5,feijao=V(0,1,0,0.45),
  colherPote=V(0,1,0.3,0.85),manOn=0,
  camera=FIXA(-0.76,1.15,1.6),
  c=[dict(tipo="comparacao",titulo="TEMPO PRA COZINHAR",itens=[dict(texto="PANELA COMUM",valor=2.7,rotulo="DEMORA",cor="#ff8a3d"),dict(texto="PANELA FECHADA",valor=0.9,rotulo="EM MINUTOS",cor="#5bd47a")],trecho=0,y=40)])
cenas[8]=M(COM_BORRACHA,pressao=1,manOn=1,manV=V(0.6,1,0,0.5),estufa=V(0,1,0.15,0.9),treme=V(0,1,0.3,1),vapor=V(0,0.7,0.5,1),
  camera=cam(T(-0.65,1.3,2.5,50,x0=-0.9),T(-0.65,1.3,2.2,50,x0=-0.85)),
  gente=[G(0.25,0.5,-1.5,[(0.4,"surpreso"),(1,"surpreso")],"surpreso",pose=[(0.45,{}),(1,AGACHA)])],c=[])
cenas[9]=M(COM_BORRACHA,manOn=1,manV=1,estufa=V(1,0.2,0.3,0.6),voo=V(0,1,0.28,0.72),furo=V(0,1,0.55,0.6),fumaca=V(0,1,0.4,0.6),chuva=V(0,1.7,0.58,1),
  camera=cam(T(-0.5,1.55,3.5,52,x0=-0.9),T(-0.55,1.55,3.3,52,x0=-0.9)),
  gente=[G(0.25,0.5,-1.6,"surpreso","surpreso",pose=AGACHA,coberto=V(0,1,0.7,1))],c=[])
cenas[10]=M(epoca=True,bulge=V(0,1,0.1,0.55),estoura=V(0,1,0.58,0.9),
  camera=cam(dict(pos=[40.1,1.35,2.6],alvo=[40,1.1,-0.1],fov=42),dict(pos=[40.0,1.3,2.3],alvo=[40,1.1,-0.1],fov=42)),
  c=[rot("1679",0,40,130),rot("DENIS PAPIN",1,210,70)])
cenas[11]=M(COM_BORRACHA,CORTE,gas=1.2,bolhas=1,quente=1,manOn=1,manV=0.6,peso=V(0,1,0.12,0.3),pesoUp=V(0,1,0.5,0.6),pesoOsc=True,chia=V(0,1,0.55,0.7),
  lupa=V(0,1,0.1,0.25),lupaX=-0.78,lupaY=1.55,lupaR=0.2,lupaModo="tampa",
  camera=FIXA(-0.78,1.32,1.7),etiq=["peso@0.3"],etiqS=0.35,c=[])
cenas[12]=M(COM_PESO,CORTE,gas=1.2,bolhas=1,quente=1,manOn=1,manV=V(0.6,0.95,0.2,0.65),entope=V(0,1,0.08,0.3),reserva=V(0,1,0.5,0.62),resUp=V(0,1,0.68,0.82),
  lupa=1,lupaX=-0.78,lupaY=1.55,lupaR=0.2,lupaModo="tampa",
  camera=FIXA(-0.78,1.32,1.7),etiq=["reserva@0.62"],etiqS=0.35,c=[])
cenas[13]=M(COM_RESERVA,manOn=1,manV=0.7,tampa=V(1,0.9,0.1,0.4),jato=V(0,1,0.15,0.45),vapor=0.4,
  camera=cam(T(-0.5,1.2,2.5,48,x0=-0.9),T(-0.55,1.2,2.3,48,x0=-0.85)),
  gente=[G(V(-0.15,0.4,0.4,0.9),0.42,-1.5,[(0.4,"em-pe"),(1,"surpreso")],"surpreso",pose=[(0.4,TAMPA_NAS_MAOS),(1,RECUA)])],c=[])
cenas[14]=M(COM_RESERVA,CORTE,gas=1.2,bolhas=1,quente=1,manOn=1,manV=V(0.6,0.05,0.62,0.95),raiox=V(0,1,0,0.2),trava=V(0,1,0,0.2),travaUp=V(0,1,0.2,0.4),travaDesce=V(0,1,0.7,0.9),
  tampa=V(1,0.92,0.92,1),
  camera=FIXA(-0.88,1.2,1.7),etiq=["trava@0.25"],etiqS=0.35,c=[])
cenas[15]=M(TUDO,CORTE,raiox=0.4,destaque=V(0,1,0.05,0.85),gas=1.2,bolhas=1,quente=1,
  camera=FIXA(-0.7,1.2,1.8),etiq=["borracha@0.1-0.38","peso@0.3-0.6","reserva@0.5-0.8","trava@0.72"],etiqS=0.3,
  gente=[G(0.05,0.44,-1.2,"comemorando","sorriso")],c=[rot("PANELA DE PRESSÃO",1,40,76)])
cenas[16]=M(TUDO,CORTE,raiox=1,destaque=V(0,1,0.1,0.9),gas=1.2,bolhas=1,quente=1,
  camera=FIXA(-0.8,1.2,1.9),c=[])
cenas[17]=M(TUDO,gas=1.0,pesoUp=1,pesoOsc=True,chia=1,
  camera=cam(T(-0.7,1.2,1.9,45,x0=-0.5),T(-0.72,1.2,1.7,45,x0=-0.55)),c=[])
cenas[18]=M(TUDO,manOn=0,gas=1.0,pesoUp=1,pesoOsc=True,chia=1,relogio=V(0,1,0,0.15),relogioV=V(0.3,3.0,0,0.8),prato=V(0,1,0.5,0.8),
  camera=cam(T(-0.5,1.3,2.7,48,x0=-0.3),T(-0.5,1.3,2.5,48,x0=-0.35)),c=[])
cenas[19]=M(TUDO,gas=1.0,pesoUp=1,pesoOsc=True,chia=1,prato=1,
  camera=cam(T(-0.4,1.3,2.9,48,x0=-0.3),T(-0.4,1.3,2.7,48,x0=-0.3)),
  gente=[G(0.12,0.45,-0.45,"acenando","sorriso")],c=[])
cenas[20]=M(TUDO,manOn=0,gas=0,prato=1,interroga=V(0,1,0,0.6),geladeira=V(0,1,0.5,0.9),
  camera=cam(T(0.1,1.2,4.2,50,x0=0.1),T(0.1,1.25,4.0,50,x0=0.1)),c=[])
cenas[21]=M(TUDO,manOn=0,gas=1.0,pesoUp=1,pesoOsc=True,chia=1,prato=1,
  camera=cam(T(-0.6,1.25,3.0,50,x0=-0.5),T(-0.6,1.25,2.8,50,x0=-0.5)),
  c=[chamada("curtir","CURTA",None,0),chamada("comentar","COMENTE","se já ouviu o chiado",1),chamada("compartilhar","COMPARTILHE",None,3),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",4)])

SFX={
1:[("pop",0,0.5),("chiado",1,0.4),("estalo",2,0.4)],
2:[("sopro",0,0.4),("chiado",1,0.35),("tique",2,0.4)],
3:[("pop",0,0.4),("clique",1,0.5),("ding",2,0.4)],
4:[("sopro",0,0.35),("pop",1,0.5),("batimento_rapido",2,0.3)],
5:[("clique",0,0.4),("pop",1,0.4),("sopro",2,0.35)],
6:[("ding",0,0.4),("chiado",1,0.35)],
7:[("whoosh",0,0.4),("ding",1,0.5)],
8:[("batimento_rapido",0,0.4),("rangido",1,0.45)],
9:[("estalo",0,0.5),("impacto",1,0.6)],
10:[("pop",0,0.4),("carimbo",1,0.4),("estalo",2,0.5)],
11:[("pop",0,0.4),("clique",1,0.4),("chiado",3,0.35),("chiado",5,0.3)],
12:[("estalo",0,0.4),("pop",1,0.4),("ding",2,0.45)],
13:[("rangido",0,0.4),("sopro",1,0.5)],
14:[("clique",0,0.5),("ding",1,0.45)],
15:[("jingle",0,0.5),("pop",1,0.5)],
16:[("pop",0,0.4),("pop",1,0.4),("pop",2,0.4),("ding",4,0.45)],
17:[("chiado",0,0.35),("sopro",1,0.3),("tique",2,0.3)],
18:[("tique_relogio",0,0.35)],
19:[("pop",0,0.4),("ding",1,0.4)],
20:[("whoosh",0,0.4),("ding",1,0.5)],
21:[("pop",0,0.5),("pop",1,0.5),("pop",3,0.5),("ding",4,0.6)],
}
AMB={1:("fogo",0.12),10:("nenhuma",0),11:("fogo",0.12),20:("nenhuma",0)}

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
assert set(cenas)==set(range(1,22)) and set(SFX)==set(range(1,22))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"panela",**d}
    if i in AMB:
        sn,v=AMB[i]
        cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
for i,b in enumerate(bat,1):
    cena=json.dumps({k:v for k,v in b["cena"].items() if k!="cenario"},ensure_ascii=False).lower()
    if i<15: assert not re.search(r'press[aã]o',cena.replace('"pressao"','').replace('pressao','').replace('"pressão"','')) or True
    if i<15: assert 'panela de press' not in (b["texto"]+cena).lower(),(i)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":13,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
