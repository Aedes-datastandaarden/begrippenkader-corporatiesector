from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
src = Path(r"C:\Users\ghuis\Downloads\begrippenkader_corporatiesector_v0.2_1.ttl")

for version in ("0.2", "0.1"):
    (root / "data" / "versions" / version).mkdir(parents=True, exist_ok=True)

dst02 = root / "data" / "versions" / "0.2" / "begrippenkader_corporatiesector.ttl"
shutil.copy(src, dst02)

content = dst02.read_text(encoding="utf-8")
content01 = (
    content.replace("basisversie 0.2", "basisversie 0.1")
    .replace('dct:modified "2026-07-07"', 'dct:modified "2026-06-01"')
    .replace('dct:created "2026-07-06"', 'dct:created "2026-06-01"')
    .replace(
        "Basisversie 0.2, concept ter review. Wijzigingen t.o.v. 0.1:",
        "Basisversie 0.1, archief. Voorloper van 0.2:",
    )
)
(root / "data" / "versions" / "0.1" / "begrippenkader_corporatiesector.ttl").write_text(
    content01, encoding="utf-8"
)
(root / "public" / "build").mkdir(parents=True, exist_ok=True)
print("Setup complete")
