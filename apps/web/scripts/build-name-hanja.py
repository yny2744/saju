"""
인명용 한자 작명 자료 만들기 (2026-10-08, 수정안 11번 무료 이름 풀이).

입력: 유니코드 Unihan 데이터베이스가 들어 있는 SQLite 파일
      (npm 패키지 @mandel59/mojidata 의 dist/moji.db - Unicode 라이선스, 출처 표기 필요)
출력: public/hanja/name-hanja.json  { "字": [원획, "자원오행 또는 빈 문자열", ["한글음", ...]], ... }

글자 범위: 교육용 기초한자(kKoreanEducationHanja) + 인명용 한자(kKoreanName, 2018년 추가분까지)
원획: 부수를 본래 글자로 센 획수 = 강희 부수의 본래 획수 + 나머지 획수(kRSUnicode)
      예) 淑 = 水(4) + 8 = 12획,  珍 = 玉(5) + 5 = 10획,  草 = 艸(6) + 6 = 12획
      숫자 한자(一~十)는 작명 관례대로 뜻하는 수를 원획으로 쓴다(四=4, 五=5 …).
      成과 成이 들어간 글자는 강희자전대로 成을 7획으로 센다. 유니코드 자료는 글자에 따라 成을 6획(城·誠·盛)
      또는 7획(晟·宬·珹)으로 세어 들쭉날쭉하므로, 나머지 획수가 6으로 잡힌 글자와 成 자신에만 1획을 더한다.
      (확인: 成7 城10 誠14 盛12 晟11 宬10 娍10 珹12 筬13)
자원오행: 부수가 오행을 직접 나타내는 경우만 정한다(木·竹·艸·禾·米 → 목 / 火·日·心 → 화 /
      土·山·田·阜 → 토 / 金·玉·石 → 금 / 水·雨·冫·魚·川 → 수). 그 밖의 글자는 뜻으로 판단해야 해서
      비워 둔다(화면에서 "부수만으로 정하기 어려운 글자"로 안내).

사용: python3 -I scripts/build-name-hanja.py <moji.db 경로> public/hanja/name-hanja.json
"""
import json
import sqlite3
import sys

# 강희 부수 번호 → 본래 획수 (1~214)
RANGES = [(1, 6, 1), (7, 29, 2), (30, 60, 3), (61, 94, 4), (95, 117, 5), (118, 146, 6), (147, 166, 7),
          (167, 175, 8), (176, 186, 9), (187, 194, 10), (195, 200, 11), (201, 204, 12), (205, 208, 13),
          (209, 210, 14), (211, 211, 15), (212, 213, 16), (214, 214, 17)]
RADICAL_STROKES = {}
for a, b, n in RANGES:
    for r in range(a, b + 1):
        RADICAL_STROKES[r] = n

RADICAL_ELEMENT = {
    75: "목", 118: "목", 140: "목", 115: "목", 119: "목",
    86: "화", 72: "화", 61: "화",
    32: "토", 46: "토", 102: "토", 170: "토",
    167: "금", 96: "금", 112: "금",
    85: "수", 173: "수", 15: "수", 195: "수", 47: "수",
}

NUMBER_HANJA = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}


def main(db_path: str, out_path: str) -> None:
    c = sqlite3.connect(db_path)
    edu = dict(c.execute("select UCS, value from unihan_kKoreanEducationHanja"))
    name = dict(c.execute("select UCS, value from unihan_kKoreanName"))
    rs = dict(c.execute("select UCS, value from unihan_kRSUnicode"))
    hg = dict(c.execute("select UCS, value from unihan_kHangul"))
    seong_family = {u for u, ids in c.execute("select UCS, IDS from ids") if "成" in ids} | {"成"}
    out = {}
    for ch in sorted(set(edu) | set(name)):
        first = rs[ch].split()[0].replace("'", "").replace("\"", "")
        radical, rest = first.split(".")
        radical, rest = int(radical), int(rest)
        strokes = NUMBER_HANJA.get(ch, RADICAL_STROKES[radical] + rest)
        if ch == "成" or (ch in seong_family and rest == 6):
            strokes += 1
        readings = [r.split(":")[0] for r in hg.get(ch, "").split() if r]
        out[ch] = [strokes, RADICAL_ELEMENT.get(radical, ""), readings]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} chars -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
