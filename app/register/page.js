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
        department: '부산백병원 안과',
        employee_id: '',
        introduction: '',
        contact: '',
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
                    else if (data.status === 'approved' || data.status === 'editor' || data.status === 'admin') router.push('/')
                }
            }
        }
        checkUser()
    }, [router, supabase])

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 유효성 검사
        if (formData.department === '부산백병원 안과' && !formData.employee_id) {
            alert('사번을 입력해주세요.');
            return;
        }
        if (formData.department === '기타' && !formData.introduction) {
            alert('자기소개를 입력해주세요.');
            return;
        }

        setLoading(true)

        try {
            const { error: insertError } = await supabase.from('user_profiles').upsert([
                {
                    id: userReq.id,
                    email: userReq.email,
                    name: formData.name,
                    department: formData.department,
                    employee_id: formData.department === '부산백병원 안과' ? formData.employee_id : null,
                    introduction: formData.department === '기타' ? formData.introduction : null,
                    contact: formData.department === '기타' ? formData.contact : null,
                    memo: formData.memo,
                    status: 'pending'
                }
            ], { onConflict: 'id' })

            if (insertError) throw insertError

            router.push('/pending')
        } catch (error) {
            console.error('Error saving profile:', error.message)
            alert('가입 신청 중 오류가 발생했습니다.\n이미 가입된 계정이거나 승인 거절된 경우일 수 있습니다.')
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="홍길동"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">소속</label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`
                                flex items-center justify-center px-3 py-3 rounded-lg border cursor-pointer transition-all
                                ${formData.department === '부산백병원 안과'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}
                            `}>
                                <input
                                    type="radio"
                                    name="department"
                                    value="부산백병원 안과"
                                    checked={formData.department === '부산백병원 안과'}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="sr-only"
                                />
                                <span className="text-sm font-bold">부산백병원 안과</span>
                            </label>
                            <label className={`
                                flex items-center justify-center px-3 py-3 rounded-lg border cursor-pointer transition-all
                                ${formData.department === '기타'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}
                            `}>
                                <input
                                    type="radio"
                                    name="department"
                                    value="기타"
                                    checked={formData.department === '기타'}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="sr-only"
                                />
                                <span className="text-sm font-bold">기타</span>
                            </label>
                        </div>
                    </div>

                    {formData.department === '부산백병원 안과' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">사번 (필수)</label>
                            <input
                                required
                                type="text"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="사번 입력"
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">자기소개 (필수)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.introduction}
                                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="전공의, 간호사 등 직함 포함"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">연락처</label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="010-0000-0000"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">남길 메모 (선택)</label>
                        <textarea
                            value={formData.memo}
                            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows="2"
                            placeholder="관리자에게 전달할 메모"
                        ></textarea>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white rounded-md py-3 font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-md"
                        >
                            {loading ? '제출 중...' : '가입 신청하기'}
                        </button>
                        <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
                            가입 승인 지연시 kidogu@naver.com 으로 연락 주세요
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
