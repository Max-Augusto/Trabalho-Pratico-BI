# Guia de Montagem no Power BI — Cafeterias de Betim

**Trabalho Prático de Business Intelligence — PUC Minas / Betim**
Prof. Clóvis Lemos Tavares

O relatório entregue está na página **Análise das cafeterias**, com seis gráficos no Power BI Service. O acesso depende das permissões da conta Microsoft. [Abrir relatório](https://app.powerbi.com/groups/me/reports/9ffbf44e-73de-4eb8-b84b-d2356a246e92/4b4de60277d36389e563?experience=power-bi)

O [status da entrega](STATUS_TRABALHO_BI.txt) registra os gráficos e as medidas usadas. As seções de montagem abaixo descrevem o procedimento de referência a partir da base tratada pelo ETL.

---

## 0. Arquivos entregues pelo ETL

| Arquivo | Uso |
|---|---|
| `assets/data/cafeterias_betim_bi.csv` | Carga no Power BI (UTF-8, separador `;`) |
| `assets/data/cafeterias_betim_bi.xlsx` | Mesma base em Excel, para conferência |
| `assets/data/cafeterias.js` | Consumo pela landing page (Chart.js) |

Colunas da base:

`nome, endereco, latitude, longitude, bairro, tipo, segmento, propriedade, localizacao,
localizacao_simplificada, status_inclusao, nota_google, num_avaliacoes, nivel_preco,
faixa_preco, preco_min, preco_max, horas_semana, unidades_betim`

> Ausências são mantidas como vazio (não como zero) para não distorcer médias.
> Bairro “A confirmar” foi padronizado como “Não informado”.

---

## 1. Importar a base no Power BI Desktop

1. Abra o **Power BI Desktop**.
2. `Página Inicial → Obter dados → Texto/CSV`.
3. Selecione `assets/data/cafeterias_betim_bi.csv`.
4. Na janela de pré-visualização, confirme:
   - **Origem do arquivo:** UTF-8
   - **Delimitador:** ponto e vírgula (`;`)
   - **Promover cabeçalhos:** Sim
5. Clique em **Transformar Dados** e ajuste os tipos:

| Coluna | Tipo |
|---|---|
| latitude, longitude, nota_google, preco_min, preco_max, horas_semana | Número decimal |
| num_avaliacoes, nivel_preco, unidades_betim | Número inteiro |
| nome, endereco, bairro, tipo, segmento, propriedade, localizacao, localizacao_simplificada, status_inclusao, faixa_preco | Texto |

6. Renomeie a consulta para **`Cafeterias`** e clique em **Fechar e Aplicar**.

### Coluna calculada útil (Power Query ou DAX)

```DAX
Preco Medio =
DIVIDE ( 'Cafeterias'[preco_min] + 'Cafeterias'[preco_max], 2 )
```

---

## 2. Modelagem dimensional (opcional, mas recomendada para nota)

A base plana funciona para os 6 visuais. Para demonstrar modelagem em estrela, crie as
dimensões como **tabelas calculadas** (`Modelagem → Nova tabela`):

```DAX
Dim Segmento = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[segmento] )

Dim Tipo = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[tipo] )

Dim Bairro = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[bairro] )

Dim Propriedade = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[propriedade] )

Dim Localizacao = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[localizacao_simplificada] )

Dim Status = SUMMARIZE ( 'Cafeterias', 'Cafeterias'[status_inclusao] )
```

Crie os relacionamentos **1 → \*** (dimensão → fato) no modo Modelo:

- `Dim Segmento[segmento]` → `Cafeterias[segmento]`
- `Dim Tipo[tipo]` → `Cafeterias[tipo]`
- `Dim Bairro[bairro]` → `Cafeterias[bairro]`
- `Dim Propriedade[propriedade]` → `Cafeterias[propriedade]`
- `Dim Localizacao[localizacao_simplificada]` → `Cafeterias[localizacao_simplificada]`
- `Dim Status[status_inclusao]` → `Cafeterias[status_inclusao]`

> Se preferir simplicidade, o guia dos visuais abaixo usa a tabela única `Cafeterias` —
> os dois caminhos funcionam.

### Diagrama do modelo (texto)

```
Dim Tipo ──┐
Dim Segmento ─┐
Dim Bairro ──┼──►  Fato: Cafeterias (nome, lat, long, notas, reviews, horas, preços)
Dim Propriedade ─┤
Dim Localizacao ─┤
Dim Status ──┘
```

---

## 3. Medidas DAX

Crie uma tabela de medidas (`Modelagem → Nova tabela`):

```DAX
_Medidas = { BLANK() }
```

E adicione as medidas abaixo (ajuste o nome da tabela se necessário):

```DAX
Total Cafeterias = COUNTROWS ( 'Cafeterias' )

Media Nota = AVERAGE ( 'Cafeterias'[nota_google] )

Media Nota Formatada = FORMAT ( [Media Nota], "0.00" )

Total Avaliacoes = SUM ( 'Cafeterias'[num_avaliacoes] )

Media Avaliacoes = AVERAGE ( 'Cafeterias'[num_avaliacoes] )

Horas Medias = AVERAGE ( 'Cafeterias'[horas_semana] )

Horas Medias Formatada = FORMAT ( [Horas Medias], "0.0" ) & " h"

Ticket Medio = AVERAGE ( 'Cafeterias'[Preco Medio] )

% do Total =
DIVIDE ( [Total Cafeterias], CALCULATE ( [Total Cafeterias], ALL ( 'Cafeterias' ) ) )

% por Segmento =
DIVIDE (
    [Total Cafeterias],
    CALCULATE ( [Total Cafeterias], ALL ( 'Cafeterias'[segmento] ) )
)

Ranking Bairros =
RANKX ( ALL ( 'Cafeterias'[bairro] ), [Total Cafeterias], , DESC, DENSE )

Nota Ponderada por Reviews =
DIVIDE (
    SUMX ( 'Cafeterias', 'Cafeterias'[nota_google] * 'Cafeterias'[num_avaliacoes] ),
    SUM ( 'Cafeterias'[num_avaliacoes] )
)

Cafeterias com Horario =
COUNTROWS ( FILTER ( 'Cafeterias', NOT ISBLANK ( 'Cafeterias'[horas_semana] ) ) )

Tipo com Mais Horas =
VAR Resumo =
    ADDCOLUMNS (
        VALUES ( 'Cafeterias'[tipo] ),
        "@Horas", CALCULATE ( [Horas Medias] )
    )
RETURN
    MAXX ( TOPN ( 1, Resumo, [@Horas], DESC ), 'Cafeterias'[tipo] )
```

> Dica de formatação: `Media Nota` → 2 casas decimais; `Total Avaliacoes` → separador de
> milhar; `% do Total` / `% por Segmento` → percentual com 1 casa.

---

## 4. Montagem dos 6 visuais

### 4.1 Dispersão — Nota Google × Volume de Avaliações
- Visual: **Gráfico de dispersão**
- Eixo X: `nota_google`
- Eixo Y: `num_avaliacoes`
- Detalhes: `nome`
- Legenda: `segmento`
- Formatação: rótulo de dados (nome) ativado; eixo Y em **escala logarítmica**
  (há um outlier com 1.579 avaliações); tamanho do marcador fixo.
- Insight esperado: notas altas não acompanham necessariamente volume — redes e
  cafeterias tradicionais concentram mais reviews.

### 4.2 Barras clusterizadas — Distribuição por bairro
- Visual: **Gráfico de barras clusterizadas** (horizontal)
- Eixo Y: `bairro`
- Eixo X: `Total Cafeterias`
- Classificar por `Total Cafeterias` (decrescente)
- Filtro visual (opcional): Top N 8 por `Total Cafeterias`
- Destaque: Centro, Angola, Ingá e São João.

### 4.3 Rosca — Participação por segmento
- Visual: **Gráfico de rosca**
- Legenda: `segmento`
- Valores: `Total Cafeterias`
- Rótulos: categoria + percentual do total
- Cores sugeridas: Popular `#F4B400`, Intermediária `#00A3AD`, Premium `#0B2C4D`.

### 4.4 Colunas — Disponibilidade operacional média por tipo
- Visual: **Gráfico de colunas clusterizadas**
- Eixo X: `tipo`
- Eixo Y: `Horas Medias`
- Classificar por `Horas Medias` (decrescente)
- Rótulos de dados ativados; título “Média de horas abertas por semana”.
- Observação: tipos sem horas informadas são ignorados automaticamente pela média.

### 4.5 Treemap — Propriedade × Localização
- Visual: **Treemap**
- Grupo: `propriedade`
- Detalhes: `localizacao_simplificada`
- Valores: `Total Cafeterias`
- Insight: 80% independentes; quase todo o mercado está em loja de rua, com
  shopping restrito a redes e poucas operações.

### 4.6 Cartões de KPI
Crie três **Cartões**:

| Cartão | Campo/medida | Formato |
|---|---|---|
| Total de cafeterias | `Total Cafeterias` | inteiro |
| Reputação média | `Media Nota` | 0.00 |
| Avaliações acumuladas | `Total Avaliacoes` | milhar |

Opcional: um quarto cartão com `Horas Medias Formatada`.

---

## 5. Acesso ao relatório pela página do trabalho

A seção **Dashboard analítico** de `index.html` exibe os seis gráficos em
uma grade. As imagens em `assets/graficos-power-bi/` foram extraídas de
`assets/Graficos Power BI.pdf` e podem ser vistas sem login.

O botão **Abrir dashboard** leva ao relatório interativo no Power BI e requer
login e permissão.
