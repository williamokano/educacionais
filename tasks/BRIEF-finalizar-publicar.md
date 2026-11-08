# Guia: finalizar (voz, som, master), montar o pacote e agendar um episódio

Para quem for finalizar um episódio já aprovado até o agendamento. Raiz: `/home/william/Workspace/Personal/educacionais`. Sem commit (nunca Co-Authored-By).
A pessoa já aprovou o conteúdo (roteiro e vídeo mudo). As falas NÃO mudam.

## 1. Finalizar (voz, som, render, master)

Repita o processo dos episódios já finalizados (`episodios/<slug>/`, `tasks/geradores/cadeado.py`, `descarga.py`, `hidreletrica.py`, `ziper.py` leem os tempos reais de `epNN/episode.json`; `tasks/COMO-CONTINUAR.md`; `tasks/lessons.md` inteiro).

1. **Voz** ElevenLabs (`RGymW84CSmfVugnA5tvA`, `eleven_v4`, velocidade 1,2; `pausa` só entre pedidos; `falante`/`vozes` com seed diferente quando precisar) com `cd motor && python3 pipeline/narrar.py ../episodios/<slug>/roteiro.json` (sem `--mudo`). Se a voz do episódio já existe (`motor/public/demo-3d/epNN/narration.wav`), use o cache: **não** gaste voz de novo. **Nunca** semeie o cache à mão (a chave inclui o seed do `padrao.json`); antes de rodar `narrar`, confira que `roteiro.json` não mudou as falas (senão o pipeline regera tudo, ~2.500 créditos). Se a chave faltar ou o saldo acabar (401/quota), PARE e avise.
   Confira os primeiros 3 s: a primeira palavra inteira, sem corte tipo "vo… cê" (se houver, regere só a batida 1 com outro seed via `falante`, como no submarino).
2. A duração muda com a voz real (~20% menor): ajuste em `tasks/geradores/<slug>.py` tudo o que depende de tempo absoluto lendo `motor/public/demo-3d/epNN/episode.json` (câmeras/tomadas, cartões, rotações, sincronia com a fala e os efeitos); regenere (`python3 tasks/geradores/<slug>.py episodios/<slug>/roteiro.json`) e rode `narrar` de novo só com cache.
3. **Som:** `pipeline/som.py` (efeitos sincronizados com a imagem). Ambiência **discreta**: nada grave contínuo (lição do zunido); só nas batidas da peça, volume baixo, fade.
4. **Render final:** `cd motor && npx remotion render src/index.ts episodio <saida> --concurrency=16 --props='{"episode":"demo-3d/epNN"}'` em segundo plano (`setsid nohup` + laço `until`; nunca `pkill -f` com padrão da própria linha; nada de `sleep` em primeiro plano). **No máximo 2 renders simultâneos no total**: confira `pgrep -fa "remotion render"` e espere se já houver 2.
5. `mixar.py` e `masterizar.sh` (−14 LUFS, −2 dBTP; se o AAC passar de −2 dBTP, remasterize em −3) → `episodios/<slug>/final.mp4`.
6. **Confira:** duração ≤ 3:00, áudio, 8 quadros, níveis, transcrição (STT) de termos difíceis, varredura de piscadas quadro a quadro.
7. Copie `final.mp4` e `roteiro.md` para o NAS (`/mnt/nas-dxp6800pro/Videos Curtos/Educacionais/<NN>-<tema>/`; mantenha o rascunho; `cmp`; se o `cmp` acusar EOF por zeros de bloco, `truncate -s <tamanho local>` no arquivo do NAS).

## 2. Pacote de publicação (skill `/motion-videos:publicar`)

Padrão real: `episodios/cadeado/publicacao/`, `episodios/ziper/publicacao/`, `episodios/submarino/publicacao/`. Composição `capa` (props `quadro/titulo/selo/tamanho/legenda:false/hud:false`) sobre `demo-3d/epNN`:

- `capa.png`, `story-horario.png` (texto "Hoje às Xh", teaser no MESMO dia do vídeo, 3 h antes) e `story-ja-saiu.png` (selo NOVO EPISÓDIO) em `episodios/<slug>/publicacao/`.
- O **nome do objeto principal NÃO aparece** na capa, no título, na legenda nem nos endereços das fontes públicas (só na revelação do vídeo). Sem gore.
- `textos.md`: legenda do Instagram (gancho na 1ª linha com a piada de abertura; hashtags: as três fixas `#comofunciona #fisica #ciencia` + `#curiosidades` + uma temática; hashtags novas ficam como pendência), título ≤ 70 caracteres em forma de pergunta, descrição do YouTube com capítulos reais (tempos da voz, nenhum capítulo com < 8 s; sem spoiler no da revelação), fontes da seção Fontes do roteiro, primeiro comentário fixado (revela o objeto e puxa o próximo episódio conforme a fala REAL do gancho final do vídeo e a agenda), checklist, e o **texto de cada story** (uma linha, até 60 caracteres contados; curiosidade sem entregar; o do horário e o do "já saiu" são diferentes).
- Simulação do iPhone (`bash tools/simular-iphone.sh` em `motor/`), se existir. Trailer em vídeo: NÃO.
- Copie `publicacao/` para o NAS (`cmp`).

## 3. Agendar (MCP `publisher`, carregue as ferramentas com ToolSearch)

- Padrão idêntico ao do cadeado/zíper: série `educativos` (`ea420d81f38598f0a1dd75a5ccfa2bb9`), conta `15040438e212d6c31e43b2635e46855c`, `media_path` relativo `Videos Curtos/Educacionais/<NN>-<tema>/final.mp4`, capa via `set_content_cover`, primeiro comentário fixado, três releases: story de horário (teaser), vídeo e story "já saiu" (1 min depois do vídeo). Datas e horários vêm do pedido.
- ANTES: `list_contents`/`list_releases` para não duplicar e conferir que o dia/horário está livre; se o horário já passou, PARE e avise.
- DEPOIS: três releases `pending`, `get_series_plan` com o vídeo `on_plan`; registre "agendado <data>" com IDs em `tasks/todo.md` e `tasks/COMO-CONTINUAR.md`.
- A série tem 2 slots por dia (horários de São Paulo): dom 11:00 e 20:00; seg 09:00 e 12:00; ter 12:00 e 21:00; qua 12:00 e 18:00; qui 07:30 e 18:00; sex 12:00 e 15:00; sáb 10:00 e 18:00.

## 4. Relato

Duração final, níveis, créditos de voz gastos, ajustes, pontos fracos (pronúncia, sincronia), IDs e horários (UTC/BRT), textos finais (inclusive os dois textos de story com contagem de caracteres) e pendências (hashtags novas, ganchos).
