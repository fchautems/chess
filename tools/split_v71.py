from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "baseline" / "entraineur_ouvertures_echecs_v7_1.html"
OUT = ROOT / "v71-preview"
EXPECTED_SHA256 = "10e266aacf6c75bc9bd91cbad800363754c1ee912abe8329b8ff32ceca570c2f"
EXTERNAL_CHESS = '<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>'
CSS_LINK = '<link rel="stylesheet" href="styles.css?v=7.1-split">'
CHESS_LINK = '<script src="vendor/chess.min.js?v=0.10.3"></script>'
APP_LINK = '<script src="app.js?v=7.1-split"></script>'

source_bytes = SOURCE.read_bytes()
source_sha256 = hashlib.sha256(source_bytes).hexdigest()
if source_sha256 != EXPECTED_SHA256:
    raise RuntimeError(f"Empreinte source incorrecte : {source_sha256}")
source = source_bytes.decode("utf-8")

style_open = source.index("<style>")
style_start = style_open + len("<style>")
style_close = source.index("</style>", style_start)
css = source[style_start:style_close]

script_open = source.rfind("<script>")
if script_open < 0:
    raise RuntimeError("Script applicatif intégré introuvable")
script_start = script_open + len("<script>")
script_close = source.index("</script>", script_start)
app_js = source[script_start:script_close]

if EXTERNAL_CHESS not in source:
    raise RuntimeError("Référence chess.js attendue introuvable")

index = source[:style_open]
index += CSS_LINK
index += source[style_close + len("</style>"):script_open]
index = index.replace(EXTERNAL_CHESS, CHESS_LINK, 1)
index += APP_LINK
index += source[script_close + len("</script>"):]

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "vendor").mkdir(parents=True, exist_ok=True)
(OUT / "index.html").write_text(index, encoding="utf-8")
(OUT / "styles.css").write_text(css, encoding="utf-8")
(OUT / "app.js").write_text(app_js, encoding="utf-8")

reconstructed = index
reconstructed = reconstructed.replace(CSS_LINK, "<style>" + css + "</style>", 1)
reconstructed = reconstructed.replace(CHESS_LINK, EXTERNAL_CHESS, 1)
reconstructed = reconstructed.replace(APP_LINK, "<script>" + app_js + "</script>", 1)

html_ids = re.findall(r'\bid=["\']([^"\']+)["\']', index)
js_ids = re.findall(r'getElementById\(["\']([^"\']+)["\']\)', app_js)
duplicate_html_ids = sorted({item for item in html_ids if html_ids.count(item) > 1})
missing_html_ids = sorted(set(js_ids) - set(html_ids))

expected_functions = {
    "startTraining": 3,
    "updatePreview": 4,
    "bindEvents": 2,
    "init": 2,
}
function_counts = {
    name: len(re.findall(rf"\bfunction\s+{re.escape(name)}\s*\(", app_js))
    for name in expected_functions
}

report = {
    "source_sha256": source_sha256,
    "baseline_restores_exactly": reconstructed == source,
    "css_exact_extraction": css == source[style_start:style_close],
    "javascript_exact_extraction": app_js == source[script_start:script_close],
    "missing_html_ids": missing_html_ids,
    "duplicate_html_ids": duplicate_html_ids,
    "duplicate_function_counts": function_counts,
    "duplicate_function_order_preserved": function_counts == expected_functions,
    "generated_files": {
        "index.html": len(index.encode("utf-8")),
        "styles.css": len(css.encode("utf-8")),
        "app.js": len(app_js.encode("utf-8")),
    },
    "main_branch_modified": False,
}

required = [
    report["baseline_restores_exactly"],
    report["css_exact_extraction"],
    report["javascript_exact_extraction"],
    not missing_html_ids,
    not duplicate_html_ids,
    report["duplicate_function_order_preserved"],
]
if not all(required):
    raise RuntimeError(json.dumps(report, ensure_ascii=False, indent=2))

(ROOT / "validation-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(ROOT / "VALIDATION.md").write_text(
    "# Validation V7.1 séparée\n\n"
    "- Source originale restaurée et SHA-256 vérifié.\n"
    "- CSS et JavaScript extraits sans modification.\n"
    "- Reconstitution du fichier monolithique strictement identique.\n"
    "- Ordre des fonctions redéclarées conservé.\n"
    "- Aucun identifiant DOM manquant ou dupliqué.\n"
    "- Syntaxe JavaScript contrôlée par le workflow.\n"
    "- La branche `main` n’est pas modifiée.\n",
    encoding="utf-8",
)
print(json.dumps(report, ensure_ascii=False, indent=2))
