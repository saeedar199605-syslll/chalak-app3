/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, 
  Users, 
  Heart, 
  Activity, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Calendar, 
  Award, 
  TrendingUp, 
  Lock, 
  Check, 
  X,
  FileText,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import { 
  Employee, 
  OKRGoal, 
  OKRKeyResult, 
  OneOnOneMeeting, 
  PraiseKudos, 
  PulseSurveyMetric,
  OKRConfidence 
} from '../types';
import { 
  INITIAL_OKRS, 
  INITIAL_ONE_ON_ONES, 
  INITIAL_KUDOS, 
  INITIAL_PULSE_METRICS 
} from '../data/latticeKickidlerSeed';
import { db } from '../utils/db';

interface LatticePerformanceHubProps {
  currentUser: Employee;
  employees: Employee[];
  theme?: 'dark' | 'light';
  onNavigate?: (tab: string) => void;
}

export default function LatticePerformanceHub({
  currentUser,
  employees,
  theme = 'dark'
}: LatticePerformanceHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'okrs' | 'one_on_ones' | 'praise' | 'pulse'>('okrs');
  const [okrs, setOkrs] = useState<OKRGoal[]>(() => db.getOkrs());

  const [oneOnOnes, setOneOnOnes] = useState<OneOnOneMeeting[]>(() => {
    try {
      const saved = localStorage.getItem('pe_lattice_one_on_ones');
      return saved ? JSON.parse(saved) : INITIAL_ONE_ON_ONES;
    } catch {
      return INITIAL_ONE_ON_ONES;
    }
  });

  const [kudosList, setKudosList] = useState<PraiseKudos[]>(() => {
    try {
      const saved = localStorage.getItem('pe_lattice_kudos');
      return saved ? JSON.parse(saved) : INITIAL_KUDOS;
    } catch {
      return INITIAL_KUDOS;
    }
  });

  const [pulseMetrics] = useState<PulseSurveyMetric[]>(() => {
    try {
      const saved = localStorage.getItem('pe_lattice_pulse');
      return saved ? JSON.parse(saved) : INITIAL_PULSE_METRICS;
    } catch {
      return INITIAL_PULSE_METRICS;
    }
  });

  useEffect(() => {
    const unsub = db.subscribe((key, data) => {
      if (key === 'pe_lattice_okrs' && Array.isArray(data)) {
        setOkrs(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    db.saveOkrs(okrs);
  }, [okrs]);

  useEffect(() => {
    localStorage.setItem('pe_lattice_one_on_ones', JSON.stringify(oneOnOnes));
    db.syncToCloudNow().catch(() => {});
  }, [oneOnOnes]);

  useEffect(() => {
    localStorage.setItem('pe_lattice_kudos', JSON.stringify(kudosList));
    db.syncToCloudNow().catch(() => {});
  }, [kudosList]);

  const [isNewOkrModalOpen, setIsNewOkrModalOpen] = useState(false);
  const [isNew1on1ModalOpen, setIsNew1on1ModalOpen] = useState(false);
  const [isGiveKudosModalOpen, setIsGiveKudosModalOpen] = useState(false);
  const [selected1on1Id, setSelected1on1Id] = useState<string | null>(oneOnOnes[0]?.id || null);
  const [newTalkingPointText, setNewTalkingPointText] = useState('');
  const [newActionItemTitle, setNewActionItemTitle] = useState('');
  const [actionItemAssignee, setActionItemAssignee] = useState('');

  const [okrLevelFilter, setOkrLevelFilter] = useState<'all' | 'company' | 'department' | 'individual'>('all');

  const [kudosReceiverId, setKudosReceiverId] = useState<string>(employees[1]?.id || '');
  const [kudosCompanyValue, setKudosCompanyValue] = useState<PraiseKudos['companyValue']>('کیفیت برتر');
  const [kudosMessage, setKudosMessage] = useState<string>('');
  const [kudosBadge, setKudosBadge] = useState<string>('🎯');

  const [newOkrTitle, setNewOkrTitle] = useState('');
  const [newOkrDescription, setNewOkrDescription] = useState('');
  const [newOkrLevel, setNewOkrLevel] = useState<'company' | 'department' | 'individual'>('department');
  const [newOkrDepartment, setNewOkrDepartment] = useState('خط تولید ۱');
  const [newOkrOwnerId, setNewOkrOwnerId] = useState(employees[0]?.id || '');
  const [newOkrDueDate, setNewOkrDueDate] = useState('۱۴۰۴/۱۲/۲۹');

  const handleUpdateKrValue = (goalId: string, krId: string, delta: number) => {
    setOkrs(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedKrs = goal.keyResults.map(kr => {
        if (kr.id !== krId) return kr;
        const boundedVal = Math.max(kr.startValue, kr.currentValue + delta);
        let conf: OKRConfidence = kr.confidence;
        const ratio = kr.targetValue !== kr.startValue ? (boundedVal - kr.startValue) / (kr.targetValue - kr.startValue) : 1;
        if (ratio >= 1) conf = 'completed';
        else if (ratio >= 0.7) conf = 'on_track';
        else if (ratio >= 0.4) conf = 'at_risk';
        else conf = 'behind';
        return {
          ...kr,
          currentValue: boundedVal,
          confidence: conf,
          lastUpdated: 'همین الان'
        };
      });

      const totalProgressSum = updatedKrs.reduce((acc, kr) => {
        const range = kr.targetValue - kr.startValue;
        if (range === 0) return acc + 100;
        const p = Math.min(100, Math.max(0, ((kr.currentValue - kr.startValue) / range) * 100));
        return acc + p;
      }, 0);
      const overallP = Math.round(totalProgressSum / updatedKrs.length);
      let overallConf: OKRConfidence = 'on_track';
      if (overallP >= 100) overallConf = 'completed';
      else if (overallP < 50) overallConf = 'behind';
      else if (overallP < 75) overallConf = 'at_risk';

      return {
        ...goal,
        keyResults: updatedKrs,
        progress: overallP,
        confidence: overallConf
      };
    }));
  };

  const handleToggleTalkingPoint = (meetingId: string, pointId: string) => {
    setOneOnOnes(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      return {
        ...m,
        talkingPoints: m.talkingPoints.map(tp => tp.id === pointId ? { ...tp, isCompleted: !tp.isCompleted } : tp)
      };
    }));
  };

  const handleAddTalkingPoint = (meetingId: string) => {
    if (!newTalkingPointText.trim()) return;
    setOneOnOnes(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      const newTp = {
        id: `tp-${Date.now()}`,
        text: newTalkingPointText.trim(),
        isCompleted: false,
        addedBy: currentUser.role === 'employee' ? ('employee' as const) : ('supervisor' as const)
      };
      return {
        ...m,
        talkingPoints: [...m.talkingPoints, newTp]
      };
    }));
    setNewTalkingPointText('');
  };

  const handleReactKudos = (kudosId: string, reactionType: 'claps' | 'hearts' | 'rockets' | 'stars') => {
    setKudosList(prev => prev.map(k => {
      if (k.id !== kudosId) return k;
      const currentCount = k.reactions[reactionType] || 0;
      return {
        ...k,
        reactions: {
          ...k.reactions,
          [reactionType]: currentCount + 1
        }
      };
    }));
  };

  const handleSendKudos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kudosMessage.trim() || !kudosReceiverId) return;
    const receiver = employees.find(emp => emp.id === kudosReceiverId);
    if (!receiver) return;

    const newKudos: PraiseKudos = {
      id: `kudos-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role === 'admin' ? 'مدیر سیستم' : currentUser.role === 'supervisor' ? 'سرپرست' : 'همکار',
      receiverId: receiver.id,
      receiverName: receiver.name,
      companyValue: kudosCompanyValue,
      badgeIcon: kudosBadge,
      message: kudosMessage.trim(),
      reactions: { claps: 1, hearts: 1, rockets: 1, stars: 1 },
      createdAt: 'همین الان'
    };

    setKudosList([newKudos, ...kudosList]);
    setIsGiveKudosModalOpen(false);
    setKudosMessage('');
  };

  const filteredOkrs = okrs.filter(goal => {
    if (okrLevelFilter === 'all') return true;
    return goal.level === okrLevelFilter;
  });

  const activeMeeting = oneOnOnes.find(m => m.id === selected1on1Id) || oneOnOnes[0];

  return (
    <div className="space-y-6" dir="rtl">
      <div className={`p-6 rounded-2xl border transition-all ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-900/40 text-slate-100' 
          : 'bg-gradient-to-r from-white via-indigo-50/40 to-white border-indigo-100 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                <Target className="w-5 h-5" />
              </span>
              <div>
                <h1 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                  هاب اهداف استراتژیک OKR و مربیگری
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Lattice Suite
                  </span>
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  آبشار اهداف و نتایج کلیدی (OKRs)، جلسات مربیگری دوطرفه (1-on-1s) و دیوار قدردانی
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsGiveKudosModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>ارسال قدردانی (Kudos)</span>
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-2 mt-6 border-t pt-4 overflow-x-auto ${theme === 'dark' ? 'border-slate-800' : 'border-indigo-100'}`}>
          <button
            onClick={() => setActiveSubTab('okrs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'okrs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : theme === 'dark' 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/80'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>اهداف و نتایج کلیدی (OKRs)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{okrs.length}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('one_on_ones')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'one_on_ones'
                ? 'bg-indigo-600 text-white shadow-sm'
                : theme === 'dark' 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>جلسات مربیگری ۱-به-۱</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{oneOnOnes.length}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('praise')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'praise'
                ? 'bg-indigo-600 text-white shadow-sm'
                : theme === 'dark' 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/80'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>دیوار قدردانی همکاران</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{kudosList.length}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'okrs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredOkrs.map(goal => (
              <div 
                key={goal.id}
                className={`p-5 rounded-2xl border transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-900/70 border-slate-800 text-slate-100' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{goal.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{goal.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-black font-mono text-indigo-400">{goal.progress} ٪</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {goal.keyResults.map(kr => (
                    <div 
                      key={kr.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-200">{kr.title}</span>
                        <span className="text-[10px] text-slate-400 mr-2 font-mono">({kr.ownerName})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-teal-400">{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateKrValue(goal.id, kr.id, -1)}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateKrValue(goal.id, kr.id, 1)}
                            className="w-6 h-6 rounded bg-slate-800 text-emerald-400 font-bold hover:bg-slate-700 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'one_on_ones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2">
            {oneOnOnes.map(meeting => (
              <div
                key={meeting.id}
                onClick={() => setSelected1on1Id(meeting.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  meeting.id === activeMeeting?.id 
                    ? 'bg-indigo-600/15 border-indigo-500/60 shadow-md' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{meeting.empName}</span>
                  <span className="text-[10px] font-mono text-slate-400">{meeting.scheduledDate}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">سرپرست: {meeting.supervisorName}</div>
              </div>
            ))}
          </div>

          {activeMeeting && (
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-slate-100">جلسه با: {activeMeeting.empName}</h3>
                <span className="text-xs font-mono text-slate-400">{activeMeeting.scheduledDate}</span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">محورهای گفتگو:</span>
                {activeMeeting.talkingPoints.map(tp => (
                  <div
                    key={tp.id}
                    onClick={() => handleToggleTalkingPoint(activeMeeting.id, tp.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                      tp.isCompleted ? 'bg-emerald-950/20 border-emerald-800 text-slate-400 line-through' : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="text-xs">{tp.text}</span>
                    <span className="text-[10px] text-slate-500">{tp.addedBy === 'supervisor' ? 'سرپرست' : 'کارمند'}</span>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newTalkingPointText}
                    onChange={e => setNewTalkingPointText(e.target.value)}
                    placeholder="موضوع جدید برای گفتگو..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddTalkingPoint(activeMeeting.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    افزودن
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'praise' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kudosList.map(kudos => (
            <div 
              key={kudos.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-pink-600/20 flex items-center justify-center text-xl">
                    {kudos.badgeIcon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {kudos.senderName} به {kudos.receiverName}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{kudos.createdAt}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {kudos.companyValue}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-850">
                {kudos.message}
              </p>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleReactKudos(kudos.id, 'claps')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>👏</span>
                  <span className="font-mono">{kudos.reactions.claps}</span>
                </button>
                <button
                  onClick={() => handleReactKudos(kudos.id, 'hearts')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-rose-400 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>❤️</span>
                  <span className="font-mono">{kudos.reactions.hearts}</span>
                </button>
                <button
                  onClick={() => handleReactKudos(kudos.id, 'rockets')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-indigo-400 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>🚀</span>
                  <span className="font-mono">{kudos.reactions.rockets}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Give Kudos Modal */}
      {isGiveKudosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 text-right">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-current" />
                <span>ارسال پیام قدردانی (Kudos)</span>
              </h3>
              <button onClick={() => setIsGiveKudosModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                &times;
              </button>
            </div>
            <form onSubmit={handleSendKudos} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">گیرنده:</label>
                <select
                  value={kudosReceiverId}
                  onChange={e => setKudosReceiverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">ارزش سازمانی:</label>
                <select
                  value={kudosCompanyValue}
                  onChange={e => setKudosCompanyValue(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="کیفیت برتر">کیفیت برتر</option>
                  <option value="نظم و انضباط">نظم و انضباط</option>
                  <option value="ایمنی و HSE">ایمنی و HSE</option>
                  <option value="همدلی تیمی">همدلی تیمی</option>
                  <option value="سرعت و بهره‌وری">سرعت و بهره‌وری</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">متن قدردانی:</label>
                <textarea
                  required
                  rows={3}
                  value={kudosMessage}
                  onChange={e => setKudosMessage(e.target.value)}
                  placeholder="دلیل تشکر و قدردانی از همکار..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGiveKudosModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  ارسال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
