/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, TrendingUp, AlertCircle, Calendar, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';
import { TimePunchRecord, EmployeeProfile } from '../types';
import { formatBalance, formatMinutesToTime } from '../utils/timeCalculations';

interface DashboardProps {
  records: TimePunchRecord[];
  profile: EmployeeProfile;
  todayRecord: TimePunchRecord | undefined;
}

export default function Dashboard({ records, profile, todayRecord }: DashboardProps) {
  // 1. Calculate General Balance (Saldo Geral de Horas)
  const logsBalanceAccumulated = records.reduce((sum, rec) => sum + rec.balanceMinutes, 0);
  const totalBalanceMinutes = logsBalanceAccumulated + (profile.initialBalanceMinutes || 0);
  const balanceState = formatBalance(totalBalanceMinutes);

  // 2. Calculate Weekly Hours (Monday to Sunday)
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
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

  // 3. Monthly Metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRecords = records.filter((rec) => {
    const recDate = new Date(rec.date + 'T12:00:00');
    return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
  });

  const monthlyWorkedMinutes = monthlyRecords.reduce((sum, rec) => sum + rec.workedMinutes, 0);
  const monthlyTargetMinutes = monthlyRecords.reduce((sum, rec) => sum + rec.targetMinutes, 0);
  const monthlyBalanceMinutes = monthlyRecords.reduce((sum, rec) => sum + rec.balanceMinutes, 0);

  // Calculate today's current worked minutes
  let todayWorkedMinutes = 0;
  if (todayRecord) {
    todayWorkedMinutes = todayRecord.workedMinutes || 0;
  }

  // Quick statistics
  const overtimesCount = records.filter((r) => r.balanceMinutes > 15).length;
  const debitsCount = records.filter((r) => r.balanceMinutes < -15).length;
  const onTimeCount = records.length - overtimesCount - debitsCount;

  // Geometric balance formatter: e.g. "+12:44"
  const formatToGeometric = (minutes: number) => {
    const isNegative = minutes < 0;
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const sign = minutes > 0 ? '+' : isNegative ? '-' : '';
    return `${sign}${h}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div id="dashboard-wrapper" className="space-y-6">
      
      {/* 3 Columns Grid for Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Main Time Bank Balance */}
        <div id="card-main-balance" className="p-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 flex flex-col justify-between min-h-[190px] relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Consolidado</span>
            <div className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
              totalBalanceMinutes > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : totalBalanceMinutes < 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : 'bg-slate-800 text-slate-400 border-slate-705'
            }`}>
              {totalBalanceMinutes > 0 ? 'Crédito' : totalBalanceMinutes < 0 ? 'Devedor' : 'Equilibrado'}
            </div>
          </div>

          <div className="my-4">
            <h1 className={`text-4xl sm:text-5xl font-light tracking-tighter font-mono ${
              totalBalanceMinutes >= 0 
                ? 'text-white' 
                : 'text-rose-400'
            }`}>
              {formatToGeometric(totalBalanceMinutes)}
              <span className="text-lg opacity-40 ml-1 text-slate-400 font-sans">hrs</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-2 leading-none">
              Incluso carga inicial: <span className="font-semibold text-indigo-400 font-mono">{formatToGeometric(profile.initialBalanceMinutes)}h</span>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Período Ativo</span>
            <span className="font-bold text-indigo-400 font-sans">CLT 44h</span>
          </div>
        </div>

        {/* Card 2: Current Week's Goal (44 Hours) */}
        <div id="card-weekly-target" className="p-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 flex flex-col justify-between min-h-[190px] transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jornada Semanal</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tighter text-white font-mono">
              {formatToGeometric(weeklyWorkedMinutes).replace('+', '')}
              <span className="text-lg opacity-40 ml-1 text-slate-400">/ 44:00</span>
            </h1>
            
            {/* Minimal Progress Bar */}
            <div className="w-full bg-slate-950 border border-slate-855 border-slate-800 h-2.5 rounded-full overflow-hidden mt-3 relative p-0.5">
              <div 
                className="bg-gradient-to-r from-indigo-505 to-violet-505 from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5">
            <span>Progresso semanal</span>
            <span className="font-bold text-indigo-400 font-mono">{weeklyPercent}%</span>
          </div>
        </div>

        {/* Card 3: Monthly Statistics Overview */}
        <div id="card-monthly-stats" className="p-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 flex flex-col justify-between min-h-[190px] transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Balanço Mensal</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-4">
            <h1 className={`text-4xl sm:text-5xl font-light tracking-tighter font-mono ${
              monthlyBalanceMinutes >= 0 ? 'text-white' : 'text-rose-400'
            }`}>
              {formatToGeometric(monthlyBalanceMinutes)}
              <span className="text-lg opacity-40 ml-1 text-slate-400 font-sans">hrs</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-2 leading-none">
              Trabalhado: <span className="font-semibold text-slate-300 font-mono">{formatMinutesToTime(monthlyWorkedMinutes)}h</span> de {formatMinutesToTime(monthlyTargetMinutes)}h
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-3 border-t border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate capitalize">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

      </div>

      {/* Grid: Instructions and Real-time tracking summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Left Column: Guidelines / Guidance */}
        <div className="lg:col-span-8 p-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-base">Leis Trabalhistas & Boas Práticas do Banco</h3>
            <span className="px-2.5 py-0.5 text-[10px] bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-400 font-bold uppercase tracking-wider font-mono">Manual</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <div className="flex gap-4">
                <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Intervalo de Descanso (Interjornada)</h4>
                  <p className="text-xxs text-slate-400 mt-2 leading-relaxed">
                    A Consolidação das Leis do Trabalho (CLT) exige o intervalo mínimo de 11 horas corridas para repouso absoluto entre dois dias de expediente.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <div className="flex gap-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Compensação da Jornada CLT 44H</h4>
                  <p className="text-xxs text-slate-400 mt-2 leading-relaxed">
                    No regime de 44h distribuídas de Segunda a Sexta, sua meta diária padrão é de <strong>8 horas e 48 minutos</strong>. Controle seu banco para evitar excesso diário de 2 horas extras (limite legal).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reference portal banner for updates */}
          <div className="mt-5 p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl transition-all duration-300 hover:border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded-xl shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Consulta de Convenções & Atualizações</h4>
                  <p className="text-xxs text-slate-400 mt-1 leading-relaxed max-w-xl">
                    Utilize o portal do <strong>SECOFS (Sindicato dos Empregados no Comércio de Feira de Santana)</strong> para acesso fidedigno a convenções coletivas e atualizações da legislação comercial.
                  </p>
                </div>
              </div>
              <a 
                href="https://secofs.org.br/" 
                target="_blank" 
                rel="noreferrer"
                className="text-xxs font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 font-mono inline-flex items-center gap-1 shrink-0 self-start sm:self-center uppercase tracking-wider"
              >
                Acessar Portal
              </a>
            </div>
          </div>

          {/* Quick regularities stats */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 text-center">
            <div>
              <p className="text-2xl font-light font-mono text-indigo-400">{overtimesCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1 font-sans">H. Extras</p>
            </div>
            <div className="border-x border-slate-800/80 animate-fade">
              <p className="text-2xl font-light font-mono text-white">{onTimeCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1 font-sans">Exp. Justo</p>
            </div>
            <div>
              <p className="text-2xl font-light font-mono text-rose-400">{debitsCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1 font-sans">Em Débito</p>
            </div>
          </div>
        </div>

        {/* Right Column: Live shift log preview */}
        <div className="lg:col-span-4 p-8 bg-slate-900/90 [background-image:radial-gradient(ellipse_at_top,#201540_0%,transparent_70%)] border border-slate-800 text-white rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-indigo-500/[0.02] rounded-full opacity-10 select-none pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2.5 mb-5 select-none text-[10px] font-bold tracking-widest uppercase text-indigo-400">
              <Sparkles className="w-4 h-4 text-emerald-400 font-bold" />
              <span>LOGS DO DIA</span>
            </div>

            <h4 className="text-sm font-semibold mb-1">Passo a Passo de Hoje</h4>
            <p className="text-[11px] text-slate-400 mb-4 font-light">Seus horários registrados de hoje no banco:</p>
            
            {todayRecord ? (
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Entrada</span>
                  <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{todayRecord.entry}</span>
                </div>
                {todayRecord.lunchStart && (
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Almoço (Saída)</span>
                    <span className="text-slate-300">{todayRecord.lunchStart}</span>
                  </div>
                )}
                {todayRecord.lunchEnd && (
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Almoço (Retorno)</span>
                    <span className="text-slate-300">{todayRecord.lunchEnd}</span>
                  </div>
                )}
                {todayRecord.exit ? (
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-400">Saída Final</span>
                    <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{todayRecord.exit}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-400">Saída Final</span>
                    <span className="text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded text-[10px]">Expediente ativo</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-400 leading-relaxed font-sans font-light">
                  Sem batidas coletadas hoje ainda. Acesse a aba "Bater Ponto" para iniciar seu turno contratual de 44h.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px]">
            <span className="text-slate-400">Cálculo Acumulado de Hoje:</span>
            <span className="font-bold font-mono text-white text-xs bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{formatMinutesToTime(todayWorkedMinutes)}h</span>
          </div>
        </div>

      </div>
    </div>
  );
}
