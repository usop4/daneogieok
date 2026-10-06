from generate_quiz0103_data import classify_entries


def test_classify_entries_tracks_unclassified_rows():
    entries = [
        ("가게부", "家計簿", []),
        ("가꾸다", "栽培する、装う", ["정원에서 꽃을 가꿉니다.（庭で花を育てます。）"]),
        ("행복", "幸せになる", []),
    ]

    quiz01_entries, quiz03_entries, unclassified_entries = classify_entries(entries)

    assert quiz01_entries == [("가게부", "家計簿", [])]
    assert quiz03_entries == [
        ("가꾸다", "栽培する、装う", ["정원에서 꽃을 가꿉니다.（庭で花を育てます。）"])
    ]
    assert unclassified_entries == [("행복", "幸せになる", [])]
