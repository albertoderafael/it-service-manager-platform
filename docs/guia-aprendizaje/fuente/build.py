#!/usr/bin/env python3
"""
Genera la guía de aprendizaje en PDF a partir de los capítulos en Markdown.

Convenciones de los ficheros src/*.md
-------------------------------------
- "# Título"    → capítulo (numerado automáticamente)
- "## Título"   → sección   (n.m, aparece en el índice, enlace bidireccional)
- "### Título"  → apartado  (n.m.k, solo en marcadores del PDF)
- ```lang title="ruta/fichero"  → bloque de código con el fichero como pie
- Bloques especiales:
    ::: java            Recuadro «Si vienes de Java…»
    ::: proyecto        Recuadro «En el proyecto»
    ::: nota            Recuadro «Nota»
    ::: atencion        Recuadro «Cuidado»
    ::: decision Título Recuadro «Decisión de diseño»
    ::: ejercicio Título         (numerado; enlaza con su solución)
    ::: solucion N.M             (en el anexo; enlaza con el ejercicio)
    ::: preguntas                (autoevaluación del capítulo; enlaza con respuestas)
    ::: respuestas N             (en el anexo; enlaza con las preguntas del capítulo N)
    :::                 cierra el bloque
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter
from weasyprint import HTML

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "build"

BLOCK_LABEL = "Edición completa · 26 capítulos y 5 anexos"

# --------------------------------------------------------------------------
# Estructura de la guía. Los capítulos sin fichero aparecen como pendientes.
# --------------------------------------------------------------------------
PARTS = [
    ("I", "Fundamentos", [
        "01-spa", "02-javascript-typescript", "03-node-npm"]),
    ("II", "Herramientas del proyecto", [
        "04-vite", "05-typescript-eslint"]),
    ("III", "React 19 a fondo", [
        "06-componentes-jsx", "07-estado-renderizado", "08-hooks", "09-composicion-contexto"]),
    ("IV", "Interfaz y diseño", [
        "10-tailwind", "11-shadcn-radix", "12-layout-sistema-visual"]),
    ("V", "Arquitectura", [
        "13-organizacion-funcionalidad", "14-anatomia-modulo"]),
    ("VI", "Datos y backend", [
        "15-cliente-http", "16-cors-proxy-despliegue", "17-tanstack-query"]),
    ("VII", "Navegación y formularios", [
        "18-react-router", "19-estado-en-url", "20-formularios"]),
    ("VIII", "Recorridos completos", [
        "21-recorrido-aplicaciones", "22-recorrido-demandas"]),
    ("IX", "Calidad y evolución", [
        "23-pruebas-vitest", "24-registro-decisiones", "25-notas-integracion", "26-ejercicio-incidencias"]),
]
PENDING_BLOCK = {"I": 1, "II": 1, "III": 1, "IV": 2, "V": 2, "VI": 2, "VII": 3, "VIII": 3, "IX": 4}

ANNEXES = ["A-soluciones", "B-glosario", "C-equivalencias", "D-chuleta", "E-mapa-ficheros"]   # anexos ya escritos (en orden)
PENDING_ANNEXES: list[str] = []

CALLOUTS = {
    "java": "Si vienes de Java…",
    "proyecto": "En el proyecto",
    "nota": "Nota",
    "atencion": "Cuidado",
    "decision": "Decisión de diseño",
}


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def inline_md(text: str) -> str:
    """Markdown en línea mínimo para títulos: `código` y *énfasis*."""
    out = esc(text)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", out)
    return out


def plain(text: str) -> str:
    return re.sub(r"[`*]", "", text)


class Doc:
    def __init__(self) -> None:
        self.toc: list[dict] = []          # entradas del índice
        self.exercises: dict[str, str] = {}
        self.chapter_no = 0

    # ---------------------------------------------------------------
    def preprocess(self, md_text: str, chapter: int | None, annex: str | None) -> str:
        lines = md_text.splitlines()
        out: list[str] = []
        in_code = False
        sec = sub = 0
        ex_count = 0
        open_block = False
        chapter_sections: list[tuple[str, str]] = []
        chapter_header_idx = None

        for line in lines:
            stripped = line.strip()
            # --- bloques de código ------------------------------------
            if stripped.startswith("```"):
                if not in_code:
                    m = re.match(r'```(\w*)\s*(?:title="([^"]+)")?', stripped)
                    lang, title = (m.group(1), m.group(2)) if m else ("", None)
                    if title:
                        out.append(f'<div class="file">{esc(title)}</div>')
                        out.append("")
                    out.append(f"```{lang}")
                    in_code = True
                    continue
                in_code = False
                out.append("```")
                continue
            if in_code:
                out.append(line)
                continue

            # --- títulos ----------------------------------------------
            m = re.match(r"^(#{1,3})\s+(.*)$", line)
            if m:
                level, title = len(m.group(1)), m.group(2).strip()
                if level == 1:
                    if annex:
                        hid = f"anx-{annex}"
                        label = f"Anexo {annex}. {plain(title)}"
                        self.toc.append({"level": 1, "id": hid, "label": annex, "title": title})
                        out.append(
                            f'<header class="chapter-head" id="{hid}" data-label="{esc(label)}">'
                            f'<p class="chapter-kicker">Anexo {annex}</p>'
                            f'<h1>{inline_md(title)}</h1>'
                            f'<a class="back" href="#toc-{hid}">↑ Volver al índice</a></header>')
                    else:
                        hid = f"cap-{chapter}"
                        label = f"{chapter}. {plain(title)}"
                        self.toc.append({"level": 1, "id": hid, "label": f"{chapter}", "title": title})
                        out.append(
                            f'<header class="chapter-head" id="{hid}" data-label="{esc(label)}" data-chapter="{esc(label)}">'
                            f'<p class="chapter-kicker">Capítulo {chapter}</p>'
                            f'<h1>{inline_md(title)}</h1>'
                            f'<a class="back" href="#toc-{hid}">↑ Volver al índice</a>'
                            f'@@MINITOC@@</header>')
                        chapter_header_idx = len(out) - 1
                    out.append("")
                    continue
                if level == 2:
                    sec += 1
                    sub = 0
                    num = f"{chapter}.{sec}" if chapter else f"{annex}.{sec}"
                    hid = f"s-{num.replace('.', '-')}"
                    if chapter:
                        self.toc.append({"level": 2, "id": hid, "label": num, "title": title})
                        chapter_sections.append((hid, f"{num} {title}"))
                        back = f'<a class="back" href="#toc-{hid}">↑ Índice</a>'
                    else:
                        back = f'<a class="back" href="#toc-anx-{annex}">↑ Índice</a>'
                    out.append(
                        f'<h2 id="{hid}" data-label="{esc(num + " " + plain(title))}">'
                        f'<span class="num">{num}</span> {inline_md(title)}{back}</h2>')
                    out.append("")
                    continue
                if level == 3:
                    sub += 1
                    num = f"{chapter}.{sec}.{sub}" if chapter else ""
                    hid = f"ss-{num.replace('.', '-')}" if num else ""
                    idattr = f' id="{hid}"' if hid else ""
                    numspan = f'<span class="num">{num}</span> ' if num else ""
                    out.append(
                        f'<h3{idattr} data-label="{esc((num + " " if num else "") + plain(title))}">'
                        f'{numspan}{inline_md(title)}</h3>')
                    out.append("")
                    continue

            # --- bloques especiales -------------------------------------
            m = re.match(r"^:::\s*(\w+)?\s*(.*)$", stripped)
            if m and stripped.startswith(":::"):
                kind, arg = m.group(1), m.group(2).strip()
                if kind is None:
                    out.append("")
                    out.append("</div>")
                    out.append("")
                    open_block = False
                    continue
                if open_block:
                    raise ValueError(f"Bloque sin cerrar antes de ':::{kind}' (cap {chapter})")
                open_block = True
                if kind in CALLOUTS:
                    title = CALLOUTS[kind] + (f": {inline_md(arg)}" if arg else "")
                    out.append(f'<div class="callout {kind}" markdown="1">')
                    out.append(f'<p class="callout-title">{title}</p>')
                elif kind == "ejercicio":
                    ex_count += 1
                    n = f"{chapter}.{ex_count}"
                    eid = n.replace(".", "-")
                    self.exercises[n] = arg
                    out.append(f'<div class="callout ejercicio" id="ej-{eid}" markdown="1">')
                    out.append(
                        f'<p class="callout-title">Ejercicio {n} · {inline_md(arg)}'
                        f'<a class="xref" href="#sol-{eid}">Ver solución →</a></p>')
                elif kind == "solucion":
                    eid = arg.replace(".", "-")
                    ttl = self.exercises.get(arg, "")
                    out.append(f'<div class="callout solucion" id="sol-{eid}" markdown="1">')
                    out.append(
                        f'<p class="callout-title">Solución {arg} · {inline_md(ttl)}'
                        f'<a class="xref" href="#ej-{eid}">← Volver al ejercicio</a></p>')
                elif kind == "preguntas":
                    out.append(f'<div class="callout preguntas" id="auto-{chapter}" markdown="1">')
                    out.append(
                        f'<p class="callout-title">Autoevaluación del capítulo {chapter}'
                        f'<a class="xref" href="#resp-{chapter}">Ver respuestas →</a></p>')
                elif kind == "respuestas":
                    out.append(f'<div class="callout respuestas" id="resp-{arg}" markdown="1">')
                    out.append(
                        f'<p class="callout-title">Respuestas · capítulo {arg}'
                        f'<a class="xref" href="#auto-{arg}">← Volver a las preguntas</a></p>')
                else:
                    raise ValueError(f"Bloque desconocido: {kind}")
                out.append("")
                continue

            out.append(line)

        if open_block:
            raise ValueError(f"Bloque sin cerrar al final del capítulo {chapter}")

        # mini índice del capítulo
        if chapter_header_idx is not None:
            items = "".join(
                f'<li><a href="#{hid}">{inline_md(t)}</a></li>' for hid, t in chapter_sections)
            out[chapter_header_idx] = out[chapter_header_idx].replace(
                "@@MINITOC@@", f'<nav class="minitoc"><p>En este capítulo</p><ol>{items}</ol></nav>')
        return "\n".join(out)

    # ---------------------------------------------------------------
    def render_md(self, text: str) -> str:
        return markdown.markdown(
            text,
            extensions=["fenced_code", "codehilite", "tables", "md_in_html", "attr_list", "sane_lists"],
            extension_configs={"codehilite": {"guess_lang": False, "css_class": "hl"}},
        )


def build() -> Path:
    doc = Doc()
    body: list[str] = []
    chapter = 0
    pending_toc: list[str] = []

    for num, title, chapters in PARTS:
        pid = f"parte-{num}"
        written = [c for c in chapters if (SRC / f"{c}.md").exists()]
        if written:
            doc.toc.append({"level": 0, "id": pid, "label": f"Parte {num}", "title": title})
            body.append(
                f'<section class="part-page" id="{pid}" data-label="Parte {num}. {esc(title)}">'
                f'<p class="part-kicker">Parte {num}</p><h1 class="part-title">{esc(title)}</h1>'
                f'@@PARTTOC-{num}@@'
                f'<a class="back" href="#toc-{pid}">↑ Volver al índice</a></section>')
            part_entries = []
            part_idx = len(body) - 1
            for c in chapters:
                chapter += 1
                if not (SRC / f"{c}.md").exists():
                    continue
                md = (SRC / f"{c}.md").read_text(encoding="utf-8")
                pre = doc.preprocess(md, chapter, None)
                body.append(f'<section class="chapter">{doc.render_md(pre)}</section>')
                ch_title = next(e for e in reversed(doc.toc) if e["level"] == 1)["title"]
                part_entries.append(f'<li><a href="#cap-{chapter}"><span>{chapter}</span> {inline_md(ch_title)}</a></li>')
            body[part_idx] = body[part_idx].replace(
                f"@@PARTTOC-{num}@@", f'<ol class="part-toc">{"".join(part_entries)}</ol>')
        else:
            items = []
            for c in chapters:
                chapter += 1
                items.append(f'<li><span class="n">{chapter}</span> {esc(c)}</li>')
            pending_toc.append(
                f'<li class="pending-part"><span class="pl">Parte {num}</span> {esc(title)}'
                f'<span class="pend">bloque {PENDING_BLOCK[num]}</span><ul>{"".join(items)}</ul></li>')

    for a in ANNEXES:
        letter = a.split("-")[0]
        md = (SRC / f"{a}.md").read_text(encoding="utf-8")
        pre = doc.preprocess(md, None, letter)
        body.append(f'<section class="chapter annex">{doc.render_md(pre)}</section>')

    # ------------------------------ índice general ------------------------------
    doc.toc.insert(0, {"level": 1, "id": "como-usar", "label": "0", "title": "Cómo usar esta guía"})
    toc_items = []
    annex_header_done = False
    for e in doc.toc:
        if e["id"].startswith("anx-") and not annex_header_done:
            toc_items.append('<li class="t-part t-static"><span class="tl">Anexos</span> '
                             '<span class="tt">Material de consulta</span></li>')
            annex_header_done = True
        cls = {0: "t-part", 1: "t-chap", 2: "t-sec"}[e["level"]]
        toc_items.append(
            f'<li class="{cls}" id="toc-{e["id"]}"><a href="#{e["id"]}">'
            f'<span class="tl">{esc(e["label"])}</span> <span class="tt">{inline_md(e["title"])}</span></a></li>')
    toc_html = (
        '<section class="toc" id="indice" data-label="Índice">'
        '<h1 class="toc-title">Índice</h1>'
        '<p class="toc-help">Cada entrada es un enlace. Desde cualquier capítulo o sección, '
        'el enlace <b>↑ Índice</b> junto al título te devuelve a su entrada en esta página.</p>'
        f'<ul class="toc-list">{"".join(toc_items)}</ul>'
        + (('<h2 class="toc-pending-title">Próximos bloques</h2>'
            f'<ul class="toc-pending">{"".join(pending_toc)}</ul>') if pending_toc else '')
        + '</section>')

    cover = f'''
<section class="cover">
  <div class="cover-grid"></div>
  <p class="cover-kicker">Guía de aprendizaje</p>
  <h1 class="cover-title">Construir el frontend de<br><span>IT Service &amp; Demand Manager</span></h1>
  <p class="cover-sub">React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · React Hook Form · Zod</p>
  <p class="cover-block">{BLOCK_LABEL}</p>
  <div class="cover-foot">
    <p>Preparada para Alberto de Rafael Fernández</p>
    <p>Octubre de 2026</p>
  </div>
</section>'''

    intro_md = (SRC / "00-como-usar.md").read_text(encoding="utf-8")
    intro = doc.render_md(intro_md)
    intro_html = (
        '<section class="intro"><header class="intro-head chapter-head" id="como-usar" '
        'data-chapter="Cómo usar esta guía" data-label="Cómo usar esta guía">'
        '<p class="chapter-kicker">Antes de empezar</p><h1>Cómo usar esta guía</h1>'
        '<a class="back" href="#toc-como-usar">↑ Volver al índice</a></header>'
        f'{intro}</section>')

    css = (ROOT / "style.css").read_text(encoding="utf-8")
    css += HtmlFormatter(style="friendly").get_style_defs(".hl")

    page = f'''<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Guía de aprendizaje · Frontend IT Service &amp; Demand Manager</title>
<meta name="author" content="Alberto de Rafael Fernández">
<style>{css}</style></head><body>
{cover}{toc_html}{intro_html}{"".join(body)}
</body></html>'''
    OUT.mkdir(exist_ok=True)
    (OUT / "guia.html").write_text(page, encoding="utf-8")
    pdf = OUT / "guia-frontend-it-service-manager.pdf"
    HTML(string=page, base_url=str(ROOT)).write_pdf(pdf)
    return pdf


if __name__ == "__main__":
    p = build()
    print(p, file=sys.stderr)
