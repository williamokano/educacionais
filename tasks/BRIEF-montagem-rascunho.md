# Guia: montar um episódio-rascunho (cenário 3D + gerador + render mudo)

Para quem for montar um dos roteiros-rascunho (`tasks/roteiro-<tema>.md`) até o **render mudo**. Escrito em 04/11/2026 com o que deu certo e errado no episódio da
procissão. Raiz do repositório: `/home/william/Workspace/Personal/educacionais`.

## O que entregar (e o que NÃO fazer)

Entregar: (1) cenário 3D `motor/banco/series/explicadores/<cenario>.tsx` registrado em `index.tsx`; (2) gerador `tasks/geradores/<tema>.py`; (3)
`episodios/<tema>/roteiro.json`; (4) vídeo mudo `episodios/<tema>/rascunho-mudo.mp4` (sem voz: pode ficar sem áudio); (5) uma linha de status no
`tasks/COMO-CONTINUAR.md` e o item marcado em `tasks/todo.md`.
NÃO fazer: voz (ElevenLabs), som/mix/master, capa, textos de publicação, NAS, publisher, stories, **commit**. Não mexer em `motor/src`, `pipeline`, `tools`
(motor é do plugin). Não alterar o texto do roteiro; se a fala precisar mudar para a imagem fazer sentido, anote em "Pendências" no fim do `.md` e siga.

## Leia antes

1. `tasks/lessons.md` inteiro (todas as correções valem; as do episódio 12, no fim, são as mais recentes).
2. O roteiro do tema (`tasks/roteiro-<tema>.md`): tabela de cenas, "Linguagem visual", "Fontes".
3. Implementação de referência: `motor/banco/series/explicadores/procissao.tsx` + `fieis.ts` + `tasks/geradores/procissao.py` (padrão mais novo), e
   `inducao.tsx` + `tasks/geradores/inducao.py` (cozinha). Peças de apoio: `cozinha-base.tsx` (Liga, Seta, Halo, Texto3D, Etiqueta, Fumaca, mistura),
   `../../../src/v3d/qualidade` (Caixa, Mat, rnd), `../../../src/v3d/anima` (valor, suave, clamp01, lerp), `../../../src/v3d/acoes` (poseDe3D: poses do boneco),
   `../../../src/v3d/personagem` (Boneco3D). Cartões disponíveis: veja `index.tsx` e os `cartoes*.tsx` (rotulo, medida, chamada, perguntaFinal, peso, gas…).
4. `motor/docs/roteiro-3d.md` (contrato do roteiro 3D).

## Cenário (`<cenario>.tsx`)

- Comentário no topo com a lista de campos (como em `procissao.tsx`). Campos numéricos aceitam `{de, para, ini, fim}` (`valor(n0(cena[k]), p, pad)`).
- Registre em `index.tsx`: `import`, e a chave em `cenarios3d`. Personagens novos entram em `fieis.ts` (ou arquivo novo) e em `personagens3d`.
- Mundo em metros; o Zeca (id `zeca`) tem ~1,7 m (`esc` 1,06). Câmera por `camera: {de:{pos,alvo,fov}, para:{...}}`. Cores de céu/fundo em `fundo`.
- `npx tsc --noEmit` (em `motor/`) tem que passar limpo.

## Gerador (`tasks/geradores/<tema>.py`)

Copie a estrutura de `procissao.py`: lê a tabela do `.md` (as falas SEMPRE iguais ao texto), monta `cenas[i]` com `M(...)`, `V(...)`, `cam(...)`, cartões (`rot`,
`chamada`, `pergunta`), `SFX` por batida (nomes válidos: `motor/pipeline/sfx.py` → `REGISTRO`; `trecho` ≤ nº de `[leve]` da batida), `AMB` (ambiência),
`pausa` por batida só vale entre PEDIDOS de voz (veja lessons). Grave `"episodio": N` com o número que a tarefa indicar (cada episódio é uma pasta
`motor/public/demo-3d/epNN`; não repita número). Uso: `python3 tasks/geradores/<tema>.py episodios/<tema>/roteiro.json`.

## Render mudo (passos; rode da raiz ou de `motor/` como indicado)

```bash
python3 tasks/geradores/<tema>.py episodios/<tema>/roteiro.json
cd motor && python3 pipeline/narrar.py ../episodios/<tema>/roteiro.json --mudo      # grava public/demo-3d/epNN/episode.json (fps 30!)
# quadros de conferência (frame = round(segundos * fps); LEIA o fps do episode.json, é 30, não 25):
npx remotion still src/index.ts episodio <scratchpad>/q/a.png --frame=<N> --scale=0.4 --props='{"episode":"demo-3d/epNN"}'
# vídeo completo mudo (demora vários minutos; rode em segundo plano, sem sleep em primeiro plano):
npx remotion render src/index.ts episodio ../episodios/<tema>/rascunho-mudo.mp4 --props='{"episode":"demo-3d/epNN"}'
```

- Use o diretório de rascunho da sessão (scratchpad) para quadros temporários; nada de `/tmp` solto.
- Rodar em segundo plano: `setsid nohup <script.sh> > log 2>&1 < /dev/null &` e esperar com um laço `until [ -f FLAG ]; do sleep 10; done` também em segundo
  plano. **Nunca** `pkill -f` com um padrão que apareça na sua própria linha de comando (mata o próprio shell).
- Com muitas batidas 3D a folha única estoura contextos WebGL: tire UM quadro por batida (meio) com `remotion still` e monte a folha com PIL (colunas de 300 px).
- Faça de 2 a 4 rodadas de conferência/correção olhando os quadros do VÍDEO renderizado (não só dos quadros de teste). Cada rodada: leia os quadros,
  liste o que está errado, corrija, regenere, renderize de novo.

## Checklist visual (as correções que a pessoa já fez; confira TODAS antes de entregar)

- Objeto levado/segurado fica **na frente do corpo, nas mãos** (pose com os braços à frente: `SEGURA`/`SEGURA_D`/`COMUNHAO` em `procissao.tsx`), nunca no
  eixo do tronco nem flutuando. Procure (`grep`) TODAS as ocorrências de cada objeto levado, em todas as vinhetas.
- Peça que não recebe `x` (desenhada em x = 0) vai num `<group position>` do palco/lugar certo. Confira que aparece junto das pessoas.
- Objeto preso a uma pessoa escala com `altura / 1,6` do personagem; varas/ombros: iguale a altura dos carregadores e ponha cada um AO LADO da vara.
- Expressão padrão `sorriso` ou `surpreso`; `neutro` e `preocupado` leem como tristeza. Só use triste quando a fala pede.
- Multidão/fila/torcida = dezenas de pessoas (30+), em fileiras; 8 parece teatro.
- **Câmera** (lessons, 04/11/2026): padrão na diagonal (três quartos); movimento nem sempre, mas de vez em quando um ângulo/movimento cinematográfico (viradas, revelações, aberturas); cenário com vida.
- **NUNCA gore** (lessons, 04/11/2026): visual infantil. Machucado só leve e simbólico, estilo Looney Tunes (a parte atingida incha, pulsa vermelho, raios/estrelinhas; braço vermelho como na airfryer; nada arranca); morte só se o tema exigir (fala + olhos em X); perigo principalmente no objeto/ambiente.
- Abertura: em movimento, câmera na FRENTE do personagem (diagonal, não "chapada"), cenário ao fundo; nunca de costas.
- Escala real dos objetos ao lado do Zeca; aproxime a câmera da peça que a fala explica (≥ 45% da largura).
- Peça só aparece quando a fala a introduz; o nome do objeto só na batida de revelação (rótulos incluídos).
- Rótulos 3D: curtos, medidos pelo texto, dentro da coluna segura; confira `etiqK` no vídeo final, no momento em que o rótulo entra (câmera andando muda o tamanho).
- Cortes dentro de uma batida seguem `trechos` (tempo da fala), não frações da batida.
- Boca/língua de bicho: interior escuro entre focinho e mandíbula, a mandíbula desce, a língua apoia nela.
- A física tem que estar certa (sentido dos movimentos, circuitos fechados, pressão/escape).
- Rótulos e cartões de texto longo: confira tamanho real; nada cortado nas bordas; nada atrás dos botões do Reels (parte de baixo e lado direito).

## Ao terminar

Responda com: arquivos criados, nº de batidas, duração do vídeo mudo, o que ainda está fraco (honesto), e como assistir (`episodios/<tema>/rascunho-mudo.mp4`).
Marque o item em `tasks/todo.md` e acrescente UMA entrada curta no `tasks/COMO-CONTINUAR.md` (status "rascunho mudo", comando do gerador, pontos fracos).
