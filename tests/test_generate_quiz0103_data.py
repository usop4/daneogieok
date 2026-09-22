from generate_quiz0103_data import classify_entries


def test_classify_entries_tracks_unclassified_rows():
    entries = [
        ("가다", "to go", []),
        ("건설", "construction", []),
        ("행복", "happiness", []),
    ]

    quiz01_entries, quiz03_entries, unclassified_entries = classify_entries(entries)

    assert quiz01_entries == [("건설", "construction", [])]
    assert quiz03_entries == [("가다", "to go", [])]
    assert unclassified_entries == [("행복", "happiness", [])]
