# Validation de la séparation V7.1

```json
{
  "source_sha256": "10e266aacf6c75bc9bd91cbad800363754c1ee912abe8329b8ff32ceca570c2f",
  "baseline_restores_exactly": true,
  "css_exact_extraction": true,
  "javascript_exact_recomposition": true,
  "javascript_parts": 6,
  "javascript_part_sizes_bytes": {
    "app-01.js": 22070,
    "app-02.js": 239428,
    "app-03.js": 5983,
    "app-04.js": 71112,
    "app-05.js": 59623,
    "app-06.js": 45557
  },
  "javascript_syntax": "OK for every part (node --check)",
  "html_ids": 66,
  "javascript_element_ids": 65,
  "missing_html_ids": [],
  "duplicate_html_ids": [],
  "script_order": [
    "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js",
    "app-01.js",
    "app-02.js",
    "app-03.js",
    "app-04.js",
    "app-05.js",
    "app-06.js"
  ],
  "main_branch_modified": false
}
```
