from pathlib import Path
import hashlib
import json
import re
import sys

SOURCE_SHA256 = "10e266aacf6c75bc9bd91cbad800363754c1ee912abe8329b8ff32ceca570c2f"
FILES = [
    ("01-data.js", 61730, "03ddefb57a3fa8ed682a72eacf9393604d1ec7005debf50a0af1b9cd320050a4"),
    ("02-state.js", 63065, "438704f19a44eb50152e313e741202a83beb2eb2cf152e1836de623a682dc608"),
    ("03-board.js", 59177, "c81540e79997484b6c3e9146f43a73c1bf35c6bb2d5e4f499d3d8353ae3a55de"),
    ("04-training.js", 58397, "5b78d606ebd57ae123c8856608bdbd3bcda31d5acf07d9c19b9e64edb212bb78"),
    ("05-campaign.js", 51740, "dc8b65f603275676b2b1115be6c982a09b41c415310c6f908d60356786f52dc2"),
    ("06-boss.js", 50410, "654a24627e450ae5e0b8a0654a123445ffab22e0e8c99c53e762ba6874525f4e"),
    ("07-ui.js", 49725, "2679760e0f7fd7ddf67a59e35d23ba0a26df35f34ab053670befaa7f9ac01eda"),
    ("08-init.js", 50031, "ae8028d9a6f4790252e046c82b07ac87b01ea17a3c1565b6fd438d45b417727a"),
]

def transform(js: str, name: str) -> str:
    match = re.search(rf"    const {name} = (\{{.*?\}});\n", js, flags=re.S)
    if not match:
        raise RuntimeError(f"{name} introuvable")
    values = json.loads(match.group(1))
    replacement = f"    const {name} = {{}};\n"
    for key, value in values.items():
        replacement += (
            f"    Object.assign({name}, "
            + json.dumps({key: value}, ensure_ascii=False, separators=(",", ":"))
            + ");\n"
        )
    return js[:match.start()] + replacement + js[match.end():]

def main() -> None:
    source_path = Path(sys.argv[1])
    source_bytes = source_path.read_bytes()
    if hashlib.sha256(source_bytes).hexdigest() != SOURCE_SHA256:
        raise RuntimeError("Empreinte de la source V7.1 incorrecte")
    source = source_bytes.decode("utf-8")
    script_open = source.rfind("<script>")
    script_start = script_open + len("<script>")
    script_close = source.index("</script>", script_start)
    js = source[script_start:script_close]
    js = transform(js, "PIECE_IMAGES")
    js = transform(js, "SOUND_DATA")
    payload = js.encode("utf-8")
    if hashlib.sha256(payload).hexdigest() != "da80c877047ea757cfd45311a4f5b109d7f07713b9f1b04482a2658aba011fc8":
        raise RuntimeError("JavaScript transportable incorrect")
    out = Path("js")
    out.mkdir(exist_ok=True)
    offset = 0
    for filename, size, expected_sha in FILES:
        chunk = payload[offset:offset + size]
        offset += size
        actual_sha = hashlib.sha256(chunk).hexdigest()
        if len(chunk) != size or actual_sha != expected_sha:
            raise RuntimeError(f"Contrôle échoué pour {filename}: {len(chunk)} / {actual_sha}")
        (out / filename).write_bytes(chunk)
        print(f"{filename}: {size} octets, {actual_sha}")
    if offset != len(payload):
        raise RuntimeError(f"Octets non répartis: {len(payload) - offset}")

if __name__ == "__main__":
    main()
