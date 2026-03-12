export const DEFAULT_ASSISTANT_CONFIG = {
    hospRate: 0.6,
    injFee: 124241,
    dateFormat: "YYYY-MM-DD",
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
