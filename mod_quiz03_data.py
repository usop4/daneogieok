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

    parts = [part.strip() for part in stripped.split(",")]
    if len(parts) < 2:
        return line

    hangul = parts[0]
    japanese = parts[1]
    if not hangul or not HANGUL_RE.fullmatch(hangul[0]):
        return line

    japanese = normalize_japanese_text(japanese)
    if not JAPANESE_RE.search(japanese):
        return line

    return ",".join([hangul, japanese, *parts[2:]])


def transform_csv_block(text: str) -> str:
    lines = text.splitlines()
    return "\n".join(transform_line(line) for line in lines)


def rewrite_data_file(input_path: Path, output_path: Path) -> None:
    text = input_path.read_text(encoding="utf-8")
    output_path.write_text(transform_csv_block(text), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize quiz03 Japanese gloss entries in the data file")
    parser.add_argument("--input", default="quiz03-data.txt", help="Path to the input text file")
    parser.add_argument("--output", default=None, help="Path to the output JavaScript file. Defaults to overwriting the input file")
    parser.add_argument("--in-place", action="store_true", help="Overwrite the input file in place")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = Path(__file__).resolve().parent / input_path

    output_path = Path(args.output) if args.output else input_path
    if args.in_place:
        output_path = input_path

    rewrite_data_file(input_path, output_path)
    print(f"Wrote transformed data to {output_path}")


if __name__ == "__main__":
    main()
