#!/usr/bin/env python3
"""Generate module narration with Kokoro (voice bf_emma) into public/audio/<id>/.

Setup (once, on the Mac):
    brew install espeak-ng python@3.12
    "$(brew --prefix python@3.12)/bin/python3.12" -m venv .venv && .venv/bin/pip install kokoro soundfile
Usage:
    .venv/bin/python scripts/tts.py            # all modules, skipping tracks whose text is unchanged
    .venv/bin/python scripts/tts.py m03 m07    # just those modules
Track text and file names come from `node scripts/narration-tracks.mjs`, the same code the app and
validator use, so the three never disagree.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "src/content/modules"
OUT = ROOT / "public/audio"
VOICE = "bf_emma"


def tracks(module_path: Path) -> list[dict]:
    raw = subprocess.check_output(["node", str(ROOT / "scripts/narration-tracks.mjs"), str(module_path)])
    return json.loads(raw)


def to_mp3(audio, sample_rate: int, dest: Path) -> None:
    import soundfile as sf
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, audio, sample_rate)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-ac", "1", "-ar", "24000", "-b:a", "48k", str(dest)],
            check=True,
        )


def main(only: set[str]) -> None:
    import numpy as np
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    for path in sorted(MODULES.glob("*.json")):
        module = json.loads(path.read_text())
        mid = module["id"]
        if only and mid not in only:
            continue
        out = OUT / mid
        out.mkdir(parents=True, exist_ok=True)
        hashes_path = out / "hashes.json"
        hashes = json.loads(hashes_path.read_text()) if hashes_path.exists() else {}
        wanted = tracks(path)
        keep = {t["file"] for t in wanted} | {"hashes.json"}
        for stray in out.iterdir():          # module shrank: drop files no track owns
            if stray.name not in keep:
                stray.unlink()
                hashes.pop(stray.name, None)
        for t in wanted:
            mp3 = out / t["file"]
            if hashes.get(t["file"]) == t["hash"] and mp3.exists():
                continue
            print(f"{mid}/{t['file']}  {t['title']}", flush=True)
            chunks = []
            for _graphemes, _phonemes, audio in pipe(t["text"], voice=VOICE, speed=1.0):
                chunks.append(audio.numpy() if hasattr(audio, "numpy") else np.asarray(audio))
            to_mp3(np.concatenate(chunks), 24000, mp3)
            hashes[t["file"]] = t["hash"]
            hashes_path.write_text(json.dumps(hashes, indent=2) + "\n")   # after every track: safe to interrupt
    print("done")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
