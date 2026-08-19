from __future__ import annotations

import functools
import http.server
import os
import sys
import threading
import webbrowser
from pathlib import Path


class LocalOnlyServer(http.server.ThreadingHTTPServer):
    daemon_threads = True


def main() -> int:
    project_dir = Path(__file__).resolve().parent
    site_dir = project_dir / "dist"
    index_file = site_dir / "index.html"

    if not index_file.is_file():
        print("ERREUR: la version compilee de l'application est absente.")
        print(f"Fichier attendu: {index_file}")
        input("Appuyez sur Entree pour fermer...")
        return 1

    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(site_dir),
    )
    requested_port = int(os.environ.get("CHESS_PORT", "0"))
    server = LocalOnlyServer(("127.0.0.1", requested_port), handler)
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/"

    if os.environ.get("CHESS_NO_BROWSER") != "1":
        threading.Timer(0.35, webbrowser.open, args=(url,)).start()

    print("Chess Openings Trainer est lance.")
    print(f"Adresse locale: {url}")
    print("Laissez cette fenetre ouverte. Ctrl+C ou fermeture = arret.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArret de l'application.")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
