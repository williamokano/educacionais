import json,re,sys,os
# Gera episodios/bunker/roteiro.json (episódio 8, "bunker") a partir da tabela de cenas de tasks/roteiro-bunker.md.
# As falas vêm sempre do .md; as cenas, os cartões e os efeitos ficam aqui. Uso (da raiz do repositório):
#   python3 tasks/geradores/bunker.py episodios/bunker/roteiro.json
# Depois: cd motor && python3 pipeline/narrar.py ../episodios/bunker/roteiro.json --mudo  (o render lê o episode.json que ele grava)
md=open(os.path.join(os.path.dirname(__file__),'..','roteiro-bunker.md'),encoding='utf-8').read()
tab=md.split('## Tabela de cenas')[1].split('## Contas')[0]
falas=[re.match(r'\| \d+ \| (.+?) \| ',l).group(1).strip() for l in tab.splitlines() if re.match(r'\| \d+ \| ',l)]
assert len(falas)==31,len(falas)

PISO=-3.75
V=lambda de,para,ini=None,fim=None: dict(de=de,para=para,**({"ini":ini} if ini is not None else {}),**({"fim":fim} if fim is not None else {}))
C=lambda pos,alvo,fov=50: dict(pos=pos,alvo=alvo,fov=fov)
cam=lambda de=None,para=None,**k: {**{kk:v for kk,v in (("de",de),("para",para)) if v},**k}
rot=lambda txt,tr=0,y=None,tam=None: dict(tipo="rotulo",texto=txt,trecho=tr,**({"y":y} if y is not None else {}),**({"tamanho":tam} if tam else {}))
fita=lambda tr=0,dur=1.8,txt="REBOBINANDO": dict(tipo="fita",trecho=tr,dur=dur,texto=txt)
chamada=lambda icone,txt,sub=None,tr=0: dict(tipo="chamada",icone=icone,texto=txt,trecho=tr,**({"sub":sub} if sub else {}))
termo=lambda txt,x,tr=1: dict(tipo="termometro",trecho=tr,de=0.5,para=0.5,dur=1,texto=txt,x=x,y=60)
forcas=lambda tr=2,modo="par",troca=1.8: dict(tipo="forcas",trecho=tr,modo=modo,troca=troca,x=200,y=30)
gas=lambda de,para,dur,tr=1: dict(tipo="gas",trecho=tr,de=de,para=para,dur=dur,x=230,y=20)   # não pode se chamar "medidor" (nome do HUD no núcleo)
cal=lambda tr=2,dur=2.4: dict(tipo="cal",trecho=tr,dur=dur,x=180,y=20)
G=lambda id,x=0,y=PISO,z=-0.8,**k: dict(id=id,x=x,y=y,z=z,**k)
# camadas de estado do bunker
CAIXA=dict(caixa=True,concreto=1,ferro=1,saida=1,laje=1)
PRONTO={**CAIXA,'terra':1,'troca':1,'grossa':1}
P=lambda **k: {**PRONTO,**k}
K=lambda **k: {**CAIXA,**k}
CANOS=dict(canos=True,fluxo=1,vent=1)
# quatro pessoas em pé na frente do vão (a torre fica à esquerda, o gerador e a bateria atrás)
EM_PE=lambda exp="neutro": [G("zeca",-0.35,exp=exp),G("vizinha",0.15,exp=exp),G("menino",0.6,exp=exp),G("vovo",1.0,exp=exp)]
# o vão ficou mais largo (3,6 m): duas pessoas deitadas lado a lado em cada fileira
DORMEM=[G("zeca",-0.15,z=-0.5,deita=1),G("vizinha",1.7,z=-0.5,deita=1),G("vovo",-0.2,z=-1.3,deita=1),G("menino",0.45,z=-1.3,deita=-1)]
# câmeras (a vista é de frente; o corte tem 6,2 m de largura e a saída fica em x 2,1..3,1)
CORTE=C([0,-1.6,15.2],[0,-1.9,0]); LARGO=C([0,-1.4,18],[0,-1.8,0]); SALA=C([0,-2.7,8.6],[0,-2.7,-1.5])
QUINTAL=C([1.0,2.4,14],[-0.3,-1.2,-1],56)
TERRA=C([-3.2,1.4,17],[-3.2,-0.9,-1],52); ALTO=C([0,2.0,10.5],[0,-3.3,-1.2],54)
SALA_GER=C([-1.1,0.6,16.5],[-1.1,-1.4,-1],54)         # a sala do gerador, o cano e a tampa (para a cota de ≈ 6 m)
SALA_ABRE=C([-3.4,-1.0,11.5],[-3.4,-2.2,0],52)        # a sala do gerador, de perto
VIZINHOS=C([-3.4,0.6,17],[-3.4,-1.6,-1],54)           # o barulho chega aos vizinhos, logo à esquerda da sala
SALA_PERTO=C([-3.4,-0.6,10],[-3.4,-2.5,0],52)         # o isolamento, de perto
BAT=C([0.4,-0.5,14],[0.4,-2.3,-1],52)                 # a bateria e o quarto
SALA_ESQ=C([-3.4,-0.5,12],[-3.4,-2.2,-1],52)          # a sala do gerador
PAINEL=C([5.6,1.0,12.2],[5.6,0.6,-1],52)              # os dois painéis solares e o Zeca (face para a câmera)
BAT_SALA=C([-1.9,-0.6,13],[-1.9,-2.2,-1],52)          # a bateria e a sala do gerador, juntas
rota=lambda *ks: [dict(p=p,pos=c['pos'],alvo=c['alvo'],fov=c['fov']) for p,c in ks]
PASSEIO_A=C([-1.8,0.6,17.5],[-1.8,-1.4,-1],54); PASSEIO_B=C([4.5,0.6,18.5],[4.5,-1.4,-1],54)   # percorre o bunker, da sala ao painel
LONGE=C([0.5,11,38],[0.5,11,-1],54)                    # o bunker fica ABAIXO da zona da legenda (y > ~1410 em 1920): pontas dos canos ≈ y 1410, base ≈ 1715
PERTO=C([0.5,10,32],[0.5,10,-1],54)                    # começo da batida 30: mesmo recuo, um pouco mais perto (topo ≈ y 1450, base ≈ 1815)
# a sala do gerador fica até o fim: gerador apagado e cinza, com o isolamento
EX=C([3.2,-0.6,13.2],[3.2,-2.4,-1],52)               # a sala extra de água e comida (e o lado direito do quarto)
AMPLO2=C([1.2,0.6,25],[1.2,-1.5,-1],54); AMPLO2B=C([1.2,0.6,23.5],[1.2,-1.5,-1],54)   # as duas salas e o bunker, inteiros
EXTRA=dict(salaEx=True,porta=1,luzEx=1)
SALAP=dict(sala=True,gerador="sala",gerCinza=1,tanque=0.6,escape=True,detector=True,isola=1)

cenas={
1:dict(furo=1,desaba=V(0,0.8,0.1,1),umido=1,chuva=1,camera=cam(QUINTAL,CORTE),gente=[G("zeca",0,-4.0,-1.6,acao="tremendo",exp="medo")],c=[rot("POR QUÊ?",1,y=40,tam=64)]),
2:dict(reverso=True,furo=V(1,0,0.35,1),desaba=V(0.8,0,0,0.6),umido=V(1,0.2),chuva=V(1,0,0.3,0.7),camera=cam(CORTE,QUINTAL),
   gente=[G("zeca",x=V(0,-3.9,0,0.55),y=V(-4.0,0,0,0.55),z=-1.2,acao="em-pe",exp="surpreso")],c=[fita(0,2.4)]),
3:dict(furo=V(0,1,0.08,0.7),umido=0.2,pa=True,camera=cam(C([-2.4,1.4,9.5],[-2.4,-1.4,0],52),CORTE),
   gente=[G("zeca",x=V(-3.7,-0.2,0.72,0.92),y=V(0,-4.0,0.72,0.92),z=-0.8,acao=[[0.7,"mexendo","concentrado"],[1.0,"comemorando","sorriso"]])],c=[rot("ABRIGO ✓",2,y=40,tam=64)]),
4:dict(furo=1,chuva=1,umido=V(0,1),agua=V(0,2.0,0.05,0.95),desaba=V(0,0.85,0.2,1),camera=cam(CORTE,CORTE),
   gente=[G("zeca",0,y=V(-4.0,-0.3,0.35,1),z=-1.6,acao=[[0.35,"tremendo","medo"],[1.0,"mexendo","medo"]])],c=[]),
5:dict(caixa=True,furo=1,umido=0.2,ferro=V(0,1,0,0.45),concreto=V(0,1,0.35,0.85),raioX=V(0,1,0.78,0.9),saida=V(0,1,0.8,1),
   etiq=["ferro@0.3","concreto@0.55","saida@0.88"],etiqL=3.0,camera=cam(LARGO,LARGO),
   gente=[G("zeca",-4.0,0,-0.6,rot=0.4,acao="apontando",exp="eureka")],c=[]),
6:K(umido=1,chuva=0.8,lencol=V(-4.6,-1.7,0.1,0.75),sobe=V(0,0.9,0.45,0.95),balanca=V(0,1,0.5,0.7),setas="agua",setasDe=0.3,
   camera=cam(C([0,0.6,15],[0,-1.8,0]),C([0,0.6,15],[0,-1.8,0])),
   gente=[G("zeca",0,y=V(PISO,PISO+0.9,0.45,0.95),acao="tremendo",exp="medo")],c=[rot("A ÁGUA EMPURRA PRA CIMA",2,y=40,tam=52)]),
7:dict(caixa=True,concreto=1,ferro=1,saida=1,laje=V(0,1,0,0.6),umido=1,chuva=0.6,lencol=-1.7,sobe=V(0.9,0,0.3,0.8),etiq=["laje@0.5"],etiqL=3.0,camera=cam(LARGO,LARGO),
   gente=[G("zeca",0,y=V(PISO+0.9,PISO,0.3,0.8),acao=[[0.5,"tremendo","medo"],[1.0,"em-pe","eureka"]])],c=[]),
8:K(umido=V(1,0.3),lencol=-1.7,terra=V(0,1,0.05,0.8),escavadeira=True,camera=cam(TERRA,TERRA),
   gente=[G("zeca",-5.9,0,0.5,acao="comemorando",exp="sorriso")],c=[]),
9:P(troca=0,grossa=0,coluna=V(0,1,0,0.4),setas="peso",etiq=["umMetro@0.5"],etiqL=3.0,camera=cam(LARGO,LARGO),
   gente=[G("zeca",-0.35,acao="em-pe",exp="preocupado")],c=[dict(tipo="peso",trecho=1,x=210,y=20)]),
10:P(troca=0,grossa=0,verga=V(0,1,0.15,0.6),racha=V(0,1,0.45,0.85),setas="tracao",setasDe=0.3,camera=cam(CORTE,CORTE),
   gente=[G("zeca",-0.5,acao="em-pe",exp="medo")],c=[forcas(2)]),
11:P(troca=V(0,1,0.05,0.9),grossa=0,setas="curva",setasDe=0.55,etiq=["abobada@0.45"],camera=cam(LARGO,CORTE),
   gente=[G("zeca",-0.35,acao=[[0.5,"em-pe","preocupado"],[1.0,"em-pe","eureka"]])],c=[rot("SÓ APERTA",3,y=40,tam=64)]),
12:P(grossa=V(0,1,0.4,0.9),setas="empuxo",setasDe=0.3,camera=cam(C([0,-1.7,11.5],[0,-2.0,0]),C([0,-1.7,11.5],[0,-2.0,0])),gente=[G("zeca",-0.35,acao="em-pe",exp="alivio")],c=[rot("PAREDE GROSSA E ENTERRADA",3,y=40,tam=44)]),
13:P(tampa=V(1,0,0,0.6),escuro=V(0,0.75,0.5,1),ar=True,co2=0.1,camera=cam(CORTE,SALA),gente=[G("zeca",-0.35,acao="em-pe",exp="tenso")],c=[rot("?",1,y=40,tam=140)]),
14:P(tampa=0,lampada=0.8,ar=True,co2=V(0.05,1),camera=cam(SALA,SALA),gente=EM_PE("cansado"),c=[gas(0.05,1,6,1)]),
15:P(tampa=0,lampada=0.8,**CANOS,ar=True,co2=0.5,etiq=["canoBaixo@0.45","canoAlto@0.75"],camera=cam(CORTE,CORTE),gente=EM_PE("neutro"),c=[]),
16:P(tampa=0,lampada=0.8,canos=True,fluxo=0,vent=0,vela=True,ar=True,co2=0.5,camera=cam(CORTE,CORTE),gente=EM_PE("cansado"),c=[termo("FORA",60),termo("DENTRO",330)]),
17:P(tampa=0,lampada=0.8,**CANOS,ar=True,co2=V(0.9,0.2),etiq=["ventilador@0.35"],camera=cam(CORTE,CORTE),gente=EM_PE("sorriso"),c=[gas(0.9,0.25,4,0)]),
18:P(tampa=0,lampada=0.8,canos=True,fluxo=V(1,0,0,0.3),vent=V(1,0,0,0.3),fechados=V(0,1,0,0.4),ar=True,co2=V(0.2,0.9),camera=cam(CORTE,CORTE),gente=EM_PE("tenso"),c=[gas(0.2,0.9,3,1)]),
19:P(tampa=0,lampada=0.8,canos=True,fluxo=0,vent=0,fechados=1,torre=True,cal=V(0,0.35,0.2,1),fluxoTorre=1,ar=True,co2=V(0.9,0.15),etiq=["torre@0.4"],camera=cam(CORTE,CORTE),gente=EM_PE("neutro"),c=[gas(0.9,0.2,5,1)]),
20:P(tampa=0,lampada=0.8,canos=True,fluxo=0,vent=0,fechados=1,torre=True,cal=V(0.35,1,0.1,0.9),fluxoTorre=V(1,0,0.7,0.95),ar=True,co2=V(0.15,0.6),camera=cam(CORTE,CORTE),gente=EM_PE("cansado"),c=[cal(2,2.4)]),
21:P(tampa=0,lampada=1,canos=True,fluxo=1,vent=1,fechados=0,torre=True,cal=1,gerador="dentro",gerLigado=True,fumaca=0.3,etiq=["gerador@0.4"],camera=cam(CORTE,CORTE),gente=[G("zeca",-0.4,acao="comemorando",exp="sorriso")],c=[]),
22:P(tampa=0,lampada=1,canos=True,fluxo=1,vent=1,torre=True,cal=0.3,fluxoTorre=1,gerador="dentro",gerLigado=True,fumaca=0.5,monoxido=1,ar=True,co2=0.2,camera=cam(ALTO,ALTO),gente=DORMEM,c=[rot("MONÓXIDO DE CARBONO",0,y=0,tam=60),rot("NÃO SAI NA TORRE",2,y=110,tam=48)]),
# 23: o gerador sai do quarto: sala fechada à esquerda, cano de escape até o quintal (≈ 6 m da tampa) e detector na porta
23:P(tampa=0,lampada=0.9,**CANOS,sala=True,gerador="sala",gerLigado=True,escape=True,detector=True,monoxido=0.9,regua=True,fio=True,torre=True,cal=1,fluxoTorre=0,
   etiq=["salaGer@0.1-0.5","canoEsc@0.4-0.8","seis@0.7"],etiqL=2.6,camera=cam(SALA_ABRE,SALA_GER),gente=[G("zeca",-2.6,0,0.2,rot=-0.5,acao="apontando",exp="eureka")],c=[]),
24:P(tampa=0,lampada=0.9,**CANOS,sala=True,gerador="sala",gerLigado=True,escape=True,detector=True,monoxido=0.5,ruido=1,vizinhos=True,torre=True,cal=1,fluxoTorre=0,
   camera=cam(VIZINHOS,VIZINHOS),gente=[],c=[]),
25:P(tampa=0,lampada=0.9,**CANOS,sala=True,gerador="sala",gerLigado=True,escape=True,detector=True,monoxido=0.5,isola=V(0,1,0,0.55),ruido=V(1,0,0.2,0.75),tanque=V(1,0,0.55,0.95),torre=True,cal=1,fluxoTorre=0,
   etiq=["isolamento@0.15"],etiqL=2.4,camera=cam(SALA_PERTO,SALA_PERTO),gente=[],c=[]),
# 26: dois painéis de frente no quintal; o fio desce e liga o ventilador e a luz; o gerador fica na sala, apagado e cinza (emergência)
26:P(tampa=0,lampada=0.8,**CANOS,**SALAP,painel=True,sol=V(0,1,0,0.3),fio=True,torre=True,cal=1,fluxoTorre=0,
   etiq=["painel@0.04-0.55","gerEmerg@0.6"],etiqL=2.8,camera=cam(PAINEL,SALA_ESQ),
   rota=rota((0,PAINEL),(0.52,PAINEL),(0.66,SALA_ESQ),(1,SALA_ESQ)),   # segura o painel e o Zeca (≈ 3 s) e só depois vai à sala do gerador
   gente=[G("zeca",3.1,0,0.5,acao="comemorando",exp="sorriso",pula=0.28)],c=[]),
# 27: a noite cai, os painéis apagam e a bateria CHEIA (indicador verde) mantém a luz e o ventilador acesos (só construção: sem operar a bateria)
27:P(tampa=0,lampada=0.9,**CANOS,**SALAP,painel=True,sol=V(1,0,0,0.4),noite=V(0,1,0,0.4),bateria=0.95,fio=True,torre=True,cal=1,fluxoTorre=0,
   etiq=["bateria@0.45"],etiqL=2.8,camera=cam(PAINEL,BAT),
   rota=rota((0,PAINEL),(0.4,PAINEL),(0.58,BAT),(1,BAT)),
   gente=[G("zeca",-0.4,acao="em-pe",exp="alivio")],c=[]),
# 28: sala extra (do lado oposto à do gerador): a porta abre, a luz acende, prateleiras com água e comida; as pessoas olham
28:P(tampa=0,lampada=0.8,**CANOS,**SALAP,salaEx=True,porta=V(0,1,0.05,0.3),luzEx=V(0,1,0.18,0.32),torre=True,cal=1,fluxoTorre=0,painel=True,sol=1,bateria=0.9,fio=True,
   etiq=["agua@0.25-0.8","comida@0.5-1.0"],etiqL=2.2,camera=cam(EX,EX),
   gente=[G("zeca",0.5,rot=1.0,exp="surpreso"),G("vizinha",0.95,rot=1.0,exp="surpreso"),G("menino",1.4,rot=1.0,exp="sorriso"),G("vovo",1.75,rot=1.0,exp="surpreso")],c=[]),
# 29: um bunker básico, pronto pra usar: a câmera mostra as duas salas e o bunker inteiros, com as peças etiquetadas
29:P(tampa=0,lampada=0.6,**CANOS,**SALAP,**EXTRA,torre=True,cal=0.4,fluxoTorre=1,painel=True,sol=1,bateria=0.9,fio=True,etiqL=3.3,
   etiq=["salaGer@0.0-0.2","canoBaixo@0.06-0.28","ventilador@0.16-0.38","abobada@0.26-0.48","torre@0.36-0.58","canoAlto@0.46-0.7","saida@0.54-0.78","agua@0.6-0.82","comida@0.68-0.9","painel@0.74-0.98"],
   camera=cam(AMPLO2,AMPLO2B),gente=[G("zeca",3.0,0,0.6,acao="comemorando",exp="sorriso",pula=0.2)],c=[]),
# 30: "E aí, preparado pro seu apocalipse nuclear?": a câmera se afasta, o quintal some no escuro e sobe o cartão de texto (o bunker fica embaixo)
30:P(tampa=0,lampada=1,**CANOS,**SALAP,**EXTRA,torre=True,cal=0.6,fluxoTorre=1,painel=False,bateria=0.8,fade=V(0,1,0.2,0.85),camera=cam(PERTO,LONGE),
   gente=EM_PE("pensativo"),c=[dict(tipo="perguntaFinal",trecho=1,y=90,linhas=["PREPARADO PRO","SEU APOCALIPSE","NUCLEAR?"])]),
31:P(tampa=0,lampada=1,**CANOS,**SALAP,**EXTRA,torre=True,cal=0.6,fluxoTorre=1,bateria=0.8,fade=1,camera=cam(LONGE,LONGE),
   gente=[],c=[chamada("curtir","CURTA",0),chamada("comentar","COMENTE","se você teria um bunker na sua casa",1),chamada("compartilhar","COMPARTILHE",None,3),chamada("seguir","SIGA","PRA SABER COMO AS COISAS FUNCIONAM",5)]),
}

SFX={1:[("trovao",0,0.5)],2:[("whoosh_reverso",0,0.7),("estatica",0,0.4)],3:[("arrastar",0,0.4),("pop",2,0.5)],4:[("agua",1,0.6),("impacto",2,0.4)],
5:[("chiado",1,0.4),("clique",2,0.6)],6:[("agua",1,0.5),("rangido",2,0.5)],7:[("impacto",1,0.6)],8:[("motor",0,0.35),("impacto",2,0.3)],
9:[("impacto",1,0.5)],10:[("estalo",1,0.8),("chocalho",1,0.3)],11:[("whoosh",0,0.5),("ding",3,0.4)],12:[("impacto_seco",1,0.4)],
13:[("porta",0,0.6),("coracao",1,0.4)],14:[("respiracao",1,0.4),("bips",2,0.4)],15:[("sopro",1,0.5)],16:[("tique",1,0.4)],17:[("clique",0,0.6),("sopro",2,0.5)],
18:[("bips",1,0.4),("clique",0,0.6)],19:[("pop",1,0.5)],20:[("impacto_seco",0,0.4)],21:[("clique",0,0.6),("motor",1,0.5)],22:[("bips",1,0.5),("respiracao",2,0.4)],
23:[("porta",1,0.5),("bips",2,0.4)],24:[("motor",0,0.5),("latido",1,0.4)],25:[("sopro",1,0.4),("bips",2,0.5)],26:[("ding",0,0.5),("clique",2,0.4)],27:[("clique",1,0.4),("ding",2,0.5)],
28:[("porta",0,0.5),("clique",1,0.5)],
29:[("ding",0,0.6)],
30:[("whoosh",0,0.4),("ding",1,0.5)],
31:[("pop",0,0.5),("pop",1,0.5),("pop",3,0.5),("ding",5,0.6)]}
AMB={1:("chuva",0.18),2:("chuva",0.18),3:("chuva",0.1),4:("chuva",0.2),5:("nenhuma",0),6:("chuva",0.16),8:("dia",0.12),9:("nenhuma",0),13:("drone",0.1),26:("dia",0.1),27:("noite",0.14),28:("dia",0.1),30:("drone",0.12)}
bat=[]
for i,f in enumerate(falas,1):
    d=dict(cenas[i]); c=d.pop('c')
    palavras=len(re.sub(r'\[[a-z]+\]','',f).split())
    cena={"cenario":"abrigo",**d}
    if i in AMB:
        s,v=AMB[i]
        cena["ambiencia"]="nenhuma" if s=="nenhuma" else {"som":s,"volume":v}
    if c: cena["cartoes"]=c
    if i in SFX: cena["sfx"]=[{"som":a,"trecho":t,"volume":v} for a,t,v in SFX[i]]
    bat.append({"texto":f,"duracao":round(max(2.2,palavras/2.9),1),"cena":cena})
r={"slug":"demo-3d","serie":"DEMO 3D","episodio":8,"voz":{"tts":"elevenlabs","id":"RGymW84CSmfVugnA5tvA","modelo":"eleven_v4","idioma":"pt","velocidade":1.2},"cartaoFinal":None,"batidas":bat}
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])),exist_ok=True)
json.dump(r,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(bat),'batidas',round(sum(b['duracao'] for b in bat),1),'s')
