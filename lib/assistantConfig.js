import { DEFAULT_ASSISTANT_CONFIG, DIAGS } from './assistantConstants';

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function cloneDrug(drug = {}) {
    return {
        name: drug.name || '',
        price: Number(drug.price) || 0,
        payR: Number(drug.payR) || 0,
        payN: Number(drug.payN) || 0,
        is50: Boolean(drug.is50),
        hasProgram: Boolean(drug.hasProgram),
        color: drug.color || '#1e293b',
    };
}

function normalizeFeatureVisibility(featureVisibility) {
    return {
        ...deepClone(DEFAULT_ASSISTANT_CONFIG.featureVisibility),
        ...(featureVisibility || {}),
    };
}

function normalizeDrugs(drugs) {
    if (!Array.isArray(drugs) || drugs.length === 0) {
        return deepClone(DEFAULT_ASSISTANT_CONFIG.drugs);
    }

    return drugs.map(cloneDrug);
}

function normalizeMatrix(matrix, drugs) {
    const normalized = deepClone(DEFAULT_ASSISTANT_CONFIG.matrix);

    if (matrix && typeof matrix === 'object') {
        Object.entries(matrix).forEach(([diag, entries]) => {
            normalized[diag] = { ...(normalized[diag] || {}), ...(entries || {}) };
        });
    }

    const drugNames = drugs.map(drug => drug.name);
    DIAGS.forEach(diag => {
        const current = { ...(normalized[diag] || {}) };
        drugNames.forEach(drugName => {
            if (current[drugName] === undefined) {
                current[drugName] = 'X';
            }
        });
        normalized[diag] = current;
    });

    return normalized;
}

export function normalizeAssistantConfig(config) {
    const base = deepClone(DEFAULT_ASSISTANT_CONFIG);
    if (!config || typeof config !== 'object') {
        return base;
    }

    const normalized = {
        ...base,
        hospRate: config.hospRate !== undefined ? config.hospRate : base.hospRate,
        injFee: config.injFee !== undefined ? config.injFee : base.injFee,
        dateFormat: config.dateFormat || base.dateFormat,
    };

    normalized.featureVisibility = normalizeFeatureVisibility(config.featureVisibility);
    normalized.drugs = normalizeDrugs(config.drugs);
    normalized.matrix = normalizeMatrix(config.matrix, normalized.drugs);

    if (config._lastDeployMeta) {
        normalized._lastDeployMeta = deepClone(config._lastDeployMeta);
    }
    if (config._dismissedGlobalVersion !== undefined) {
        normalized._dismissedGlobalVersion = config._dismissedGlobalVersion;
    }

    return normalized;
}

export function stripInternalConfigFields(config) {
    const sanitized = normalizeAssistantConfig(config);
    delete sanitized._lastDeployMeta;
    delete sanitized._baseVersion;
    delete sanitized._dismissedGlobalVersion;
    return sanitized;
}

function mergeDrugCatalog(baseDrugs, sourceDrugs) {
    const baseMap = new Map(baseDrugs.map(drug => [drug.name, drug]));

    return sourceDrugs.map(sourceDrug => {
        const baseDrug = baseMap.get(sourceDrug.name);
        return {
            ...(baseDrug ? cloneDrug(baseDrug) : {}),
            ...cloneDrug(sourceDrug),
            price: baseDrug ? baseDrug.price : Number(sourceDrug.price) || 0,
            payR: baseDrug ? baseDrug.payR : Number(sourceDrug.payR) || 0,
            payN: baseDrug ? baseDrug.payN : Number(sourceDrug.payN) || 0,
            is50: baseDrug ? Boolean(baseDrug.is50) : Boolean(sourceDrug.is50),
            hasProgram: baseDrug ? Boolean(baseDrug.hasProgram) : Boolean(sourceDrug.hasProgram),
        };
    });
}

function mergeDrugPricing(baseDrugs, sourceDrugs) {
    const sourceMap = new Map(sourceDrugs.map(drug => [drug.name, drug]));

    return baseDrugs.map(baseDrug => {
        const sourceDrug = sourceMap.get(baseDrug.name);
        if (!sourceDrug) {
            return cloneDrug(baseDrug);
        }

        return {
            ...cloneDrug(baseDrug),
            price: Number(sourceDrug.price) || 0,
            payR: Number(sourceDrug.payR) || 0,
            payN: Number(sourceDrug.payN) || 0,
            is50: Boolean(sourceDrug.is50),
            hasProgram: Boolean(sourceDrug.hasProgram),
        };
    });
}

function applyDeploySections(baseConfig, sourceConfig, deployMeta) {
    const sections = deployMeta?.sections || [];
    const updated = normalizeAssistantConfig(baseConfig);
    const source = normalizeAssistantConfig(sourceConfig);

    if (deployMeta?.featureId === 'schedule') {
        if (sections.includes('visibility')) {
            updated.featureVisibility.schedule = source.featureVisibility.schedule;
        }
        if (sections.includes('dateFormat')) {
            updated.dateFormat = source.dateFormat;
        }
    }

    if (deployMeta?.featureId === 'cost') {
        if (sections.includes('visibility')) {
            updated.featureVisibility.cost = source.featureVisibility.cost;
        }
        if (sections.includes('institution')) {
            updated.hospRate = source.hospRate;
            updated.injFee = source.injFee;
        }
        if (sections.includes('drugCatalog')) {
            updated.drugs = mergeDrugCatalog(updated.drugs, source.drugs);
        }
        if (sections.includes('drugPricing')) {
            updated.drugs = mergeDrugPricing(updated.drugs, source.drugs);
        }
        if (sections.includes('coverageMatrix')) {
            updated.matrix = normalizeMatrix(source.matrix, updated.drugs);
        } else {
            updated.matrix = normalizeMatrix(updated.matrix, updated.drugs);
        }
    }

    if (deployMeta?.featureId === 'risk' && sections.includes('visibility')) {
        updated.featureVisibility.risk = source.featureVisibility.risk;
    }

    if (deployMeta?.featureId === 'iol' && sections.includes('visibility')) {
        updated.featureVisibility.iol = source.featureVisibility.iol;
    }

    return normalizeAssistantConfig(updated);
}

export function applyFeatureSections(baseConfig, sourceConfig, featureId, sections) {
    return applyDeploySections(baseConfig, sourceConfig, {
        featureId,
        sections,
    });
}

// assistant_global_config 테이블에서 전역 설정을 로드합니다.
// 테이블이 비어 있으면 DEFAULT_ASSISTANT_CONFIG를 삽입 후 반환합니다.
export async function loadGlobalConfig(client) {
    const { data, error } = await client
        .from('assistant_global_config')
        .select('*')
        .order('version', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        const initialConfig = normalizeAssistantConfig(DEFAULT_ASSISTANT_CONFIG);
        const { data: inserted, error: insertErr } = await client
            .from('assistant_global_config')
            .insert({ config: initialConfig, version: 1 })
            .select()
            .single();

        if (insertErr) {
            console.warn('[assistantConfig] 전역 config 초기화 실패, 로컬 기본값 사용:', insertErr.message);
            return { config: initialConfig, version: 0 };
        }
        return { config: normalizeAssistantConfig(inserted.config), version: inserted.version };
    }

    return { config: normalizeAssistantConfig(data.config), version: data.version };
}

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
        baseVersion: cfg._baseVersion || 0,
        dismissedGlobalVersion: cfg._dismissedGlobalVersion || 0
    };
}

// 전역 config에 개인 오버라이드를 적용하여 최종 config를 생성합니다.
export function mergeConfig(globalConfig, userOverrides) {
    const normalizedGlobal = normalizeAssistantConfig(globalConfig);
    if (!userOverrides || Object.keys(userOverrides).length === 0) {
        return normalizedGlobal;
    }

    const merged = normalizeAssistantConfig(normalizedGlobal);

    if (userOverrides.hospRate !== undefined) merged.hospRate = userOverrides.hospRate;
    if (userOverrides.dateFormat !== undefined) merged.dateFormat = userOverrides.dateFormat;
    if (userOverrides.injFee !== undefined) merged.injFee = userOverrides.injFee;
    if (userOverrides.featureVisibility !== undefined) {
        merged.featureVisibility = {
            ...normalizedGlobal.featureVisibility,
            ...userOverrides.featureVisibility,
        };
    }
    if (userOverrides.drugs && userOverrides.drugs.length > 0) {
        merged.drugs = normalizeDrugs(userOverrides.drugs);
    }
    if (userOverrides.matrix && Object.keys(userOverrides.matrix).length > 0) {
        merged.matrix = normalizeMatrix(userOverrides.matrix, merged.drugs);
    } else {
        merged.matrix = normalizeMatrix(merged.matrix, merged.drugs);
    }

    if (normalizedGlobal._lastDeployMeta) {
        merged._lastDeployMeta = deepClone(normalizedGlobal._lastDeployMeta);
    }

    return merged;
}

// 새 전역 업데이트를 사용자의 현재 설정에 부분 적용합니다.
export function applyGlobalUpdate(userConfig, newGlobal) {
    const normalizedUser = normalizeAssistantConfig(userConfig);
    const normalizedGlobal = normalizeAssistantConfig(newGlobal);
    const deployMeta = normalizedGlobal._lastDeployMeta;

    if (!deployMeta?.featureId || !Array.isArray(deployMeta.sections) || deployMeta.sections.length === 0) {
        return mergeConfig(normalizedGlobal, {
            hospRate: normalizedUser.hospRate,
            dateFormat: normalizedUser.dateFormat,
            injFee: normalizedUser.injFee,
            featureVisibility: normalizedUser.featureVisibility,
            drugs: normalizedUser.drugs,
            matrix: normalizedUser.matrix,
        });
    }

    const updated = applyDeploySections(normalizedUser, normalizedGlobal, deployMeta);
    updated._lastDeployMeta = deepClone(deployMeta);
    return updated;
}

// user_profiles.assistant_config에 개인 오버라이드를 저장합니다.
export async function saveUserConfig(client, userId, overrides, globalVersion, meta = {}) {
    if (!userId) return { success: false, error: 'No user ID' };

    const dataToSave = {
        ...stripInternalConfigFields(overrides),
        _baseVersion: meta.baseVersionOverride ?? globalVersion ?? 0
    };
    if (meta.dismissedGlobalVersion !== undefined) {
        dataToSave._dismissedGlobalVersion = meta.dismissedGlobalVersion;
    }

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

// 전역 + 개인 설정을 순서대로 로드하여 merged config를 반환합니다.
export async function loadMergedConfig(client, userId) {
    const { config: globalConfig, version: globalVersion } = await loadGlobalConfig(client);
    const { overrides, baseVersion, dismissedGlobalVersion } = await loadUserOverrides(client, userId);
    const merged = mergeConfig(globalConfig, overrides);
    const latestSeenVersion = Math.max(baseVersion || 0, dismissedGlobalVersion || 0);

    return {
        config: merged,
        globalConfig,
        globalVersion,
        baseVersion,
        dismissedGlobalVersion,
        hasUpdate: globalVersion > latestSeenVersion && baseVersion > 0
    };
}

// 현재 탭 기준으로 선택한 항목만 반영한 전역 설정을 새 버전으로 배포합니다.
export async function deployGlobalConfig(client, currentGlobalConfig, sourceConfig, currentVersion, deployMeta) {
    const nextVersion = (currentVersion || 0) + 1;
    const nextConfig = applyDeploySections(currentGlobalConfig, sourceConfig, deployMeta);
    nextConfig._lastDeployMeta = {
        featureId: deployMeta.featureId,
        sections: [...deployMeta.sections],
        summary: deployMeta.summary || '',
        deployedAt: new Date().toISOString(),
    };

    const { error } = await client
        .from('assistant_global_config')
        .insert({
            version: nextVersion,
            config: nextConfig
        });

    if (error) {
        console.error('[assistantConfig] 전역 배포 실패:', error.message);
        return { success: false, error: error.message };
    }

    return { success: true, newVersion: nextVersion, config: nextConfig };
}
