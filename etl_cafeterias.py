#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL — Cafeterias de Betim (MG)
Trabalho Prático de Business Intelligence — PUC Minas / Betim
Prof. Clóvis Lemos Tavares

Lê a planilha original (Pasta1.xlsx), padroniza os dados, trata ausências,
gera o arquivo de carga para o Power BI (CSV + XLSX) e o arquivo de dados
consumido pela landing page (assets/cafeterias.js).

Uso:
    python3 etl_cafeterias.py
    python3 etl_cafeterias.py --input ~/Downloads/Pasta1.xlsx --outdir .

Requisitos:
    pip install openpyxl
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:  # pragma: no cover
    sys.exit("openpyxl não encontrado. Rode: python3 -m pip install --user openpyxl")


COLUNAS_SAIDA = [
    "nome",
    "endereco",
    "latitude",
    "longitude",
    "bairro",
    "tipo",
    "segmento",
    "propriedade",
    "localizacao",
    "localizacao_simplificada",
    "status_inclusao",
    "nota_google",
    "num_avaliacoes",
    "nivel_preco",
    "faixa_preco",
    "preco_min",
    "preco_max",
    "horas_semana",
    "unidades_betim",
]


def normalizar(texto: Any) -> str:
    """Remove acentos, espaços duplicados e deixa em minúsculas para comparação."""
    if texto is None:
        return ""
    s = str(texto).strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).lower()


MAPA_COLUNAS = {
    "nome": "nome",
    "endereco": "endereco",
    "latitude": "latitude",
    "longitude": "longitude",
    "bairro": "bairro",
    "dimensao 1": "tipo",
    "tipo": "tipo",
    "dimensao 2": "segmento",
    "segmento": "segmento",
    "dimensao 3": "propriedade",
    "propriedade": "propriedade",
    "dimensao 4": "localizacao",
    "localizacao": "localizacao",
    "dimensao 5": "status_inclusao",
    "status de inclusao": "status_inclusao",
    "medida 1": "nota_google",
    "nota google": "nota_google",
    "medida 2": "num_avaliacoes",
    "n avaliacoes": "num_avaliacoes",
    "medida 3": "nivel_preco",
    "nivel de preco": "nivel_preco",
    "faixa de preco observada": "faixa_preco",
    "faixa de preco": "faixa_preco",
    "medida 4": "horas_semana",
    "horas abertas": "horas_semana",
    "medida 5": "unidades_betim",
}


def mapear_cabecalho(cabecalho: list[Any]) -> dict[int, str]:
    """Associa o índice de cada coluna original ao nome normalizado de destino."""
    indice: dict[int, str] = {}
    for i, valor in enumerate(cabecalho):
        chave = normalizar(valor)
        if not chave:
            continue
        for prefixo, destino in MAPA_COLUNAS.items():
            if chave.startswith(prefixo):
                indice[i] = destino
                break
    return indice


def para_numero(valor: Any) -> float | None:
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        numero = float(valor)
        return None if numero != numero else numero  # descarta NaN
    texto = str(valor).strip()
    if not texto or texto.lower() in {"nan", "none", "-", "—"}:
        return None
    texto = texto.replace("\u2013", "-").replace("\u2014", "-")
    texto = re.sub(r"[^\d,.\-]", "", texto)
    if "," in texto and "." in texto:
        texto = texto.replace(".", "").replace(",", ".")
    elif "," in texto:
        texto = texto.replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return None


def interpretar_faixa(faixa: Any) -> tuple[float | None, float | None]:
    if faixa is None:
        return None, None
    texto = str(faixa).replace("\u2013", "-").replace("\u2014", "-")
    valores = re.findall(r"\d+(?:[.,]\d+)?", texto)
    if len(valores) >= 2:
        return para_numero(valores[0]), para_numero(valores[1])
    return None, None


def limpar_texto(valor: Any) -> str | None:
    if valor is None:
        return None
    texto = re.sub(r"\s+", " ", str(valor)).strip()
    return texto or None


def normalizar_bairro(valor: Any) -> str:
    texto = limpar_texto(valor)
    if not texto or normalizar(texto) in {"a confirmar", "nao informado"}:
        return "Não informado"
    return texto


def simplificar_localizacao(valor: Any) -> str:
    chave = normalizar(valor)
    if "shopping" in chave:
        return "Shopping"
    if "rua" in chave:
        return "Loja de rua"
    return limpar_texto(valor) or "Não informado"


def localizar_cabecalho(linhas: list[tuple[Any, ...]]) -> int:
    for i, linha in enumerate(linhas[:10]):
        if any(normalizar(c) == "nome" for c in linha) and any(
            "segmento" in normalizar(c) for c in linha
        ):
            return i
    raise ValueError("Cabeçalho com 'Nome' e 'Segmento' não encontrado na planilha.")


def carregar_planilha(caminho: Path) -> list[dict[str, Any]]:
    wb = openpyxl.load_workbook(caminho, data_only=True)
    ws = wb.worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    inicio = localizar_cabecalho(linhas)
    cabecalho = list(linhas[inicio])
    indice = mapear_cabecalho(cabecalho)

    registros: list[dict[str, Any]] = []
    for linha in linhas[inicio + 1 :]:
        bruto = {indice[i]: linha[i] for i in indice if i < len(linha)}
        nome = limpar_texto(bruto.get("nome"))
        if not nome:
            continue
        faixa = limpar_texto(bruto.get("faixa_preco"))
        preco_min, preco_max = interpretar_faixa(faixa)
        nota = para_numero(bruto.get("nota_google"))
        avaliacoes = para_numero(bruto.get("num_avaliacoes"))
        horas = para_numero(bruto.get("horas_semana"))

        registro = {
            "nome": nome,
            "endereco": limpar_texto(bruto.get("endereco")),
            "latitude": para_numero(bruto.get("latitude")),
            "longitude": para_numero(bruto.get("longitude")),
            "bairro": normalizar_bairro(bruto.get("bairro")),
            "tipo": limpar_texto(bruto.get("tipo")) or "Não informado",
            "segmento": limpar_texto(bruto.get("segmento")) or "Não informado",
            "propriedade": limpar_texto(bruto.get("propriedade")) or "Não informado",
            "localizacao": limpar_texto(bruto.get("localizacao")) or "Não informado",
            "localizacao_simplificada": simplificar_localizacao(bruto.get("localizacao")),
            "status_inclusao": limpar_texto(bruto.get("status_inclusao")) or "Não informado",
            "nota_google": round(nota, 2) if nota is not None else None,
            "num_avaliacoes": int(avaliacoes) if avaliacoes is not None else None,
            "nivel_preco": int(para_numero(bruto.get("nivel_preco")))
            if para_numero(bruto.get("nivel_preco")) is not None
            else None,
            "faixa_preco": faixa,
            "preco_min": preco_min,
            "preco_max": preco_max,
            "horas_semana": round(horas, 2) if horas is not None else None,
            "unidades_betim": int(para_numero(bruto.get("unidades_betim")))
            if para_numero(bruto.get("unidades_betim")) is not None
            else 1,
        }
        registros.append(registro)

    registros.sort(key=lambda r: (r["segmento"], r["nome"]))
    return registros


def formatar_csv(valor: Any) -> Any:
    """Grava decimais com vírgula (pt-BR), padrão esperado pelo Power BI."""
    if valor is None:
        return ""
    if isinstance(valor, float):
        return ("%g" % valor).replace(".", ",")
    return valor


def gravar_csv(registros: list[dict[str, Any]], destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with destino.open("w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=COLUNAS_SAIDA, delimiter=";")
        escritor.writeheader()
        for registro in registros:
            escritor.writerow({c: formatar_csv(registro[c]) for c in COLUNAS_SAIDA})


def gravar_xlsx(registros: list[dict[str, Any]], destino: Path) -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Cafeterias"
    ws.append(COLUNAS_SAIDA)
    for registro in registros:
        ws.append([registro[c] for c in COLUNAS_SAIDA])

    cabecalho_preenchimento = PatternFill("solid", fgColor="0B2C4D")
    for celula in ws[1]:
        celula.font = Font(bold=True, color="FFFFFF")
        celula.fill = cabecalho_preenchimento
        celula.alignment = Alignment(horizontal="center", vertical="center")
    for i, coluna in enumerate(COLUNAS_SAIDA, start=1):
        largura = max(len(coluna) + 2, 14)
        ws.column_dimensions[get_column_letter(i)].width = min(largura, 46)
    ws.freeze_panes = "A2"
    destino.parent.mkdir(parents=True, exist_ok=True)
    wb.save(destino)


def gravar_dados_web(registros: list[dict[str, Any]], destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    conteudo = (
        "/* Arquivo gerado automaticamente por etl_cafeterias.py — não edite à mão. */\n"
        "window.CAFETERIAS_BETIM = "
        + json.dumps(registros, ensure_ascii=False, indent=2)
        + ";\n"
        + "window.BASE_ATUALIZADA_EM = "
        + json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
        + ";\n"
    )
    destino.write_text(conteudo, encoding="utf-8")


def media(valores: list[float]) -> float | None:
    return round(sum(valores) / len(valores), 2) if valores else None


def imprimir_resumo(registros: list[dict[str, Any]]) -> None:
    total = len(registros)
    notas = [r["nota_google"] for r in registros if r["nota_google"] is not None]
    reviews = [r["num_avaliacoes"] for r in registros if r["num_avaliacoes"] is not None]
    horas = [r["horas_semana"] for r in registros if r["horas_semana"] is not None]

    largura = 66
    print("=" * largura)
    print(" RESUMO ESTATÍSTICO — CAFETERIAS DE BETIM (MG)")
    print("=" * largura)
    print(f" Estabelecimentos mapeados ........: {total}")
    print(f" Nota Google média .................: {media(notas)}")
    print(f" Total de avaliações acumuladas ....: {sum(reviews):,}".replace(",", "."))
    print(f" Média de avaliações por cafeteria .: {round(sum(reviews) / total, 1) if total else 0}")
    print(f" Horas abertas/semana (média) ......: {media(horas)} h")
    print(f" Registros sem horas informadas ....: {total - len(horas)}")

    def bloco(titulo: str, contador: Counter, total_base: int) -> None:
        print(f"\n {titulo}")
        print(" " + "-" * (largura - 2))
        for chave, quantidade in contador.most_common():
            percentual = (quantidade / total_base * 100) if total_base else 0
            barra = "█" * max(1, round(percentual / 5))
            print(f"   {chave[:30]:<30} {quantidade:>3}  {percentual:5.1f}%  {barra}")

    bloco("Contagem por bairro / região", Counter(r["bairro"] for r in registros), total)
    bloco("Contagem por segmento", Counter(r["segmento"] for r in registros), total)
    bloco("Contagem por tipo", Counter(r["tipo"] for r in registros), total)
    bloco("Contagem por propriedade", Counter(r["propriedade"] for r in registros), total)
    bloco(
        "Contagem por localização",
        Counter(r["localizacao_simplificada"] for r in registros),
        total,
    )

    print("\n Destaques")
    print(" " + "-" * (largura - 2))
    melhor = max(registros, key=lambda r: (r["nota_google"] or 0, r["num_avaliacoes"] or 0))
    mais_avaliada = max(registros, key=lambda r: r["num_avaliacoes"] or 0)
    print(f"   Melhor nota .....: {melhor['nome']} ({melhor['nota_google']})")
    print(f"   Mais avaliada ...: {mais_avaliada['nome']} ({mais_avaliada['num_avaliacoes']} avaliações)")

    horas_por_tipo: dict[str, list[float]] = {}
    for r in registros:
        if r["horas_semana"] is not None:
            horas_por_tipo.setdefault(r["tipo"], []).append(r["horas_semana"])
    if horas_por_tipo:
        tipo_lider = max(horas_por_tipo.items(), key=lambda item: sum(item[1]) / len(item[1]))
        print(f"   Maior disponibilidade média por tipo: {tipo_lider[0]} ({media(tipo_lider[1])} h)")
    print("=" * largura)


def analisar(caminho_entrada: Path, saida_dir: Path) -> list[dict[str, Any]]:
    if not caminho_entrada.exists():
        sys.exit(f"Arquivo de entrada não encontrado: {caminho_entrada}")

    print(f"Lendo planilha ....: {caminho_entrada}")
    registros = carregar_planilha(caminho_entrada)
    if not registros:
        sys.exit("Nenhum registro válido encontrado na planilha.")

    csv_destino = saida_dir / "assets" / "data" / "cafeterias_betim_bi.csv"
    xlsx_destino = saida_dir / "assets" / "data" / "cafeterias_betim_bi.xlsx"
    js_destino = saida_dir / "assets" / "data" / "cafeterias.js"

    gravar_csv(registros, csv_destino)
    gravar_xlsx(registros, xlsx_destino)
    gravar_dados_web(registros, js_destino)

    imprimir_resumo(registros)
    print("\nArquivos gerados:")
    for destino in (csv_destino, xlsx_destino, js_destino):
        print(f"  • {destino}  ({destino.stat().st_size / 1024:.1f} KB)")

    return registros


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL das cafeterias de Betim para o trabalho de BI.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path.home() / "Downloads" / "Pasta1.xlsx",
        help="Caminho da planilha original (padrão: ~/Downloads/Pasta1.xlsx)",
    )
    parser.add_argument(
        "--outdir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Diretório raiz do projeto (padrão: pasta deste script)",
    )
    args = parser.parse_args()
    analisar(args.input.expanduser(), args.outdir.expanduser().resolve())


if __name__ == "__main__":
    main()
