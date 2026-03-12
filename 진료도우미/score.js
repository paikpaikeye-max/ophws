/**
 * score.js - v5.3 (AREDS Simplified Severity Scale)
 */

const riskRates = [0.5, 3, 12, 25, 50];

function calculateAMDScore() {
    let results = { R: 0, L: 0, drusen: { R: 'none', L: 'none' }, pigment: { R: false, L: false }, advanced: { R: false, L: false } };
    let anyChecked = false; // 체크 여부 확인용

    ['R', 'L'].forEach(eye => {
        const isAdv = document.getElementById(`amd_${eye}_advanced`).checked;
        if(isAdv) anyChecked = true;
        results.advanced[eye] = isAdv;
        
        const otherEye = eye === 'R' ? 'L' : 'R';
        if (isAdv) {
            document.getElementById(`amd_${otherEye}_advanced`).disabled = true;
            results[eye] = 2;
        } else {
            if (!document.getElementById(`amd_${otherEye}_advanced`).checked) {
                document.getElementById(`amd_${eye}_advanced`).disabled = false;
            }
            
            if (document.getElementById(`amd_${eye}_drusen_large`).checked) {
                results.drusen[eye] = 'large';
                results[eye] += 1;
                anyChecked = true;
            } else if (document.getElementById(`amd_${eye}_drusen_inter`).checked) {
                results.drusen[eye] = 'inter';
                anyChecked = true;
            } else if (document.getElementById(`amd_${eye}_drusen_small`).checked) {
                anyChecked = true;
            }
            
            if (document.getElementById(`amd_${eye}_pigment`).checked) {
                results.pigment[eye] = true;
                results[eye] += 1;
                anyChecked = true;
            }
        }
    });

    // 0점이어도 체크가 하나라도 되어야 계산 결과 출력
    if (!anyChecked) {
        document.getElementById('totalAMDScore').innerText = "0";
        document.getElementById('amdRiskText').innerHTML = `<p class="text-slate-300 font-bold">좌측에서 환자의 소견을 체크해주세요.</p>`;
        renderCharts(-1); // 그래프 초기화
        return;
    }

    let totalScore = results.R + results.L;

    if (results.drusen.R === 'inter' && results.drusen.L === 'inter' && 
        results.drusen.R !== 'large' && results.drusen.L !== 'large' &&
        !results.advanced.R && !results.advanced.L) {
        totalScore = Math.min(totalScore + 1, 4);
    }

    renderCharts(totalScore);
}

function handleDrusenCheck(eye, size) {
    const sizes = ['small', 'inter', 'large'];
    sizes.forEach(s => {
        if (s !== size) document.getElementById(`amd_${eye}_drusen_${s}`).checked = false;
    });
    calculateAMDScore();
}

function resetAMDCalculator() {
    const checkboxes = document.querySelectorAll('#page-amd-risk input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });
    calculateAMDScore();
}

function renderCharts(score) {
    if (score === -1) {
        document.getElementById('fig6_container').innerHTML = ""; 
        return;
    }

    const risk = riskRates[score];
    document.getElementById('totalAMDScore').innerText = score;
    // 문구 수정: 25% -> 1/4 감소
    document.getElementById('amdRiskText').innerHTML = `
        <div class="flex flex-col gap-2 animate-fade-in">
            <p class="text-2xl font-black">5년 뒤 Advanced AMD(GA/wet) <br>진행 확률 <span class="text-amber-300 underline">${risk}%</span></p>
            <div class="mt-2 pt-2 border-t border-indigo-400/50 text-base font-bold opacity-90">
                AREDS formula 복용 시 진행 확률을 <br>약 1/4 감소 시킬 수 있습니다.
            </div>
        </div>
    `;

    const fig6 = document.getElementById('fig6_container');
    let html = '';
    riskRates.forEach((rate, i) => {
        const height = (rate * 4) + 10;
        const isSelected = i === score;
        html += `
            <div class="flex flex-col items-center gap-2">
                <span class="text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-300'}">${rate}%</span>
                <div style="height: ${height}px; width: 40px;" class="rounded-t-md transition-all duration-500 ${isSelected ? 'bg-indigo-600 shadow-lg' : 'bg-slate-200'}"></div>
                <span class="text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}">${i}점</span>
            </div>`;
    });
    fig6.innerHTML = html;
}