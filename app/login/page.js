'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Create Supabase client for browser
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            setErrorMsg('')

            // Determine the redirect URL dynamically based on the current environment
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            const redirectTo = `${origin}/auth/callback`
            const shouldSelectAccount =
                typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('switch') === '1'

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo,
                    queryParams: shouldSelectAccount ? { prompt: 'select_account' } : undefined,
                },
            })

            if (error) throw error
        } catch (error) {
            console.error('Error logging in:', error.message)
            setErrorMsg('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
        } finally {
            // The redirect will navigate away, but if it fails we stop loading
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        부산백병원 안과 워크스테이션
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        허가된 사용자만 접근할 수 있습니다.
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {errorMsg && (
                        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                            {errorMsg}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            {/* Google G Logo SVG */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        </span>
                        {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
                    </button>
                </div>
            </div>
        </div>
    )
}
