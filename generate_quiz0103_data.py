# word.txtを元に
# 動詞の場合はquiz03-data.txtに出力し
# 漢字語の場合はquiz01-data.txtに出力する
# 
# word.txtはカンマ区切りで単語は１項目目、意味が２項目目にある。３項目目に例文がある場合がある
# 動詞は単語が「다」で終わる場合に判定する
# 漢字語は動詞でなく、単語の文字数と意味の文字数が同じ場合に判定する
# それ以外は、どちらにも分類しない

#!/usr/bin/env python3
import argparse
import csv
import io
from pathlib import Path
from typing import List, Sequence, Tuple


Entry = Tuple[str, str, List[str]]


def parse_entries(text: str) -> List[Entry]:
	entries: List[Entry] = []
	for row in csv.reader(io.StringIO(text)):
		if not row or not any(field.strip() for field in row):
			continue
		if row[0].strip().startswith("#") or len(row) < 2:
			continue

		hangul = row[0].strip()
		meaning = row[1].strip()
		supplements = [",".join(field.strip() for field in row[2:])]
		if not supplements[0]:
			supplements = []
		entries.append((hangul, meaning, supplements))
	return entries


def classify_entries(entries: Sequence[Entry]) -> Tuple[List[Entry], List[Entry]]:
	quiz01_entries: List[Entry] = []
	quiz03_entries: List[Entry] = []

	for entry in entries:
		hangul, meaning, _ = entry
		if hangul.endswith("다"):
			quiz03_entries.append(entry)
		elif len(hangul) == len(meaning):
			quiz01_entries.append(entry)

	return quiz01_entries, quiz03_entries


def format_entries(entries: Sequence[Entry], header: str) -> str:
	output = io.StringIO()
	output.write(header + "\n")
	writer = csv.writer(output, lineterminator="\n")
	for hangul, meaning, supplements in entries:
		writer.writerow([hangul, meaning, *supplements])
	return output.getvalue()


def resolve_path(path_text: str) -> Path:
	path = Path(path_text)
	return path if path.is_absolute() else Path(__file__).resolve().parent / path


def main() -> None:
	parser = argparse.ArgumentParser(description="Generate quiz01 and quiz03 data from word.txt")
	parser.add_argument("--input", default="word.txt", help="Path to the source CSV file")
	parser.add_argument("--quiz01-output", default="quiz01-data.txt", help="Path to the Quiz01 output file")
	parser.add_argument("--quiz03-output", default="quiz03-data.txt", help="Path to the Quiz03 output file")
	args = parser.parse_args()

	entries = parse_entries(resolve_path(args.input).read_text(encoding="utf-8"))
	quiz01_entries, quiz03_entries = classify_entries(entries)

	quiz01_path = resolve_path(args.quiz01_output)
	quiz03_path = resolve_path(args.quiz03_output)
	quiz01_path.write_text(format_entries(quiz01_entries, "# format: hangul,kanji[,supplement]"), encoding="utf-8")
	quiz03_path.write_text(format_entries(quiz03_entries, "# format: hangul,japanese[,example]"), encoding="utf-8")

	print(f"Wrote {len(quiz01_entries)} entries to {quiz01_path}")
	print(f"Wrote {len(quiz03_entries)} entries to {quiz03_path}")


if __name__ == "__main__":
	main()