/** 2026-10-10: 선불 충전은 하지 않는다 (수정안 31) - 운세를 살 때 모자란 만큼만 결제. 예전 주소로 오면 내 복주머니로. */
import { redirect } from "next/navigation";

export default function ChargePage() {
  redirect("/mypage");
}
