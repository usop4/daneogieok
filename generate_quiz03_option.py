#!/usr/bin/env python3
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import DefaultDict, List, Optional, Tuple

from common_setting import FAMILY_DISPLAY_NAMES, INITIAL_FAMILY, MEDIAL_FAMILY


def extract_default_csv(js_path: Path) -> str:
    text = js_path.read_text(encoding="utf-8")
    marker = "const DEFAULT_TXT = `"
    if marker not in text:
        raise ValueError(f"Could not find DEFAULT_TXT in {js_path}")

    start = text.index(marker) + len(marker)
    end = text.find("`", start)
    if end == -1:
        end = len(text)
    return text[start:end]


def parse_entries(csv_text: str) -> List[Tuple[str, List[str]]]:
    entries: List[Tuple[str, List[str]]] = []
    for raw_line in csv_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = [p.strip() for p in line.split(" ", 1) if p.strip()]
        if len(parts) < 2:
            continue

        hangul = parts[0]
        japanese_values = [parts[1]]
        entries.append((hangul, japanese_values))

    return entries


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


def build_suffix_key(hangul: str) -> Optional[str]:
    if len(hangul) < 2:
        return None

    suffix = hangul[-2:]
    if not all(re.fullmatch(r"[가-힣]", ch) for ch in suffix):
        return None

    return suffix


def build_groups(
    entries: List[Tuple[str, List[str]]],
) -> Tuple[List[Tuple[str, List[Tuple[str, List[str]]]]], List[Tuple[str, List[str]]]]:
    valid_entries: List[Tuple[str, List[str]]] = []
    for hangul, japanese_values in entries:
        if hangul and re.fullmatch(r"[가-힣]+", hangul):
            valid_entries.append((hangul, japanese_values))

    if not valid_entries:
        return [], []

    suffix_groups: DefaultDict[str, List[Tuple[str, List[str]]]] = defaultdict(list)
    for hangul, japanese_values in valid_entries:
        suffix_key = build_suffix_key(hangul)
        if not suffix_key:
            continue
        suffix_groups[suffix_key].append((hangul, japanese_values))

    suffix_items = []
    for suffix, entries_for_group in suffix_groups.items():
        if len(entries_for_group) < 2:
            continue
        if len(suffix) < 2:
            continue

        by_family: DefaultDict[str, List[Tuple[str, List[str]]]] = defaultdict(list)
        for hangul, japanese_values in entries_for_group:
            first_char = hangul[0]
            decomp = decompose_hangul(first_char)
            if decomp is None:
                continue
            initial, _ = decomp
            family = INITIAL_FAMILY.get(initial, initial)
            by_family[family].append((hangul, japanese_values))

        for family, family_entries in by_family.items():
            if len(family_entries) < 2:
                continue
            display_family = FAMILY_DISPLAY_NAMES.get(family, family)
            suffix_items.append((f"suffix_{suffix}_{display_family}", family_entries))

    suffix_items.sort(key=lambda item: (len(item[1]), item[0]))

    grouped: DefaultDict[Tuple[str, str], List[Tuple[str, List[str]]]] = defaultdict(list)
    for hangul, japanese_values in valid_entries:
        first_char = hangul[0]
        decomp = decompose_hangul(first_char)
        if decomp is None:
            continue
        initial, medial = decomp
        key = (INITIAL_FAMILY.get(initial, initial), MEDIAL_FAMILY.get(medial, medial))
        grouped[key].append((hangul, japanese_values))

    grouped_items = [(f"{FAMILY_DISPLAY_NAMES.get(initial, initial)}_{medial}", entries_for_group) for (initial, medial), entries_for_group in grouped.items() if len(entries_for_group) > 1]
    grouped_items.sort(key=lambda item: (len(item[1]), item[0]))

    groups = grouped_items + suffix_items
    grouped_words = {hangul for _, entries_for_group in groups for hangul, _ in entries_for_group}
    ungrouped_entries = [entry for entry in valid_entries if entry[0] not in grouped_words]
    ungrouped_entries.sort(key=lambda item: item[0])

    return groups, ungrouped_entries


def format_output(groups: List[Tuple[str, List[Tuple[str, List[str]]]]], ungrouped_entries: List[Tuple[str, List[str]]]) -> str:
    lines: List[str] = []
    for name, entries in groups:
        lines.append(f"[{name}]")
        for hangul, japanese_values in entries:
            values_text = ", ".join(japanese_values)
            lines.append(f"{hangul} {values_text}")
        lines.append("")

    if ungrouped_entries:
        lines.append("[グループなし]")
        for hangul, japanese_values in sorted(ungrouped_entries, key=lambda item: item[0]):
            values_text = ", ".join(japanese_values)
            lines.append(f"{hangul} {values_text}")

    return "\n".join(lines).rstrip() + "\n"


def format_js_output(groups: List[Tuple[str, List[Tuple[str, List[str]]]]]) -> str:
    payload = []
    for name, entries in groups:
        payload.append({
            "name": name,
            "entries": [
                {"hangul": hangul, "values": japanese_values}
                for hangul, japanese_values in entries
            ],
        })

    return "window.QUIZ03_OPTION_GROUPS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate grouped quiz option output from quiz03-data.js")
    parser.add_argument("--input", default="quiz03-data.js", help="Path to the quiz03 data file")
    parser.add_argument("--output", default="quiz03-option.txt", help="Optional output file path")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = Path(__file__).resolve().parent / input_path

    csv_text = extract_default_csv(input_path)
    entries = parse_entries(csv_text)
    groups, ungrouped_entries = build_groups(entries)
    output_text = format_output(groups, ungrouped_entries)
    js_output_text = format_js_output(groups)

    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = Path(__file__).resolve().parent / output_path
        output_path.write_text(output_text, encoding="utf-8")
        js_output_path = output_path.with_suffix('.js')
        js_output_path.write_text(js_output_text, encoding="utf-8")
        print(f"Wrote {len(groups)} groups to {output_path} and {js_output_path}")
    else:
        print(output_text)


if __name__ == "__main__":
    main()
