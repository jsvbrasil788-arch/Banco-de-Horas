/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Coffee, Sun, CheckCircle, Plus, Sparkles, FileText, Trash2 } from 'lucide-react';
import { TimePunchRecord } from '../types';
import { formatMinutesToTime, getPortugueseWeekday } from '../utils/timeCalculations';

interface ClockPuncherProps {
  todayRecord: TimePunchRecord | undefined;
  onSaveRecord: (record: Omit<TimePunchRecord, 'workedMinutes' | 'balanceMinutes'>) => void;
  onDeleteRecord: (id: string) => void;
  dailyTarget: number;
}

export default function ClockPuncher({
  todayRecord,
  onSaveRecord,
  onDeleteRecord,
  dailyTarget,
}: ClockPuncherProps) {
  const [time, setTime] = useState<Date>(new Date());
  const [manualMode, setManualMode] = useState<boolean>(false);
  
  // Local state for punches (can be preset from todayRecord or typed)
  const [entry, setEntry] = useState<string>('');
  const [lunchStart, setLunchStart] = useState<string>('');
  const [lunchEnd, setLunchEnd] = useState<string>('');
  const [exit, setExit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Sync state if todayRecord changes
  useEffect(() => {
    if (todayRecord) {
      setEntry(todayRecord.entry || '');
      setLunchStart(todayRecord.lunchStart || '');
      setLunchEnd(todayRecord.lunchEnd || '');
      setExit(todayRecord.exit || '');
      setNotes(todayRecord.notes || '');
    } else {
      setEntry('');
      setLunchStart('');
      setLunchEnd('');
      setExit('');
      setNotes('');
    }
  }, [todayRecord]);

  // Keep digital clock running
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format digital clock
  const formattedTime = time.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate current stage
  let activeStage: 'entry' | 'lunchStart' | 'lunchEnd' | 'exit' | 'completed' = 'entry';
  if (!entry) {
    activeStage = 'entry';
  } else if (!lunchStart) {
    activeStage = 'lunchStart';
  } else if (!lunchEnd) {
    activeStage = 'lunchEnd';
  } else if (!exit) {
    activeStage = 'exit';
  } else {
    activeStage = 'completed';
  }

  // Handle rapid clock punch using the active real-time value
  const handleInstantPunch = () => {
    const curHours = String(time.getHours()).padStart(2, '0');
    const curMinutes = String(time.getMinutes()).padStart(2, '0');
    const currentClockTime = `${curHours}:${curMinutes}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const currentId = todayRecord?.id || `record-${todayStr}`;

    const newRecord: Omit<TimePunchRecord, 'workedMinutes' | 'balanceMinutes'> = {
      id: currentId,
      date: todayStr,
      entry: activeStage === 'entry' ? currentClockTime : entry,
      lunchStart: activeStage === 'lunchStart' ? currentClockTime : lunchStart || undefined,
      lunchEnd: activeStage === 'lunchEnd' ? currentClockTime : lunchEnd || undefined,
      exit: activeStage === 'exit' ? currentClockTime : exit || undefined,
      notes: notes || undefined,
      targetMinutes: dailyTarget,
      isHolidayOrOff: false,
    };

    onSaveRecord(newRecord);
  };

  // Convert number to HH:MM helper
  const getDailyTargetFormatted = () => {
    return formatMinutesToTime(dailyTarget);
  };

  // Process manual form submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentId = todayRecord?.id || `record-${todayStr}`;

    onSaveRecord({
      id: currentId,
      date: todayStr,
      entry,
      lunchStart: lunchStart || undefined,
      lunchEnd: lunchEnd || undefined,
      exit: exit || undefined,
      notes: notes || undefined,
      targetMinutes: dailyTarget,
      isHolidayOrOff: false,
    });
    setManualMode(false);
  };

  const handleClearToday = () => {
    if (todayRecord) {
      if (confirm('Deseja realmente apagar os registros do dia de hoje?')) {
        onDeleteRecord(todayRecord.id);
      }
    }
  };

  // Formulate badge style for status
  const getStatusBadge = () => {
    switch (activeStage) {
      case 'entry':
        return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500/20">Aguardando</span>;
      case 'lunchStart':
        return <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-500/20">Em Expediente</span>;
      case 'lunchEnd':
        return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/20">Em Almoço</span>;
      case 'exit':
        return <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-500/20">Expediente Tarde</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-450 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/20">Concluído</span>;
    }
  };

  return (
    <div id="clock-punch-container" className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xs overflow-hidden h-full">
      
      {/* Top Banner with Clock - Indigo Geometric style */}
      <div className="bg-indigo-950/40 border-b border-slate-800 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none select-none">
          <Sparkles className="w-24 h-24 text-white" />
        </div>
        
        <p className="text-[11px] font-bold tracking-widest text-indigo-400 uppercase mb-1">{formattedDate}</p>
        <h2 className="text-4xl font-extralight tracking-tight font-mono text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] my-2">
          {formattedTime}
        </h2>
        
        <div className="flex items-center justify-center gap-2 mt-4 select-none">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Fuso Horário Local (GMT-3)</p>
        </div>
      </div>

      {/* Main Punch UI */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider select-none">Bater Ponto Hoje</h3>
            <p className="text-xxs text-slate-400 mt-1 leading-none">Meta diária: <strong className="text-indigo-400 font-bold font-mono">{getDailyTargetFormatted()}h</strong> • {getPortugueseWeekday(new Date().toISOString().split('T')[0])}</p>
          </div>
          {getStatusBadge()}
        </div>

        {!manualMode ? (
          <div>
            {/* Standard Big Touch / Punch Button */}
            {activeStage !== 'completed' ? (
              <button
                id="btn-punch-instant"
                onClick={handleInstantPunch}
                className="w-full flex flex-col items-center justify-center p-6 bg-indigo-600 hover:bg-indigo-550 active:scale-[0.98] transition-all text-white rounded-2xl shadow-md shadow-indigo-650/15 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] border border-indigo-500/30 cursor-pointer gap-2.5 text-center"
              >
                {activeStage === 'entry' && (
                  <>
                    <Play className="w-6 h-6 fill-current text-emerald-300" />
                    <span className="font-bold text-base uppercase tracking-wider">Registrar Entrada</span>
                    <span className="text-xxs text-indigo-100 font-light leading-none">Clique para marcar seu horário de início</span>
                  </>
                )}
                {activeStage === 'lunchStart' && (
                  <>
                    <Coffee className="w-6 h-6 text-emerald-300" />
                    <span className="font-bold text-base uppercase tracking-wider">Início do Almoço</span>
                    <span className="text-xxs text-indigo-100 font-light leading-none">Clique para sair para pausa alimentar</span>
                  </>
                )}
                {activeStage === 'lunchEnd' && (
                  <>
                    <Sun className="w-6 h-6 text-emerald-300" />
                    <span className="font-bold text-base uppercase tracking-wider">Retorno do Almoço</span>
                    <span className="text-xxs text-indigo-100 font-light leading-none">Clique ao retornar do intervalo</span>
                  </>
                )}
                {activeStage === 'exit' && (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-300" />
                    <span className="font-bold text-base uppercase tracking-wider">Registrar Saída</span>
                    <span className="text-xxs text-indigo-100 font-light leading-none">Clique para encerrar o expediente</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/20 text-center rounded-2xl mb-4 select-none">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Ponto Fechado com Sucesso!</h4>
                <p className="text-xxs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Todos os 4 horários padrão estão colhidos para o dia de hoje.
                </p>
              </div>
            )}

            {/* Timestamps visual checkmark */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="p-4 bg-slate-950/65 border border-slate-800 rounded-xl transition-all hover:border-indigo-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Entrada</span>
                <p className="text-lg font-mono font-bold text-white mt-1 select-all">
                  {entry || '--:--'}
                </p>
              </div>
              <div className="p-4 bg-slate-950/65 border border-slate-800 rounded-xl transition-all hover:border-indigo-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Alm. Início</span>
                <p className="text-lg font-mono font-bold text-white mt-1 select-all">
                  {lunchStart || '--:--'}
                </p>
              </div>
              <div className="p-4 bg-slate-950/65 border border-slate-800 rounded-xl transition-all hover:border-indigo-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Alm. Fim</span>
                <p className="text-lg font-mono font-bold text-white mt-1 select-all">
                  {lunchEnd || '--:--'}
                </p>
              </div>
              <div className="p-4 bg-slate-950/65 border border-slate-800 rounded-xl transition-all hover:border-indigo-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Saída</span>
                <p className="text-lg font-mono font-bold text-white mt-1 select-all">
                  {exit || '--:--'}
                </p>
              </div>
            </div>

            {/* Note text input */}
            {todayRecord && (
              <div className="mt-5 flex items-center gap-3 border-t border-slate-800 pt-4">
                <FileText className="w-4 h-4 text-slate-450 shrink-0" />
                <input
                  type="text"
                  placeholder="Observação da batida (ex: Home Office, Viagem)"
                  value={notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    onSaveRecord({
                      ...todayRecord,
                      notes: val || undefined,
                    });
                  }}
                  className="w-full text-xs text-slate-300 focus:outline-hidden bg-transparent placeholder-slate-500"
                />
              </div>
            )}

            {/* Quick buttons toolbar */}
            <div className="flex gap-3 mt-6">
              <button
                id="btn-toggle-manual-mode"
                onClick={() => setManualMode(true)}
                className="flex-1 py-3 text-center text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajuste Manual
              </button>
              {todayRecord && (
                <button
                  id="btn-clear-today"
                  onClick={handleClearToday}
                  title="Apagar dados de hoje"
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Manual time input/adjust form */
          <form id="form-manual-punch" onSubmit={handleManualSubmit} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-2 font-mono">Ajuste Manual Contínuo</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">1. Entrada</label>
                <input
                  type="time"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">2. Alm. Saída</label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">3. Alm. Retorno</label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">4. Saída</label>
                <input
                  type="time"
                  value={exit}
                  onChange={(e) => setExit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Observações adicionais</label>
              <input
                type="text"
                placeholder="Exemplo: Home office, Visita externa, Viagem"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                id="btn-cancel-manual"
                onClick={() => setManualMode(false)}
                className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-850 hover:bg-slate-700/60 border border-slate-750 border-slate-850 border-slate-700 text-slate-350 text-slate-350 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                id="btn-save-manual"
                className="flex-1 py-2.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-500/20"
              >
                Salvar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
