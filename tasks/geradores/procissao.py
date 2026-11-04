import json,re,sys,os
# Gera episodios/procissao/roteiro.json (episódio 12, "como montar uma procissão, peça por peça") a partir da tabela de cenas de tasks/roteiro-procissao.md.
# As falas vêm sempre do .md; cenas, cartões e efeitos ficam aqui. Uso (da raiz): python3 tasks/geradores/procissao.py episodios/procissao/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/procissao/roteiro.json --mudo
# Mundo (veja o topo de motor/banco/series/explicadores/procissao.tsx): fachada da igreja em z = -4, rua para +z; a fila anda para +z.
# Posições da fila em relação ao líder Z0 = pz + anda·min(p, pare): cruz Z0, ciriais Z0-0,3, turíbulo Z0-2,3, andor Z0-5,4, povo Z0-9,2 em diante.
AQUI=os.path.dirname(os.path.abspath(__file__))
md=open(os.path.join(AQUI,'..','roteiro-procissao.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Fontes')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==30,len(falas)
NLEVE=[f.count('[leve]') for f in falas]

M=lambda *ds,**k: {**{kk:v for d in ds for kk,v in d.items()},**k}
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
def T(pos,alvo,fov=50): return dict(pos=list(pos),alvo=list(alvo),fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
FIX=lambda pos,alvo,fov=50: cam(T(pos,alvo,fov),T(pos,alvo,fov))
rot=lambda txt,tr=0,y=None,tam=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}),**({"tamanho":tam} if tam else {}))
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
pergunta=lambda linhas,tr=0,y=90: dict(tipo="perguntaFinal",trecho=tr,y=y,linhas=linhas)
# braços à frente, segurando algo no meio (a imagem no colo)
HOLD={"ombroE.x":-0.95,"ombroD.x":-0.95,"cotoveloE.x":-0.65,"cotoveloD.x":-0.65,"ombroE.z":-0.28,"ombroD.z":0.28,"maos":0.2}
G=lambda id,x=0,z=0.0,y=0.0,rot=0,acao="em-pe",exp="neutro",**k: dict(id=id,x=x,y=y,z=z,rot=rot,acao=acao,exp=exp,**k)

# camadas de estado da fila (acumulam: cada peça só aparece quando a fala a introduz)
ANDOR=dict(andor=1,ombros=1,led=1,imagem=1,imgLugar=1)
CRUZ=M(ANDOR,cruz=1)
CIR=M(CRUZ,ciriais=1)
TUR=M(CIR,turibulo=1,fumaca=1)
POVO=lambda n=8,**k: M(TUR,povo=n,**k)

cenas={}
# 1–3: Zeca sai da igreja com a imagem no colo
cenas[1]=M(escuro=0.2,imagem=1,imgLugar=0,imgX=0,imgY=0.82,imgZ=V(-3.3,5.6),dog=1,dogX=0.6,dogZ=V(-6.5,2.0),dogModo="trota",
  camera=cam(T((2.7,1.6,6.6),(0.1,1.5,0.5),46),T((3.3,1.6,8.4),(0.1,1.5,1.0),46)),
  gente=[G("zeca",0,V(-3.8,5.1),acao="andando",exp="sorriso",pose=HOLD)],c=[])
cenas[2]=M(escuro=0.45,imagem=1,imgLugar=0,imgX=0,imgY=0.82,imgZ=1.4,dog=1,dogX=0.9,dogZ=0.2,dogModo="fica",
  camera=cam(T((2.6,2.0,7.0),(0,1.3,0.9),58),T((3.2,2.2,9.4),(0,1.3,0.9),58)),
  gente=[G("zeca",0,0.9,exp="sorriso",pose=HOLD),
    G("vizinha",V(-3.4,-1.3),1.7,rot=1.4,acao="andando"),G("homemA",V(3.5,1.4),2.0,rot=-1.4,acao="andando"),
    G("mulher",V(-4.2,-2.0),3.0,rot=1.3,acao="andando"),G("vovo",V(4.3,2.0),3.3,rot=-1.3,acao="andando"),G("menino",V(-3.0,-0.8),0.6,rot=1.5,acao="andando")],c=[])
cenas[3]=M(escuro=0.45,imagem=1,imgLugar=0,imgX=0,imgY=0.82,imgZ=1.1,balanca=1,
  camera=cam(T((1.9,1.4,4.0),(0,1.1,0.9),46),T((1.5,1.4,3.5),(0,1.1,0.9),46)),
  gente=[G("zeca",0,0.6,exp="sorriso",pose=HOLD),G("vizinha",-0.85,-0.9,acao="pensando",exp="surpreso"),G("homemA",0.85,-0.9,acao="pensando",exp="surpreso"),G("mulher",0.0,-1.8,exp="surpreso")],c=[])
# 4–5: o andor
cenas[4]=M(escuro=0.5,pz=6.9,andor=V(0,1,0,0.5),ombros=V(0,1,0.55,0.95),led=V(0,1,0.7,1),imagem=V(0,1,0.1,0.18),imgLugar=V(0,1,0.35,0.6),imgX=-0.5,imgY=0.82,imgZ=2.8,
  camera=cam(T((2.0,0.7,7.2),(0,1.4,1.8),55),T((1.7,1.0,6.4),(0,1.5,1.8),55)),etiq=["andor@0.78"],etiqK=1.2,
  c=[rot("o número de carregadores pode variar",1,70,50)])
cenas[5]=M(ANDOR,escuro=0.6,pz=15,anda=5,camera=cam(T((0,1.5,26),(0,2.1,9.6),32),T((0,1.5,26),(0,2.1,14.4),32)),c=[])
cenas[6]=M(ANDOR,escuro=0.6,pz=9,anda=5,moto=True,
  camera=FIX((1.0,1.6,14.8),(-1.5,1.4,8.0),46),
  gente=[G("motoboy",-3.1,9.6,y=0.2,rot=1.1,acao="cocando-cabeca",exp="surpreso"),G("vizinha",3.5,2.2,y=0.2,rot=-1.2,exp="surpreso"),G("vovo",4.1,3.4,y=0.2,rot=-1.2,exp="surpreso"),G("homemB",3.0,0.8,y=0.2,rot=-1.2)],c=[])
# 7–8: a cruz
cenas[7]=M(ANDOR,escuro=0.6,pz=11,anda=4,cruz=V(0,1,0,0.5),camera=cam(T((0.8,0.45,15.8),(0.1,3.0,11),62),T((0.8,0.7,19.3),(0.1,3.2,15.5),62)),etiq=["cruz@0.55"],etiqK=1.3,c=[])
cenas[8]=M(CRUZ,escuro=0.6,pz=13,anda=5,camera=cam(T((4.6,2.4,20.5),(0,1.8,10.5),48),T((4.0,2.4,25.5),(0,1.8,15.5),48)),c=[])
cenas[9]=M(CRUZ,escuro=V(0.7,1.0),pz=40,anda=4,camera=cam(T((0,1.2,47.5),(0,3.6,40.5),52),T((0,1.2,50.5),(0,3.9,44.5),52)),c=[])
# 10–11: os ciriais
cenas[10]=M(CRUZ,ciriais=V(0,1,0,0.4),escuro=1,pz=42,anda=3,camera=cam(T((0,1.5,49.5),(0,2.3,42),50),T((0,1.6,52.0),(0,2.3,45.0),50)),etiq=["ciriais@0.5"],etiqK=0.8,c=[])
cenas[11]=M(CIR,escuro=1,pz=46,anda=5,camera=FIX((0.8,1.6,53),(3.0,1.4,49.5),45),
  gente=[G("mulher",3.7,49.0,y=0.2,rot=-1.3,acao="explicando",exp="surpreso")],c=[])
# 12–13: o turíbulo
cenas[12]=M(CIR,turibulo=V(0,1,0,0.3),fumaca=V(0,1,0.2,0.6),escuro=1,pz=50,anda=3,camera=cam(T((4.2,1.4,49.4),(0,1.0,47.7),46),T((4.2,1.4,52.4),(0,1.0,50.7),46)),etiq=["turibulo@0.5"],etiqK=0.7,c=[])
cenas[13]=M(TUR,escuro=1,pz=54,anda=2,camera=cam(T((0.8,1.0,55.4),(0,1.0,51.7),50),T((0.8,1.0,57.4),(0,3.8,53.7),50)),c=[])
# 14–16: as velas
cenas[14]=M(POVO(34),escuro=1,pz=58,anda=3,camera=FIX((0,2.6,69),(0,1.5,52),58),c=[])
cenas[15]=M(POVO(34),velas=V(0,1,0.05,0.85),escuro=1,pz=60,anda=2,
  camera=cam(T((1.0,1.6,54),(-0.8,1.2,50.8),45),T((0,3.4,70),(0,1.3,52),56)),etiq=["vela@0.1-0.5"],etiqK=1.7,c=[])
cenas[16]=M(POVO(34),velas=1,escuro=1,pz=62,anda=2,baixa=0.3,camera=cam(T((0.6,1.6,54.4),(-0.8,1.45,52.8),34),T((-0.6,1.6,54.4),(0.8,1.45,52.8),34)),c=[])
# 17–19: silêncio, canto e parada
cenas[17]=M(POVO(34),velas=1,escuro=1,pz=64,anda=4,baixa=V(0,0.3),camera=cam(T((7.0,1.6,57),(0,1.4,56),50),T((7.0,1.6,53),(0,1.4,55),50)),c=[])
cenas[18]=M(POVO(34),velas=1,escuro=1,pz=66,anda=6,pare=0.6,canto=V(0,1,0.2,0.45),baixa=V(0,1,0.62,0.8),
  camera=cam(T((0,6.4,77),(0,1.5,60),52),T((0,3.4,72),(0,1.5,58),52)),c=[])
cenas[19]=M(POVO(34),velas=1,escuro=1,pz=68,anda=4,canto=V(1,0),baixa=V(0.8,0),camera=FIX((0,2.3,76),(0,1.6,60),52),c=[])
# 20–21: por que andar
cenas[20]=M(escuro=0.2,camera=cam(T((0,1.7,-5.5),(0,1.6,-16),55),T((0,1.7,-7.5),(0,1.6,-16),55)),c=[])
cenas[21]=M(POVO(12),velas=1,escuro=0.5,pz=2,anda=14,camera=cam(T((0,1.8,16),(0,1.8,2),55),T((0,8.2,22),(0,3.0,-2),55)),c=[])
# 22–23: procissões na missa e as grandes do ano (a câmera passa de lado pelos quatro palcos)
cenas[22]=M(missa=True,escuro=0.3,camera=cam(T((-40,1.8,6.2),(-40,1.45,0),52),T((-40,1.8,5.5),(-40,1.45,0),52)),c=[])
cenas[23]=M(vinheta=True,dia=0.5,escuro=0.2,camera=cam(T((40,1.9,6.6),(40,1.4,0),50),T((40,4.8,6.8),(40,0.4,0.4),50)),c=[])
# 24–26: o padroeiro, a volta e guardar o andor
cenas[24]=M(POVO(30),velas=1,escuro=0.5,pz=-1,anda=8,camera=FIX((0,2.2,13),(0,1.8,2),52),c=[])
cenas[25]=M(POVO(30),velas=1,escuro=0.5,volta=True,pz=10,anda=-9,
  camera=FIX((0.0,3.9,30),(0,1.3,1.0),30),gente=[G("padre",0,-2.7,y=0.16,acao="acenando",exp="sorriso")],c=[])
cenas[26]=M(ANDOR,ombros=V(1,0,0,0.4),led=V(1,0,0.2,0.7),semGente=True,pz=-1.6,apaga=V(0,1,0.5,1),escuro=V(0.3,0.9),camera=FIX((2.8,1.9,-4.0),(0,1.0,-7.0),55),c=[])
# 27–28: o final do Caramelo, no adro
cenas[27]=M(escuro=0.4,camera=FIX((2.6,1.5,6.0),(0,1.5,0.5),50),gente=[G("zeca",0,0.5,y=0.12,acao="comemorando",exp="sorriso")],c=[])
cenas[28]=M(escuro=0.4,dog=1,dogX=0.3,dogZ=1.9,dogModo="fica",cambalhota=V(0,1,0.6,0.74),boca=V(0,1,0.82,0.9),
  camera=cam(T((3.6,1.4,6.0),(0.2,0.8,2.2),42),T((0.3,0.7,6.2),(0.3,0.95,3.0),28)),
  gente=[G("zeca",-1.5,0.2,y=0.12,acao="comemorando",exp="sorriso")],c=[])
CLOSE=dict(escuro=0.4,dog=1,dogX=0.3,dogZ=1.9,dogModo="fica",cambalhota=1,boca=1,camera=FIX((0.3,0.7,6.2),(0.3,0.95,3.0),28))
cenas[29]=M(CLOSE,c=[pergunta(["DEVOTO OU","CURIOSO?"],0,90)])
cenas[30]=M(CLOSE,c=[chamada("compartilhar","COMPARTILHE","com quem acha que procissão é só andar",0),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",1)])

SFX={
1:[("porta",0,0.4),("passos",1,0.3),("latido",2,0.3)],
2:[("pop",0,0.4),("passo_leve",1,0.3)],
3:[("rangido",0,0.35),("batimento_rapido",1,0.3)],
4:[("pop",0,0.5),("impacto_seco",1,0.5),("ding",2,0.5)],
5:[("whoosh",0,0.4)],
6:[("motor",0,0.35),("buzina",1,0.3),("pop",2,0.4)],
7:[("whoosh",0,0.4),("impacto_seco",1,0.4)],
8:[("passos",0,0.3),("ding",1,0.4)],
9:[("vento",0,0.4),("sino_longe",0,0.3)],
10:[("pop",0,0.4),("fogo",1,0.4),("ding",2,0.4)],
11:[("passo_leve",0,0.3)],
12:[("pop",0,0.4),("metal",1,0.4),("ding",2,0.4)],
13:[("sopro",0,0.4)],
14:[("vento",0,0.35)],
15:[("pop",0,0.45),("fogo",0,0.3)],
16:[("sino",0,0.3)],
17:[("passos_lentos",0,0.3)],
18:[("pop",0,0.4),("sino_longe",1,0.3),("ding",2,0.4)],
19:[("passos",0,0.3)],
20:[("pop",0,0.4)],
21:[("whoosh",0,0.4),("sino",0,0.3)],
22:[("pop",0,0.4),("ding",1,0.4),("pop",2,0.4)],
23:[("pop",0,0.4),("sino",1,0.4)],
24:[("whoosh",0,0.4)],
25:[("porta",0,0.4),("sino",0,0.3)],
26:[("porta",0,0.4),("queda_energia",0,0.35)],
27:[("jingle",0,0.5)],
28:[("ding",0,0.35),("whoosh",1,0.5)],
29:[("pop",0,0.5)],
30:[("pop",0,0.5),("ding",1,0.6)],
}
AMB={1:("noite",0.1),2:("noite",0.1),20:("nenhuma",0),22:("nenhuma",0),23:("nenhuma",0),26:("nenhuma",0)}
for i in range(3,20):
    AMB.setdefault(i,("noite",0.1))
PAUSA={28:1.5}

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
assert set(cenas)==set(range(1,31)) and set(SFX)==set(range(1,31))

bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"procissao",**d}
    if i in AMB:
        sn,v=AMB[i]
        cena["ambiencia"]="nenhuma" if sn=="nenhuma" else {"som":sn,"volume":v}
    if c: cena["cartoes"]=c
    cena["sfx"]=[{"som":sf[0],"trecho":sf[1],"volume":sf[2]} for sf in SFX[i]]
    b={"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena}
    if i>=29: b["falante"]="fim"
    if i in PAUSA: b["pausa"]=PAUSA[i]
    bat.append(b)
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":12,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"vozes":{"fim":{"seed":3}},"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s',sum(len(v) for v in SFX.values()),'efeitos')
