/**
 * config.js - v4.9 (입력 커서 튕김 방지 및 실시간 계산 최적화)
 */
let cfg = {
    "hospRate": 0.6,
    "injFee": 124241,
    "dateFormat": "YYYY-MM-DD",
    "drugs": [
        {"name": "Avastin", "price": 43756, "payR": 0, "payN": 0, "is50": false, "hasProgram": false, "color": "#1e293b"},
        {"name": "Lucentis", "price": 576879, "payR": 86532, "payN": 210000, "is50": true, "hasProgram": true, "color": "#0060fa"},
        {"name": "Eylea", "price": 496118, "payR": 74418, "payN": 210000, "is50": true, "hasProgram": true, "color": "#138b2b"},
        {"name": "Vabysmo", "price": 695857, "payR": 104379, "payN": 240000, "is50": true, "hasProgram": true, "color": "#ee00ff"},
        {"name": "Beovu", "price": 735050, "payR": 110258, "payN": 300000, "is50": true, "hasProgram": true, "color": "#c7650a"},
        {"name": "Ozurdex", "price": 742000, "payR": 0, "payN": 0, "is50": false, "hasProgram": false, "color": "#777a7e"},
        {"name": "Maqaid", "price": 69920, "payR": 0, "payN": 0, "is50": false, "hasProgram": false, "color": "#777a7e"},
        {"name": "Amelivu", "price": 150000, "payR": 0, "payN": 0, "is50": false, "hasProgram": false, "color": "#0060fa"},
        {"name": "Afilivu", "price": 298000, "payR": 44700, "payN": 160000, "is50": true, "hasProgram": true, "color": "#138b2b"},
        {"name": "Eydenzelt", "price": 330000, "payR": 49500, "payN": 165000, "is50": true, "hasProgram": true, "color": "#138b2b"},
        {"name": "HD Eylea", "price": 795000, "payR": 119250, "payN": 280000, "is50": true, "hasProgram": true, "color": "#660cd4"}
    ],
    "matrix": {
        "AMD": {"Avastin": "X", "Lucentis": "R", "Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R", "HD Eylea": "R"},
        "DME": {"Avastin": "X", "Lucentis": "R", "Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "R", "Maqaid": "R", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R", "HD Eylea": "R"},
        "BRVO": {"Avastin": "X", "Lucentis": "R", "Eylea": "R", "Vabysmo": "R", "Beovu": "X", "Ozurdex": "R", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R", "HD Eylea": "X"},
        "CRVO": {"Avastin": "X", "Lucentis": "O", "Eylea": "O", "Vabysmo": "O", "Beovu": "X", "Ozurdex": "O", "Maqaid": "X", "Amelivu": "O", "Afilivu": "O", "Eydenzelt": "O", "HD Eylea": "X"},
        "mCNV": {"Avastin": "X", "Lucentis": "R", "Eylea": "R", "Vabysmo": "X", "Beovu": "X", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R", "HD Eylea": "X"},
        "Uveitis": {"Ozurdex": "R", "Lucentis": "X", "Eylea": "X", "Vabysmo": "X", "Beovu": "X", "Maqaid": "X", "Amelivu": "X", "Afilivu": "X", "Eydenzelt": "X", "HD Eylea": "X"}
    }
};

const diags = ["AMD", "DME", "BRVO", "CRVO", "mCNV", "Uveitis"];

window.onload = () => {
    const saved = localStorage.getItem('opht_cfg_v43');
    if(saved) cfg = JSON.parse(saved);
    updateUI();
    const dateInput = document.querySelector(`input[name="dateFormat"][value="${cfg.dateFormat || 'YYYY-MM-DD'}"]`);
    if(dateInput) dateInput.checked = true;
};

function saveConfig() {
    cfg.hospRate = parseFloat(document.getElementById('set_hospRate').value);
    cfg.injFee = parseInt(document.getElementById('set_injFee').value);
    localStorage.setItem('opht_cfg_v43', JSON.stringify(cfg));
    updateUI(); closeModal(); showToast("설정이 저장되었습니다.");
}

function handleExport() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `OphtConfig_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function handleImport(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { 
        cfg = JSON.parse(ev.target.result); 
        localStorage.setItem('opht_cfg_v43', JSON.stringify(cfg));
        location.reload(); 
    };
    r.readAsText(f);
}

function updateUI() {
    const labels = {"0.6":"상급종합","0.5":"종합병원","0.4":"안과병원","0.3":"의원"};
    if(document.getElementById('hospitalTag')) 
        document.getElementById('hospitalTag').innerText = `${labels[cfg.hospRate]} ${Math.round(cfg.hospRate*100)}%`;
    if(document.getElementById('set_hospRate'))
        document.getElementById('set_hospRate').value = cfg.hospRate;
    if(document.getElementById('set_injFee'))
        document.getElementById('set_injFee').value = cfg.injFee;
}

// 약제 목록 렌더링 (커서 유지 및 지연 업데이트 적용)
function renderDrugs() {
    const b = document.getElementById('drugBody'); b.innerHTML = '';
    cfg.drugs.forEach((d, i) => { 
        const isReadonly = d.is50 ? 'readonly' : '';
        const bgClass = d.is50 ? 'bg-slate-100' : 'bg-white';
        
        b.innerHTML += `<tr>
            <td><div class="flex flex-col"><i class="fa-solid fa-chevron-up cursor-pointer hover:text-indigo-600" onclick="moveDrug(${i}, -1)"></i><i class="fa-solid fa-chevron-down cursor-pointer hover:text-indigo-600" onclick="moveDrug(${i}, 1)"></i></div></td>
            <td><div class="flex items-center gap-2"><input type="color" value="${d.color}" onchange="cfg.drugs[${i}].color=this.value;renderDrugs();"><input type="text" value="${d.name}" class="w-full font-black text-center" style="color:${d.color}" onchange="cfg.drugs[${i}].name=this.value"></div></td>
            <td><input type="number" value="${d.price}" class="w-full text-center" oninput="cfg.drugs[${i}].price=parseInt(this.value || 0)" onblur="autoCalcAll50()"></td>
            <td class="bg-indigo-50/50">
                <div class="flex flex-col items-center justify-center">
                    <span style="font-size: 10px; font-weight: 900; color: #6366f1; margin-bottom: -2px;">50%</span>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" ${d.is50?'checked':''} onchange="toggle50(${i}, this.checked)" class="w-4 h-4">
                        <input type="number" value="${d.payR}" ${isReadonly} class="w-24 text-center ${bgClass} border border-indigo-200 rounded p-1 text-sm font-bold" oninput="if(!cfg.drugs[${i}].is50) cfg.drugs[${i}].payR=parseInt(this.value || 0)">
                    </div>
                </div>
            </td>
            <td><input type="number" value="${d.payN}" class="w-full text-center" oninput="cfg.drugs[${i}].payN=parseInt(this.value || 0)"></td>
            <td><input type="checkbox" ${d.hasProgram?'checked':''} onchange="cfg.drugs[${i}].hasProgram=this.checked" class="w-5 h-5"></td>
            <td><button onclick="deleteDrug(${i})" class="text-red-500 font-bold text-xl">&times;</button></td>
        </tr>`; 
    });
}

function renderMatrix() {
    const c = document.getElementById('matrixContainer');
    let h = `<table class="w-full text-xs mt-4"><thead><tr class="bg-slate-100"><th>약제</th>` + diags.map(d => `<th>${d}</th>`).join('') + `</tr></thead><tbody>`;
    cfg.drugs.forEach(drug => { if(drug.name === 'Avastin') return; h += `<tr><td class="font-black bg-slate-50 text-left pl-4" style="color:${drug.color}">${drug.name}</td>` + diags.map(diag => {
        const st = cfg.matrix[diag] ? cfg.matrix[diag][drug.name] : "X";
        let color = 'text-black'; if(st==='R') color='text-blue-600'; if(st==='O') color='text-red-600';
        return `<td><select onchange="if(!cfg.matrix['${diag}'])cfg.matrix['${diag}']={};cfg.matrix['${diag}']['${drug.name}']=this.value;renderMatrix();" class="text-[10px] border rounded w-full font-bold ${color}"><option value="R" ${st==='R'?'selected':''}>급여</option><option value="O" ${st==='O'?'selected':''}>허가O급여X</option><option value="X" ${st==='X'?'selected':''}>허가X</option></select></td>`;
    }).join('') + `</tr>`; });
    c.innerHTML = h + `</tbody></table>`;
}

function deleteDrug(i) { const n = cfg.drugs[i].name; cfg.drugs.splice(i, 1); diags.forEach(d => { if(cfg.matrix[d]) delete cfg.matrix[d][n]; }); renderDrugs(); renderMatrix(); }

function toggle50(i, chk) { 
    cfg.drugs[i].is50 = chk; 
    if(chk) { 
        cfg.drugs[i].payR = Math.round((cfg.drugs[i].price * cfg.hospRate) * 0.5); 
    } 
    renderDrugs(); 
}

function moveDrug(idx, dir) { const newIdx = idx+dir; if(newIdx>=0 && newIdx<cfg.drugs.length) { [cfg.drugs[idx], cfg.drugs[newIdx]] = [cfg.drugs[newIdx], cfg.drugs[idx]]; renderDrugs(); renderMatrix(); } }
function addDrug() { const n = "신규"+cfg.drugs.length; cfg.drugs.push({ name:n, price:0, payR:0, payN:0, is50:false, hasProgram:true, color: '#1e293b' }); diags.forEach(d => { if(!cfg.matrix[d])cfg.matrix[d]={}; cfg.matrix[d][n]="X"; }); renderDrugs(); renderMatrix(); }

// 계산 로직 최적화: 입력을 마친 후(onblur) 혹은 설정 변경 시에만 동기화
function autoCalcAll50() { 
    cfg.drugs.forEach(d => { 
        if(d.is50) {
            d.payR = Math.round((d.price * cfg.hospRate) * 0.5); 
        }
    }); 
    renderDrugs(); 
}

function saveDateSetting() { cfg.dateFormat = document.querySelector('input[name="dateFormat"]:checked').value; }
function showToast(msg) { const toast = document.getElementById("toast"); toast.innerText = msg; toast.className = "show"; setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 2000); }