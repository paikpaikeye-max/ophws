"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './assistant.css';

// 원본 데이터 및 로직 통합
const DEFAULT_CONFIG = {
    dateFormat: "YYYY-MM-DD",
    hospRate: 0.6,
    injFee: 124241,
    drugs: [
        { name: "Avastin", price: 43756, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#1e293b" },
        { name: "Lucentis", price: 576879, payR: 86532, payN: 210000, is50: true, hasProgram: true, color: "#0060fa" },
        { name: "Eylea", price: 496118, payR: 74418, payN: 210000, is50: true, hasProgram: true, color: "#138b2b" },
        { name: "Vabysmo", price: 695857, payR: 104379, payN: 240000, is50: true, hasProgram: true, color: "#ee00ff" },
        { name: "Beovu", price: 735050, payR: 110258, payN: 300000, is50: true, hasProgram: true, color: "#c7650a" },
        { name: "Ozurdex", price: 742000, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#777a7e" },
        { name: "Maqaid", price: 69920, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#777a7e" },
        { name: "Amelivu", price: 150000, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#0060fa" },
        { name: "Afilivu", price: 298000, payR: 44700, payN: 160000, is50: true, hasProgram: true, color: "#138b2b" },
        { name: "Eydenzelt", price: 330000, payR: 49500, payN: 165000, is50: true, hasProgram: true, color: "#138b2b" },
        { name: "HD Eylea", price: 795000, payR: 119250, payN: 280000, is50: true, hasProgram: true, color: "#660cd4" }
    ],
    matrix: {
        "AMD": { "Avastin": "X", "Lucentis": "R", "Eylea": "R", "HD Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "DME": { "Avastin": "X", "Lucentis": "R", "Eylea": "R", "HD Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "R", "Maqaid": "R", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "BRVO": { "Avastin": "X", "Lucentis": "R", "Eylea": "R", "HD Eylea": "X", "Vabysmo": "R", "Beovu": "X", "Ozurdex": "R", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "CRVO": { "Avastin": "X", "Lucentis": "O", "Eylea": "O", "HD Eylea": "X", "Vabysmo": "O", "Beovu": "X", "Ozurdex": "O", "Maqaid": "X", "Amelivu": "O", "Afilivu": "O", "Eydenzelt": "O" },
        "mCNV": { "Avastin": "X", "Lucentis": "R", "Eylea": "R", "HD Eylea": "X", "Vabysmo": "X", "Beovu": "X", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "Uveitis": { "Avastin": "X", "Lucentis": "X", "Eylea": "X", "HD Eylea": "X", "Vabysmo": "X", "Beovu": "X", "Ozurdex": "R", "Maqaid": "X", "Amelivu": "X", "Afilivu": "X", "Eydenzelt": "X" }
    }
};

export default function AssistantPage() {
    const router = useRouter();
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [activeTab, setActiveTab] = useState('schedule');
    const [collapsed, setCollapsed] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "" });
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(link);
        return () => { if (document.head.contains(link)) document.head.removeChild(link); };
    }, []);

    const showToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: "" }), 2000);
    };

    return (
        <div className="assistant-body">
            {/* Sidebar */}
            <aside className={`sidebar shadow-2xl ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header overflow-hidden">
                    {!collapsed && (
                        <h1 className="logo-text-sidebar whitespace-nowrap cursor-pointer mr-auto" onClick={() => router.push('/')}>
                            OPHWS <span>Assistant</span>
                        </h1>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white transition-colors">
                        <i className={`fa-solid ${collapsed ? 'fa-angles-right' : 'fa-angles-left'} text-xl`}></i>
                    </button>
                </div>

                <nav className="flex-1 space-y-1 mt-4">
                    {[
                        { id: 'schedule', label: '주사 일정 계산', icon: 'fa-calendar-alt' },
                        { id: 'cost', label: '주사 비용 계산기', icon: 'fa-coins' },
                        { id: 'risk', label: 'Dry AMD 위험도', icon: 'fa-chart-line' }
                    ].map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            title={tab.label}
                        >
                            <i className={`fa-solid ${tab.icon} w-6 text-center shrink-0`}></i>
                            <span className="menu-text ml-3">{tab.label}</span>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    {!collapsed && (
                        <div className="copyright-text mb-4">
                            <p className="font-bold text-indigo-300">Designed by 김동근</p>
                            <p>© 2026 OPHWS. All Rights Reserved.</p>
                        </div>
                    )}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-full flex items-center justify-center p-3 rounded-xl bg-slate-700 text-white font-black text-sm hover:bg-slate-600 transition-all whitespace-nowrap"
                        title="시스템 설정"
                    >
                        <i className="fa-solid fa-gear shrink-0"></i>
                        <span className="menu-text ml-2">시스템 설정</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="content-area">
                <div className="animate-fade-in space-y-8">
                    {activeTab === 'schedule' && <ScheduleSection config={config} />}
                    {activeTab === 'cost' && <CostSection config={config} />}
                    {activeTab === 'risk' && <RiskSection />}
                </div>
            </main>

            {/* Settings Modal (Placeholder for now, focused on main layout) */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-sidebar">
                            <div className="modal-tab active">환경 설정</div>
                        </div>
                        <div className="modal-main">
                            <h2 className="text-2xl font-black mb-6">시스템 설정 (준비 중)</h2>
                            <p className="text-slate-500 font-bold">원본 설정창의 모든 기능을 곧 구현 예정입니다.</p>
                        </div>
                    </div>
                </div>
            )}

            {toast.show && <div id="toast" className="show">{toast.message}</div>}
        </div>
    );
}

// --- 독립 컴포넌트: ResultCard (ScheduleSection 밖으로 분리하여 모드 간 리렌더 격리) ---
function ResultCard({ date, formatDate, setOffset, offset, mode }) {
    if (!date) return null;
    const fDate = formatDate(date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    const cardClass = mode === 1 ? "result-card-mode1" : "result-card-mode2";

    return (
        <div className="result-wrapper animate-fade-in">
            <div onClick={(e) => { e.preventDefault(); setOffset(offset - 1); }} className="date-adj-outer-btn">
                <i className="fa-solid fa-chevron-left"></i>
            </div>
            <div className={cardClass}>
                <span className="result-date-text">{fDate} ({dayOfWeek})</span>
                <i className="fa-regular fa-copy cursor-pointer ml-2 opacity-80 hover:opacity-100" onClick={() => { navigator.clipboard.writeText(fDate); alert('복사되었습니다'); }}></i>
            </div>
            <div onClick={(e) => { e.preventDefault(); setOffset(offset + 1); }} className="date-adj-outer-btn">
                <i className="fa-solid fa-chevron-right"></i>
            </div>
        </div>
    );
}

// --- 독립 컴포넌트: OffsetBadge ---
function OffsetBadge({ offset }) {
    if (offset === 0) return null;
    const colorClass = offset > 0 ? 'offset-plus' : 'offset-minus';
    const sign = offset > 0 ? '+' : '';
    return (
        <span className={`offset-badge ${colorClass}`}>
            {sign}{offset}일
        </span>
    );
}

// --- 일정 계산기 컴포넌트 (원본 schedule.js 및 index.html 통합) ---
function ScheduleSection({ config }) {
    const [m1Last, setM1Last] = useState("");
    const [m1Plan, setM1Plan] = useState("");
    const [m1Offset, setM1Offset] = useState(0);

    const [m2Base, setM2Base] = useState("");
    const [m2Last, setM2Last] = useState("");
    const [m2Plan, setM2Plan] = useState("");
    const [m2Offset, setM2Offset] = useState(0);

    const parseDt = (s) => {
        if (!s) return null;
        let c = s.replace(/[^0-9]/g, '');
        if (c.length < 6) return null;
        let y = c.length === 8 ? c.substr(0, 4) : '20' + c.substr(0, 2);
        let m = c.length === 8 ? c.substr(4, 2) : c.substr(2, 2);
        let d = c.length === 8 ? c.substr(6, 2) : c.substr(4, 2);
        const dt = new Date(`${y}-${m}-${d}`);
        return isNaN(dt.getTime()) ? null : dt;
    };

    const formatDate = (dt) => {
        if (!dt) return "";
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const calculateNextDate = (baseDt, plan, offset) => {
        const base = parseDt(baseDt);
        if (!base || !plan) return null;
        const res = new Date(base);
        res.setDate(res.getDate() + (parseInt(plan) * 7) + offset);
        return res;
    };

    return (
        <section className="space-y-8">
            <header className="border-b-2 border-slate-100 pb-4">
                <h2 className="text-3xl font-black text-slate-800">주사 일정 계산</h2>
                <p className="text-sm text-slate-500 mt-2 font-bold leading-relaxed">
                    실제 계획대로 내원하였는지 확인하고, 다음 내원 날짜를 정확히 계산하고 텍스트로 보낼 수 있습니다.<br />
                    시스템 설정에서 출력 날짜 형식을 변경할 수 있습니다.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mode 1 */}
                <div className="glass-card p-8 border-t-8 border-indigo-500 shadow-lg space-y-6">
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mode 1. 오늘 내원 기준</h3>
                    <input
                        type="text"
                        placeholder="이전 주사일 (날짜 형식 자동 인식)"
                        className="input-base text-lg"
                        value={m1Last}
                        onChange={e => { setM1Last(e.target.value); setM1Offset(0); }}
                    />
                    <div className="flex gap-4">
                        <div className="flex-1 status-box">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">현재 경과 주수</p>
                            <p className="text-5xl font-black text-indigo-600">
                                {m1Last && parseDt(m1Last) ? ((new Date() - parseDt(m1Last)) / (1000 * 60 * 60 * 24) / 7).toFixed(1) : "-"}
                            </p>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">향후 계획 (주)</p>
                            <div className="plan-input-container">
                                <input
                                    type="number"
                                    className="input-base text-3xl font-black text-center h-[90px]"
                                    value={m1Plan}
                                    onChange={e => { setM1Plan(e.target.value); setM1Offset(0); }}
                                />
                                <OffsetBadge offset={m1Offset} />
                            </div>
                        </div>
                    </div>
                    <ResultCard
                        key={`m1-${m1Plan}-${m1Offset}`}
                        date={calculateNextDate(formatDate(new Date()), m1Plan, m1Offset)}
                        formatDate={formatDate}
                        setOffset={setM1Offset}
                        offset={m1Offset}
                        mode={1}
                    />
                </div>

                {/* Mode 2 */}
                <div className="glass-card p-8 border-t-8 border-slate-400 shadow-lg space-y-6">
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mode 2. 특정일 기준</h3>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="기준일자 설정"
                                className="input-base bg-amber-50/50"
                                value={m2Base}
                                onChange={e => { setM2Base(e.target.value); setM2Offset(0); }}
                            />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="이전 주사일"
                                className="input-base"
                                value={m2Last}
                                onChange={e => { setM2Last(e.target.value); setM2Offset(0); }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 status-box">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">기준일 주수</p>
                            <p className="text-5xl font-black text-slate-600">
                                {m2Base && m2Last && parseDt(m2Base) && parseDt(m2Last) ? ((parseDt(m2Base) - parseDt(m2Last)) / (1000 * 60 * 60 * 24) / 7).toFixed(1) : "-"}
                            </p>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">기준일+N주</p>
                            <div className="plan-input-container">
                                <input
                                    type="number"
                                    className="input-base text-3xl font-black text-center h-[90px]"
                                    value={m2Plan}
                                    onChange={e => { setM2Plan(e.target.value); setM2Offset(0); }}
                                />
                                <OffsetBadge offset={m2Offset} />
                            </div>
                        </div>
                    </div>
                    <ResultCard
                        key={`m2-${m2Base}-${m2Plan}-${m2Offset}`}
                        date={calculateNextDate(m2Base, m2Plan, m2Offset)}
                        formatDate={formatDate}
                        setOffset={setM2Offset}
                        offset={m2Offset}
                        mode={2}
                    />
                </div>
            </div>
        </section>
    );
}

// --- 질환별 보험 급여 가이드 데이터 ---
const INSURANCE_GUIDE = {
    "AMD": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 첫 진단 시:</strong> FAG + OCT 필수</p>
            <p><strong>2. 예방적 투여:</strong> 3차 loading 이후 재발 확인 안 된 4차 투여 급여 불가, 첫 재발 이후에는 T&E 가능</p>
            <div className="flex">
                <strong className="shrink-0 mr-1">3. 효과 미흡:</strong>
                <div>
                    <p>3차 loading 효과 없는 경우 재발 확인되어도 4차 급여 불가</p>
                    <p>3차 loading 효과 없는 경우 약제 변경하여 3회 loading 가능 (변경 후에도 효과 없을 시 추가 급여 불가)</p>
                </div>
            </div>
            <p><strong>5. 시력 기준:</strong> 5차 투여부터 교정시력 0.1 이하 급여 불가</p>
            <p><strong>6. 최소 간격:</strong> Ranibizumab, Aflibercept 2mg & 8mg (4주), Faricimab(8주), Brolucizumab(12주/재발 시 8주)</p>
            <p className="text-indigo-600 text-xs mt-1">* Faricimab 예외: 3차 후 효과 있으나 fluid 잔존 시 4차 loading 가능</p>
        </div>
    ),
    "DME": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 두께 기준:</strong> OCT Thinnest CRT ≥ 300μm (첫 시작 300μm 이상 시 1년 이내 5회까지는 300μm 이하도 급여)</p>
            <p><strong>2. 혈당 조절:</strong> HbA1c ≤ 10%</p>
            <p><strong>3. 제외 대상:</strong> 황반위축/손상/경성삼출물로 효과 기대 어려운 경우, 국소적 부종으로 영구 손상 우려 적은 경우</p>
            <p><strong>4. 주사 횟수:</strong> Anti-VEGF(양안 합산 총 14회), Steroid(제한 없음)</p>
            <p><strong>5. 주사 간격:</strong> Anti-VEGF(Ranibizumab, Aflibercept 2mg & 8mg 4주, 나머지 8주/loading 기간 제외), Steroid(12주)</p>
        </div>
    ),
    "BRVO": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 두께 기준:</strong> OCT Thinnest CRT ≥ 300μm</p>
            <p><strong>2. 초기 급여:</strong> 반대안 교정시력 0.3 이하 시</p>
            <p><strong>3. 지연 급여:</strong> 반대안 교정시력 0.4 이상 시 발병 2~3개월 경과 후 부종 지속 및 해당안 교정시력 0.5 이하</p>
            <p><strong>4. 주사 횟수:</strong> Anti-VEGF(단안 총 5회), Steroid(제한 없음)</p>
            <p><strong>5. 주사 간격:</strong> Anti-VEGF(Ranibizumab, Aflibercept 2mg & 8mg 4주, 나머지 8주), Steroid(12주)</p>
        </div>
    ),
    "CRVO": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>참고:</strong> 허가사항은 있으나 별도의 급여기준 없음</p>
            <p className="text-amber-600"><strong>* 약제비 비급여 / 시술료 급여 적용</strong></p>
        </div>
    ),
    "mCNV": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 횟수:</strong> 첫 진단 후 12개월 이내 단안 총 5회 (12개월 이후에도 재진단 하에 남은 차수 가능)</p>
            <p><strong>2. 방식:</strong> Loading 과정 없음</p>
            <p><strong>3. 간격:</strong> Ranibizumab, Aflibercept 4주</p>
        </div>
    ),
    "Uveitis": (
        <div className="space-y-2 text-sm text-slate-600 text-left">
            <p><strong>1. 조건:</strong> 점안제 외 스테로이드 1개월 이상 사용 후 효과 없거나 부작용 있는 경우</p>
            <p><strong>2. 횟수:</strong> 단안당 1회 (의사 소견서 첨부 시 추가 투여 가능)</p>
            <p><strong>3. 간격:</strong> 3개월</p>
        </div>
    )
};

// --- 비용 계산기 컴포넌트 (원본 cost.js 포팅) ---
function CostSection({ config }) {
    const [diag, setDiag] = useState("AMD");
    const diags = ["AMD", "DME", "BRVO", "CRVO", "mCNV", "Uveitis"];

    // 원본 genPriceHTML 로직 포팅
    const genPriceInfo = (drug, mode) => {
        const isSupp = (drug.hasProgram && !(diag === 'AMD' && mode === 'R'));
        let dR = (mode === "R") ? (diag === "AMD" ? 0.1 : config.hospRate) : 1.0;
        let iR = (diag === "AMD" && mode === "R") ? 0.1 : config.hospRate;
        const total = Math.round((drug.price * dR) + (config.injFee * iR));
        let payback = isSupp ? (drug.is50 && mode === "R" ? Math.round((drug.price * dR) * 0.5) : (mode === "R" ? drug.payR : drug.payN)) : 0;
        const final_ = total - payback;
        return { total, final: final_, hasSupport: isSupp && payback > 0 };
    };

    // 가격 셀 렌더링
    const PriceCell = ({ info, isBlue }) => {
        if (info.hasSupport) {
            return (
                <td className="text-center">
                    <div className="price-before-support">{info.total.toLocaleString()}원</div>
                    <div className={`font-black text-2xl tracking-tighter ${isBlue ? 'text-indigo-600' : ''}`}>{info.final.toLocaleString()}원</div>
                </td>
            );
        }
        return (
            <td className={`font-black text-2xl tracking-tighter ${isBlue ? 'text-indigo-600' : ''}`}>
                {info.total.toLocaleString()}원
            </td>
        );
    };

    // 진단명 표시 변환
    const getDisplayDiag = (d) => {
        if (d === "AMD") return "Exudative AMD";
        if (d === "mCNV") return "myopic CNV";
        return d;
    };

    return (
        <section className="space-y-6">
            <header className="border-b-2 border-slate-100 pb-4">
                <h2 className="text-3xl font-black text-slate-800">주사 비용 계산기</h2>
                <p className="text-sm text-slate-500 mt-2 font-bold leading-relaxed">
                    기관분류/질환/급여 기준 별로 유리체강내 주사 수기료를 포함한 가격입니다.<br />
                    시스템 설정에서 근무 환경에 맞게 설정 할 수 있습니다.
                </p>
            </header>
            <div className="flex flex-wrap gap-2 border-b-2 border-slate-100 pb-4">
                {diags.map(d => (
                    <button key={d} onClick={() => setDiag(d)} className={`diag-tab ${diag === d ? 'active' : ''}`}>{d === 'AMD' ? 'Exudative AMD' : d}</button>
                ))}
            </div>
            <div className="glass-card p-8 overflow-x-auto">
                <table className="assistant-table">
                    <thead>
                        <tr className="font-black">
                            <th width="15%">약제명</th>
                            <th width="20%">구분</th>
                            <th width="32.5%">급여 시</th>
                            <th width="32.5%">비급여 시</th>
                        </tr>
                    </thead>
                    <tbody>
                        {config.drugs.map(drug => {
                            // Avastin 특수 처리: 모든 진단에서 "허가 외"로 표시
                            if (drug.name === 'Avastin') {
                                const p = Math.round(drug.price + config.injFee);
                                return (
                                    <tr key={drug.name}>
                                        <td className="font-black text-left pl-8" style={{ color: drug.color, borderLeft: `8px solid ${drug.color}` }}>{drug.name}</td>
                                        <td className="font-black text-slate-400">허가 외</td>
                                        <td>-</td>
                                        <td className="font-black text-2xl tracking-tighter">{p.toLocaleString()}원</td>
                                    </tr>
                                );
                            }

                            const status = config.matrix[diag]?.[drug.name] || "X";
                            if (status === "X") return null;

                            const isR = status === "R";
                            const pR = genPriceInfo(drug, "R");
                            const pO = genPriceInfo(drug, "O");

                            return (
                                <tr key={drug.name}>
                                    <td className="font-black text-left pl-8" style={{ color: drug.color, borderLeft: `8px solid ${drug.color}` }}>{drug.name}</td>
                                    <td className={`font-black ${isR ? 'text-blue-600' : 'text-orange-500'}`}>{isR ? '급여가능' : '허가O급여X'}</td>
                                    {isR ? <PriceCell info={pR} isBlue={true} /> : <td>-</td>}
                                    <PriceCell info={pO} isBlue={false} />
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* 보험 급여 가이드 */}
                {INSURANCE_GUIDE[diag] && (
                    <div className="mt-10 p-8 bg-slate-50 border-2 border-slate-100 rounded-3xl animate-fade-in text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <i className="fa-solid fa-circle-info text-indigo-500"></i>
                            <h3 className="font-black text-slate-800 tracking-tight">{getDisplayDiag(diag)} 보험 급여 가이드 및 체크사항</h3>
                        </div>
                        {INSURANCE_GUIDE[diag]}
                    </div>
                )}
            </div>
        </section>
    );
}

// --- Dry AMD 위험도 컴포넌트 (원본 score.js 포팅) ---
const RISK_RATES = [0.5, 3, 12, 25, 50];

function RiskSection() {
    const [drusen, setDrusen] = useState({ R: 'none', L: 'none' });
    const [pigment, setPigment] = useState({ R: false, L: false });
    const [advanced, setAdvanced] = useState({ R: false, L: false });

    // 드루젠 체크 (라디오 그룹처럼 동작)
    const handleDrusen = (eye, size) => {
        setDrusen(prev => ({
            ...prev,
            [eye]: prev[eye] === size ? 'none' : size
        }));
    };

    // Advanced 체크 (반대안 상호 배제)
    const handleAdvanced = (eye, checked) => {
        setAdvanced(prev => ({ ...prev, [eye]: checked }));
    };

    // 스코어 계산 (원본 calculateAMDScore 로직)
    const calcScore = () => {
        let anyChecked = false;
        let scoreR = 0, scoreL = 0;

        ['R', 'L'].forEach(eye => {
            if (advanced[eye]) {
                anyChecked = true;
                if (eye === 'R') scoreR = 2; else scoreL = 2;
            } else {
                if (drusen[eye] === 'large') { scoreR += (eye === 'R' ? 1 : 0); scoreL += (eye === 'L' ? 1 : 0); anyChecked = true; }
                else if (drusen[eye] === 'inter') { anyChecked = true; }
                else if (drusen[eye] === 'small') { anyChecked = true; }

                if (pigment[eye]) {
                    if (eye === 'R') scoreR += 1; else scoreL += 1;
                    anyChecked = true;
                }
            }
        });

        if (!anyChecked) return -1;

        let total = scoreR + scoreL;

        // 양안 모두 Intermediate drusen이면 +1 보너스
        if (drusen.R === 'inter' && drusen.L === 'inter' &&
            !advanced.R && !advanced.L) {
            total = Math.min(total + 1, 4);
        }

        return total;
    };

    const score = calcScore();
    const risk = score >= 0 ? RISK_RATES[score] : null;

    const handleReset = () => {
        setDrusen({ R: 'none', L: 'none' });
        setPigment({ R: false, L: false });
        setAdvanced({ R: false, L: false });
    };

    // 눈별 체크박스 패널
    const EyePanel = ({ eye, label }) => {
        const isAdvOther = advanced[eye === 'R' ? 'L' : 'R'];
        return (
            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <h3 className="font-black text-indigo-600 text-center text-sm border-b pb-2">{label}</h3>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">DRUSEN SIZE (Max)</p>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={drusen[eye] === 'large'} onChange={() => handleDrusen(eye, 'large')} disabled={advanced[eye]} className="w-4 h-4" />
                        <b>Large</b> (≥125μm)
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={drusen[eye] === 'inter'} onChange={() => handleDrusen(eye, 'inter')} disabled={advanced[eye]} className="w-4 h-4" />
                        <b>Intermediate</b> (63~124μm)
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={drusen[eye] === 'small'} onChange={() => handleDrusen(eye, 'small')} disabled={advanced[eye]} className="w-4 h-4" />
                        <b>Small / None</b> (&lt;63μm)
                    </label>
                </div>
                <div className="pt-2 border-t">
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold">
                        <input type="checkbox" checked={pigment[eye]} onChange={e => setPigment(prev => ({ ...prev, [eye]: e.target.checked }))} disabled={advanced[eye]} className="w-4 h-4" />
                        Pigmentary Abnormality
                    </label>
                </div>
                <div className="pt-2 border-t">
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-black text-red-600">
                        <input type="checkbox" checked={advanced[eye]} onChange={e => handleAdvanced(eye, e.target.checked)} disabled={isAdvOther} className="w-4 h-4" />
                        Advanced AMD (Wet/GA)
                    </label>
                </div>
            </div>
        );
    };

    return (
        <section className="space-y-6 h-full">
            <div className="flex h-full gap-6">
                {/* 좌측: 입력 + 결과 */}
                <div className="w-1/2 glass-card p-8 flex flex-col gap-5 overflow-y-auto" style={{ minHeight: '600px' }}>
                    <header className="flex justify-between items-center border-b pb-3">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 italic">AREDS Simplified Severity Scale</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: AREDS Report No. 18</p>
                        </div>
                        <button onClick={handleReset} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold rounded-lg transition-colors">
                            <i className="fa-solid fa-rotate-left mr-1"></i> RESET
                        </button>
                    </header>

                    <div className="grid grid-cols-2 gap-4">
                        <EyePanel eye="R" label="Right Eye (OD)" />
                        <EyePanel eye="L" label="Left Eye (OS)" />
                    </div>

                    {/* 결과 패널 */}
                    <div className="p-6 bg-indigo-600 rounded-2xl text-white text-center shadow-lg flex flex-col justify-center animate-fade-in" style={{ minHeight: '180px' }}>
                        <p className="text-[10px] font-bold opacity-70 tracking-widest mb-3 uppercase">
                            Analysis Result (Score: <span>{score >= 0 ? score : 0}</span>)
                        </p>
                        {score < 0 ? (
                            <p className="text-slate-300 font-bold">좌측에서 환자의 소견을 체크해주세요.</p>
                        ) : (
                            <div className="flex flex-col gap-2 animate-fade-in">
                                <p className="text-2xl font-black">
                                    5년 뒤 Advanced AMD(GA/wet) <br />진행 확률 <span className="text-amber-300 underline">{risk}%</span>
                                </p>
                                <div className="mt-2 pt-2 border-t border-indigo-400/50 text-base font-bold opacity-90">
                                    AREDS formula 복용 시 진행 확률을 <br />약 1/4 감소 시킬 수 있습니다.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 참고 텍스트 */}
                    <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p><b>* Drusen/Pigment Evaluation Range:</b> Both eyes, within 3000μm of the fovea.</p>
                        <p><b>* Pigmentary Abnormality:</b> Increased pigmentation or hypopigmentation.</p>
                        <p><b>* Advanced AMD:</b> Neovascular AMD or Geographic Atrophy involving the foveal center.</p>
                    </div>
                </div>

                {/* 우측: Figure 5 + Figure 6 */}
                <div className="w-1/2 flex flex-col gap-4">
                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase italic">Figure 5. Cumulative incidence of advanced AMD by Year</p>
                        <div className="flex-1 bg-white border border-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/fig5.png" alt="AREDS Fig 5" className="max-h-full object-contain" />
                            <div className="absolute bottom-2 right-2 text-[8px] text-slate-300">Source: AREDS Report No. 18, Fig 5.</div>
                        </div>
                    </div>
                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase italic">Figure 6. 5-Year Progression Risk by Score</p>
                        <div className="flex-1 flex items-end justify-around pb-6 bg-slate-50/50 rounded-lg">
                            {score >= 0 && RISK_RATES.map((rate, i) => {
                                const height = (rate * 4) + 10;
                                const isSelected = i === score;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>{rate}%</span>
                                        <div
                                            style={{ height: `${height}px`, width: '40px' }}
                                            className={`rounded-t-md transition-all duration-500 ${isSelected ? 'bg-indigo-600 shadow-lg' : 'bg-slate-200'}`}
                                        ></div>
                                        <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{i}점</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
