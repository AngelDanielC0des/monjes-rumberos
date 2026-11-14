#!/usr/bin/env python3
"""Publish a visually reviewed RIFE candidate set into the runtime assets."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "monks" / "dance"
SOURCE_DIR = ASSET_DIR / "source"
CANDIDATE_DIR = ROOT / "phase1-dance-candidates"
MANIFEST_PATH = ASSET_DIR / "manifest.json"
EXPECTED_MODEL_SHA256 = "76e4cef9ab42fa7dd4e8f6e4aba47462051e3faa969e4bca6479784fbab0ac6f"
EXPECTED_MODEL_REVISION = "18dcfbe2c349d5922e353708153581d2039c576c"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    report_path = CANDIDATE_DIR / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("modelSha256") != EXPECTED_MODEL_SHA256:
        raise RuntimeError("Candidate report does not match the pinned RIFE model")
    if report.get("modelRevision") != EXPECTED_MODEL_REVISION:
        raise RuntimeError("Candidate report uses an unexpected RIFE model revision")
    if report.get("targetFps") != 25 or report.get("targetFrameDurationMs") != 40:
        raise RuntimeError("Candidate cadence is not the approved 25 FPS / 40 ms")
    if report.get("status") != "candidate-only; source runtime assets are not modified":
        raise RuntimeError("Candidate report status is unexpected")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    for side in ("left", "right"):
        performer = report["performers"][side]
        runtime_path = ASSET_DIR / f"monje-{side}-dance.webp"
        original_path = SOURCE_DIR / f"monje-{side}-dance-original.webp"
        candidate_path = CANDIDATE_DIR / performer["candidate"]

        if not candidate_path.is_file():
            raise FileNotFoundError(candidate_path)
        if sha256(candidate_path) != performer["candidateSha256"]:
            raise RuntimeError(f"{side}: candidate SHA-256 mismatch")
        if candidate_path.stat().st_size != performer["candidateBytes"]:
            raise RuntimeError(f"{side}: candidate byte size mismatch")
        if performer["targetFrames"] != 63 or performer["targetCycleDurationMs"] != 2520:
            raise RuntimeError(f"{side}: candidate frame count or cycle duration mismatch")

        if not original_path.exists():
            if not runtime_path.is_file():
                raise FileNotFoundError(runtime_path)
            shutil.copy2(runtime_path, original_path)

        shutil.copy2(candidate_path, runtime_path)
        animation = manifest["performers"][side]["animation"]
        animation.update({
            "file": f"assets/monks/dance/monje-{side}-dance.webp",
            "format": "animated WebP",
            "frames": performer["targetFrames"],
            "frameDurationMs": performer["targetFrameDurationMs"],
            "loop": 0,
            "dimensions": performer["sourceDimensions"],
            "bytes": runtime_path.stat().st_size,
            "sha256": sha256(runtime_path),
            "totalDurationMs": performer["targetCycleDurationMs"],
        })

        record = manifest["performers"][side]
        record["source"] = str(original_path.relative_to(ROOT)).replace("\\", "/")
        record["sourceFormat"] = "animated WebP"
        record["sourceSha256"] = sha256(original_path)
        record["notes"] = [
            "25 FPS animated WebP interpolated with RIFE v4.9 ONNX.",
            "Original source poses are preserved at every seventh output frame.",
            "RGB is interpolated premultiplied; the alpha mask is interpolated separately.",
            "The legacy GIF fallback is retained unchanged for older browsers.",
            "The static poster remains the pause, reduced-motion, hidden-tab and no-JavaScript fallback.",
        ]

    manifest["interpolation"] = {
        "algorithm": "RIFE v4.9 ONNX",
        "modelRepository": report["modelRepository"],
        "modelRevision": report["modelRevision"],
        "modelLicense": report["modelLicense"],
        "modelSha256": report["modelSha256"],
        "targetFps": report["targetFps"],
        "frameDurationMs": report["targetFrameDurationMs"],
        "alphaStrategy": "separate RIFE interpolation of premultiplied RGB and alpha mask",
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({
        side: {
            "file": manifest["performers"][side]["animation"]["file"],
            "frames": manifest["performers"][side]["animation"]["frames"],
            "fps": manifest["interpolation"]["targetFps"],
            "durationMs": manifest["performers"][side]["animation"]["totalDurationMs"],
            "bytes": manifest["performers"][side]["animation"]["bytes"],
            "sha256": manifest["performers"][side]["animation"]["sha256"],
            "preservedSource": manifest["performers"][side]["source"],
            "sourceSha256": manifest["performers"][side]["sourceSha256"],
        }
        for side in ("left", "right")
    }, indent=2))


if __name__ == "__main__":
    main()
