/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  History, 
  Settings, 
  Sparkles, 
  User, 
  Calendar,
  CheckCircle,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { EmployeeProfile, TimePunchRecord } from './types';
import { getDefaultTargets, generateSampleData, getPortugueseWeekday, formatMinutesToTime } from './utils/timeCalculations';

// Components
import Dashboard from './components/Dashboard';
import ClockPuncher from './components/ClockPuncher';
import HistoryList from './components/HistoryList';
import ConfigPanel from './components/ConfigPanel';
import Analytics from './components/Analytics';
import Login from './components/Login';

// Constants for LocalStorage keys
const STORAGE_PROFILE_KEY = 'conv_banco_horas_profile_v1';
const STORAGE_RECORDS_KEY = 'conv_banco_horas_records_v1';

const DEFAULT_PROFILE: EmployeeProfile = {
  name: 'Ana Rodrigues',
  role: 'Engenheira de Software Pleno',
  admissionDate: '2025-10-10',
  initialBalanceMinutes: 120, // starts with +2h legacy credit
  scheme: 'balanced5day',
  customTargets: getDefaultTargets('balanced5day'),
};

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('conv_banco_horas_authenticated_v1') === 'true';
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clock' | 'history' | 'analytics' | 'config'>('dashboard');

  // Core Data States
  const [profile, setProfile] = useState<EmployeeProfile>(DEFAULT_PROFILE);
  const [records, setRecords] = useState<TimePunchRecord[]>([]);

  // Local clock state for header greeting
  const [greeting, setGreeting] = useState<string>('Bom dia');

  const handleLogin = (username: string) => {
    setIsAuthenticated(true);
    localStorage.setItem('conv_banco_horas_authenticated_v1', 'true');
    
    // Reload the profile to capture any newly registered user info
    const savedProfile = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Error reloading profile after login', e);
      }
    }
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente sair da sua conta?')) {
      setIsAuthenticated(false);
      localStorage.setItem('conv_banco_horas_authenticated_v1', 'false');
    }
  };

  // On first mount: Hydrate from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_PROFILE_KEY);
    const savedRecords = localStorage.getItem(STORAGE_RECORDS_KEY);

    let parsedProfile = DEFAULT_PROFILE;
    if (savedProfile) {
      try {
        parsedProfile = JSON.parse(savedProfile);
         setProfile(parsedProfile);
      } catch (e) {
        console.error('Error parsing stored profile', e);
      }
    } else {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
    }

    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error('Error parsing stored records', e);
      }
    } else {
      // Auto seed sample data on first visit so they don't see an empty layout
      const initialSamples = generateSampleData(parsedProfile.scheme, parsedProfile.initialBalanceMinutes);
      setRecords(initialSamples);
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(initialSamples));
    }

    // Determine greeting
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('Bom dia');
    else if (hours < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  // Return login gating if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Save profile helper
  const handleSaveProfile = (newProfile: EmployeeProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
  };

  // Save a single record (can be today's punch or past retro-entry)
  const handleSaveRecord = (updatedRecord: Omit<TimePunchRecord, 'workedMinutes' | 'balanceMinutes'> & { workedMinutes?: number; balanceMinutes?: number }) => {
    const entry = updatedRecord.entry;
    const lunchStart = updatedRecord.lunchStart;
    const lunchEnd = updatedRecord.lunchEnd;
    const exit = updatedRecord.exit;
    const targetMinutes = updatedRecord.targetMinutes;

    // Use pure helper to calculate
    const entryMin = entry ? parseInt(entry.split(':')[0]) * 60 + parseInt(entry.split(':')[1]) : 0;
    const exitMin = exit ? parseInt(exit.split(':')[0]) * 60 + parseInt(exit.split(':')[1]) : 0;
    const lStartMin = lunchStart ? parseInt(lunchStart.split(':')[0]) * 60 + parseInt(lunchStart.split(':')[1]) : 0;
    const lEndMin = lunchEnd ? parseInt(lunchEnd.split(':')[0]) * 60 + parseInt(lunchEnd.split(':')[1]) : 0;

    let workedMin = 0;
    if (entryMin > 0) {
      if (exitMin > 0) {
        if (lStartMin > 0 && lEndMin > 0) {
          workedMin = Math.max(0, (lStartMin - entryMin) + (exitMin - lEndMin));
        } else {
          workedMin = Math.max(0, exitMin - entryMin);
        }
      } else if (lStartMin > 0) {
        workedMin = Math.max(0, lStartMin - entryMin);
      }
    }

    const finalRecord: TimePunchRecord = {
      ...updatedRecord,
      workedMinutes: workedMin,
      balanceMinutes: workedMin - targetMinutes,
    } as TimePunchRecord;

    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === finalRecord.id || r.date === finalRecord.date);
      let updatedList = [];
      if (idx >= 0) {
        updatedList = [...prev];
        updatedList[idx] = finalRecord;
      } else {
        updatedList = [finalRecord, ...prev];
      }
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(updatedList));
      return updatedList;
    });
  };

  // Delete a record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(filtered));
      return filtered;
    });
  };

  // Empty the log list completely
  const handleClearDatabase = () => {
    if (confirm('Atenção: isto excluirá todos os horários e reiniciará o seu banco de horas. Continuar?')) {
      setRecords([]);
      localStorage.removeItem(STORAGE_RECORDS_KEY);
      alert('Banco de horas zerado com sucesso.');
    }
  };

  // Re-seed mock data
  const handleLoadSamples = () => {
    const samples = generateSampleData(profile.scheme, profile.initialBalanceMinutes);
    setRecords(samples);
    localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(samples));
    alert('Dados de simulação gerados! O painel já está preenchido.');
  };

  // Filter current record for "today"
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find((r) => r.date === todayStr);

  // Get active target for today
  const currentDayOfWeek = new Date().getDay();
  const todayTargetMinutes = profile.customTargets?.find((t) => t.dayOfWeek === currentDayOfWeek)?.targetMinutes || 0;

  // Real-time calculation for Geometric Balance Sidebar
  const logsBalanceAccumulated = records.reduce((sum, rec) => sum + rec.balanceMinutes, 0);
  const totalBalanceMinutes = logsBalanceAccumulated + (profile.initialBalanceMinutes || 0);

  // Custom balance display state matching "+14:22" style
  const getFormattedBalanceParts = (minutes: number) => {
    const isNegative = minutes < 0;
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const sign = minutes > 0 ? '+' : isNegative ? '-' : '';
    return {
      sign,
      hoursStr: `${h}:${String(m).padStart(2, '0')}`,
      isPositive: minutes > 0,
      isNegative: minutes < 0,
    };
  };
  const sidebarBalance = getFormattedBalanceParts(totalBalanceMinutes);

  // Weekly worked calculation
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(mondayDiff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
  };

  const { startOfWeek, endOfWeek } = getWeekDates();
  const weeklyRecords = records.filter((rec) => {
    const recDate = new Date(rec.date + 'T12:00:00');
    return recDate >= startOfWeek && recDate <= endOfWeek;
  });

  const weeklyWorkedMinutes = weeklyRecords.reduce((sum, rec) => sum + rec.workedMinutes, 0);
  const weeklyTargetMinutes = 44 * 60; // 44 hours target
  const weeklyPercent = Math.min(100, Math.round((weeklyWorkedMinutes / weeklyTargetMinutes) * 100));
  const weeklyWorkedHoursDecimal = (weeklyWorkedMinutes / 60).toFixed(1);
  const missingHoursDecimal = Math.max(0, 44 - (weeklyWorkedMinutes / 60));

  const shiftFeedbackMessage = missingHoursDecimal > 0
    ? `Faltam ${missingHoursDecimal.toFixed(1)} horas para completar sua jornada de 44h.`
    : `Parabéns! Jornada de 44h semanas completada com sucesso.`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-indigo-505/30 selection:bg-indigo-500/30 relative">
      {/* Dynamic starfield grid backdrop & futuristic neon glass blobs */}
      <div className="absolute top-[-5%] left-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/15 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0" />
  
      {/* Top Navigation Bar: Glassmorphic balance layout */}
      <header className="h-20 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/80 px-6 lg:px-10 flex items-center justify-between shrink-0 select-none z-30 print:hidden relative">
        
        {/* Brand Group with futuristic neon geometry */}
        <div className="flex items-center gap-3">
          <div className="relative inline-flex">
            <div className="absolute inset-x-0 w-8 h-8 rounded bg-indigo-500 blur-xs opacity-50 animate-pulse" />
            <div className="relative w-10 h-10 bg-indigo-600 rounded flex items-center justify-center shadow-md select-none">
              <div className="w-5 h-5 border-2 border-white rounded-sm rotate-45"></div>
            </div>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            MEU <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-light">HORÁRIO</span>
          </span>
        </div>

        {/* Navigation Tabs - Desktop view link bars with bottom indicators */}
        <nav className="hidden md:flex gap-8 h-full text-xs font-bold uppercase tracking-widest relative">
          <button 
            id="nav-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`h-full border-b-2 px-1 transition-all cursor-pointer flex items-center ${
              activeTab === 'dashboard' 
                ? 'text-indigo-400 border-indigo-500 font-extrabold' 
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Painel
          </button>
          
          <button 
            id="nav-btn-clock"
            onClick={() => setActiveTab('clock')}
            className={`h-full border-b-2 px-1 transition-all cursor-pointer flex items-center ${
              activeTab === 'clock' 
                ? 'text-indigo-400 border-indigo-500 font-extrabold' 
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Bater Ponto
          </button>

          <button 
            id="nav-btn-history"
            onClick={() => setActiveTab('history')}
            className={`h-full border-b-2 px-1 transition-all cursor-pointer flex items-center ${
              activeTab === 'history' 
                ? 'text-indigo-400 border-indigo-500 font-extrabold' 
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Histórico
          </button>

          <button 
            id="nav-btn-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`h-full border-b-2 px-1 transition-all cursor-pointer flex items-center ${
              activeTab === 'analytics' 
                ? 'text-indigo-400 border-indigo-500 font-extrabold' 
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Análises
          </button>

          <button 
            id="nav-btn-config"
            onClick={() => setActiveTab('config')}
            className={`h-full border-b-2 px-1 transition-all cursor-pointer flex items-center ${
              activeTab === 'config' 
                ? 'text-indigo-400 border-indigo-500 font-extrabold' 
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Ajustes
          </button>
        </nav>

        {/* User Identity widget */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">{profile.name}</p>
            <p className="text-[10px] text-indigo-450 text-indigo-405 text-indigo-400 font-bold uppercase tracking-wide mt-1">{profile.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-800/60 flex items-center justify-center font-bold text-indigo-300 shadow-xs uppercase select-none text-sm">
            {profile.name.slice(0, 2)}
          </div>
          
          {/* Sign Out Exit Trigger Button */}
          <button
            id="btn-trigger-logout"
            onClick={handleLogout}
            title="Sair do Sistema"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-900/50 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-400 font-bold" />
          </button>
        </div>
      </header>

      {/* Main content viewport containing Sidebar Rail & Active Section View */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative print:hidden z-10">
        
        {/* Sidebar / Stats Rail - Pristine style from Geometric Balance HTML */}
        <aside className="w-full md:w-80 bg-slate-900/50 backdrop-blur-md border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto select-none z-10">
          <div className="p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
            
            {/* Real Accumulated Balance Card in Indigo with futuristic accent glow */}
            <div id="sidebar-balance-card" className="bg-indigo-950/80 border border-indigo-500/30 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden transition-all hover:border-indigo-500/50">
              <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Clock className="w-20 h-20 text-indigo-400" />
              </div>
              
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">Saldo Acumulado</p>
              <h2 className="text-4xl font-light tracking-tighter text-white font-mono">
                {sidebarBalance.sign}{sidebarBalance.hoursStr}
                <span className="text-lg opacity-50 ml-1 font-sans">hrs</span>
              </h2>
              
              <div className="mt-4 pt-4 border-t border-indigo-900/60 flex justify-between items-center">
                <span className="text-[10px] text-indigo-400">Última atualização: Hoje</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  sidebarBalance.isPositive 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                    : sidebarBalance.isNegative 
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                    : 'bg-white/10 text-white'
                }`}>
                  {sidebarBalance.isPositive ? 'Estável' : sidebarBalance.isNegative ? 'Devedor' : 'Equilibrado'}
                </span>
              </div>
            </div>

            {/* Weekly Goal Progress slider */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-sans">Jornada Semanal</h3>
                <span className="text-xs font-bold text-white font-mono">{weeklyWorkedHoursDecimal}h <span className="text-slate-550 text-slate-500">/ 44h</span></span>
              </div>
              
              <div className="h-4 w-full bg-slate-950 border border-slate-800 rounded-full overflow-hidden flex p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-350 shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
                  style={{ width: `${Math.min(100, Math.round(weeklyPercent))}%` }}
                ></div>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                {shiftFeedbackMessage}
              </p>
            </div>

            {/* Quick action buttons displaying active states */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Ponto de Hoje</span>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('clock')}
                  className="bg-slate-950/80 border border-slate-800 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-900 hover:border-indigo-500/30 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <span className="text-[10px] font-bold uppercase text-slate-500">Entrada</span>
                  <span className="text-lg font-light font-mono text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                    {todayRecord?.entry || '--:--'}
                  </span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('clock')}
                  className="bg-indigo-950/20 border border-indigo-950 hover:bg-indigo-950/40 border-indigo-900/50 text-indigo-300 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500/30 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <span className="text-[10px] font-bold uppercase text-indigo-400">Saída</span>
                  <span className="text-lg font-light font-mono">
                    {todayRecord?.exit || '--:--'}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Bottom synchronizer status widget */}
          <div className="mt-auto p-6 border-t border-slate-800/80 hidden md:block">
            <div className="flex items-center gap-3 p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Sincronizado com RH</p>
            </div>
          </div>
        </aside>

        {/* Main Grid Content Area views switcher */}
        <section className="flex-1 p-6 md:p-10 bg-transparent overflow-y-auto relative z-10">
          
          {/* Mobile Tabs Fallback to improve accessibility */}
          <div className="flex md:hidden bg-slate-900/60 backdrop-blur-md p-1 rounded-xl mb-6 shadow-xs border border-slate-800">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Painel
            </button>
            <button 
              onClick={() => setActiveTab('clock')} 
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'clock' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Ponto
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Logs
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Gráficos
            </button>
            <button 
              onClick={() => setActiveTab('config')} 
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Ajustes
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <Dashboard records={records} profile={profile} todayRecord={todayRecord} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <div>
                    <ClockPuncher 
                      todayRecord={todayRecord} 
                      onSaveRecord={handleSaveRecord} 
                      onDeleteRecord={handleDeleteRecord} 
                      dailyTarget={todayTargetMinutes} 
                    />
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-1 px-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Visão Analítica Rápida</h3>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed mb-4">
                        Seu banco de horas possui dados gerados para visualização instantânea de gráficos, desvios, médias, horas de almoço e produtividade do regime CLT de 44h.
                      </p>
                      
                      {/* Miniature Analytics stats widget */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-950/60 border border-slate-800/85 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Saldo Mês</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block">
                            +{records.length > 0 ? (records.filter(r => r.balanceMinutes > 0).length) : 0} dias de crédito
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950/60 border border-slate-800/85 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Lançamentos</span>
                          <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">
                            {records.length} cadastrados
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('history')}
                      className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center uppercase tracking-wider shadow-md shadow-indigo-600/10"
                    >
                      Consultar Extrato Completo →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clock' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5">
                  <ClockPuncher 
                    todayRecord={todayRecord} 
                    onSaveRecord={handleSaveRecord} 
                    onDeleteRecord={handleDeleteRecord} 
                    dailyTarget={todayTargetMinutes} 
                  />
                </div>
                
                {/* FAQ details card */}
                <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-base">Perguntas Frequentes</h3>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Como funciona o cálculo em regime compensatório de 44h?</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        O sistema diminui todas as pausas alimentares do tempo decorrido total de expediente. O saldo é cotejado contra a sua meta diária de jornada do seu regime de 44h ({profile.scheme === 'balanced5day' ? '8h 48m diários de Seg a Sex' : '8h de Seg a Sex e 4h Sáb'}).
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Como ajustar retroativamente se esquecer de bater o ponto?</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Você pode navegar para a aba <strong className="text-slate-700 font-semibold cursor-pointer" onClick={() => setActiveTab('history')}>Histórico</strong> e clicar em "Lançamento Retroativo" para adicionar ou ajustar de forma simples qualquer dia do histórico.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">O que é a Carga Inicial de Saldo Legado?</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Nas Configurações, defina o saldo consolidado de horas de antes de iniciar neste sistema web para que seja levado em consideração no cálculo consolidado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <HistoryList 
                  records={records} 
                  onSaveRecord={handleSaveRecord} 
                  onDeleteRecord={handleDeleteRecord} 
                  dailyTargetsByDay={profile.customTargets || []} 
                />
                
                {/* Analytics prompt banner in indigo */}
                <div className="p-6 bg-indigo-900 text-white rounded-3xl relative overflow-hidden flex flex-col sm:flex-row items-center sm:justify-between gap-4 select-none">
                  <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                    <Sparkles className="w-16 h-16 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Pronto para visualizar insights gráficos consolidados?</h4>
                    <p className="text-xs text-indigo-200 mt-0.5 font-light">Veja regularidade de expediente, desvios e estatísticas médias.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-slate-100 font-bold rounded-xl text-xs shrink-0 transition-colors cursor-pointer shadow-sm"
                  >
                    Métricas e Escalas →
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <Analytics records={records} />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6">
                <ConfigPanel 
                  profile={profile} 
                  onSaveProfile={handleSaveProfile} 
                  onClearDatabase={handleClearDatabase} 
                  onLoadSamples={handleLoadSamples} 
                />
              </div>
            )}
          </div>

        </section>
      </main>

      {/* Premium print-friendly PDF timesheet ledger */}
      <div className="hidden print:block bg-white text-black p-8 font-sans leading-normal">
        
        {/* Header Block */}
        <div className="text-center pb-5 border-b-2 border-slate-900 mb-6 flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-950">EXTRATO INDIVIDUAL DE BANCO DE HORAS</h1>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-1 tracking-wider">Acordo de Compensação de Horas nos Termos da CLT</p>
          </div>
          <div className="text-right bg-slate-100 border border-slate-200 rounded px-2.5 py-1 text-[9px] font-bold">
            PÁGINA 1 DE 1
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl text-[10px]">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Colaborador(a)</span>
            <span className="font-extrabold text-slate-900 text-xs">{profile.name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Cargo / Setor</span>
            <span className="font-bold text-slate-800">{profile.role}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Admissão</span>
            <span className="font-semibold font-mono text-slate-700">{profile.admissionDate ? new Date(profile.admissionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/----'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Regime de Expediente</span>
            <span className="font-semibold text-slate-705">
              {profile.scheme === 'balanced5day' ? 'CLT 5 dias (Meta diária 8h 48m)' : profile.scheme === 'classic6day' ? 'CLT 6 dias (8H diárias + 4h Sáb)' : 'Regime Customizado CLT'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Emissão do Relatório</span>
            <span className="font-mono text-slate-700">{new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Saldo Consolidado de Banco de Horas</span>
            <span className="font-extrabold text-indigo-900 text-sm font-mono block">
              {sidebarBalance.sign}{sidebarBalance.hoursStr} hrs
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="mb-8 border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-600 uppercase text-[8px]">
                <th className="py-2 px-3 border-r border-slate-300">Data</th>
                <th className="py-2 px-3 border-r border-slate-300">Dia</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Entrada</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Almoço Saída</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Almoço Retorno</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Saída Geral</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Meta Dia</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center font-bold">Trabalhado</th>
                <th className="py-2 px-2 border-r border-slate-300 text-right">Saldo do Dia</th>
                <th className="py-2 px-3">Ocorrência / Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.length > 0 ? (
                // Order ascending chronologically for official printout
                [...records].sort((a,b) => a.date.localeCompare(b.date)).map((r) => {
                  const hourBalance = r.balanceMinutes;
                  const isPos = hourBalance > 0;
                  const isNeg = hourBalance < 0;
                  const sign = isPos ? '+' : isNeg ? '-' : '';
                  const abs = Math.abs(hourBalance);
                  const h = Math.floor(abs / 60);
                  const m = abs % 60;
                  const balanceText = `${sign}${h}:${String(m).padStart(2, '0')}`;

                  let notesDisplay = r.notes || '';
                  if (r.specialDayType === 'sick') notesDisplay = '🩺 Atestado Médico ' + (r.notes ? `(${r.notes})` : '');
                  else if (r.specialDayType === 'vacation') notesDisplay = '🏝️ Férias ' + (r.notes ? `(${r.notes})` : '');
                  else if (r.specialDayType === 'holiday') notesDisplay = '⭐️ Feriado / Folga ' + (r.notes ? `(${r.notes})` : '');

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-bold">{r.date}</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{getPortugueseWeekday(r.date)}</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{r.entry || '--:--'}</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{r.lunchStart || '--:--'}</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{r.lunchEnd || '--:--'}</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{r.exit || '--:--'}</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-400">{formatMinutesToTime(r.targetMinutes)}h</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-extrabold text-slate-800">{formatMinutesToTime(r.workedMinutes)}h</td>
                      <td className={`py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold ${isPos ? 'text-emerald-700' : isNeg ? 'text-rose-700' : 'text-slate-400'}`}>
                        {balanceText}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-slate-600 text-[8px] truncate max-w-xs">{notesDisplay || '--'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">Sem registros cadastrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stamp and Signature lanes */}
        <div className="grid grid-cols-2 gap-x-12 mt-16 pt-8 border-t border-slate-300 text-center">
          <div className="flex flex-col items-center">
            <div className="w-4/5 border-t border-slate-800 pt-1.5 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
              {profile.name}
            </div>
            <span className="text-[8px] text-slate-405 text-slate-500 uppercase mt-1 tracking-wider">Assinatura do Trabalhador</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-4/5 border-t border-slate-800 pt-1.5 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
              {profile.role ? 'Recursos Humanos / Gestão' : 'Representante Legal'}
            </div>
            <span className="text-[8px] text-slate-405 text-slate-500 uppercase mt-1 tracking-wider">Assinatura da Empresa</span>
          </div>
        </div>

        {/* Legal Disclaimer block */}
        <p className="text-[8px] text-slate-400 mt-16 text-center italic leading-relaxed">
          O presente espelho individual de banco de horas constitui documento corporativo fidedigno aos lançamentos efetuados pelo colaborador no sistema Meu Horário, em conformidade com o artigo 59 da Consolidação das Leis do Trabalho (CLT) e disposições vigentes de Lei Geral de Proteção de Dados (LGPD).
        </p>
      </div>
    </div>
  );
}
