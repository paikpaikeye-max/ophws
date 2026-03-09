'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import LogoutButton from '@/components/LogoutButton'

export default function PendingPage() {
    const [userName, setUserName] = useState('')
    const [copied, setCopied] = useState(false)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('name')
                    .eq('id', user.id)
                    .single()
                if (data) setUserName(data.name)
            }
        }
        fetchProfile()
    }, [supabase])

    const copyToClipboard = () => {
        const adminEmail = 'kidogu@naver.com'
        navigator.clipboard.writeText(adminEmail).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center relative overflow-hidden">
                {/* Volatile Success Message */}
                <div className={`
                    absolute top-0 left-0 w-full bg-blue-600 text-white text-xs py-2 transition-all duration-300 transform font-bold
                    ${copied ? 'translate-y-0' : '-translate-y-full'}
                `}>
                    이메일 주소 복사됨!
                </div>

                <div className="text-5xl mb-6 animate-pulse">⏳</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {userName ? `${userName}님, ` : ''}승인 대기 중입니다
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    관리자가 가입 신청을 확인하고 승인해야<br />
                    일정표에 접근할 수 있습니다. 조금만 기다려주세요!
                </p>

                <div className="flex justify-center mb-10">
                    <LogoutButton />
                </div>

                <div className="flex items-center justify-center flex-wrap gap-x-1 gap-y-2 text-gray-600 dark:text-gray-400 text-sm">
                    <span>가입 승인 지연시</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">kidogu@naver.com</span>
                    <button
                        onClick={copyToClipboard}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        title="이메일 주소 복사"
                    >
                        <svg
                            className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <span>으로 연락 주세요</span>
                </div>
            </div>
        </div>
    )
}
