'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function GlobalAccountWidget() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [switching, setSwitching] = useState(false)
    const [account, setAccount] = useState(null)

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), [])

    useEffect(() => {
        let cancelled = false

        async function loadAccount() {
            setLoading(true)

            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    if (!cancelled) setAccount(null)
                    return
                }

                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('name, status')
                    .eq('id', user.id)
                    .single()

                if (!cancelled) {
                    setAccount({
                        email: user.email || '',
                        name: profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
                        status: profile?.status || ''
                    })
                }
            } catch (error) {
                console.warn('GlobalAccountWidget load failed:', error)
                if (!cancelled) setAccount(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadAccount()

        return () => {
            cancelled = true
        }
    }, [supabase])

    const handleSwitchAccount = async () => {
        try {
            setSwitching(true)
            const { error } = await supabase.auth.signOut()
            if (error) throw error

            router.refresh()
            router.push('/login?switch=1')
        } catch (error) {
            console.error('Switch account failed:', error.message)
        } finally {
            setSwitching(false)
        }
    }

    if (loading || !account) {
        return null
    }

    return (
        <div className="w-full max-w-md">
            <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-4 shadow-md">
                <div className="flex items-center gap-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                        {(account.name || account.email || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                            {account.name || 'Signed-in user'}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            {account.email}
                        </p>
                        {account.status && (
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-blue-600">
                                {account.status}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSwitchAccount}
                    disabled={switching}
                    className="mt-3 w-full rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {switching ? '로그아웃 중...' : '로그아웃'}
                </button>
            </div>
        </div>
    )
}
