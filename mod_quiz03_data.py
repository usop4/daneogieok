#!/usr/bin/env python3
import argparse
import re
from pathlib import Path


HANGUL_RE = re.compile(r"[가-힣]")
JAPANESE_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]")
BRACKETED_GLOSS_RE = re.compile(r"([^\s,、。]+)[【\[]([^\]】]+)[】\]]")


def normalize_japanese_text(text: str) -> str:
    text = BRACKETED_GLOSS_RE.sub(r"\2", text)
    return text


def transform_line(line: str) -> str:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        return line

    idx = 0
    while idx < len(stripped) and HANGUL_RE.fullmatch(stripped[idx]):
        idx += 1

    if idx == 0 or idx >= len(stripped):
        return line

    prefix = stripped[:idx]
    suffix = stripped[idx:]
    suffix = suffix.lstrip()

    suffix = normalize_japanese_text(suffix)
    if not JAPANESE_RE.search(suffix):
        return line

    return f"{prefix} {suffix}"


def transform_csv_block(text: str) -> str:
    lines = text.splitlines()
    return "\n".join(transform_line(line) for line in lines)


def rewrite_js_file(input_path: Path, output_path: Path) -> None:
    text = input_path.read_text(encoding="utf-8")
    markers = ["const DEFAULT_TXT = `", "const DEFAULT_CSV = `"]
    marker = next((m for m in markers if m in text), None)
    if marker is None:
        raise ValueError(f"Could not find a supported DEFAULT_* block in {input_path}")

    start = text.index(marker) + len(marker)
    end = text.find("`", start)
    if end == -1:
        end = len(text)

    body = text[start:end]
    new_body = transform_csv_block(body)
    new_text = text[:start] + new_body + text[end:]
    output_path.write_text(new_text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize quiz03 Japanese gloss entries in the data file")
    parser.add_argument("--input", default="quiz03-data.js", help="Path to the input JavaScript file")
    parser.add_argument("--output", default=None, help="Path to the output JavaScript file. Defaults to overwriting the input file")
    parser.add_argument("--in-place", action="store_true", help="Overwrite the input file in place")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = Path(__file__).resolve().parent / input_path

    output_path = Path(args.output) if args.output else input_path
    if args.in_place:
        output_path = input_path

    rewrite_js_file(input_path, output_path)
    print(f"Wrote transformed data to {output_path}")


if __name__ == "__main__":
    main()
