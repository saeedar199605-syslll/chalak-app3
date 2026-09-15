/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Monitor, 
  Clock, 
  AlertOctagon, 
  Flame, 
  Activity, 
  Search, 
  CheckCircle2, 
  MousePointer, 
  Keyboard, 
  Send, 
  TrendingUp, 
  Layers, 
  BarChart3, 
  Check, 
  Plus,
  Edit2,
  Trash2,
  Save,
} from 'lucide-react';
import { 
  Employee, 
  WorkdayActivityRecord, 
  LiveEmployeeActivity, 
  KickidlerViolation, 
  KickidlerLiveStatus 
} from '../types';
import { 
  INITIAL_KICKIDLER_RECORDS, 
  INITIAL_LIVE_ACTIVITIES, 
  INITIAL_VIOLATIONS 
} from '../data/latticeKickidlerSeed';

interface KickidlerProductivityHubProps {
  currentUser: Employee;
  employees: Employee[];
  theme?: 'dark' | 'light';
  onNavigate?: (tab: string) => void;
}

export default function KickidlerProductivityHub({
  currentUser,
  employees,
  theme = 'dark'
}: KickidlerProductivityHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'live_grid' | 'time_breakdown' | 'violations' | 'burnout'>('live_grid');

  const [liveActivities, setLiveActivities] = useState<LiveEmployeeActivity[]>(() => {
    try {
      const saved = localStorage.getItem('pe_kickidler_live');
      return saved ? JSON.parse(saved) : INITIAL_LIVE_ACTIVITIES;
    } catch {
      return INITIAL_LIVE_ACTIVITIES;
    }
  });

  const [records, setRecords] = useState<WorkdayActivityRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pe_kickidler_records');
      return saved ? JSON.parse(saved) : INITIAL_KICKIDLER_RECORDS;
    } catch {
      return INITIAL_KICKIDLER_RECORDS;
    }
  });

  const [violations, setViolations] = useState<KickidlerViolation[]>(() => {
    try {
      const saved = localStorage.getItem('pe_kickidler_violations');
      return saved ? JSON.parse(saved) : INITIAL_VIOLATIONS;
    } catch {
      return INITIAL_VIOLATIONS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pe_kickidler_live', JSON.stringify(liveActivities));
  }, [liveActivities]);

  useEffect(() => {
    localStorage.setItem('pe_kickidler_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('pe_kickidler_violations', JSON.stringify(violations));
  }, [violations]);

  const [statusFilter, setStatusFilter] = useState<'all' | KickidlerLiveStatus>('all');
  const [selectedRecordEmpId, setSelectedRecordEmpId] = useState<string>(records[0]?.empId || '');
  const [searchQuery, setSearchQuery] = useState('');

  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} دقیقه`;
    if (m === 0) return `${h} ساعت`;
    return `${h} ساعت و ${m} دقیقه`;
  };

  const filteredLive = liveActivities.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.empName.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q) || item.empCode.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedRecord = records.find(r => r.empId === selectedRecordEmpId) || records[0];

  return (
    <div className="space-y-6" dir="rtl">
      <div className={`p-6 rounded-2xl border transition-all ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border-teal-900/40 text-slate-100' 
          : 'bg-gradient-to-r from-white via-teal-50/40 to-white border-teal-100 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500/20 text-teal-500 border border-teal-500/30">
                <Monitor className="w-5 h-5" />
              </span>
              <div>
                <h1 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                  پایش بهره‌وری و زمان مفید کارگاهی
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
                    Kickidler Analytics
                  </span>
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  پایش زمان مفید، توقفات خط (Idle)، ثبت ناهنجاری‌ها و رادار فرسودگی شغلی (Burnout)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-2 mt-6 border-t pt-4 overflow-x-auto ${
          theme === 'dark' ? 'border-slate-800' : 'border-teal-100'
        }`}>
          <button
            onClick={() => setActiveSubTab('live_grid')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'live_grid'
                ? 'bg-teal-600 text-white shadow-sm'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>مانیتورینگ زنده ایستگاه‌ها</span>
          </button>
          <button
            onClick={() => setActiveSubTab('time_breakdown')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'time_breakdown'
                ? 'bg-teal-600 text-white shadow-sm'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>تفکیک زمان کاری</span>
          </button>
          <button
            onClick={() => setActiveSubTab('violations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'violations'
                ? 'bg-teal-600 text-white shadow-sm'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>ثبت ناهنجاری‌ها ({violations.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'live_grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLive.map(item => (
            <div
              key={item.empId}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{item.empName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{item.empCode} - {item.unit}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                  {item.status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block">نرم‌افزار فعال:</span>
                <span className="font-bold text-slate-200 truncate block mt-0.5">{item.currentApp}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800 font-mono">
                <span className="text-slate-400">راندمان روز: {item.todayProductivityRate}٪</span>
                <span className="text-slate-400">توقف: {item.todayIdleMinutes} دقیقه</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'time_breakdown' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">{selectedRecord.empName}</h3>
              <p className="text-xs text-slate-400">{selectedRecord.unit} | تاریخ: {selectedRecord.date}</p>
            </div>
            <div className="text-2xl font-black font-mono text-teal-400">
              شاخص بهره‌وری: {selectedRecord.productivityIndex} ٪
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-1">
              <span className="text-xs font-bold text-emerald-400 block">زمان مفید:</span>
              <span className="text-lg font-black font-mono text-emerald-300">
                {formatMinutes(selectedRecord.timeBreakdown.productiveMinutes)}
              </span>
            </div>
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-400 block">زمان خنثی:</span>
              <span className="text-lg font-black font-mono text-amber-300">
                {formatMinutes(selectedRecord.timeBreakdown.neutralMinutes)}
              </span>
            </div>
            <div className="p-3.5 bg-rose-950/20 border border-rose-800/40 rounded-xl space-y-1">
              <span className="text-xs font-bold text-rose-400 block">زمان غیرمفید:</span>
              <span className="text-lg font-black font-mono text-rose-300">
                {formatMinutes(selectedRecord.timeBreakdown.unproductiveMinutes)}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-slate-400 block">زمان توقف / Idle:</span>
              <span className="text-lg font-black font-mono text-slate-200">
                {formatMinutes(selectedRecord.timeBreakdown.idleMinutes)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'violations' && (
        <div className="space-y-3">
          {violations.map(viol => (
            <div
              key={viol.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs"
            >
              <div>
                <div className="font-bold text-slate-100">{viol.empName} ({viol.empCode}) - {viol.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{viol.description}</div>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-500">{viol.timestamp}</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">
                  {viol.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
