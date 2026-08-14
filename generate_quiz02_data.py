#!/usr/bin/env python3
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from common_setting import INITIAL_FAMILY, MEDIAL_FAMILY


def read_data_file(data_path: Path) -> str:
    return data_path.read_text(encoding="utf-8")


def decompose_hangul(ch: str) -> Optional[Tuple[str, str]]:
    if not re.fullmatch(r"[가-힣]", ch):
        return None

    code = ord(ch)
    if code < 0xAC00 or code > 0xD7A3:
        return None

    base = code - 0xAC00
    initial_index = base // (21 * 28)
    medial_index = (base // 28) % 21
    initial_chars = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
    medial_chars = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
    return initial_chars[initial_index], medial_chars[medial_index]


def extract_hangul_chars(csv_text: str) -> List[str]:
    chars: List[str] = []
    seen = set()

    for raw_line in csv_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "," not in line:
            continue

        hangul = line.split(",", 1)[0].strip()
        for ch in hangul:
            if re.fullmatch(r"[가-힣]", ch) and ch not in seen:
                seen.add(ch)
                chars.append(ch)

    return chars


def build_quiz02_groups(chars: List[str]) -> Dict[Tuple[str, str], List[str]]:
    groups: Dict[Tuple[str, str], List[str]] = defaultdict(list)

    for ch in chars:
        decomp = decompose_hangul(ch)
        if decomp is None:
            continue
        initial, medial = decomp
        key = (INITIAL_FAMILY.get(initial, initial), MEDIAL_FAMILY.get(medial, medial))
        groups[key].append(ch)

    return {key: sorted(value) for key, value in sorted(groups.items())}


def format_output(groups: Dict[Tuple[str, str], List[str]], output_format: str) -> str:
    if output_format == "json":
        return json.dumps([{"key": [k[0], k[1]], "chars": v} for k, v in groups.items()], ensure_ascii=False)

    if output_format == "js":
        body = "\n".join(" ".join(v) for v in groups.values())
        return f"const PAIR = `\n{body}\n`"

    lines = [" ".join(v) for v in groups.values()]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate quiz02 candidate groups from quiz01-data.txt")
    parser.add_argument("--input", default="quiz01-data.txt", help="Path to the text data file")
    parser.add_argument("--output", default=None, help="Optional output file path")
    parser.add_argument("--format", choices=["text", "json", "js"], default="js", help="Output format")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = Path(__file__).resolve().parent / input_path

    csv_text = read_data_file(input_path)
    chars = extract_hangul_chars(csv_text)
    groups = build_quiz02_groups(chars)
    output_text = format_output(groups, args.format)

    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = Path(__file__).resolve().parent / output_path
        output_path.write_text(output_text + "\n", encoding="utf-8")
        print(f"Wrote {len(groups)} groups to {output_path}")
    else:
        print(output_text)


if __name__ == "__main__":
    main()
