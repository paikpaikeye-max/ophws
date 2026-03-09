'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default function RejectedPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const handleReapply = async () => {
        if (!confirm('가입 정보를 다시 작성하시겠습니까?')) return
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return; }

            // 기존 프로필 삭제 → register 페이지에서 새로 작성 가능
            const { error: deleteError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id)

            if (deleteError) {
                console.error('Delete error during re-apply:', deleteError)
                alert('기존 정보를 처리하는 중 오류가 발생했습니다. (RLS 권한 확인이 필요할 수 있습니다)')
                return
            }

            router.push('/register')
        } catch (err) {
            console.error('Re-apply catch error:', err)
            alert('오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center">
                <div className="text-5xl mb-6">❌</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    가입 신청이 거절되었습니다
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    입력하신 정보가 확인되지 않아 승인이 거절되었습니다.<br />
                    정보를 정확히 수정하여 다시 신청해 주세요.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleReapply}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white rounded-md py-3 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '처리 중...' : '📝 다시 가입 신청하기'}
                    </button>
                    <div className="flex justify-center mt-2">
                        <LogoutButton />
                    </div>
                </div>
            </div>
        </div>
    )
}
