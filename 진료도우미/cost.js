/**
 * cost.js - v4.7 (전체 페이드 인 애니메이션 적용 버전)
 */

// 질환별 급여 기준 데이터
const insuranceGuide = {
    "AMD": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 첫 진단 시:</strong> FAG + OCT 필수</p>
            <p><strong>2. 예방적 투여:</strong> 3차 loading 이후 재발 확인 안 된 4차 투여 급여 불가, 첫 재발 이후에는 T&E 가능</p>
            <div class="flex">
                <strong class="shrink-0 mr-1">3. 효과 미흡:</strong>
                <div>
                    <p>3차 loading 효과 없는 경우 재발 확인되어도 4차 급여 불가</p>
                    <p>3차 loading 효과 없는 경우 약제 변경하여 3회 loading 가능 (변경 후에도 효과 없을 시 추가 급여 불가)</p>
                </div>
            </div>
            <p><strong>5. 시력 기준:</strong> 5차 투여부터 교정시력 0.1 이하 급여 불가</p>
            <p><strong>6. 최소 간격:</strong> 
                Ranibizumab, Aflibercept 2mg & 8mg (4주), 
                Faricimab(8주), Brolucizumab(12주/재발 시 8주)
            </p>
            <p class="text-indigo-600 text-xs mt-1">* Faricimab 예외: 3차 후 효과 있으나 fluid 잔존 시 4차 loading 가능</p>
        </div>`,
    "DME": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 두께 기준:</strong> OCT Thinnest CRT ≥ 300μm (첫 시작 300μm 이상 시 1년 이내 5회까지는 300μm 이하도 급여)</p>
            <p><strong>2. 혈당 조절:</strong> HbA1c ≤ 10%</p>
            <p><strong>3. 제외 대상:</strong> 황반위축/손상/경성삼출물로 효과 기대 어려운 경우, 국소적 부종으로 영구 손상 우려 적은 경우</p>
            <p><strong>4. 주사 횟수:</strong> Anti-VEGF(양안 합산 총 14회), Steroid(제한 없음)</p>
            <p><strong>5. 주사 간격:</strong> Anti-VEGF(Ranibizumab, Aflibercept 2mg & 8mg 4주, 나머지 8주/loading 기간 제외), Steroid(12주)</p>
        </div>`,
    "BRVO": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 두께 기준:</strong> OCT Thinnest CRT ≥ 300μm</p>
            <p><strong>2. 초기 급여:</strong> 반대안 교정시력 0.3 이하 시</p>
            <p><strong>3. 지연 급여:</strong> 반대안 교정시력 0.4 이상 시 발병 2~3개월 경과 후 부종 지속 및 해당안 교정시력 0.5 이하</p>
            <p><strong>4. 주사 횟수:</strong> Anti-VEGF(단안 총 5회), Steroid(제한 없음)</p>
            <p><strong>5. 주사 간격:</strong> Anti-VEGF(Ranibizumab, Aflibercept 2mg & 8mg 4주, 나머지 8주), Steroid(12주)</p>
        </div>`,
    "CRVO": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>참고:</strong> 허가사항은 있으나 별도의 급여기준 없음</p>
            <p class="text-amber-600"><strong>* 약제비 비급여 / 시술료 급여 적용</strong></p>
        </div>`,
    "mCNV": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 횟수:</strong> 첫 진단 후 12개월 이내 단안 총 5회 (12개월 이후에도 재진단 하에 남은 차수 가능)</p>
            <p><strong>2. 방식:</strong> Loading 과정 없음</p>
            <p><strong>3. 간격:</strong> Ranibizumab, Aflibercept 4주</p>
        </div>`,
    "Uveitis": `
        <div class="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 조건:</strong> 점안제 외 스테로이드 1개월 이상 사용 후 효과 없거나 부작용 있는 경우</p>
            <p><strong>2. 횟수:</strong> 단안당 1회 (의사 소견서 첨부 시 추가 투여 가능)</p>
            <p><strong>3. 간격:</strong> 3개월</p>
        </div>`
};

// 탭 선택 및 즉시 계산 실행
function selectDiagTab(diag) {
    // 1. 모든 탭 비활성화 후 선택된 탭 활성화
    document.querySelectorAll('.diag-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`diag-tab-${diag}`).classList.add('active');

    // 2. 비용 계산 및 렌더링 호출
    renderCostTable(diag);
}

// 기존 calculateCost를 renderCostTable로 변경 및 매개변수화
function renderCostTable(diag) {
    const area = document.getElementById('costArea');
    
    let html = `
        <table class="w-full mb-8 animate-fade-in">
            <thead>
                <tr>
                    <th width="15%">약제명</th>
                    <th width="20%">구분</th>
                    <th width="32.5%">급여 시</th>
                    <th width="32.5%">비급여 시</th>
                </tr>
            </thead>
            <tbody>`;

    cfg.drugs.forEach(drug => {
        const status = cfg.matrix[diag] ? cfg.matrix[diag][drug.name] : "X";
        
        if (drug.name === 'Avastin') {
            const p = Math.round(drug.price + cfg.injFee);
            html += `<tr>
                <td class="font-black text-left pl-8" style="color:${drug.color}; border-left: 8px solid ${drug.color}">${drug.name}</td>
                <td class="status-text text-slate-400">허가 외</td>
                <td>-</td>
                <td class="price-final-bold text-2xl">${p.toLocaleString()}원</td>
            </tr>`;
            return;
        }
        
        if (status === "X") return;
        
        const isR = status === "R";
        html += `<tr>
            <td class="font-black text-left pl-8" style="color:${drug.color}; border-left: 8px solid ${drug.color}">${drug.name}</td>
            <td class="status-text ${isR ? 'text-blue-600' : 'text-orange-500'}">
                ${isR ? '급여가능' : '허가O급여X'}
            </td>
            <td>${isR ? genPriceHTML(diag, drug, "R") : '-'}</td>
            <td>${genPriceHTML(diag, drug, "O")}</td>
        </tr>`;
    });

    html += `</tbody></table>`;

    let displayDiagTitle = diag;
    if (diag === "AMD") displayDiagTitle = "Exudative AMD";
    else if (diag === "mCNV") displayDiagTitle = "myopic CNV";

    if (insuranceGuide[diag]) {
        html += `
            <div class="mt-10 p-8 bg-slate-50 border-2 border-slate-100 rounded-3xl animate-fade-in text-left">
                <div class="flex items-center gap-2 mb-4">
                    <i class="fa-solid fa-circle-info text-indigo-500"></i>
                    <h3 class="font-black text-slate-800 tracking-tight">${displayDiagTitle} 보험 급여 가이드 및 체크사항</h3>
                </div>
                ${insuranceGuide[diag]}
            </div>
        `;
    }

    area.innerHTML = html;
}

function genPriceHTML(diag, drug, mode) {
    const isSupp = (drug.hasProgram && !(diag === 'AMD' && mode === 'R'));
    let dR = (mode === "R") ? (diag === "AMD" ? 0.1 : cfg.hospRate) : 1.0;
    let iR = (diag === "AMD" && mode === "R") ? 0.1 : cfg.hospRate;
    const total = Math.round((drug.price * dR) + (cfg.injFee * iR));
    let payback = isSupp ? (drug.is50 && mode === "R" ? Math.round((drug.price * dR) * 0.5) : (mode === "R" ? drug.payR : drug.payN)) : 0;
    const final = total - payback;

    if (isSupp && payback > 0) {
        return `
            <div class="price-before-support">${total.toLocaleString()}원</div>
            <div class="price-final-blue text-2xl">${final.toLocaleString()}원</div>
        `;
    }
    
    return `<div class="price-final-bold text-2xl">${total.toLocaleString()}원</div>`;
}