#!/usr/bin/env python3
"""Generate review-only RIFE 4.9 interpolation candidates for Monjes Rumberos."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "monks" / "dance"
TARGET_FPS = 25
FRAME_DURATION_MS = 40
SAMPLES_PER_SOURCE_INTERVAL = 7
MODEL_SHA256 = "76e4cef9ab42fa7dd4e8f6e4aba47462051e3faa969e4bca6479784fbab0ac6f"
MODEL_REVISION = "18dcfbe2c349d5922e353708153581d2039c576c"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class RifeInterpolator:
    def __init__(self, model_path: Path):
        actual_sha = sha256(model_path)
        if actual_sha != MODEL_SHA256:
            raise RuntimeError(f"RIFE model SHA-256 mismatch: {actual_sha}")
        options = ort.SessionOptions()
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(
            str(model_path),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        inputs = {item.name: item for item in self.session.get_inputs()}
        outputs = {item.name: item for item in self.session.get_outputs()}
        expected = {"img0", "img1", "timestep"}
        if set(inputs) != expected or "output" not in outputs:
            raise RuntimeError(
                "Unexpected RIFE ONNX signature: "
                f"inputs={list(inputs)}, outputs={list(outputs)}"
            )
        self.inputs = inputs
        self.output_name = "output"
        self.model_sha256 = actual_sha

    @staticmethod
    def _tensor(rgb: np.ndarray) -> tuple[np.ndarray, tuple[int, int]]:
        height, width = rgb.shape[:2]
        padded_height = ((height + 31) // 32) * 32
        padded_width = ((width + 31) // 32) * 32
        pad_bottom = padded_height - height
        pad_right = padded_width - width
        padded = np.pad(
            rgb,
            ((0, pad_bottom), (0, pad_right), (0, 0)),
            mode="reflect",
        )
        tensor = np.transpose(padded, (2, 0, 1))[None].astype(np.float32, copy=False)
        return tensor, (height, width)

    def interpolate(self, first: np.ndarray, second: np.ndarray, timestep: float) -> np.ndarray:
        tensor0, original_size = self._tensor(first)
        tensor1, _ = self._tensor(second)
        result = self.session.run(
            [self.output_name],
            {
                "img0": tensor0,
                "img1": tensor1,
                "timestep": np.asarray([timestep], dtype=np.float32),
            },
        )[0][0]
        output = np.transpose(result, (1, 2, 0))
        height, width = original_size
        return np.clip(output[:height, :width, :], 0.0, 1.0)


def load_rgba_frames(path: Path) -> tuple[list[Image.Image], list[int]]:
    frames: list[Image.Image] = []
    durations: list[int] = []
    with Image.open(path) as source:
        for frame in ImageSequence.Iterator(source):
            frames.append(frame.convert("RGBA").copy())
            durations.append(int(frame.info.get("duration", source.info.get("duration", 0)) or 0))
    if len(frames) < 2:
        raise RuntimeError(f"Expected an animated source with multiple frames: {path}")
    if len(set(durations)) != 1:
        raise RuntimeError(f"Source frame durations are inconsistent: {durations}")
    if durations[0] <= 0:
        raise RuntimeError(f"Invalid source frame duration: {durations}")
    return frames, durations


def as_premultiplied_and_alpha(frame: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    rgba = np.asarray(frame, dtype=np.float32) / 255.0
    alpha = rgba[..., 3:4]
    premultiplied = rgba[..., :3] * alpha
    return premultiplied, alpha


def composite_for_review(frame: Image.Image) -> Image.Image:
    background = Image.new("RGBA", frame.size, (18, 16, 28, 255))
    background.alpha_composite(frame)
    return background.convert("RGB")


def write_contact_sheet(frames: list[Image.Image], path: Path, side: str) -> None:
    columns = 7
    gap = 10
    label_height = 18
    tile_width, tile_height = 120, 134
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (
            columns * tile_width + (columns + 1) * gap,
            rows * (tile_height + label_height) + (rows + 1) * gap,
        ),
        (8, 7, 13),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, frame in enumerate(frames):
        x = gap + (index % columns) * (tile_width + gap)
        y = gap + (index // columns) * (tile_height + label_height + gap)
        preview = composite_for_review(frame).resize(
            (tile_width, tile_height), Image.Resampling.LANCZOS
        )
        sheet.paste(preview, (x, y))
        draw.text((x + 2, y + tile_height + 2), f"{side} · {index:02d}", fill="white", font=font)
    sheet.save(path, optimize=True)


def generate_side(side: str, interpolator: RifeInterpolator, output_dir: Path) -> dict:
    preserved_source = ASSET_DIR / "source" / f"monje-{side}-dance-original.webp"
    source_path = preserved_source if preserved_source.is_file() else ASSET_DIR / f"monje-{side}-dance.webp"
    source_frames, source_durations = load_rgba_frames(source_path)
    source_ms = source_durations[0]
    cycle_ms = sum(source_durations)
    if cycle_ms % FRAME_DURATION_MS:
        raise RuntimeError(
            f"Cycle duration {cycle_ms} ms is not divisible by target frame duration "
            f"{FRAME_DURATION_MS} ms"
        )
    expected_frames = cycle_ms // FRAME_DURATION_MS
    if len(source_frames) * SAMPLES_PER_SOURCE_INTERVAL != expected_frames:
        raise RuntimeError(
            f"Sampling mismatch: {len(source_frames)} source frames × "
            f"{SAMPLES_PER_SOURCE_INTERVAL} samples != {expected_frames} target frames"
        )

    prepared = [as_premultiplied_and_alpha(frame) for frame in source_frames]
    output_frames: list[Image.Image] = []

    for index, frame in enumerate(source_frames):
        next_index = (index + 1) % len(source_frames)
        premult0, alpha0 = prepared[index]
        premult1, alpha1 = prepared[next_index]
        output_frames.append(frame.copy())

        for sample in range(1, SAMPLES_PER_SOURCE_INTERVAL):
            timestep = sample / SAMPLES_PER_SOURCE_INTERVAL
            interpolated_premult = interpolator.interpolate(premult0, premult1, timestep)
            alpha_rgb0 = np.repeat(alpha0, 3, axis=2)
            alpha_rgb1 = np.repeat(alpha1, 3, axis=2)
            interpolated_alpha_rgb = interpolator.interpolate(
                alpha_rgb0, alpha_rgb1, timestep
            )
            interpolated_alpha = np.mean(interpolated_alpha_rgb, axis=2, keepdims=True)
            interpolated_alpha = np.clip(interpolated_alpha, 0.0, 1.0)

            straight_rgb = np.zeros_like(interpolated_premult)
            np.divide(
                interpolated_premult,
                np.maximum(interpolated_alpha, 1e-5),
                out=straight_rgb,
                where=interpolated_alpha > 1e-5,
            )
            rgba = np.concatenate(
                [np.clip(straight_rgb, 0.0, 1.0), interpolated_alpha], axis=2
            )
            output_frames.append(
                Image.fromarray(np.round(rgba * 255.0).astype(np.uint8), mode="RGBA")
            )

    if len(output_frames) != expected_frames:
        raise RuntimeError(
            f"{side}: generated {len(output_frames)} frames, expected {expected_frames}"
        )

    target_path = output_dir / f"monje-{side}-dance-rife-candidate.webp"
    output_frames[0].save(
        target_path,
        format="WEBP",
        save_all=True,
        append_images=output_frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        quality=90,
        alpha_quality=100,
        method=6,
        exact=True,
    )
    write_contact_sheet(
        output_frames,
        output_dir / f"monje-{side}-contact-sheet.png",
        side,
    )

    alpha_stats = []
    for frame in output_frames:
        alpha = frame.getchannel("A")
        alpha_stats.append({
            "bbox": list(alpha.getbbox()) if alpha.getbbox() else None,
            "extrema": list(alpha.getextrema()),
        })

    return {
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "sourceFrames": len(source_frames),
        "sourceFrameDurationsMs": source_durations,
        "sourceCycleDurationMs": cycle_ms,
        "sourceDimensions": list(source_frames[0].size),
        "targetFrames": len(output_frames),
        "targetFps": TARGET_FPS,
        "targetFrameDurationMs": FRAME_DURATION_MS,
        "targetCycleDurationMs": len(output_frames) * FRAME_DURATION_MS,
        "alphaExtrema": [min(item["extrema"][0] for item in alpha_stats), max(item["extrema"][1] for item in alpha_stats)],
        "candidate": target_path.name,
        "candidateBytes": target_path.stat().st_size,
        "candidateSha256": sha256(target_path),
        "contactSheet": f"monje-{side}-contact-sheet.png",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    interpolator = RifeInterpolator(args.model)
    report = {
        "status": "candidate-only; source runtime assets are not modified",
        "algorithm": "RIFE v4.9 ONNX, CPUExecutionProvider",
        "modelRepository": "https://huggingface.co/edgetools/rife",
        "modelRevision": MODEL_REVISION,
        "modelLicense": "MIT (see upstream model card and LICENSE)",
        "modelSha256": interpolator.model_sha256,
        "targetFps": TARGET_FPS,
        "targetFrameDurationMs": FRAME_DURATION_MS,
        "performers": {
            side: generate_side(side, interpolator, args.output)
            for side in ("left", "right")
        },
    }
    report_path = args.output / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
