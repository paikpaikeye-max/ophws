'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setUsers(data)
        }
        setLoading(false)
    }

    const handleUpdateStatus = async (userId, newStatus) => {
        if (!confirm(`정말로 이 사용자를 '${newStatus}' 상태로 변경하시겠습니까?`)) return

        const { error } = await supabase
            .from('user_profiles')
            .update({ status: newStatus })
            .eq('id', userId)

        if (!error) {
            alert('변경되었습니다.')
            fetchUsers()
        } else {
            alert('오류가 발생했습니다.')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Admin Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">사용자 가입 승인 및 권한 관리</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="text-sm text-blue-600 font-bold hover:underline">
                            ← 메인 일정표로
                        </button>
                        <LogoutButton />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">사용자 목록</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">이름</th>
                                    <th className="px-6 py-4 font-semibold">이메일</th>
                                    <th className="px-6 py-4 font-semibold">소속 / 사번</th>
                                    <th className="px-6 py-4 font-semibold">메모</th>
                                    <th className="px-6 py-4 font-semibold">가입일</th>
                                    <th className="px-6 py-4 font-semibold">상태</th>
                                    <th className="px-6 py-4 font-semibold text-right">관리액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                            불러오는 중...
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                            가입된 사용자가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                                {user.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-800 dark:text-slate-200 font-medium">{user.department}</div>
                                                <div className="text-xs text-slate-500">{user.employee_id || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[150px] truncate text-slate-600 dark:text-slate-400" title={user.memo}>
                                                    {user.memo || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                                    ${user.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                                                    ${user.status === 'editor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                                                    ${user.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse' : ''}
                                                    ${user.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                                                    ${user.status === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                                                `}>
                                                    {user.status === 'approved' ? '열람만' : user.status === 'editor' ? '편집자' : user.status === 'admin' ? '관리자' : user.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {user.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'approved')}
                                                            className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            승인 (열람)
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'editor')}
                                                            className="text-white bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            승인 (편집)
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'rejected')}
                                                            className="text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            거절
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'approved' && (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'editor')}
                                                            className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            편집자로 승격
                                                        </button>
                                                    </div>
                                                )}
                                                {user.status === 'editor' && (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'approved')}
                                                            className="text-slate-500 hover:text-slate-700 text-xs underline"
                                                        >
                                                            열람만으로 변경
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(user.id, 'admin')}
                                                            className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            관리자 부여
                                                        </button>
                                                    </div>
                                                )}
                                                {user.status === 'admin' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(user.id, 'editor')}
                                                        className="text-slate-500 hover:text-slate-700 text-xs underline"
                                                    >
                                                        관리자 해제
                                                    </button>
                                                )}
                                                {user.status === 'rejected' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(user.id, 'pending')}
                                                        className="text-slate-500 hover:text-slate-700 text-xs underline"
                                                    >
                                                        다시 검토
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
