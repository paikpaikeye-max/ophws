"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import './assistant.css';
import { DEFAULT_ASSISTANT_CONFIG, DIAGS, HOSP_LABELS, DATE_FORMATS } from '@/lib/assistantConstants';
import { loadMergedConfig, saveUserConfig, applyGlobalUpdate, deployGlobalConfig } from '@/lib/assistantConfig';

export default function AssistantPage() {
    const router = useRouter();
    const [config, setConfig] = useState(DEFAULT_ASSISTANT_CONFIG);
    const [activeTab, setActiveTab] = useState('schedule');
    const [collapsed, setCollapsed] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "" });
    const [showSettings, setShowSettings] = useState(false);

    // DB 연동 상태
    const [userId, setUserId] = useState(null);
    const [globalConfig, setGlobalConfig] = useState(null);
    const [globalVersion, setGlobalVersion] = useState(0);
    const [baseVersion, setBaseVersion] = useState(0);
    const [hasGlobalUpdate, setHasGlobalUpdate] = useState(false);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const authClientRef = useRef(null);

    // 현재 로그인 유저 가져오기 + Config 로드
    useEffect(() => {
        const authClient = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        authClientRef.current = authClient;
        async function init() {
            try {
                const { data: { user }, error: authError } = await authClient.auth.getUser();
                if (authError) {
                    console.warn('[Assistant] User auth error:', authError.message);
                }

                if (user) {
                    setUserId(user.id);
                    // Admin 권한 확인
                    const { data: profile } = await authClient
                        .from('user_profiles')
                        .select('status')
                        .eq('id', user.id)
                        .single();
                    if (profile?.status === 'admin') {
                        setIsAdmin(true);
                    }

                    const result = await loadMergedConfig(authClient, user.id);
                    setConfig(result.config);
                    setGlobalConfig(result.globalConfig);
                    setGlobalVersion(result.globalVersion);
                    setBaseVersion(result.baseVersion);
                    setHasGlobalUpdate(result.hasUpdate);
                }
            } catch (err) {
                console.warn('[Assistant] 초기화 중 오류 발생 (기본값 사용):', err);
            } finally {
                setConfigLoaded(true);
            }
        }
        init();
    }, []);

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
                        { id: 'risk', label: 'Dry AMD 위험도', icon: 'fa-chart-line' },
                        { id: 'iol', label: '인공수정체 안내문', icon: 'fa-compact-disc' }
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
                    {activeTab === 'schedule' && <ScheduleSection config={config} showToast={showToast} />}
                    {activeTab === 'cost' && <CostSection config={config} />}
                    {activeTab === 'risk' && <RiskSection />}
                    {activeTab === 'iol' && <IolSection />}
                </div>
            </main>

            {/* Settings Modal */}
            {showSettings && <SettingsModal
                config={config}
                setConfig={setConfig}
                userId={userId}
                globalVersion={globalVersion}
                globalConfig={globalConfig}
                hasGlobalUpdate={hasGlobalUpdate}
                setHasGlobalUpdate={setHasGlobalUpdate}
                setBaseVersion={setBaseVersion}
                setGlobalVersion={setGlobalVersion}
                setGlobalConfig={setGlobalConfig}
                isAdmin={isAdmin}
                onClose={() => setShowSettings(false)}
                showToast={showToast}
                supabaseClient={authClientRef.current}
            />}

            {toast.show && <div id="toast" className="show">{toast.message}</div>}
        </div>
    );
}

// --- 독립 컴포넌트: ResultCard (ScheduleSection 밖으로 분리하여 모드 간 리렌더 격리) ---
function ResultCard({ date, formatDate, setOffset, offset, mode, showToast }) {
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
                <i className="fa-regular fa-copy cursor-pointer ml-2 opacity-80 hover:opacity-100" onClick={(e) => { 
                    e.stopPropagation();
                    navigator.clipboard.writeText(fDate); 
                    if (showToast) showToast(`복사되었습니다: ${fDate}`); else alert('복사되었습니다'); 
                }}></i>
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
function ScheduleSection({ config, showToast }) {
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
        const y4 = dt.getFullYear();
        const y2 = String(y4).slice(-2);
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const fmt = config.dateFormat || "YYYY-MM-DD";
        return fmt
            .replace('YYYY', y4).replace('YY', y2)
            .replace('MM', m).replace('DD', d);
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
                    실제 계획대로 내원하였는지 확인하고, 다음 내원 날짜를 정확히 계산하고 텍스트로 복사할 수 있습니다.<br />
                    시스템 설정에서 출력 날짜 형식을 변경할 수 있습니다.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mode 1 */}
                <div className="glass-card p-8 border-t-8 border-indigo-500 shadow-lg space-y-6">
                    <h3 className="text-slate-400 text-sm font-black uppercase tracking-widest">Mode 1. 오늘 내원 기준</h3>
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
                        showToast={showToast}
                    />
                </div>

                {/* Mode 2 */}
                <div className="glass-card p-8 border-t-8 border-slate-400 shadow-lg space-y-6">
                    <h3 className="text-slate-400 text-sm font-black uppercase tracking-widest">Mode 2. 특정일 기준</h3>
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
                        showToast={showToast}
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

// --- Dry AMD 위험도 컴포넌트 (원본 score.js 포팅 및 Report 42 반영) ---
const RISK_RATES_NO_RPD = [0.3, 4, 12, 27, 50];
const RISK_RATES_RPD = [3, 8, 29, 59, 72];

function RiskSection() {
    const [drusen, setDrusen] = useState({ R: 'none', L: 'none' });
    const [pigment, setPigment] = useState({ R: false, L: false });
    const [advanced, setAdvanced] = useState({ R: false, L: false });
    const [rpd, setRpd] = useState({ R: false, L: false });

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

    const hasRPD = rpd.R || rpd.L;
    const currentRates = hasRPD ? RISK_RATES_RPD : RISK_RATES_NO_RPD;
    const score = calcScore();
    const risk = score >= 0 ? currentRates[score] : null;

    const handleReset = () => {
        setDrusen({ R: 'none', L: 'none' });
        setPigment({ R: false, L: false });
        setAdvanced({ R: false, L: false });
        setRpd({ R: false, L: false });
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
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold text-slate-600">
                        <input type="checkbox" checked={rpd[eye]} onChange={e => setRpd(prev => ({ ...prev, [eye]: e.target.checked }))} className="w-4 h-4" />
                        Reticular Pseudodrusen (RPD)
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
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: AREDS REPORT NO. 18 & 42</p>
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

                {/* 우측: Graphs */}
                <div className="w-1/2 flex flex-col gap-4">
                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase italic">Cumulative incidence of advanced AMD by Year</p>
                        <div className="flex-1 bg-white border border-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden flex-row gap-2 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/report18_fig5.png" alt="AREDS Fig 5" className="h-full w-1/2 object-contain rounded" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/report42_fig4.png" alt="AREDS Fig 4" className="h-full w-1/2 object-contain rounded" />
                            <div className="absolute bottom-2 right-2 text-[8px] text-slate-400 font-bold bg-white/80 px-2 py-1 rounded shadow-sm">
                                AREDS report 18 figure 5 / AREDS report 42 figure 4
                            </div>
                        </div>
                    </div>
                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase italic flex justify-between">
                            <span>5-Year Progression Risk by Score</span>
                            <span className="flex gap-3">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> No RPD</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm"></span> With RPD</span>
                            </span>
                        </p>
                        <div className="flex-1 flex items-end justify-around pb-6 bg-slate-50/50 rounded-lg pt-4 px-2 relative min-h-[160px]">
                            {score >= 0 && [0,1,2,3,4].map((i) => {
                                const isSelected = i === score;
                                const rateNo = RISK_RATES_NO_RPD[i];
                                const rateYes = RISK_RATES_RPD[i];
                                const heightNo = (rateNo * 1.5) + 10;
                                const heightYes = (rateYes * 1.5) + 10;
                                
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1 w-full max-w-[80px] h-full justify-end">
                                        <div className="flex items-end justify-center w-full gap-3 relative">
                                            {/* No RPD */}
                                            <div className="flex flex-col items-center justify-end group">
                                                <span className={`text-[10px] font-bold mb-1 transition-all ${isSelected && !hasRPD ? 'text-blue-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>{rateNo}%</span>
                                                <div
                                                    style={{ height: `${heightNo}px`, width: '28px' }}
                                                    className={`rounded-t-md transition-all duration-500 ${isSelected && !hasRPD ? 'bg-blue-500 shadow-lg scale-110' : 'bg-slate-200'}`}
                                                    title={`Score ${i} (No RPD): ${rateNo}%`}
                                                ></div>
                                            </div>
                                            {/* With RPD */}
                                            <div className="flex flex-col items-center justify-end group">
                                                <span className={`text-[10px] font-bold mb-1 transition-all ${isSelected && hasRPD ? 'text-red-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>{rateYes}%</span>
                                                <div
                                                    style={{ height: `${heightYes}px`, width: '28px' }}
                                                    className={`rounded-t-md transition-all duration-500 ${isSelected && hasRPD ? 'bg-red-400 shadow-lg scale-110' : 'bg-slate-300'}`}
                                                    title={`Score ${i} (With RPD): ${rateYes}%`}
                                                ></div>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-black mt-3 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{i}점</span>
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

// --- 설정 모달 컴포넌트 (원본 config.js 포팅) ---
function SettingsModal({ config, setConfig, userId, globalVersion, globalConfig, hasGlobalUpdate, setHasGlobalUpdate, setBaseVersion, setGlobalVersion, setGlobalConfig, isAdmin, onClose, showToast, supabaseClient }) {
    const [settingsTab, setSettingsTab] = useState('sched-set');
    const [tempConfig, setTempConfig] = useState(() => JSON.parse(JSON.stringify(config)));
    const [saving, setSaving] = useState(false);
    const [deploying, setDeploying] = useState(false);

    // hospRate를 가져올 때 float 보장
    const hospRate = parseFloat(tempConfig.hospRate) || 0.6;

    // 50% 자동 계산
    const autoCalcAll50 = useCallback((cfg) => {
        const rate = parseFloat(cfg.hospRate) || 0.6;
        return {
            ...cfg,
            drugs: cfg.drugs.map(d => d.is50
                ? { ...d, payR: Math.round((d.price * rate) * 0.5) }
                : d
            )
        };
    }, []);

    // 약제 이동
    const moveDrug = (idx, dir) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= tempConfig.drugs.length) return;
        setTempConfig(prev => {
            const drugs = [...prev.drugs];
            [drugs[idx], drugs[newIdx]] = [drugs[newIdx], drugs[idx]];
            return { ...prev, drugs };
        });
    };

    // 약제 삭제
    const deleteDrug = (idx) => {
        const drugName = tempConfig.drugs[idx].name;
        setTempConfig(prev => {
            const drugs = prev.drugs.filter((_, i) => i !== idx);
            const matrix = { ...prev.matrix };
            DIAGS.forEach(d => {
                if (matrix[d]) {
                    const m = { ...matrix[d] };
                    delete m[drugName];
                    matrix[d] = m;
                }
            });
            return { ...prev, drugs, matrix };
        });
    };

    // 약제 추가
    const addDrug = () => {
        const name = "신규" + tempConfig.drugs.length;
        setTempConfig(prev => {
            const drugs = [...prev.drugs, { name, price: 0, payR: 0, payN: 0, is50: false, hasProgram: true, color: '#1e293b' }];
            const matrix = { ...prev.matrix };
            DIAGS.forEach(d => {
                if (!matrix[d]) matrix[d] = {};
                matrix[d] = { ...matrix[d], [name]: "X" };
            });
            return { ...prev, drugs, matrix };
        });
    };

    // 50% 토글
    const toggle50 = (idx, checked) => {
        setTempConfig(prev => {
            const drugs = prev.drugs.map((d, i) => {
                if (i !== idx) return d;
                const updated = { ...d, is50: checked };
                if (checked) {
                    updated.payR = Math.round((d.price * (parseFloat(prev.hospRate) || 0.6)) * 0.5);
                }
                return updated;
            });
            return { ...prev, drugs };
        });
    };

    // 약제 필드 업데이트
    const updateDrug = (idx, field, value) => {
        setTempConfig(prev => {
            const drugs = prev.drugs.map((d, i) => i === idx ? { ...d, [field]: value } : d);
            return { ...prev, drugs };
        });
    };

    // 약제 가격 변경 후 50% 재계산
    const updateDrugPrice = (idx, price) => {
        setTempConfig(prev => {
            const drugs = prev.drugs.map((d, i) => {
                if (i !== idx) return d;
                const updated = { ...d, price: parseInt(price) || 0 };
                if (d.is50) {
                    updated.payR = Math.round((updated.price * (parseFloat(prev.hospRate) || 0.6)) * 0.5);
                }
                return updated;
            });
            return { ...prev, drugs };
        });
    };

    // 매트릭스 변경
    const updateMatrix = (diag, drugName, value) => {
        setTempConfig(prev => {
            const matrix = { ...prev.matrix };
            if (!matrix[diag]) matrix[diag] = {};
            matrix[diag] = { ...matrix[diag], [drugName]: value };
            return { ...prev, matrix };
        });
    };

    // 기관분류 변경 시 50% 재계산
    const updateHospRate = (value) => {
        setTempConfig(prev => autoCalcAll50({ ...prev, hospRate: parseFloat(value) }));
    };

    // 저장
    const handleSave = async () => {
        setSaving(true);
        try {
            // DB에 개인 오버라이드 저장
            if (userId && supabaseClient) {
                const overrides = {
                    hospRate: tempConfig.hospRate,
                    dateFormat: tempConfig.dateFormat,
                    injFee: tempConfig.injFee,
                    drugs: tempConfig.drugs,
                    matrix: tempConfig.matrix
                };
                const result = await saveUserConfig(supabaseClient, userId, overrides, globalVersion);
                if (!result.success) {
                    showToast('저장 실패: ' + result.error);
                    setSaving(false);
                    return;
                }
                setBaseVersion(globalVersion);
            }
            setConfig(tempConfig);
            showToast('설정이 저장되었습니다.');
            onClose();
        } catch (err) {
            showToast('저장 중 오류: ' + err.message);
        }
        setSaving(false);
    };

    // 전역 배포 (Admin 전용)
    const handleDeployGlobal = async () => {
        if (!isAdmin || !supabaseClient) return;
        if (!confirm('현재 설정을 전역 기본값으로 배포하시겠습니까?\n모든 사용자가 최신 버전을 적용받게 됩니다.')) return;
        
        setDeploying(true);
        try {
            const result = await deployGlobalConfig(supabaseClient, tempConfig, globalVersion);
            if (!result.success) {
                showToast('전역 배포 실패: ' + result.error);
            } else {
                showToast('새로운 전역 설정이 배포되었습니다! (Ver.' + result.newVersion + ')');
                setGlobalVersion(result.newVersion);
                setBaseVersion(result.newVersion); // 내 버전도 최신으로 갱신
                setGlobalConfig(tempConfig);
                setConfig(tempConfig);
                setHasGlobalUpdate(false);
                onClose();
            }
        } catch (err) {
            showToast('전역 배포 중 오류: ' + err.message);
        }
        setDeploying(false);
    };

    // 내보내기
    const handleExport = () => {
        const exportData = { ...tempConfig };
        delete exportData._baseVersion;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `OphtConfig_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // 불러오기
    const handleImport = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                setTempConfig(prev => ({ ...prev, ...imported }));
                showToast('설정을 불러왔습니다. "저장 및 적용"을 눌러 반영하세요.');
            } catch {
                showToast('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(f);
        e.target.value = '';
    };

    // 전역 업데이트 적용
    const handleApplyGlobalUpdate = () => {
        if (!globalConfig) return;
        const updated = applyGlobalUpdate(tempConfig, globalConfig);
        setTempConfig(updated);
        setHasGlobalUpdate(false);
        showToast('전역 설정이 반영되었습니다. "저장 및 적용"을 눌러 저장하세요.');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* 모달 사이드바 */}
                <div className="modal-sidebar">
                    <div
                        className={`modal-tab ${settingsTab === 'sched-set' ? 'active' : ''}`}
                        onClick={() => setSettingsTab('sched-set')}
                    >주사 일정 계산</div>
                    <div
                        className={`modal-tab ${settingsTab === 'cost-set' ? 'active' : ''}`}
                        onClick={() => setSettingsTab('cost-set')}
                    >주사 비용 계산기</div>
                </div>

                {/* 모달 메인 */}
                <div className="modal-main-wrapper">
                    {/* 헤더 */}
                    <div className="modal-header">
                        <h2 className="font-black text-lg text-slate-800 uppercase italic">
                            {settingsTab === 'cost-set' ? '주사 비용 계산기' : '주사 일정 계산'}
                        </h2>
                        <button onClick={onClose} className="modal-close-btn">&times;</button>
                    </div>

                    {/* 전역 업데이트 알림 */}
                    {hasGlobalUpdate && (
                        <div className="global-update-banner">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <span>관리자가 전역 설정을 업데이트했습니다.</span>
                            <button onClick={handleApplyGlobalUpdate} className="global-update-btn">적용하기</button>
                        </div>
                    )}

                    {/* 컨텐츠 */}
                    <div className="modal-body">
                        {/* 탭 1: 날짜 형식 */}
                        {settingsTab === 'sched-set' && (
                            <div className="space-y-6">
                                <div className="settings-section">
                                    <h3 className="font-bold text-slate-700 mb-4">날짜 출력 형식 설정</h3>
                                    <div className="date-format-grid">
                                        {DATE_FORMATS.map(fmt => (
                                            <label key={fmt.value} className={`date-format-option ${tempConfig.dateFormat === fmt.value ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="dateFormat"
                                                    value={fmt.value}
                                                    checked={tempConfig.dateFormat === fmt.value}
                                                    onChange={() => setTempConfig(prev => ({ ...prev, dateFormat: fmt.value }))}
                                                />
                                                <span>{fmt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 탭 2: 비용 계산기 설정 */}
                        {settingsTab === 'cost-set' && (
                            <div className="space-y-8">
                                {/* 기관 분류 & 시술료 */}
                                <div className="settings-hosp-row">
                                    <div>
                                        <label className="settings-label">기관 분류</label>
                                        <select
                                            className="input-base font-bold"
                                            value={tempConfig.hospRate}
                                            onChange={e => updateHospRate(e.target.value)}
                                        >
                                            {Object.entries(HOSP_LABELS).map(([val, label]) => (
                                                <option key={val} value={val}>{label}({Math.round(parseFloat(val) * 100)}%)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="settings-label">시술료 원가</label>
                                        <input
                                            type="number"
                                            className="input-base font-bold"
                                            value={tempConfig.injFee}
                                            onChange={e => setTempConfig(prev => ({ ...prev, injFee: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>

                                {/* 약제 테이블 */}
                                <div className="settings-table-wrap">
                                    <table className="settings-drug-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}>정렬</th>
                                                <th style={{ width: '160px' }}>약제명</th>
                                                <th style={{ width: '100px' }}>원가</th>
                                                <th style={{ width: '150px' }}>급여지원</th>
                                                <th style={{ width: '100px' }}>비급지원</th>
                                                <th style={{ width: '50px' }}>지원</th>
                                                <th style={{ width: '40px' }}>삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tempConfig.drugs.map((drug, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <div className="drug-sort-btns">
                                                            <i className="fa-solid fa-chevron-up" onClick={() => moveDrug(i, -1)}></i>
                                                            <i className="fa-solid fa-chevron-down" onClick={() => moveDrug(i, 1)}></i>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="drug-name-cell">
                                                            <input
                                                                type="color"
                                                                value={drug.color}
                                                                onChange={e => updateDrug(i, 'color', e.target.value)}
                                                                className="drug-color-picker"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={drug.name}
                                                                onChange={e => updateDrug(i, 'name', e.target.value)}
                                                                className="drug-name-input"
                                                                style={{ color: drug.color }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={drug.price}
                                                            onChange={e => updateDrugPrice(i, e.target.value)}
                                                            className="drug-num-input"
                                                        />
                                                    </td>
                                                    <td className="pay-r-cell">
                                                        <div className="pay-r-inner">
                                                            <span className="pay-r-label">50%</span>
                                                            <div className="pay-r-row">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={drug.is50}
                                                                    onChange={e => toggle50(i, e.target.checked)}
                                                                    className="w-4 h-4"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={drug.payR}
                                                                    readOnly={drug.is50}
                                                                    onChange={e => !drug.is50 && updateDrug(i, 'payR', parseInt(e.target.value) || 0)}
                                                                    className={`drug-pay-input ${drug.is50 ? 'readonly' : ''}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={drug.payN}
                                                            onChange={e => updateDrug(i, 'payN', parseInt(e.target.value) || 0)}
                                                            className="drug-num-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={drug.hasProgram}
                                                            onChange={e => updateDrug(i, 'hasProgram', e.target.checked)}
                                                            className="w-5 h-5"
                                                        />
                                                    </td>
                                                    <td>
                                                        <button onClick={() => deleteDrug(i)} className="drug-delete-btn">&times;</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 급여 매트릭스 */}
                                <div className="settings-table-wrap">
                                    <table className="settings-matrix-table">
                                        <thead>
                                            <tr>
                                                <th>약제</th>
                                                {DIAGS.map(d => <th key={d}>{d}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tempConfig.drugs.filter(d => d.name !== 'Avastin').map(drug => (
                                                <tr key={drug.name}>
                                                    <td className="matrix-drug-name" style={{ color: drug.color }}>{drug.name}</td>
                                                    {DIAGS.map(diag => {
                                                        const st = tempConfig.matrix[diag]?.[drug.name] || 'X';
                                                        const colorCls = st === 'R' ? 'matrix-select-r' : st === 'O' ? 'matrix-select-o' : '';
                                                        return (
                                                            <td key={diag}>
                                                                <select
                                                                    value={st}
                                                                    onChange={e => updateMatrix(diag, drug.name, e.target.value)}
                                                                    className={`matrix-select ${colorCls}`}
                                                                >
                                                                    <option value="R">급여</option>
                                                                    <option value="O">허가O급여X</option>
                                                                    <option value="X">허가X</option>
                                                                </select>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* New Drug 버튼 */}
                                <div className="flex justify-end">
                                    <button onClick={addDrug} className="add-drug-btn">
                                        + New Drug
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 하단 버튼 */}
                    <div className="modal-footer">
                        {isAdmin && (
                            <button onClick={handleDeployGlobal} disabled={deploying} className="modal-btn-deploy">
                                {deploying ? '배포 중...' : '전역 설정 배포'}
                            </button>
                        )}
                        <button onClick={handleExport} className="modal-btn-export">설정 내보내기</button>
                        <label className="modal-btn-import">
                            설정 불러오기
                            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                        </label>
                        <button onClick={handleSave} disabled={saving} className="modal-btn-save">
                            {saving ? '저장 중...' : '저장 및 적용'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- IOL 안내문 컴포넌트 ---
const IOL_DATA = [
    {
        id: 'monofocal',
        name: '단초점 (Monofocal)',
        desc: '원거리(또는 근거리) 한 곳에 초점을 맞추는 기본 렌즈입니다.',
        pros: ['선명한 시야 확보', '빛번짐 최소화', '건강보험 적용(기본)'],
        cons: ['안경(돋보기) 의존도 높음'],
        ranges: { far: 5, mid: 2, near: 1 }
    },
    {
        id: 'edof',
        name: '연속초점 (EDOF)',
        desc: '원거리부터 중간거리(컴퓨터, 내비게이션 등)까지 연속적으로 잘 보이는 렌즈입니다.',
        pros: ['원~중간거리 우수한 시력', '다초점 대비 야간 빛번짐 적음'],
        cons: ['아주 가까운 글씨는 돋보기 필요 가능'],
        ranges: { far: 5, mid: 4, near: 2 }
    },
    {
        id: 'multifocal',
        name: '다초점 (Multifocal)',
        desc: '원거리, 중간거리, 근거리 모두 초점을 맞추어 안경 의존도를 최소화하는 렌즈입니다.',
        pros: ['안경/돋보기 의존도 거의 없음', '일상생활 편의성 극대화'],
        cons: ['초기 적응 기간 필요', '야간 빛번짐 발생 가능'],
        ranges: { far: 5, mid: 4, near: 4 }
    }
];

function IolSection() {
    const [patientInfo, setPatientInfo] = useState({ name: '', regNo: '', eye: '우안 (OD)' });
    const [selectedIols, setSelectedIols] = useState(['monofocal', 'edof', 'multifocal']); // default all
    const [bestIol, setBestIol] = useState('');
    const [toricNeeded, setToricNeeded] = useState(false);

    const toggleIol = (id) => {
        setSelectedIols(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        if (bestIol === id) setBestIol(''); // reset best if deselected
    };

    const handlePrint = () => {
        window.print();
    };

    const RangeBars = ({ ranges }) => (
        <div className="flex gap-4 mt-3">
            {[
                { label: '원거리(운전 등)', val: ranges.far },
                { label: '중간거리(PC 등)', val: ranges.mid },
                { label: '근거리(독서 등)', val: ranges.near }
            ].map(r => (
                <div key={r.label} className="flex flex-col items-center flex-1">
                    <span className="text-[10px] font-bold text-slate-500 mb-1 whitespace-nowrap">{r.label}</span>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(r.val / 5) * 100}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <section className="space-y-6 flex flex-col xl:flex-row gap-6 relative min-h-[80vh]">
            {/* 좌측: 컨트롤 입력 폼 (인쇄 시 숨김) */}
            <div className="w-full xl:w-[350px] shrink-0 glass-card p-6 flex flex-col gap-6 no-print h-fit sticky top-6 mb-8">
                <header className="border-b pb-3">
                    <h2 className="text-xl font-black text-slate-800">안내문 설정</h2>
                    <p className="text-xs text-slate-500 mt-1 font-bold">환자 정보 및 렌즈 추천 옵션을 설정합니다.</p>
                </header>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400">환자 정보</label>
                        <input type="text" placeholder="환자 성함" className="input-base" value={patientInfo.name} onChange={e => setPatientInfo({...patientInfo, name: e.target.value})} />
                        <input type="text" placeholder="등록번호" className="input-base" value={patientInfo.regNo} onChange={e => setPatientInfo({...patientInfo, regNo: e.target.value})} />
                        <select className="input-base bg-white" value={patientInfo.eye} onChange={e => setPatientInfo({...patientInfo, eye: e.target.value})}>
                            <option>우안 (OD)</option>
                            <option>좌안 (OS)</option>
                            <option>양안 (OU)</option>
                        </select>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <label className="text-xs font-bold text-slate-400">의학적 선택 가능 렌즈 (출력됨)</label>
                        <div className="flex flex-col gap-2">
                            {IOL_DATA.map(iol => (
                                <label key={iol.id} className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-700">
                                    <input type="checkbox" checked={selectedIols.includes(iol.id)} onChange={() => toggleIol(iol.id)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    {iol.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    {selectedIols.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                            <label className="text-xs font-bold text-slate-400">가장 추천하는 렌즈 (Best Option 도장)</label>
                            <select className="input-base bg-white" value={bestIol} onChange={e => setBestIol(e.target.value)}>
                                <option value="">--- 선택 안 함 ---</option>
                                {IOL_DATA.filter(iol => selectedIols.includes(iol.id)).map(iol => (
                                    <option key={iol.id} value={iol.id}>{iol.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2 pt-4 border-t">
                        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-700">
                            <input type="checkbox" checked={toricNeeded} onChange={e => setToricNeeded(e.target.checked)} className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500" />
                            난시 교정 (Toric) 필요
                        </label>
                        <p className="text-[10px] text-slate-400 font-bold ml-6 leading-relaxed">체크 시 안내문 하단에 난시 교정의 필요성에 대한 안내 문구가 추가됩니다.</p>
                    </div>

                    <div className="pt-6">
                        <button onClick={handlePrint} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                            <i className="fa-solid fa-print"></i>
                            안내문 인쇄하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 우측: 인쇄 미리보기 레이아웃 (A4 비율 맞춤) */}
            <div className="flex-1 print-area">
                <div className="bg-white p-10 md:p-14 shadow-2xl print:shadow-none mx-auto print-page border border-slate-200 rounded-2xl print:rounded-none">
                    {/* 안내문 헤더 */}
                    <header className="border-b-4 border-slate-800 pb-6 mb-8 text-center">
                        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">백내장 수술 및 인공수정체 선택 안내문</h1>
                    </header>

                    {/* 환자 정보 */}
                    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-xl mb-8 border border-slate-200">
                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Name</span>
                                <span className="text-xl font-black text-slate-800">{patientInfo.name || "OOO"} 님</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Reg No.</span>
                                <span className="text-xl font-bold text-slate-700">{patientInfo.regNo || "_______"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Eye</span>
                                <span className="text-lg font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-0.5 rounded-lg">{patientInfo.eye}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mr-1">Date</span>
                            <p className="text-sm font-bold text-slate-600">{todayStr}</p>
                        </div>
                    </div>

                    {/* 진단 및 권고사항 */}
                    <div className="mb-8 text-slate-700 space-y-3 leading-relaxed text-[15px]">
                        <p>성공적인 백내장 수술을 위해 기존의 혼탁해진 수정체를 제거하고, <strong>새로운 인공수정체를 삽입</strong>해야 합니다.</p>
                        <p>환자분의 정밀 검사 결과를 바탕으로, 아래와 같이 <strong>가장 적합한 인공수정체 종류를 안내</strong>해 드립니다. 각 렌즈의 특징을 확인하시고 수술 전 최종적으로 어떤 렌즈를 삽입할지 결정해주시기 바랍니다.</p>
                    </div>

                    {/* 렌즈 옵션 리스트 */}
                    <div className="space-y-6 mb-8">
                        {IOL_DATA.filter(iol => selectedIols.includes(iol.id)).map(iol => {
                            const isBest = bestIol === iol.id;
                            return (
                                <div key={iol.id} className={`relative p-6 rounded-2xl border-2 transition-all ${isBest ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-white'}`}>
                                    {isBest && (
                                        <div className="absolute -top-4 -right-2 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md transform rotate-3 print:rotate-0 print:border-2 print:border-indigo-600 print:text-indigo-600 print:bg-white inset-auto print:top-4 print:right-6 print:shadow-none bg-indigo-600">
                                            <i className="fa-solid fa-thumbs-up mr-1"></i> 가장 추천 (Best Option)
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <h3 className={`text-xl font-black ${isBest ? 'text-indigo-700' : 'text-slate-800'}`}>{iol.name}</h3>
                                        {toricNeeded && (
                                            <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded inline-flex items-center gap-1 border border-amber-200">
                                                <span>+ 난시 교정(Toric) 적용</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 mb-5 leading-relaxed">{iol.desc}</p>
                                    
                                    <div className="grid grid-cols-2 gap-5 mb-5">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-black text-slate-600 mb-2 flex items-center gap-1.5">
                                                 <span className="bg-green-100 text-green-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-green-200"><i className="fa-solid fa-check"></i></span> 장점
                                            </h4>
                                            <ul className="text-xs font-bold text-slate-600 space-y-2 list-disc pl-5">
                                                {iol.pros.map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-black text-slate-600 mb-2 flex items-center gap-1.5">
                                                 <span className="bg-amber-100 text-amber-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-amber-200"><i className="fa-solid fa-exclamation"></i></span> 참고사항
                                            </h4>
                                            <ul className="text-xs font-bold text-slate-600 space-y-2 list-disc pl-5">
                                                {iol.cons.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-4">
                                        <h4 className="text-xs font-black text-slate-400 mb-2 pl-1">이 렌즈를 선택했을 시 수술 후 거리별 시력 만족도 예측</h4>
                                        <RangeBars ranges={iol.ranges} />
                                    </div>
                                </div>
                            );
                        })}
                        {selectedIols.length === 0 && (
                            <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 font-bold bg-slate-50">
                                <i className="fa-solid fa-clipboard-list text-4xl mb-3 text-slate-300"></i>
                                <p>좌측 안내문 설정에서 렌즈 옵션을 하나 이상 선택해주세요.</p>
                            </div>
                        )}
                    </div>

                    {toricNeeded && (
                        <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl relative overflow-hidden">
                            <h4 className="text-[15px] font-black text-amber-900 mb-2 flex items-center gap-2">
                                <i className="fa-solid fa-eye text-amber-600"></i> 난시 교정(Toric) 추가 안내
                            </h4>
                            <p className="text-[13px] font-bold text-amber-800/80 leading-relaxed">
                                환자분은 각막 난시가 동반되어 있어, 일반 인공수정체 삽입 시 수술 후에도 난시성 안경 착용이 필요할 수 있습니다. 
                                위에서 선택하시는 렌즈에 <strong>'난시 교정 기능(Toric)'</strong>을 추가로 적용하여 수술 후 선명도를 높이고 안경 의존도를 더욱 낮출 수 있습니다. 주치의 상담 시 상의 바랍니다.
                            </p>
                        </div>
                    )}

                    <div className="border-t-[3px] border-slate-800 pt-6 mt-16 flex justify-between items-end pb-8">
                        <div className="text-[11px] font-bold text-slate-400 leading-relaxed">
                            <span className="text-indigo-400">*</span> 본 안내문은 환자분의 직관적인 이해를 돕기 위한 참고자료이며,<br/>최종 수술 결과는 눈 상태에 따라 개인차가 있을 수 있습니다.
                        </div>
                        <div className="text-base font-black text-slate-800 flex items-end gap-3">
                            <span className="mb-1">주치의 서명 :</span>
                            <div className="w-40 border-b-2 border-slate-400"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
