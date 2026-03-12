"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './assistant.css';

// 원본 데이터 및 로직 통합
const DEFAULT_CONFIG = {
    dateFormat: "YYYY-MM-DD",
    hospRate: 0.6,
    injFee: 125430,
    drugs: [
        { name: "Lucentis", price: 828166, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#2563eb" },
        { name: "Eylea", price: 708740, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#16a34a" },
        { name: "HD Eylea", price: 1544350, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#8b5cf6" },
        { name: "Vabysmo", price: 708740, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#db2777" },
        { name: "Beovu", price: 773634, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#d97706" },
        { name: "Ozurdex", price: 474260, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#94a3b8" },
        { name: "Maqaid", price: 47340, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#94a3b8" },
        { name: "Amelivu", price: 463773, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#0891b2" },
        { name: "Afilivu", price: 425244, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#059669" },
        { name: "Eydenzelt", price: 425244, payR: 0, payN: 0, is50: false, hasProgram: false, color: "#4f46e5" }
    ],
    matrix: {
        "AMD": { "Lucentis": "R", "Eylea": "R", "HD Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "DME": { "Lucentis": "R", "Eylea": "R", "HD Eylea": "R", "Vabysmo": "R", "Beovu": "R", "Ozurdex": "R", "Maqaid": "R", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "BRVO": { "Lucentis": "R", "Eylea": "R", "HD Eylea": "X", "Vabysmo": "R", "Beovu": "X", "Ozurdex": "R", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "CRVO": { "Lucentis": "O", "Eylea": "O", "HD Eylea": "X", "Vabysmo": "O", "Beovu": "X", "Ozurdex": "O", "Maqaid": "X", "Amelivu": "O", "Afilivu": "O", "Eydenzelt": "O" },
        "mCNV": { "Lucentis": "R", "Eylea": "R", "HD Eylea": "X", "Vabysmo": "X", "Beovu": "X", "Ozurdex": "X", "Maqaid": "X", "Amelivu": "R", "Afilivu": "R", "Eydenzelt": "R" },
        "Uveitis": { "Lucentis": "X", "Eylea": "X", "HD Eylea": "X", "Vabysmo": "X", "Beovu": "X", "Ozurdex": "R", "Maqaid": "X", "Amelivu": "X", "Afilivu": "X", "Eydenzelt": "X" }
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

    const ResultCard = ({ date, setOffset, offset, mode, baseDt, plan }) => {
        if (!date) return null;
        const fDate = formatDate(date);
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        const cardClass = mode === 1 ? "result-card-mode1" : "result-card-mode2";

        // key를 부여하여 해당 모드의 데이터가 바뀔 때만 remount -> 애니메이션 실행
        const animationKey = `${mode}-${baseDt}-${plan}-${offset}`;

        return (
            <div key={animationKey} className="result-wrapper animate-fade-in">
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
    };

    const OffsetBadge = ({ offset }) => {
        if (offset === 0) return null;
        const colorClass = offset > 0 ? 'offset-plus' : 'offset-minus';
        const sign = offset > 0 ? '+' : '';
        return (
            <span className={`offset-badge ${colorClass}`}>
                {sign}{offset}일
            </span>
        );
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
                        date={calculateNextDate(formatDate(new Date()), m1Plan, m1Offset)}
                        setOffset={setM1Offset}
                        offset={m1Offset}
                        mode={1}
                        baseDt={formatDate(new Date())}
                        plan={m1Plan}
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
                        date={calculateNextDate(m2Base, m2Plan, m2Offset)}
                        setOffset={setM2Offset}
                        offset={m2Offset}
                        mode={2}
                        baseDt={m2Base}
                        plan={m2Plan}
                    />
                </div>
            </div>
        </section>
    );
}

// --- 비용 계산기 컴포넌트 ---
function CostSection({ config }) {
    const [diag, setDiag] = useState("AMD");
    const diags = ["AMD", "DME", "BRVO", "CRVO", "mCNV", "Uveitis"];

    const getPriceInfo = (drug, mode) => {
        let dR = (mode === "R") ? (diag === "AMD" ? 0.1 : config.hospRate) : 1.0;
        let iR = (diag === "AMD" && mode === "R") ? 0.1 : config.hospRate;
        const total = Math.round((drug.price * dR) + (config.injFee * iR));
        return { total };
    };

    return (
        <section className="space-y-6">
            <header className="border-b-2 border-slate-100 pb-4">
                <h2 className="text-3xl font-black text-slate-800">주사 비용 계산기</h2>
                <p className="text-sm text-slate-500 mt-2 font-bold leading-relaxed">기관분류/질환/급여 기준 별 유리체강내 주사 비용입니다.</p>
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
                            const status = config.matrix[diag]?.[drug.name] || "X";
                            if (status === "X") return null;
                            const pR = getPriceInfo(drug, "R");
                            const pO = getPriceInfo(drug, "O");
                            return (
                                <tr key={drug.name}>
                                    <td className="font-black text-left pl-8" style={{ color: drug.color, borderLeft: `8px solid ${drug.color}` }}>{drug.name}</td>
                                    <td className={`font-black ${status === 'R' ? 'text-blue-600' : 'text-orange-500'}`}>{status === 'R' ? '급여가능' : '허가O급여X'}</td>
                                    <td className="font-black text-2xl text-indigo-600 tracking-tighter">{status === 'R' ? pR.total.toLocaleString() + '원' : '-'}</td>
                                    <td className="font-black text-2xl tracking-tighter">{pO.total.toLocaleString()}원</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// --- Dry AMD 위험도 컴포넌트 ---
function RiskSection() {
    return (
        <section className="space-y-6">
            <header className="border-b-2 border-slate-100 pb-4">
                <h2 className="text-3xl font-black text-slate-800">Dry AMD 위험도</h2>
                <p className="text-sm text-slate-500 mt-2 font-bold leading-relaxed">AREDS Simplified Severity Scale 기반 진행 위험도 분석입니다.</p>
            </header>
            <div className="glass-card p-12 text-center italic text-slate-400 font-bold">
                원본 소스 코드 기반으로 기능 구현 중입니다.
            </div>
        </section>
    );
}
