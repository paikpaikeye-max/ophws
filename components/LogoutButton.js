'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LogoutButton() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const handleLogout = async () => {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signOut()
            if (error) throw error

            // Refresh router and push to login page
            router.refresh()
            router.push('/login')
        } catch (error) {
            console.error('Error logging out:', error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
            {loading ? '로그아웃 중...' : '로그아웃'}
        </button>
    )
}
