# Cafeterias de Betim — Business Intelligence

Estudo de **Inteligência de Negócios (BI)** sobre o mercado de cafeterias de **Betim (MG)**, desenvolvido como Trabalho Prático da disciplina de *Business Intelligence* na **PUC Minas — Campus Betim** (Prof. Clóvis Lemos Tavares).

O projeto abrange desde a coleta primária de dados públicos até a camada de visualização analítica, com pipeline de **ETL em Python**, **modelagem dimensional (modelo em estrela)**, **dashboard oficial no Power BI** e **landing page** exibindo os 6 gráficos gerados no Power BI.

- **Página publicada (GitHub Pages):** [https://max-augusto.github.io/Trabalho-Pratico-BI/](https://max-augusto.github.io/Trabalho-Pratico-BI/)

---

## Principais Indicadores da Base

- **20** cafeterias mapeadas em Betim/MG
- **4,63** de nota média no Google
- **5.500** avaliações acumuladas analisadas
- **64,0 h** de disponibilidade operacional média semanal

---

## Estrutura do Repositório

```text
.
├── index.html                        # Landing page e estrutura do dashboard
├── styles.css                        # Estilos (design editorial e responsivo)
├── app.js                            # KPIs, interações e link oficial do Power BI
├── etl_cafeterias.py                 # Script Python de ETL (padronização, limpeza e exportação)
├── powerbi_setup.md                  # Documentação de modelagem, medidas DAX e publicação
└── assets/
    ├── mapa2.pdf                     # Mapa geográfico das cafeterias mapeadas
    ├── mapa-betim.png                # Versão em imagem do mapa exibida na página web
    ├── Graficos Power BI.pdf         # Exportação em PDF dos gráficos do Power BI
    ├── cafeterias-betim-power-bi.pdf # Relatório completo exportado do Power BI
    ├── graficos-power-bi/            # Imagens PNG dos 6 gráficos exibidos na página
    └── data/
        ├── cafeterias_betim_bi.csv   # Base tratada (UTF-8, separador ';') para BI
        ├── cafeterias_betim_bi.xlsx  # Base tratada em Excel para carga direta no Power BI
        └── cafeterias.js             # Dados estruturados consumidos pela landing page
```

---

## Visões Analíticas do Dashboard (Power BI)

1. **Notas e volume de avaliações** — gráfico de dispersão por segmento (eixo Y em escala logarítmica).
2. **Cafeterias por bairro** — barras horizontais ordenadas por concentração de estabelecimentos.
3. **Participação por segmento** — gráfico de rosca (*Popular*, *Intermediária* e *Premium*).
4. **Horas abertas por tipo** — colunas com a média semanal de funcionamento por categoria.
5. **Propriedade × Localização** — treemap comparando operações *Independentes* e *Redes* por tipo de ponto (*Loja de rua* vs *Shopping*).
6. **Faixa de preço × Reputação** — gráfico combinado (colunas de quantidade + linha de nota média Google por faixa de preço).

---

## Como Executar Localmente

1. **Visualizar a aplicação web:**
   ```bash
   python3 -m http.server 8080
   ```
   Acesse `http://localhost:8080/` no navegador.

2. **Reprocessar o ETL (opcional):**
   ```bash
   pip install openpyxl
   python3 etl_cafeterias.py --input caminho/para/planilha.xlsx --outdir .
   ```

3. **Power BI:**
   Consulte [`powerbi_setup.md`](powerbi_setup.md) para detalhes da modelagem em estrela, medidas DAX e publicação. O link do relatório publicado está configurado na constante `POWER_BI_URL` em [`app.js`](app.js).
