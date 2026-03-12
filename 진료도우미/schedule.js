/**
 * schedule.js - v6.0 (최종 통합 안정화 버전)
 */

let m1_offset = 0;
let m2_offset = 0;

// 날짜 파싱 및 포맷 (기존 로직 유지)
function parseDt(s) {
    if (!s) return null;
    let c = s.replace(/[^0-9]/g, '');
    if (c.length < 6) return null;
    let y = c.length === 8 ? c.substr(0, 4) : '20' + c.substr(0, 2);
    let m = c.length === 8 ? c.substr(4, 2) : c.substr(2, 2);
    let d = c.length === 8 ? c.substr(6, 2) : c.substr(4, 2);
    let dt = new Date(`${y}-${m}-${d}`);
    return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(dt) {
    if (!dt) return "";
    let y = dt.getFullYear();
    let m = String(dt.getMonth() + 1).padStart(2, '0');
    let d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 조정 함수
function adjM1(days) { m1_offset += days; runM1(); }
function adjM2(days) { m2_offset += days; runM2(); }

// 메인 계산 함수 (Mode 1)
function runM1() {
    const lastDateVal = document.getElementById('m1_lastDate').value;
    const planVal = document.getElementById('m1_plan').value;
    const resDiv = document.getElementById('m1_res');
    const weeksPassedSpan = document.getElementById('m1_weeksPassed');

    // 경과 주수 계산
    const last = parseDt(lastDateVal);
    if (last && weeksPassedSpan) {
        const diffDays = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
        weeksPassedSpan.innerText = (diffDays / 7).toFixed(1);
    }

    // 배지 업데이트
    updateBadge('m1', m1_offset);

    // 결과 출력
    if (planVal) {
        let nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (parseInt(planVal) * 7) + m1_offset);
        renderResult(resDiv, nextDate, 'adjM1');
    } else {
        m1_offset = 0;
        if (resDiv) resDiv.classList.add('hidden');
    }
}

// 메인 계산 함수 (Mode 2)
function runM2() {
    const baseDateVal = document.getElementById('m2_baseDate').value;
    const planVal = document.getElementById('m2_plan').value;
    const resDiv = document.getElementById('m2_res');
    const weeksPassedSpan = document.getElementById('m2_weeksPassed');

    const bDate = parseDt(baseDateVal);
    if (bDate && planVal) {
        let nextDate = new Date(bDate);
        nextDate.setDate(nextDate.getDate() + (parseInt(planVal) * 7) + m2_offset);
        renderResult(resDiv, nextDate, 'adjM2');
    } else {
        m2_offset = 0;
        if (resDiv) resDiv.classList.add('hidden');
    }
}

// 공통 배지 업데이트
function updateBadge(mode, offset) {
    const planInput = document.getElementById(`${mode}_plan`);
    if (!planInput) return;
    const parent = planInput.parentElement;
    const oldBadge = document.getElementById(`${mode}_badge`);
    if (oldBadge) oldBadge.remove();

    if (offset !== 0) {
        parent.classList.add('plan-input-wrapper');
        const colorClass = offset > 0 ? 'offset-plus' : 'offset-minus';
        const sign = offset > 0 ? '+' : '';
        const badge = document.createElement('span');
        badge.id = `${mode}_badge`;
        badge.className = `offset-badge ${colorClass}`;
        badge.innerText = `${sign}${offset}일`;
        parent.appendChild(badge);
    }
}

// 공통 결과 출력
function renderResult(targetDiv, date, adjFuncName) {
    const fDate = formatDate(date);
    const dayOfWeek = ['일','월','화','수','목','금','토'][date.getDay()];
    targetDiv.innerHTML = `
        <div class="result-wrapper">
            <div onclick="${adjFuncName}(-1)" class="date-adj-outer-btn"><i class="fa-solid fa-chevron-left"></i></div>
            <div class="result-card-compact">
                <span class="result-date-text">${fDate} (${dayOfWeek})</span>
                <div onclick="navigator.clipboard.writeText('${fDate}').then(()=>showToast('복사되었습니다'))" style="cursor:pointer; display:flex; align-items:center;">
                    <i class="fa-regular fa-copy" style="font-size: 1.1rem; opacity: 0.8;"></i>
                </div>
            </div>
            <div onclick="${adjFuncName}(1)" class="date-adj-outer-btn"><i class="fa-solid fa-chevron-right"></i></div>
        </div>`;
    targetDiv.classList.remove('hidden');
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    // showModal()은 명시적으로 호출될 때만 실행 (자동 팝업 방지)
    if (typeof runM1 === 'function') runM1();
    if (typeof runM2 === 'function') runM2();
});