import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname.startsWith('/login')
    const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
    const isRegisterPage = request.nextUrl.pathname.startsWith('/register')
    const isPendingPage = request.nextUrl.pathname.startsWith('/pending')
    const isRejectedPage = request.nextUrl.pathname.startsWith('/rejected')

    // 1. If not logged in, redirect everything to /login
    if (!user && !isLoginPage && !isAuthCallback) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If logged in, enforce the profile setup and approval flow
    if (user && !isAuthCallback) {
        const { data: profile, error: profileError } = await supabase.from('user_profiles').select('status').eq('id', user.id).single()

        // Debug logging to trace the issue
        console.log('[Middleware]', request.nextUrl.pathname, '| user:', user.id, '| profile:', profile, '| error:', profileError?.message)

        // If there's a DB error (e.g. RLS blocking), let request pass through
        // instead of incorrectly redirecting to /register
        if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 = "0 rows" (no profile found) - that's expected for new users
            // Any other error means something went wrong, don't redirect
            console.error('[Middleware] Profile query error:', profileError)
            return supabaseResponse
        }

        if (!profile) {
            // Needs to register
            if (!isRegisterPage) {
                const url = request.nextUrl.clone()
                url.pathname = '/register'
                return NextResponse.redirect(url)
            }
        } else if (profile.status === 'pending') {
            // Registered, awaiting approval
            if (!isPendingPage) {
                const url = request.nextUrl.clone()
                url.pathname = '/pending'
                return NextResponse.redirect(url)
            }
        } else if (profile.status === 'rejected') {
            // Rejected user: allow /rejected page (for re-apply) and /register
            if (!isRejectedPage && !isRegisterPage) {
                const url = request.nextUrl.clone()
                url.pathname = '/rejected'
                return NextResponse.redirect(url)
            }
        } else if (profile.status === 'approved' || profile.status === 'editor' || profile.status === 'admin') {
            // Fully approved user. Block them from setup/login pages.
            if (isLoginPage || isRegisterPage || isPendingPage || isRejectedPage) {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }

            // Editor routes: /edit and /settings require editor or admin
            const isEditorPage = request.nextUrl.pathname.startsWith('/edit') || request.nextUrl.pathname.startsWith('/settings')
            if (isEditorPage && profile.status === 'approved') {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }

            // Admin routes: /admin requires admin
            const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
            if (isAdminPage && profile.status !== 'admin') {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
