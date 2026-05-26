/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart, Clock, Award, Coffee, Activity } from 'lucide-react';
import { TimePunchRecord } from '../types';
import { formatBalance, formatMinutesToTime, parseTimeToMinutes, formatFriendlyDate } from '../utils/timeCalculations';

interface AnalyticsProps {
  records: TimePunchRecord[];
}

export default function Analytics({ records }: AnalyticsProps) {
  // Safe array bounds: check if there are enough records
  const hasRecords = records.length > 0;

  // 1. Calculate Averages
  let avgEntryMinutes = 0;
  let avgLunchMinutes = 0;
  let avgExitMinutes = 0;
  let cleanRecordsCount = 0;
  let totalLogsCount = records.length;

  records.forEach((rec) => {
    const entryMin = parseTimeToMinutes(rec.entry);
    const exitMin = rec.exit ? parseTimeToMinutes(rec.exit) : 0;
    
    let lunchDur = 0;
    if (rec.lunchStart && rec.lunchEnd) {
      lunchDur = parseTimeToMinutes(rec.lunchEnd) - parseTimeToMinutes(rec.lunchStart);
    }

    if (entryMin > 0 && exitMin > 0) {
      avgEntryMinutes += entryMin;
      avgExitMinutes += exitMin;
      cleanRecordsCount++;
    }

    if (lunchDur > 0) {
      avgLunchMinutes += lunchDur;
    }
  });

  const formattedAvgEntry = cleanRecordsCount > 0 
    ? formatMinutesToTime(Math.round(avgEntryMinutes / cleanRecordsCount)) 
    : '--:--';

  const formattedAvgExit = cleanRecordsCount > 0 
    ? formatMinutesToTime(Math.round(avgExitMinutes / cleanRecordsCount)) 
    : '--:--';

  const formattedAvgLunch = cleanRecordsCount > 0 
    ? Math.round(avgLunchMinutes / cleanRecordsCount) 
    : 0;

  // 2. Weekly work hour summary
  // Get last 12 working days chronologically to plot beautiful bar structures
  const chartRecords = [...records]
    .filter((r) => r.workedMinutes > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  return (
    <div id="analytics-section" className="space-y-6">
      
      {/* Top statistics widgets grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
        
        {/* Metric A: Average entry clock */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Entrada Média</span>
            <span className="text-xl font-mono font-bold text-white block mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{formattedAvgEntry}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Entrada regular habitual</span>
          </div>
        </div>

        {/* Metric B: Average break clock */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className={`p-3 rounded-xl border ${formattedAvgLunch < 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Intervalo Médio</span>
            <span className="text-xl font-mono font-bold text-white block mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{formattedAvgLunch} min</span>
            <span className={`text-[10px] block mt-0.5 font-bold ${formattedAvgLunch < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formattedAvgLunch < 60 ? 'Limite abaixo do padrão' : 'Intervalo ideal CLT'}
            </span>
          </div>
        </div>

        {/* Metric C: Average exit clock */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Saída Média</span>
            <span className="text-xl font-mono font-bold text-white block mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{formattedAvgExit}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Fim de turno habitual</span>
          </div>
        </div>

        {/* Metric D: Regularity / Health percentage */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-slate-950 rounded-xl text-slate-300 border border-slate-800">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Total de Logs</span>
            <span className="text-xl font-mono font-bold text-white block mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{totalLogsCount} Dias</span>
            <span className="text-[10px] text-indigo-400 block mt-0.5 font-mono font-bold">Lançamentos arquivados</span>
          </div>
        </div>

      </div>

      {/* Main Bar Chart comparing Worked vs. Target */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 select-none">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Cronologia de Produção</h2>
            <h1 className="text-lg font-bold text-white mt-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Últimos 12 Dias Ativos</h1>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-indigo-500 rounded shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
              <span>Trabalhado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-slate-800 border border-slate-700 rounded" />
              <span>Meta Contratual</span>
            </div>
          </div>
        </div>

        {hasRecords ? (
          <div>
            {/* Custom Responsive Core Chart in vertical flex bars */}
            <div id="custom-vector-barchart" className="h-64 flex items-end justify-between gap-2 border-b border-l border-slate-800 pb-2 pl-3">
              {chartRecords.map((r, idx) => {
                const maxVal = 600; // max minutes in a standard work shift scaled visually (10 hours)
                const workedHeight = Math.min(100, Math.round((r.workedMinutes / maxVal) * 100));
                const targetHeight = Math.min(100, Math.round((r.targetMinutes / maxVal) * 100));
                
                const delta = r.balanceMinutes;
                
                return (
                  <div key={r.id || idx} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-default">
                    {/* Floating Detailed Hover Card */}
                    <div className="absolute bottom-full mb-3 bg-slate-950 text-white rounded-xl p-3 text-[10px] w-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl z-15 text-center border border-slate-800 leading-normal">
                      <p className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-indigo-400 font-mono">{formatFriendlyDate(r.date)}</p>
                      <p className="text-slate-300">Log: <strong className="font-mono text-white text-xs">{formatMinutesToTime(r.workedMinutes)}h</strong></p>
                      <p className="text-slate-300">Meta: <strong className="font-mono text-white text-xs">{formatMinutesToTime(r.targetMinutes)}h</strong></p>
                      <p className={`font-bold mt-2.5 pt-1.5 border-t border-slate-800 flex justify-center ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatBalance(delta).text}
                      </p>
                    </div>

                    {/* Bars stack overlay */}
                    <div className="w-full relative h-[90%] flex items-end justify-center">
                      {/* Target line shadow */}
                      <div 
                        className="w-[10px] bg-slate-800 rounded-t"
                        style={{ height: `${targetHeight}%` }}
                      />
                      {/* Real worked solid loader */}
                      <div 
                        className="w-[16px] bg-indigo-500 hover:bg-indigo-400 rounded-t relative transition-all duration-300 z-5 shadow-[0_0_8px_rgba(99,102,241,0.3)] hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        style={{ height: `${workedHeight}%` }}
                      />
                    </div>

                    {/* Footer label */}
                    <span className="text-[10px] text-slate-500 block font-mono font-semibold mt-2.5">
                      {r.date.split('-')[2]}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-mono font-semibold px-2 select-none">
              <span>{chartRecords[0] ? formatFriendlyDate(chartRecords[0].date) : ''}</span>
              <span>{chartRecords[chartRecords.length - 1] ? formatFriendlyDate(chartRecords[chartRecords.length - 1].date) : ''}</span>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl select-none bg-slate-950/20">
            <div className="text-center max-w-xs p-6">
              <BarChart className="w-8 h-8 text-slate-650 text-slate-650 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Histórico Insuficiente</p>
              <p className="text-xxs text-slate-500 mt-1.5 leading-relaxed">Adicione lançamentos diários na contabilidade de banco de horas para gerar análises e gráficos.</p>
            </div>
          </div>
        )}
      </div>

      {/* Habits & Compliance Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none font-sans">
        
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-3 font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Comportamento de Compensação</h4>
          </div>

          <p className="text-xxs text-slate-400 leading-normal mb-5 font-light">
            Estatística proporcional com base na distribuição do saldo acumulado do seu cartão de ponto.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xxs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide font-mono">
                <span>Horas Extras Aditadas</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {records.filter(r => r.balanceMinutes > 0).length} Dias ({records.length > 0 ? Math.round((records.filter(r => r.balanceMinutes > 0).length / records.length) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${records.length > 0 ? (records.filter(r => r.balanceMinutes > 0).length / records.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xxs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide font-mono">
                <span>Déficits para Compensar</span>
                <span className="text-rose-400 font-bold font-mono">
                  {records.filter(r => r.balanceMinutes < 0).length} Dias ({records.length > 0 ? Math.round((records.filter(r => r.balanceMinutes < 0).length / records.length) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                  style={{ width: `${records.length > 0 ? (records.filter(r => r.balanceMinutes < 0).length / records.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quality indicator / streak card */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-transparent pb-1 font-mono">
              <Award className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Dicas da Legislação e Ergonomia</h4>
            </div>

            <p className="text-xxs text-slate-400 leading-normal font-light">
              Dicas automáticas com base na sua rotina diária inserida:
            </p>

            <div className="mt-4 space-y-3 font-sans">
              <div className="flex gap-2.5 items-start text-xxs text-slate-355 text-slate-300 leading-normal">
                <span className="inline-block w-2 h-2 rounded bg-indigo-505 bg-indigo-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                <span>Garanta pelo menos <strong>1 hora</strong> de intervalo na pausa de almoço para assegurar higiene no trabalho.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xxs text-slate-355 text-slate-300 leading-normal">
                <span className="inline-block w-2 h-2 rounded bg-indigo-505 bg-indigo-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                <span>O limite constitucional máximo de horas extras diárias é de <strong>2 horas</strong>. Evite fadiga!</span>
              </div>
            </div>
          </div>

          <div className="text-xxs text-slate-500 pt-4 border-t border-slate-800 mt-4 flex justify-between uppercase tracking-wider font-semibold font-mono">
            <span>Categoria de Rotina:</span>
            <span className="font-bold text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]">Usuário CLT Regular</span>
          </div>
        </div>
      </div>

    </div>
  );
}
