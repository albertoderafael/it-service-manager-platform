# Fuente de la guía de aprendizaje del backend

Capítulos en Markdown (`src/`) y generador en Python (`build.py`) que produce el PDF con WeasyPrint.

```bash
pip install weasyprint markdown pygments pypdf
python build.py                                      # build/guia-backend-it-service-manager.pdf
python check_links.py build/guia-backend-it-service-manager.pdf
```

Convenciones propias, además de las de la guía del frontend:

- `## Título [paso 2.3]` asocia una sección a un paso del mapa cronológico (enlace bidireccional).
- `::: mapa N Título` … `:::` define los pasos de una fase en el capítulo 1 (`N.M Texto`).
- `{{impl}}`, `{{despues}}`, `{{refactor}}`, `{{final}}`, `{{pendiente}}`, `{{reconstruido}}`: marcas de estado en texto.
- ```` ```java title="fichero" estado="reconstruido" ```` añade la marca al pie de fichero.
- Recuadros adicionales: `::: leccion`, `::: pendiente`, `::: reconstruido`.
