"""
한자이름 선택 팝업용 사전 만들기 (한 번만 실행해서 public/hanja/dict.json을 만든다).

원본: libhangul 한자 사전 data/hanja/hanja.txt (Copyright (c) 2005,2006 Choe Hwanjin, BSD 3-Clause)
  https://github.com/libhangul/libhangul/blob/main/data/hanja/hanja.txt
라이선스 전문은 public/hanja/LICENSE-libhangul.txt 에 함께 배포한다(BSD 조건: 저작권 고지 유지).

만드는 모양: { "유": [["有","있을 유"], ["柳","버들 류"], ...], ... }
  - 한 글자 음 → 한 글자 한자 항목만, 뜻이 비어 있지 않은 것만(희귀자·간체자 제외)
  - 뜻은 첫 번째 뜻만 남긴다(화면 버튼에 들어갈 길이)
  - 순서는 원본 사전 순서(자주 쓰는 한자가 앞쪽)

사용: python3 scripts/build-hanja-dict.py <hanja.txt 경로>
"""
import json
import sys

src = sys.argv[1]
d = {}
for line in open(src, encoding="utf-8"):
    if line.startswith("#"):
        continue
    p = line.rstrip("\n").split(":")
    if len(p) < 3 or len(p[0]) != 1 or len(p[1]) != 1 or not p[2].strip():
        continue
    c = p[1]
    if not ("一" <= c <= "鿿" or "豈" <= c <= "﫿"):
        continue
    meaning = p[2].split(",")[0].strip()
    lst = d.setdefault(p[0], [])
    if all(x[0] != c for x in lst):
        lst.append([c, meaning])

out = "public/hanja/dict.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
print(out, len(d), "음", sum(len(v) for v in d.values()), "자")
