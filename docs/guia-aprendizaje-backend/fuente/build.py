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

BLOCK_LABEL = "Edición completa · 27 capítulos y 5 anexos"

# (id, kicker, título, capítulos, grupo)
PARTS = [
    ("I", "Bloque I", "Mapa cronológico", ["01-mapa"], "I"),
    ("F1", "Fase 1", "Concepción y preparación", [
        "02-punto-partida", "03-postgresql-configuracion", "04-flyway"], "II"),
    ("F2", "Fase 2", "El módulo Application", [
        "05-entidad-jpa", "06-repositorio", "07-servicio-transacciones", "08-dto-validacion",
        "09-controlador", "10-errores", "11-pruebas-application"], "II"),
    ("F3", "Fase 3", "El módulo Demand", [
        "12-modelo-demanda", "13-specification", "14-n-mas-1", "15-servicio-demandas"], "II"),
    ("F4", "Fase 4", "El monolito terminado", ["16-monolito-terminado"], "II"),
    ("F5", "Fase 5", "Evolución a dos microservicios", [
        "17-por-que-extraer", "18-frontera-puertos", "19-catalog-service", "20-adaptador-http",
        "21-separar-bases-datos"], "II"),
    ("F6", "Fase 6", "Validación, estado final y pendientes", [
        "22-validacion", "23-lecciones", "24-estado-final"], "II"),
    ("F7", "Fase 7", "Cierre de la separación y despliegue con Docker", [
        "25-cerrar-separacion", "26-imagenes", "27-plataforma-compose"], "II"),
]
GROUPS = {"I": ("Bloque I", "Mapa cronológico del desarrollo"),
          "II": ("Bloque II", "El desarrollo explicado, fase a fase")}

ANNEXES = ["A-soluciones", "B-glosario", "C-equivalencias", "D-chuleta", "E-mapa-ficheros"]

STATUS = {
    "impl": ("tag-impl", "Implementado"),
    "despues": ("tag-desp", "Añadido después"),
    "refactor": ("tag-ref", "Refactorizado"),
    "final": ("tag-fin", "Estado final"),
    "pendiente": ("tag-pend", "Pendiente"),
    "reconstruido": ("tag-rec", "Reconstruido"),
}


def tag(key: str) -> str:
    cls, label = STATUS[key]
    return f'<span class="tag {cls}">{label}</span>'


def status_inline(line: str) -> str:
    return re.sub(r"\{\{(\w+)\}\}", lambda m: tag(m.group(1)), line)


STEP_RE = re.compile(r"\s*\[pasos?\s+([\d. ]+)\]\s*$")


def scan_steps() -> dict[str, tuple[str, str]]:
    """paso → (id de sección, número de sección)."""
    steps: dict[str, tuple[str, str]] = {}
    chapter = 0
    for _, _, _, chapters, _ in PARTS:
        for c in chapters:
            chapter += 1
            sec = 0
            in_code = False
            for line in (SRC / f"{c}.md").read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("```"):
                    in_code = not in_code
                    continue
                if in_code or not line.startswith("## "):
                    continue
                sec += 1
                m = STEP_RE.search(line)
                if m:
                    for p in m.group(1).split():
                        if p in steps:
                            raise ValueError(f"Paso {p} repetido")
                        steps[p] = (f"s-{chapter}-{sec}", f"{chapter}.{sec}")
    return steps

CALLOUTS = {
    "java": "Si vienes de Java EE…",
    "leccion": "Lección aprendida",
    "pendiente": "Pendiente",
    "reconstruido": "Código reconstruido",
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


def inline_md_keep(text: str) -> str:
    """Como inline_md pero deja pasar las marcas {{estado}}."""
    return inline_md(text)


def plain(text: str) -> str:
    return re.sub(r"[`*]", "", text)


class Doc:
    def __init__(self) -> None:
        self.toc: list[dict] = []          # entradas del índice
        self.exercises: dict[str, str] = {}
        self.chapter_no = 0
        self.steps: dict[str, tuple[str, str]] = {}
        self.step_text: dict[str, str] = {}

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
        in_map = None

        for line in lines:
            stripped = line.strip()
            # --- bloques de código ------------------------------------
            if stripped.startswith("```"):
                if not in_code:
                    m = re.match(r'```(\w*)\s*(?:title="([^"]+)")?\s*(?:estado="(\w+)")?', stripped)
                    lang, title, est = (m.group(1), m.group(2), m.group(3)) if m else ("", None, None)
                    if title:
                        badge = tag(est) if est else ""
                        out.append(f'<div class="file">{esc(title)}{badge}</div>')
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

            # --- mapa cronológico ---------------------------------------
            if in_map is not None:
                if stripped == ":::":
                    out.append(self.render_map(*in_map))
                    out.append("")
                    in_map = None
                elif stripped:
                    in_map[2].append(stripped)
                continue
            mm = re.match(r"^:::\s*mapa\s+(\d+)\s+(.*)$", stripped)
            if mm:
                in_map = (mm.group(1), mm.group(2), [])
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
                    stepm = STEP_RE.search(title)
                    step_links = ""
                    if stepm:
                        title = title[:stepm.start()].strip()
                        ps = stepm.group(1).split()
                        step_links = "".join(
                            f'<a class="back step" href="#paso-{p.replace(".", "-")}">Paso {p} ↖</a>' for p in ps)
                    sec += 1
                    sub = 0
                    num = f"{chapter}.{sec}" if chapter else f"{annex}.{sec}"
                    hid = f"s-{num.replace('.', '-')}"
                    if chapter:
                        self.toc.append({"level": 2, "id": hid, "label": num, "title": title})
                        chapter_sections.append((hid, f"{num} {title}"))
                        back = f'<a class="back" href="#toc-{hid}">↑ Índice</a>' + step_links
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
                    clean = re.sub(r"\s*\{\{\w+\}\}", "", title)
                    out.append(
                        f'<h3{idattr} data-label="{esc((num + " " if num else "") + plain(clean))}">'
                        f'{numspan}{status_inline(inline_md(title))}</h3>')
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

            out.append(status_inline(line))

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
    def preprocess_intro(self, md_text: str) -> str:
        out = []
        in_code = False
        for line in md_text.splitlines():
            if line.strip().startswith("```"):
                in_code = not in_code
            if in_code or line.strip().startswith("```"):
                out.append(line)
                continue
            m = re.match(r"^:::\s*(\w+)?\s*(.*)$", line.strip())
            if m and line.strip().startswith(":::"):
                if m.group(1) is None:
                    out += ["", "</div>", ""]
                else:
                    t = CALLOUTS[m.group(1)] + (f": {inline_md(m.group(2))}" if m.group(2) else "")
                    out += [f'<div class="callout {m.group(1)}" markdown="1">', f'<p class="callout-title">{t}</p>', ""]
                continue
            out.append(status_inline(line))
        return "\n".join(out)

    # ---------------------------------------------------------------
    def render_map(self, phase: str, title: str, lines: list[str]) -> str:
        rows = []
        for ln in lines:
            m = re.match(r"^(\d+\.\d+)\s+(.*)$", ln)
            if not m:
                raise ValueError(f"Línea de mapa inválida: {ln}")
            p, text = m.group(1), m.group(2)
            if p in self.step_text:
                raise ValueError(f"Paso {p} duplicado en el mapa")
            self.step_text[p] = text
            if p not in self.steps:
                raise ValueError(f"Paso {p} sin sección que lo desarrolle")
            sid, snum = self.steps[p]
            txt = status_inline(inline_md_keep(text))
            rows.append(
                f'<tr id="paso-{p.replace(".", "-")}"><td class="pn"><a href="#{sid}">{p}</a></td>'
                f'<td>{txt}</td><td class="pl"><a href="#{sid}">§ {snum} →</a></td></tr>')
        return (f'<div class="mapa"><p class="mapa-title"><span>Fase {phase}</span> {inline_md(title)}</p>'
                f'<table class="mapa-t"><tbody>{"".join(rows)}</tbody></table></div>')

    # ---------------------------------------------------------------
    def render_md(self, text: str) -> str:
        return markdown.markdown(
            text,
            extensions=["fenced_code", "codehilite", "tables", "md_in_html", "attr_list", "sane_lists"],
            extension_configs={"codehilite": {"guess_lang": False, "css_class": "hl"}},
        )


def build() -> Path:
    doc = Doc()
    doc.steps = scan_steps()
    body: list[str] = []
    chapter = 0
    map_slot = None

    for pid_s, kicker, title, chapters, group in PARTS:
        pid = f"parte-{pid_s}"
        doc.toc.append({"level": 0, "id": pid, "label": kicker, "title": title, "group": group})
        body.append(
            f'<section class="part-page" id="{pid}" data-label="{esc(kicker)}. {esc(title)}">'
            f'<p class="part-group">{esc(GROUPS[group][0])} · {esc(GROUPS[group][1])}</p>'
            f'<p class="part-kicker">{esc(kicker)}</p><h1 class="part-title">{esc(title)}</h1>'
            f'@@PARTTOC-{pid_s}@@'
            f'<a class="back" href="#toc-{pid}">↑ Volver al índice</a></section>')
        part_entries = []
        part_idx = len(body) - 1
        for c in chapters:
            chapter += 1
            md = (SRC / f"{c}.md").read_text(encoding="utf-8")
            if c == "01-mapa":
                # se procesa al final, cuando todos los pasos tienen sección
                toc_pos = len(doc.toc)
                map_slot = (len(body), chapter, md, toc_pos)
                body.append("")
                part_entries.append(f'<li><a href="#cap-{chapter}"><span>{chapter}</span> @@MAPTITLE@@</a></li>')
                continue
            pre = doc.preprocess(md, chapter, None)
            body.append(f'<section class="chapter">{doc.render_md(pre)}</section>')
            ch_title = next(e for e in reversed(doc.toc) if e["level"] == 1)["title"]
            part_entries.append(f'<li><a href="#cap-{chapter}"><span>{chapter}</span> {inline_md(ch_title)}</a></li>')
        body[part_idx] = body[part_idx].replace(
            f"@@PARTTOC-{pid_s}@@", f'<ol class="part-toc">{"".join(part_entries)}</ol>')

    # mapa (capítulo 1)
    idx, ch, md, toc_pos = map_slot
    tail = doc.toc[toc_pos:]
    doc.toc = doc.toc[:toc_pos]
    pre = doc.preprocess(md, ch, None)
    body[idx] = f'<section class="chapter">{doc.render_md(pre)}</section>'
    map_title = next(e for e in reversed(doc.toc) if e["level"] == 1)["title"]
    doc.toc.extend(tail)
    body = [b.replace("@@MAPTITLE@@", inline_md(map_title)) for b in body]
    missing = set(doc.steps) - set(doc.step_text)
    if missing:
        raise ValueError(f"Secciones con pasos que no están en el mapa: {sorted(missing)}")

    for a in ANNEXES:
        letter = a.split("-")[0]
        md = (SRC / f"{a}.md").read_text(encoding="utf-8")
        pre = doc.preprocess(md, None, letter)
        body.append(f'<section class="chapter annex">{doc.render_md(pre)}</section>')

    # ------------------------------ índice general ------------------------------
    doc.toc.insert(0, {"level": 1, "id": "como-usar", "label": "0", "title": "Cómo usar esta guía"})
    toc_items = []
    annex_header_done = False
    groups_done = set()
    for e in doc.toc:
        g = e.get("group")
        if g and g not in groups_done:
            groups_done.add(g)
            toc_items.append(f'<li class="t-group"><span class="tl">{esc(GROUPS[g][0])}</span> '
                             f'<span class="tt">{esc(GROUPS[g][1])}</span></li>')
        if e["id"].startswith("anx-") and not annex_header_done:
            toc_items.append('<li class="t-group"><span class="tl">Anexos</span> '
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
        'el enlace <b>↑ Índice</b> junto al título te devuelve a su entrada en esta página, '
        'y el enlace <b>Paso n.m ↖</b> te lleva a su línea del mapa cronológico.</p>'
        f'<ul class="toc-list">{"".join(toc_items)}</ul></section>')

    cover = f"""
<section class="cover">
  <div class="cover-grid"></div>
  <p class="cover-kicker">Guía de aprendizaje</p>
  <h1 class="cover-title">Construir el backend de<br><span>IT Service &amp; Demand Manager</span></h1>
  <p class="cover-sub">Del monolito Spring Boot a dos microservicios en Docker · Java 21 · Spring Boot 4.1.1 · Spring Data JPA · Hibernate · PostgreSQL 18 · Flyway · Testcontainers · RestClient · Docker Compose</p>
  <p class="cover-block">{BLOCK_LABEL}</p>
  <div class="cover-foot">
    <p>Preparada para Alberto de Rafael Fernández</p>
    <p>Octubre de 2026</p>
  </div>
</section>"""

    intro_md = (SRC / "00-como-usar.md").read_text(encoding="utf-8")
    intro = doc.render_md(doc.preprocess_intro(intro_md))
    intro_html = (
        '<section class="intro"><header class="intro-head chapter-head" id="como-usar" '
        'data-chapter="Cómo usar esta guía" data-label="Cómo usar esta guía">'
        '<p class="chapter-kicker">Antes de empezar</p><h1>Cómo usar esta guía</h1>'
        '<a class="back" href="#toc-como-usar">↑ Volver al índice</a></header>'
        f'{intro}</section>')

    css = (ROOT / "style.css").read_text(encoding="utf-8")
    css += HtmlFormatter(style="friendly").get_style_defs(".hl")

    page = f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Guía de aprendizaje · Backend IT Service &amp; Demand Manager</title>
<meta name="author" content="Alberto de Rafael Fernández">
<style>{css}</style></head><body>
{cover}{toc_html}{intro_html}{"".join(body)}
</body></html>"""
    OUT.mkdir(exist_ok=True)
    (OUT / "guia.html").write_text(page, encoding="utf-8")
    pdf = OUT / "guia-backend-it-service-manager.pdf"
    HTML(string=page, base_url=str(ROOT)).write_pdf(pdf)
    return pdf


if __name__ == "__main__":
    p = build()
    print(p, file=sys.stderr)
