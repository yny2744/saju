/**
 * 카카오톡 글자 확대 사이트 전체 보정 (2026-11-03 유샘 지시 ③ "카톡 글자 확대로 깨진 곳 전부 고치기")
 *
 * 카카오톡의 글자 크기 설정(안드로이드 웹뷰 textZoom)은 -webkit-text-size-adjust 로 막히지 않고 모든 글자를 강제로 키워,
 * 입력 칸·풀이·결제 창 곳곳에서 글자가 잘리거나 겹친다. 대문에 넣었던 보정(실제로 그려진 글자 크기를 재서 키운 비율만큼
 * 줄여 맞춤, lib/textZoomFix.ts)을 사이트 전체로 넓혔다:
 *   1) 카카오톡 안에서만, 100px 글자의 실제 폭을 재서 확대 비율 f 를 구한다 (1.05 이하면 아무것도 안 함).
 *   2) 스타일 규칙과 인라인 스타일의 글자 크기를 모두 1/f 로 바꿔 쓴다 → 웹뷰가 다시 f 배 해서 원래 크기가 된다.
 *      뿌리 글자(html)도 1/f 로 두어 rem 단위 글자도 같이 맞는다. 나중에 붙는 스타일(화면 이동)도 지켜본다.
 *   3) var(--gh-tz 등) 로 이미 따로 보정하는 규칙과 em·% 처럼 부모를 따르는 값은 건드리지 않는다.
 * 결과: 카카오톡에서도 크롬과 같은 크기. 글자를 키워 보고 싶은 손님은 내 복주머니 > 표시 설정 > 글자 크기 "크게"
 * (사이트 화면이 버티도록 만든 설정, html[data-font-size="large"]).
 *
 * <body> 맨 앞에서 바로 실행되는 짧은 스크립트로 넣는다 (head 의 스타일 파일을 다 받은 뒤 실행되므로 첫 화면부터 맞는다).
 * PC 에서는 글꼴에 따라 한글 폭이 넓게 재지는 일이 있어 카카오톡 안에서만 잰다 (GateHero 와 같은 기준).
 */
export const TEXT_ZOOM_GUARD = `(function(){try{
var d=document,h=d.documentElement;
if(!/KAKAOTALK/i.test(navigator.userAgent)||!window.WeakSet||!window.MutationObserver)return;
var p=d.createElement("span");p.setAttribute("aria-hidden","true");p.textContent="\\uAC00\\uAC00\\uAC00\\uAC00\\uAC00";
p.style.cssText="position:absolute;left:-9999px;top:0;visibility:hidden;font-size:100px;line-height:1;letter-spacing:0;white-space:nowrap";
(d.body||h).appendChild(p);var f=p.getBoundingClientRect().width/500;p.parentNode.removeChild(p);
if(!(f>1.05&&f<4))return;
var K=1/f,M="__tzg",done=new WeakSet();
h.setAttribute("data-tzfix",f.toFixed(2));
function conv(v){return /var\\(|em|%|inherit|initial|unset|revert|^[a-z-]+$/.test(v)?null:"calc(("+v+") * "+K.toFixed(4)+")";}
function fix(s){var v=s.getPropertyValue("font-size");if(!v||s[M]===v)return;var c=conv(v);if(c)s.setProperty("font-size",c,s.getPropertyPriority("font-size"));s[M]=s.getPropertyValue("font-size");}
function rules(l){for(var i=0;i<l.length;i++){var r=l[i];if(r.cssRules)rules(r.cssRules);if(r.style)fix(r.style);}}
function sheets(){var a=d.styleSheets;for(var i=0;i<a.length;i++){var s=a[i];if(done.has(s))continue;try{if(!s.cssRules.length)continue;rules(s.cssRules);done.add(s);}catch(e){}}}
function el(e){if(e.nodeType===1&&e.style&&e.style.getPropertyValue("font-size"))fix(e.style);}
function tree(n){el(n);if(n.querySelectorAll){var l=n.querySelectorAll("[style]");for(var i=0;i<l.length;i++)el(l[i]);}}
var rs=d.createElement("style");rs.textContent="html{font-size:"+(16*K).toFixed(3)+"px}";(d.head||h).appendChild(rs);if(rs.sheet)done.add(rs.sheet);
sheets();
new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==="attributes"){el(m.target);continue;}
if(m.target.tagName==="STYLE")setTimeout(sheets,0);
for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(n.nodeType!==1)continue;if(n.tagName==="STYLE"||n.tagName==="LINK")setTimeout(sheets,0);tree(n);}}})
.observe(h,{childList:true,subtree:true,attributes:true,attributeFilter:["style"]});
d.addEventListener("load",function(e){if(e.target&&e.target.tagName==="LINK")sheets();},true);
d.addEventListener("DOMContentLoaded",function(){sheets();tree(d.body);});
}catch(e){}})();`;
