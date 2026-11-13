#!/usr/bin/env python3
"""Inspect the current animated WebP loops without modifying production assets."""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageSequence, ImageStat

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "monks" / "dance"
OUT = ROOT / "phase1-dance-inspection"
OUT.mkdir(parents=True, exist_ok=True)

BACKGROUND = (18, 16, 28, 255)
CELL_GAP = 16
LABEL_HEIGHT = 30


def alpha_bbox(image: Image.Image):
    alpha = image.getchannel("A")
    return alpha.getbbox()


def composite(image: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", image.size, BACKGROUND)
    canvas.alpha_composite(image.convert("RGBA"))
    return canvas.convert("RGB")


def inspect(side: str) -> dict:
    source_path = ASSET_DIR / f"monje-{side}-dance.webp"
    if not source_path.is_file():
        raise FileNotFoundError(source_path)

    frames: list[Image.Image] = []
    durations: list[int] = []
    with Image.open(source_path) as source:
        source_size = source.size
        loop = source.info.get("loop", None)
        for index, frame in enumerate(ImageSequence.Iterator(source)):
            rgba = frame.convert("RGBA").copy()
            frames.append(rgba)
            durations.append(int(frame.info.get("duration", source.info.get("duration", 0)) or 0))
            rgba.save(OUT / side / f"frame-{index:02d}.png") if (OUT / side).mkdir(parents=True, exist_ok=True) is None else None

    if not frames:
        raise RuntimeError(f"No frames decoded from {source_path}")

    cols = 3
    rows = (len(frames) + cols - 1) // cols
    w, h = source_size
    sheet = Image.new("RGB", (cols * w + (cols + 1) * CELL_GAP, rows * (h + LABEL_HEIGHT) + (rows + 1) * CELL_GAP), (9, 8, 15))
    mask_sheet = Image.new("RGB", sheet.size, (9, 8, 15))
    draw = ImageDraw.Draw(sheet)
    mask_draw = ImageDraw.Draw(mask_sheet)
    font = ImageFont.load_default()

    frame_stats = []
    for index, frame in enumerate(frames):
        x = CELL_GAP + (index % cols) * (w + CELL_GAP)
        y = CELL_GAP + (index // cols) * (h + LABEL_HEIGHT + CELL_GAP)
        sheet.paste(composite(frame), (x, y))
        draw.text((x + 2, y + h + 6), f"Frame {index:02d} · {durations[index]} ms", fill=(245, 241, 255), font=font)
        mask = frame.getchannel("A").convert("RGB")
        mask_sheet.paste(mask, (x, y))
        mask_draw.text((x + 2, y + h + 6), f"Alpha {index:02d}", fill=(245, 241, 255), font=font)

        alpha = frame.getchannel("A")
        stat = ImageStat.Stat(alpha)
        frame_stats.append({
            "index": index,
            "durationMs": durations[index],
            "alphaBoundingBox": alpha_bbox(frame),
            "alphaMean": round(stat.mean[0], 3),
            "alphaExtrema": alpha.getextrema(),
        })

    sheet.save(OUT / f"{side}-contact-sheet.png", optimize=True)
    mask_sheet.save(OUT / f"{side}-alpha-sheet.png", optimize=True)

    adjacent_diffs = []
    for index, frame in enumerate(frames):
        nxt = frames[(index + 1) % len(frames)]
        diff = ImageChops.difference(frame, nxt)
        bbox = diff.getbbox()
        adjacent_diffs.append({"from": index, "to": (index + 1) % len(frames), "changedBounds": bbox})

    return {
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "format": "animated WebP",
        "dimensions": list(source_size),
        "frameCount": len(frames),
        "loop": loop,
        "durationsMs": durations,
        "totalDurationMs": sum(durations),
        "frames": frame_stats,
        "adjacentFrameDifferences": adjacent_diffs,
        "contactSheet": f"{side}-contact-sheet.png",
        "alphaSheet": f"{side}-alpha-sheet.png",
    }


report = {
    "purpose": "Visual and alpha-channel audit before frame interpolation",
    "method": "Pillow frame extraction; no source or runtime assets are modified",
    "performers": {side: inspect(side) for side in ("left", "right")},
}
(OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({
    side: {
        "dimensions": value["dimensions"],
        "frames": value["frameCount"],
        "durationsMs": value["durationsMs"],
        "totalDurationMs": value["totalDurationMs"],
        "contactSheet": value["contactSheet"],
        "alphaSheet": value["alphaSheet"],
    }
    for side, value in report["performers"].items()
}, indent=2))
