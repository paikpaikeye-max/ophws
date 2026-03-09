'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function RegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [userReq, setUserReq] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        department: '전공의',
        employee_id: '',
        memo: ''
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUserReq(user)
                // Check if they already have a profile
                const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
                if (data) {
                    if (data.status === 'pending') router.push('/pending')
                    else if (data.status === 'approved' || data.status === 'admin') router.push('/')
                }
            }
        }
        checkUser()
    }, [router, supabase])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error: insertError } = await supabase.from('user_profiles').upsert([
                {
                    id: userReq.id,
                    email: userReq.email,
                    name: formData.name,
                    department: formData.department,
                    employee_id: formData.employee_id,
                    memo: formData.memo,
                    status: 'pending'
                }
            ], { onConflict: 'id' })

            if (insertError) throw insertError

            router.push('/pending')
        } catch (error) {
            console.error('Error saving profile:', error.message)
            alert('가입 신청 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (!userReq) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    가입 정보 입력
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="홍길동"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">소속</label>
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="전공의">전공의</option>
                            <option value="전임의">전임의</option>
                            <option value="임상강사">임상강사</option>
                            <option value="교수">교수</option>
                            <option value="간호사">간호사</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">사번 (선택)</label>
                        <input
                            type="text"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="사번 입력"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">남길 메모 (선택)</label>
                        <textarea
                            value={formData.memo}
                            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows="3"
                            placeholder="관리자에게 전달할 메모"
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '제출 중...' : '가입 신청하기'}
                    </button>
                </form>
            </div>
        </div>
    )
}
