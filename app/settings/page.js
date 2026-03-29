"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PersonnelManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profs');
  const [profs, setProfs] = useState([]);
  const [members, setMembers] = useState([]);
  const [originalData, setOriginalData] = useState({ profs: [], members: [] });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 보안 관련 상태 추가
  const [isAuthorized] = useState(true);

  // 기본 정렬: 순위 오름차순
  const [sortConfig, setSortConfig] = useState({ key: 'display_order', direction: 'ascending' });

  const [newEntry, setNewEntry] = useState({ name: '', initial: '', role: 'Resident', phone: '', email: '', display_order: 999 });

  // 인증은 middleware가 처리 -> 바로 데이터 로드
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('professors').select('*');
    const { data: mData } = await supabase.from('members').select('*');

    const sanitize = (data) => (data || []).map(item => ({
      ...item,
      phone: item.phone || '',
      email: item.email || '',
      initial: item.initial || '',
      name: item.name || '',
      display_order: item.display_order ?? 999,
      is_active: !!item.is_active,
      role: item.role || ''
    }));

    const p = sanitize(pData);
    const m = sanitize(mData);

    setProfs(p);
    setMembers(m);
    setOriginalData({ profs: JSON.parse(JSON.stringify(p)), members: JSON.parse(JSON.stringify(m)) });
    setLoading(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchData]);

  const formatPhone = (val) => {
    if (!val) return '';
    val = val.replace(/[^0-9]/g, '');
    if (val.length < 4) return val;
    if (val.length < 7) return val.replace(/(\d{3})(\d{1,})/, '$1-$2');
    if (val.length < 11) return val.replace(/(\d{3})(\d{3})(\d{1,})/, '$1-$2-$3');
    return val.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  // 정렬 로직 (편집 중 행 이동 방지 로직 포함)
  const sortedData = useMemo(() => {
    let items = activeTab === 'profs' ? [...profs] : [...members];
    const originals = activeTab === 'profs' ? originalData.profs : originalData.members;

    if (sortConfig.key) {
      items.sort((a, b) => {
        const getVal = (item) => {
          if (editingId === item.id) {
            const orig = originals.find(o => o.id === item.id);
            return orig ? orig[sortConfig.key] : item[sortConfig.key];
          }
          return item[sortConfig.key];
        };

        let aVal = getVal(a);
        let bVal = getVal(b);

        if (typeof aVal === 'boolean') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [profs, members, activeTab, sortConfig, editingId, originalData]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const saveItem = async (item) => {
    const table = activeTab === 'profs' ? 'professors' : 'members';
    const { role, initial, ...commonFields } = item;
    const payload = activeTab === 'profs'
      ? { ...commonFields, initial: item.initial }
      : { ...commonFields, role: item.role };

    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      alert("저장 실패: " + error.message);
      fetchData();
    } else {
      setOriginalData(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(o => o.id === item.id ? JSON.parse(JSON.stringify(item)) : o)
      }));
    }
  };

  const addEntry = async () => {
    const table = activeTab === 'profs' ? 'professors' : 'members';
    if (!newEntry.name) return alert("이름은 필수입니다.");

    const payload = activeTab === 'profs'
      ? { name: newEntry.name, initial: newEntry.initial, phone: newEntry.phone, email: newEntry.email, display_order: newEntry.display_order, is_active: true }
      : { name: newEntry.name, role: newEntry.role, phone: newEntry.phone, email: newEntry.email, display_order: newEntry.display_order, is_active: true };

    const { error } = await supabase.from(table).insert([payload]);
    if (error) alert("등록 실패: " + error.message);
    else {
      setNewEntry({ name: '', initial: '', role: 'Resident', phone: '', email: '', display_order: 999 });
      fetchData();
    }
  };

  const updateLocalField = (id, field, value) => {
    const setter = activeTab === 'profs' ? setProfs : setMembers;
    setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // [수정] 로딩 및 인증 상태 처리
  if (!isAuthorized) return null; // 인증 전 아무것도 노출하지 않음
  if (loading) return <div className="p-20 text-center font-bold text-slate-500">데이터 로딩 중...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight underline decoration-blue-500 underline-offset-8">인력 관리 시스템</h1>
            <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-widest mt-4">Authorized Admin Only</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="bg-white border-2 border-slate-200 px-6 py-2.5 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all text-sm">홈으로</Link>
            <Link href="/edit" className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all text-sm">배치표 편집 이동</Link>
          </div>
        </header>

        {/* 신규 등록 */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">이름</span>
            <input className="input-style" placeholder="이름" value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">{activeTab === 'profs' ? '이니셜' : '직군'}</span>
            {activeTab === 'profs' ? (
              <input className="input-style uppercase" placeholder="알파벳 이니셜" value={newEntry.initial} onChange={e => setNewEntry({ ...newEntry, initial: e.target.value })} />
            ) : (
              <select className="input-style bg-white" value={newEntry.role} onChange={e => setNewEntry({ ...newEntry, role: e.target.value })}>
                <option value="Resident">전공의</option>
                <option value="PA">PA</option>
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">순위</span>
            <input type="number" className="input-style" value={newEntry.display_order} onChange={e => setNewEntry({ ...newEntry, display_order: parseInt(e.target.value) || 999 })} />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">연락처 및 이메일</span>
            <div className="flex gap-2">
              <input className="input-style flex-1" placeholder="전화번호" value={newEntry.phone} onChange={e => setNewEntry({ ...newEntry, phone: formatPhone(e.target.value) })} />
              <input className="input-style flex-1" placeholder="이메일" value={newEntry.email} onChange={e => setNewEntry({ ...newEntry, email: e.target.value })} />
            </div>
          </div>
          <button onClick={addEntry} className="bg-slate-800 text-white h-[48px] rounded-xl font-bold hover:bg-black transition-all active:scale-95">신규 등록</button>
        </section>

        {/* 리스트 영역 */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-50 border-b">
            <button onClick={() => { setActiveTab('profs'); setEditingId(null); }} className={`flex-1 py-4 font-black text-sm transition-all ${activeTab === 'profs' ? 'text-blue-600 bg-white border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>교수 명단</button>
            <button onClick={() => { setActiveTab('members'); setEditingId(null); }} className={`flex-1 py-4 font-black text-sm transition-all ${activeTab === 'members' ? 'text-blue-600 bg-white border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>전공의 / PA 명단</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('display_order')}>
                    순위 {sortConfig.key === 'display_order' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                    이름 {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort(activeTab === 'profs' ? 'initial' : 'role')}>
                    {activeTab === 'profs' ? '이니셜' : '직군'} {sortConfig.key === (activeTab === 'profs' ? 'initial' : 'role') && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </th>
                  <th className="p-4">전화번호</th>
                  <th className="p-4">이메일</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-center">편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.is_active ? 'bg-slate-50/50 opacity-60' : ''}`}>
                    <td className="p-4 w-20">
                      {editingId === item.id ? <input type="number" className="edit-input w-full" value={item.display_order} onChange={e => updateLocalField(item.id, 'display_order', parseInt(e.target.value) || 0)} /> : <span className="font-mono font-bold text-blue-600">{item.display_order}</span>}
                    </td>
                    <td className="p-4 font-bold">
                      {editingId === item.id ? <input autoFocus className="edit-input w-full" value={item.name} onChange={e => updateLocalField(item.id, 'name', e.target.value)} /> : item.name}
                    </td>
                    <td className="p-4">
                      {editingId === item.id ? (
                        activeTab === 'profs' ? <input className="edit-input w-full uppercase" value={item.initial} onChange={e => updateLocalField(item.id, 'initial', e.target.value)} />
                          : <select className="edit-input w-full bg-blue-50" value={item.role} onChange={e => updateLocalField(item.id, 'role', e.target.value)}><option value="Resident">Resident</option><option value="PA">PA</option></select>
                      ) : (activeTab === 'profs' ? <span className="font-mono font-bold text-slate-500">{item.initial}</span> : <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md font-bold">{item.role}</span>)}
                    </td>
                    <td className="p-4 font-mono text-sm text-slate-500">
                      {editingId === item.id ? <input className="edit-input w-full" value={item.phone} onChange={e => updateLocalField(item.id, 'phone', formatPhone(e.target.value))} /> : item.phone}
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {editingId === item.id ? <input className="edit-input w-full" value={item.email} onChange={e => updateLocalField(item.id, 'email', e.target.value)} /> : item.email}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            const nextItem = { ...item, is_active: !item.is_active };
                            updateLocalField(item.id, 'is_active', !item.is_active);
                            saveItem(nextItem);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner ${item.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => { if (editingId === item.id) saveItem(item); setEditingId(editingId === item.id ? null : item.id); }} className="text-xl transition-transform active:scale-90">{editingId === item.id ? '✅' : '✏️'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style jsx>{`
        .input-style { width: 100%; padding: 0.75rem; border-radius: 0.75rem; border: 2px solid #e2e8f0; font-weight: 700; font-size: 0.875rem; outline: none; transition: all 0.2s; }
        .input-style:focus { border-color: #2563eb; background: white; }
        .edit-input { padding: 0.25rem; border-bottom: 2px solid #3b82f6; outline: none; background: #eff6ff; font-weight: 700; color: #1e293b; }
      `}</style>
    </div>
  );
}
