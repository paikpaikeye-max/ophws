import { DEFAULT_ASSISTANT_CONFIG } from './assistantConstants';

// ─── 전역 Config 로드 ───────────────────────────────────────
// assistant_global_config 테이블에서 전역 설정을 로드합니다.
// 테이블이 비어있으면 DEFAULT_ASSISTANT_CONFIG를 삽입 후 반환합니다.
export async function loadGlobalConfig(client) {
    const { data, error } = await client
        .from('assistant_global_config')
        .select('*')
        .order('version', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        // 테이블이 비어있는 경우 → 기본값 삽입
        const { data: inserted, error: insertErr } = await client
            .from('assistant_global_config')
            .insert({ config: DEFAULT_ASSISTANT_CONFIG, version: 1 })
            .select()
            .single();

        if (insertErr) {
            console.warn('[assistantConfig] 전역 config 삽입 실패, 로컬 기본값 사용:', insertErr.message);
            return { config: DEFAULT_ASSISTANT_CONFIG, version: 0 };
        }
        return { config: inserted.config, version: inserted.version };
    }

    return { config: data.config, version: data.version };
}

// ─── 개인 오버라이드 로드 ───────────────────────────────────
// user_profiles.assistant_config에서 사용자별 오버라이드를 로드합니다.
export async function loadUserOverrides(client, userId) {
    if (!userId) return { overrides: {}, baseVersion: 0 };

    const { data, error } = await client
        .from('user_profiles')
        .select('assistant_config')
        .eq('id', userId)
        .single();

    if (error || !data?.assistant_config) {
        return { overrides: {}, baseVersion: 0 };
    }

    const cfg = data.assistant_config;
    return {
        overrides: cfg,
        baseVersion: cfg._baseVersion || 0
    };
}

// ─── Config 머지 ────────────────────────────────────────────
// 전역 config에 개인 오버라이드를 적용하여 최종 config를 생성합니다.
export function mergeConfig(globalConfig, userOverrides) {
    if (!userOverrides || Object.keys(userOverrides).length === 0) {
        return { ...globalConfig };
    }

    const merged = { ...globalConfig };

    // 개인 오버라이드 가능 필드
    if (userOverrides.hospRate !== undefined) merged.hospRate = userOverrides.hospRate;
    if (userOverrides.dateFormat !== undefined) merged.dateFormat = userOverrides.dateFormat;
    if (userOverrides.injFee !== undefined) merged.injFee = userOverrides.injFee;
    if (userOverrides.featureVisibility !== undefined) {
        merged.featureVisibility = {
            ...globalConfig.featureVisibility,
            ...userOverrides.featureVisibility,
        };
    }
    if (userOverrides.drugs && userOverrides.drugs.length > 0) merged.drugs = userOverrides.drugs;
    if (userOverrides.matrix && Object.keys(userOverrides.matrix).length > 0) merged.matrix = userOverrides.matrix;

    return merged;
}

// ─── 전역 업데이트 적용 ─────────────────────────────────────
export function applyGlobalUpdate(userConfig, newGlobal) {
    const updated = { ...userConfig };

    // matrix, injFee, IOL 데이터는 전역값으로 교체 (기본 정책)
    updated.matrix = newGlobal.matrix;
    updated.injFee = newGlobal.injFee;
    updated.featureVisibility = {
        ...newGlobal.featureVisibility,
        ...userConfig.featureVisibility,
    };

    // drugs: 가격/지원금만 전역에서 갱신, 색상/순서는 유지
    if (updated.drugs && updated.drugs.length > 0) {
        const globalDrugMap = {};
        newGlobal.drugs.forEach(d => { globalDrugMap[d.name] = d; });

        updated.drugs = updated.drugs.map(userDrug => {
            const gd = globalDrugMap[userDrug.name];
            if (gd) {
                return {
                    ...userDrug,
                    price: gd.price,
                    payR: gd.payR,
                    payN: gd.payN,
                    is50: gd.is50,
                    hasProgram: gd.hasProgram
                };
            }
            return userDrug;
        });

        // 전역에 새로 추가된 약제가 있으면 맨 뒤에 추가
        const userDrugNames = new Set(updated.drugs.map(d => d.name));
        newGlobal.drugs.forEach(gd => {
            if (!userDrugNames.has(gd.name)) {
                updated.drugs.push({ ...gd });
            }
        });
    }

    return updated;
}

// ─── 개인 Config 저장 ───────────────────────────────────────
// user_profiles.assistant_config에 개인 오버라이드를 저장합니다.
export async function saveUserConfig(client, userId, overrides, globalVersion) {
    if (!userId) return { success: false, error: 'No user ID' };

    const dataToSave = {
        ...overrides,
        _baseVersion: globalVersion || 0
    };

    const { error } = await client
        .from('user_profiles')
        .update({ assistant_config: dataToSave })
        .eq('id', userId);

    if (error) {
        console.error('[assistantConfig] 저장 실패:', error.message);
        return { success: false, error: error.message };
    }

    return { success: true };
}

// ─── 통합 로드 ──────────────────────────────────────────────
// 전역 + 개인 설정을 한번에 로드하여 머지된 config를 반환합니다.
export async function loadMergedConfig(client, userId) {
    const { config: globalConfig, version: globalVersion } = await loadGlobalConfig(client);
    const { overrides, baseVersion } = await loadUserOverrides(client, userId);
    const merged = mergeConfig(globalConfig, overrides);

    return {
        config: merged,
        globalConfig,
        globalVersion,
        baseVersion,
        hasUpdate: globalVersion > baseVersion && baseVersion > 0
    };
}

// ─── 전역 Config 배포 (Admin 전용) ──────────────────────────
// assistant_global_config에 새로운 버전으로 전역 설정을 배포합니다.
export async function deployGlobalConfig(client, newConfig, currentVersion) {
    const nextVersion = (currentVersion || 0) + 1;
    
    // DB에 새로운 버전 insert
    const { error } = await client
        .from('assistant_global_config')
        .insert({
            version: nextVersion,
            config: newConfig
        });

    if (error) {
        console.error('[assistantConfig] 전역 배포 실패:', error.message);
        return { success: false, error: error.message };
    }

    return { success: true, newVersion: nextVersion };
}
