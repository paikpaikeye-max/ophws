import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function createAuthClient(request) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll() {
                    // read-only route
                },
            },
        }
    );
}

function createAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return null;
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

async function getAuthorizedUser(request) {
    const authClient = createAuthClient(request);
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
        return { error: '로그인이 필요합니다.', status: 401 };
    }

    const { data: profile, error: profileError } = await authClient
        .from('user_profiles')
        .select('status')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: '사용자 권한을 확인할 수 없습니다.', status: 403 };
    }

    if (!['approved', 'editor', 'admin'].includes(profile.status)) {
        return { error: '이 기능을 사용할 권한이 없습니다.', status: 403 };
    }

    return { user, status: profile.status };
}

export async function GET(request) {
    const auth = await getAuthorizedUser(request);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
        return NextResponse.json(
            { error: '서버에 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.' },
            { status: 500 }
        );
    }

    const { data, error } = await adminClient
        .from('user_profiles')
        .select('id, name, email, status')
        .in('status', ['approved', 'editor', 'admin'])
        .neq('id', auth.user.id)
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
}

export async function POST(request) {
    const auth = await getAuthorizedUser(request);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
        return NextResponse.json(
            { error: '서버에 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.' },
            { status: 500 }
        );
    }

    const body = await request.json().catch(() => null);
    const targetUserId = body?.targetUserId;

    if (!targetUserId) {
        return NextResponse.json({ error: '대상 사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const { data, error } = await adminClient
        .from('user_profiles')
        .select('id, name, email, status, assistant_config')
        .eq('id', targetUserId)
        .in('status', ['approved', 'editor', 'admin'])
        .single();

    if (error || !data) {
        return NextResponse.json({ error: '선택한 사용자 설정을 불러오지 못했습니다.' }, { status: 404 });
    }

    return NextResponse.json({
        user: {
            id: data.id,
            name: data.name,
            email: data.email,
            status: data.status,
        },
        assistantConfig: data.assistant_config || {},
    });
}
