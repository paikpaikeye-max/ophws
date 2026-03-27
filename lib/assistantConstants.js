export const DIAGS = ["AMD", "DME", "BRVO", "CRVO", "mCNV", "Uveitis"];

export const HOSP_LABELS = {
    "0.6": "상급종합",
    "0.5": "종합병원",
    "0.4": "안과병원",
    "0.3": "의원"
};

export const DATE_FORMATS = [
    { value: "YYYY-MM-DD", label: "2025-12-12" },
    { value: "YYYY.MM.DD", label: "2025.12.12" },
    { value: "YYYY/MM/DD", label: "2025/12/12" },
    { value: "YY-MM-DD", label: "25-12-12" },
    { value: "YY.MM.DD", label: "25.12.12" },
    { value: "YY/MM/DD", label: "25/12/12" },
];

export const ASSISTANT_FEATURE_REGISTRY = [
    {
        id: "schedule",
        navLabel: "주사 일정 계산",
        settingsTabId: "sched-set",
        settingsTitle: "주사 일정 계산",
        icon: "fa-calendar-alt",
        deployOptions: [
            { id: "visibility", label: "기능 사용 상태", description: "이 기능을 좌측 툴바에 보이게 할지 기본값을 정합니다." },
            { id: "dateFormat", label: "날짜 출력 형식", description: "주사 일정 계산 결과의 날짜 표시 형식을 기본값으로 배포합니다." },
        ],
        settingSourceHint: "개인 설정 저장 시 현재 계정의 날짜 형식과 표시 여부만 바뀝니다.",
        supportsExternalPreset: true,
    },
    {
        id: "cost",
        navLabel: "주사 비용 계산기",
        settingsTabId: "cost-set",
        settingsTitle: "주사 비용 계산기",
        icon: "fa-coins",
        deployOptions: [
            { id: "visibility", label: "기능 사용 상태", description: "이 기능을 좌측 툴바에 보이게 할지 기본값을 정합니다." },
            { id: "institution", label: "기관 분류 및 시술료", description: "기관 분류와 시술료 원가 기본값을 배포합니다." },
            { id: "drugCatalog", label: "주사제 목록", description: "약제명, 정렬 순서, 색상 같은 목록 구성을 배포합니다." },
            { id: "drugPricing", label: "주사제 별 가격 및 지원금액", description: "원가, 급여지원, 비급지원, 50% 여부, 프로그램 여부를 배포합니다." },
            { id: "coverageMatrix", label: "허가 / 급여 기준", description: "진단별 허가 및 급여 매트릭스를 배포합니다." },
        ],
        settingSourceHint: "개인 설정 저장 시 현재 계정의 약제 목록과 비용 기준이 저장됩니다.",
        supportsExternalPreset: true,
    },
    {
        id: "risk",
        navLabel: "AMD 진행 위험 평가",
        settingsTabId: "risk-set",
        settingsTitle: "AMD 진행 위험 평가",
        icon: "fa-chart-line",
        deployOptions: [
            { id: "visibility", label: "기능 사용 상태", description: "이 기능을 좌측 툴바에 보이게 할지 기본값을 정합니다." },
        ],
        settingSourceHint: "현재는 표시 여부만 계정별로 저장됩니다.",
        supportsExternalPreset: false,
    },
    {
        id: "iol",
        navLabel: "인공수정체 안내문",
        settingsTabId: "iol-set",
        settingsTitle: "인공수정체 안내문",
        icon: "fa-compact-disc",
        deployOptions: [
            { id: "visibility", label: "기능 사용 상태", description: "이 기능을 좌측 툴바에 보이게 할지 기본값을 정합니다." },
        ],
        settingSourceHint: "현재는 표시 여부만 계정별로 저장됩니다.",
        supportsExternalPreset: false,
    },
];

export const ASSISTANT_FEATURES = ASSISTANT_FEATURE_REGISTRY.map(feature => ({
    id: feature.id,
    label: feature.navLabel,
    icon: feature.icon,
}));

export const ASSISTANT_SETTINGS_TABS = ASSISTANT_FEATURE_REGISTRY.map(feature => ({
    id: feature.settingsTabId,
    title: feature.settingsTitle,
    featureId: feature.id,
}));

export const ASSISTANT_DEPLOY_OPTIONS = Object.fromEntries(
    ASSISTANT_FEATURE_REGISTRY.map(feature => [feature.id, feature.deployOptions])
);

export const DEFAULT_FEATURE_VISIBILITY = Object.fromEntries(
    ASSISTANT_FEATURE_REGISTRY.map(feature => [feature.id, true])
);

export const DEFAULT_DEPLOY_SELECTIONS = Object.fromEntries(
    ASSISTANT_FEATURE_REGISTRY.map(feature => [
        feature.id,
        Object.fromEntries(feature.deployOptions.map(option => [option.id, true]))
    ])
);

export const ASSISTANT_SETTINGS_SOURCE_HINTS = Object.fromEntries(
    ASSISTANT_FEATURE_REGISTRY.map(feature => [feature.id, feature.settingSourceHint])
);

export const ASSISTANT_EXTERNAL_PRESET_SUPPORT = Object.fromEntries(
    ASSISTANT_FEATURE_REGISTRY.map(feature => [feature.id, feature.supportsExternalPreset])
);

export const DEFAULT_ASSISTANT_CONFIG = {
    hospRate: 0.6,
    injFee: 124241,
    dateFormat: "YYYY-MM-DD",
    featureVisibility: DEFAULT_FEATURE_VISIBILITY,
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
        AMD: { Avastin: "X", Lucentis: "R", Eylea: "R", Vabysmo: "R", Beovu: "R", Ozurdex: "X", Maqaid: "X", Amelivu: "R", Afilivu: "R", Eydenzelt: "R", "HD Eylea": "R" },
        DME: { Avastin: "X", Lucentis: "R", Eylea: "R", Vabysmo: "R", Beovu: "R", Ozurdex: "R", Maqaid: "R", Amelivu: "R", Afilivu: "R", Eydenzelt: "R", "HD Eylea": "R" },
        BRVO: { Avastin: "X", Lucentis: "R", Eylea: "R", Vabysmo: "R", Beovu: "X", Ozurdex: "R", Maqaid: "X", Amelivu: "R", Afilivu: "R", Eydenzelt: "R", "HD Eylea": "X" },
        CRVO: { Avastin: "X", Lucentis: "O", Eylea: "O", Vabysmo: "O", Beovu: "X", Ozurdex: "O", Maqaid: "X", Amelivu: "O", Afilivu: "O", Eydenzelt: "O", "HD Eylea": "X" },
        mCNV: { Avastin: "X", Lucentis: "R", Eylea: "R", Vabysmo: "X", Beovu: "X", Ozurdex: "X", Maqaid: "X", Amelivu: "R", Afilivu: "R", Eydenzelt: "R", "HD Eylea": "X" },
        Uveitis: { Ozurdex: "R", Lucentis: "X", Eylea: "X", Vabysmo: "X", Beovu: "X", Maqaid: "X", Amelivu: "X", Afilivu: "X", Eydenzelt: "X", "HD Eylea": "X" }
    }
};
