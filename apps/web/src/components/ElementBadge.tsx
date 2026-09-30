/**
 * Phase 8 디자인 원칙: 오행 색상은 실제 계산된 데이터(우세/부족 오행)를 나타낼
 * 때만 등장하는 "의미 있는 색"이다. 장식이 아니라 그 오행이 무엇인지 알려주는
 * 표시이므로, saju-engine이 실제로 반환하는 다섯 글자(목/화/토/금/수) 외의
 * 값이 오면 색 없이 텍스트만 보여준다 (임의로 색을 지어내지 않는다).
 */
const ELEMENT_STYLES: Record<string, string> = {
  목: "bg-[#3d6b4c]",
  화: "bg-[#b54a3f]",
  토: "bg-[#b08d57]",
  금: "bg-[#6e7075]",
  수: "bg-[#2f4a73]",
};

export function ElementBadge({ element }: { element: string }) {
  const colorClass = ELEMENT_STYLES[element];

  if (!colorClass) {
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" style={{ borderColor: "var(--color-line)" }}>
        {element}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white ${colorClass}`}>
      {element}
    </span>
  );
}
