#!/usr/bin/env python3
"""Verify the actual animated WebP payloads and preserved source poses."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence, ImageStat

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "assets/monks/dance/manifest.json").read_text(encoding="utf-8"))
BACKGROUND = (18, 16, 28, 255)


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def composite(frame: Image.Image) -> Image.Image:
    background = Image.new("RGBA", frame.size, BACKGROUND)
    background.alpha_composite(frame.convert("RGBA"))
    return background.convert("RGB")


def mae(first: Image.Image, second: Image.Image) -> float:
    difference = ImageChops.difference(composite(first), composite(second))
    return sum(ImageStat.Stat(difference).mean) / 3.0


def read_frames(path: Path) -> tuple[list[Image.Image], list[int], int | None]:
    frames = []
    durations = []
    with Image.open(path) as image:
        loop = image.info.get("loop")
        for frame in ImageSequence.Iterator(image):
            frames.append(frame.convert("RGBA").copy())
            durations.append(int(frame.info.get("duration", image.info.get("duration", 0)) or 0))
    return frames, durations, loop


def verify(side: str) -> None:
    record = MANIFEST["performers"][side]
    animation = record["animation"]
    animation_path = ROOT / animation["file"]
    poster_path = ROOT / record["poster"]["file"]
    fallback_path = ROOT / record["fallback"]["file"]
    source_path = ROOT / record["source"]

    assert animation_path.is_file(), f"{side}: animated WebP is missing"
    assert source_path.is_file(), f"{side}: original source WebP is missing"
    assert digest(animation_path) == animation["sha256"], f"{side}: animation hash mismatch"
    assert animation_path.stat().st_size == animation["bytes"], f"{side}: animation size mismatch"
    assert digest(source_path) == record["sourceSha256"], f"{side}: source hash mismatch"
    assert digest(poster_path) == record["poster"]["sha256"], f"{side}: poster hash mismatch"
    assert digest(fallback_path) == record["fallback"]["sha256"], f"{side}: GIF fallback hash mismatch"

    frames, durations, loop = read_frames(animation_path)
    source_frames, source_durations, source_loop = read_frames(source_path)
    assert len(frames) == 63, f"{side}: expected 63 interpolated frames, got {len(frames)}"
    assert set(durations) == {40}, f"{side}: every WebP frame must last 40 ms: {set(durations)}"
    assert sum(durations) == 2520, f"{side}: animation cycle must remain 2,520 ms"
    assert loop == 0, f"{side}: animation must loop infinitely"
    assert len(source_frames) == 9, f"{side}: original 9-frame source was not preserved"
    assert set(source_durations) == {280}, f"{side}: original source timing changed"
    assert source_loop == 0, f"{side}: original source loop metadata changed"
    assert frames[0].size == tuple(animation["dimensions"]), f"{side}: dimensions mismatch"

    for index, source_frame in enumerate(source_frames):
        keyframe = frames[index * 7]
        assert mae(source_frame, keyframe) <= 4.0, (
            f"{side}: source pose {index} drifted at output frame {index * 7}"
        )

    alpha_extrema = [frame.getchannel("A").getextrema() for frame in frames]
    assert all(bounds == (0, 255) for bounds in alpha_extrema), (
        f"{side}: alpha channel lost transparency or full opacity"
    )

    adjacent = [mae(frames[index], frames[(index + 1) % len(frames)]) for index in range(len(frames))]
    baseline = sum(adjacent[:-1]) / max(1, len(adjacent) - 1)
    seam = adjacent[-1]
    assert seam <= max(baseline * 1.6, baseline + 1.0), (
        f"{side}: loop seam is a visible discontinuity (seam={seam:.3f}, baseline={baseline:.3f})"
    )

    print(
        f"PASS — {side}: {len(frames)} frames @ 25 FPS, 2,520 ms loop, "
        f"alpha preserved, source poses preserved, seam ratio {seam / max(baseline, 1e-6):.2f}"
    )


def main() -> None:
    assert MANIFEST["interpolation"]["algorithm"] == "RIFE v4.9 ONNX"
    assert MANIFEST["interpolation"]["targetFps"] == 25
    assert MANIFEST["interpolation"]["frameDurationMs"] == 40
    for side in ("left", "right"):
        verify(side)


if __name__ == "__main__":
    main()
