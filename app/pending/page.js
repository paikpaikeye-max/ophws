'use client'

import LogoutButton from '@/components/LogoutButton'

export default function PendingPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center">
                <div className="text-5xl mb-6 animate-pulse">⏳</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    승인 대기 중입니다
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    관리자가 가입 신청을 확인하고 승인해야<br />
                    일정표에 접근할 수 있습니다. 조금만 기다려주세요!
                </p>
                <div className="flex justify-center">
                    <LogoutButton />
                </div>
            </div>
        </div>
    )
}
