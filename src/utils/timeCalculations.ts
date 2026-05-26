/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyHoursTarget, WorkWeekScheme, TimePunchRecord } from '../types';

// Convert HH:MM string to absolute minutes from 00:00
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

// Convert absolute minutes to HH:MM format
export function formatMinutesToTime(minutes: number): string {
  if (minutes < 0) minutes = 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Format minutes to pretty signed time string (e.g., "+08:48", "-01h 15m")
export function formatBalance(minutes: number): {
  text: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
} {
  const isZero = minutes === 0;
  const isNegative = minutes < 0;
  const isPositive = minutes > 0;
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const mins = absoluteMinutes % 60;

  const sign = isPositive ? '+' : isNegative ? '-' : '';
  const text = `${sign}${hours}h ${String(mins).padStart(2, '0')}m`;

  return { text, isPositive, isNegative, isZero };
}

// Calculates worked minutes based on four punch options
export function calculateWorkedMinutes(
  entry: string,
  lunchStart?: string,
  lunchEnd?: string,
  exit?: string
): number {
  const entryMin = parseTimeToMinutes(entry);
  const lunchStartMin = lunchStart ? parseTimeToMinutes(lunchStart) : 0;
  const lunchEndMin = lunchEnd ? parseTimeToMinutes(lunchEnd) : 0;
  const exitMin = exit ? parseTimeToMinutes(exit) : 0;

  if (entryMin === 0) return 0;

  // Case 1: All 4 punches registered
  if (entryMin > 0 && lunchStartMin > 0 && lunchEndMin > 0 && exitMin > 0) {
    const morningShift = Math.max(0, lunchStartMin - entryMin);
    const afternoonShift = Math.max(0, exitMin - lunchEndMin);
    return morningShift + afternoonShift;
  }

  // Case 2: Only Entry and Exit registered (e.g. no lunch break, or auto deducted)
  if (entryMin > 0 && exitMin > 0 && lunchStartMin === 0 && lunchEndMin === 0) {
    return Math.max(0, exitMin - entryMin);
  }

  // Case 3: Partial day (Entry and Lunch start logged, but lunch hasn't finished yet)
  if (entryMin > 0 && lunchStartMin > 0 && lunchEndMin === 0 && exitMin === 0) {
    return Math.max(0, lunchStartMin - entryMin);
  }

  // Case 4: Partial day after return from lunch (Entry, Lunch Start, Lunch End logged, but not exit yet)
  if (entryMin > 0 && lunchStartMin > 0 && lunchEndMin > 0 && exitMin === 0) {
    return Math.max(0, lunchStartMin - entryMin);
  }

  // Case 5: Standard simple fallback if only entry and one other punch exists
  if (entryMin > 0 && exitMin === 0) {
    const finalKnownTime = lunchEndMin || lunchStartMin;
    if (finalKnownTime > entryMin) {
      return finalKnownTime - entryMin;
    }
  }

  return 0;
}

// Generate default daily targets for the 44h schemes
export function getDefaultTargets(scheme: WorkWeekScheme): DailyHoursTarget[] {
  switch (scheme) {
    case 'balanced5day':
      // 5 days of 8h48m (8 * 60 + 48 = 528 minutes)
      // Sat & Sun are 0 target
      return [
        { dayOfWeek: 0, targetMinutes: 0, label: 'Domingo' },
        { dayOfWeek: 1, targetMinutes: 528, label: 'Segunda-feira' },
        { dayOfWeek: 2, targetMinutes: 528, label: 'Terça-feira' },
        { dayOfWeek: 3, targetMinutes: 528, label: 'Quarta-feira' },
        { dayOfWeek: 4, targetMinutes: 528, label: 'Quinta-feira' },
        { dayOfWeek: 5, targetMinutes: 528, label: 'Sexta-feira' },
        { dayOfWeek: 6, targetMinutes: 0, label: 'Sábado' },
      ];
    case 'classic6day':
      // 5 days of 8h (480 minutes) + Saturday 4h (240 minutes)
      return [
        { dayOfWeek: 0, targetMinutes: 0, label: 'Domingo' },
        { dayOfWeek: 1, targetMinutes: 480, label: 'Segunda-feira' },
        { dayOfWeek: 2, targetMinutes: 480, label: 'Terça-feira' },
        { dayOfWeek: 3, targetMinutes: 480, label: 'Quarta-feira' },
        { dayOfWeek: 4, targetMinutes: 480, label: 'Quinta-feira' },
        { dayOfWeek: 5, targetMinutes: 480, label: 'Sexta-feira' },
        { dayOfWeek: 6, targetMinutes: 240, label: 'Sábado' },
      ];
    case 'custom':
      // default customizable target (summing to 44h = 2640 min)
      // using e.g. 5 days of 8h and 1 day of 4h
      return [
        { dayOfWeek: 0, targetMinutes: 0, label: 'Domingo' },
        { dayOfWeek: 1, targetMinutes: 480, label: 'Segunda-feira' },
        { dayOfWeek: 2, targetMinutes: 480, label: 'Terça-feira' },
        { dayOfWeek: 3, targetMinutes: 480, label: 'Quarta-feira' },
        { dayOfWeek: 4, targetMinutes: 480, label: 'Quinta-feira' },
        { dayOfWeek: 5, targetMinutes: 480, label: 'Sexta-feira' },
        { dayOfWeek: 6, targetMinutes: 240, label: 'Sábado' },
      ];
  }
}

// Helper to get day name in Portuguese
export function getPortugueseWeekday(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // set mid day to prevent timezone shifts
  const weekdays = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return weekdays[date.getDay()];
}

// Format Date to friendly localized format (e.g. "Terça, 26 de Mai")
export function formatFriendlyDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const weekday = getPortugueseWeekday(dateStr).split('-')[0]; // "Segunda" instead of "Segunda-feira"
  return `${weekday}, ${day} ${month}`;
}

// Generate sample data for demo mode
export function generateSampleData(scheme: WorkWeekScheme, initialBalanceMin: number): TimePunchRecord[] {
  const records: TimePunchRecord[] = [];
  const today = new Date();
  const targets = getDefaultTargets(scheme);

  // Generate for the last 20 weekdays
  let daysGenerated = 0;
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday

  while (daysGenerated < 18) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    const target = targets.find((t) => t.dayOfWeek === dayOfWeek)?.targetMinutes || 0;

    if (dayOfWeek !== 0 && (dayOfWeek !== 6 || scheme === 'classic6day')) {
      // It's a working day
      daysGenerated++;

      // Introduce some random variations to mock standard/overtime work
      // workedMinutes can be exactly target, slightly off (extra hours or negative), or occasionally half day
      let workedMin = target;
      let rand = Math.random();

      let entry = '08:00';
      let lunchStart = '12:00';
      let lunchEnd = '13:00';
      let exit = '17:00';

      if (target === 528) {
        // 8h48m
        entry = '08:00';
        lunchStart = '12:00';
        lunchEnd = '13:00';
        // Target is 8h48m, so normal exit is 17:48
        if (rand < 0.3) {
          // Exactly target
          exit = '17:48';
          workedMin = 528;
        } else if (rand < 0.6) {
          // Overtime (e.g., worked 9h 15m) -> exit at 18:15
          exit = '18:15';
          workedMin = calculateWorkedMinutes(entry, lunchStart, lunchEnd, exit);
        } else if (rand < 0.8) {
          // Negative balance (e.g. worked 8h) -> exit at 17:00
          exit = '17:00';
          workedMin = calculateWorkedMinutes(entry, lunchStart, lunchEnd, exit);
        } else {
          // Home office or slightly different lunch
          lunchStart = '12:00';
          lunchEnd = '13:30';
          exit = '18:18';
          workedMin = calculateWorkedMinutes(entry, lunchStart, lunchEnd, exit);
        }
      } else if (target === 480) {
        // 8h
        entry = '08:00';
        lunchStart = '12:00';
        lunchEnd = '13:00';
        // Normal exit is 17:00
        if (rand < 0.4) {
          exit = '17:00';
          workedMin = 480;
        } else if (rand < 0.7) {
          // Overtime
          exit = '17:45';
          workedMin = calculateWorkedMinutes(entry, lunchStart, lunchEnd, exit);
        } else {
          // Trailing minutes
          exit = '16:40';
          workedMin = calculateWorkedMinutes(entry, lunchStart, lunchEnd, exit);
        }
      } else if (target === 240) {
        // 4h (Saturdays usually don't have lunch)
        entry = '08:00';
        lunchStart = '';
        lunchEnd = '';
        if (rand < 0.5) {
          exit = '12:00';
          workedMin = 240;
        } else {
          exit = '12:30'; // overtime Sat
          workedMin = 270;
        }
      }

      records.push({
        id: `sample-${daysGenerated}-${dateStr}`,
        date: dateStr,
        entry,
        lunchStart: lunchStart || undefined,
        lunchEnd: lunchEnd || undefined,
        exit,
        targetMinutes: target,
        workedMinutes: workedMin,
        balanceMinutes: workedMin - target,
        isHolidayOrOff: false,
        notes: rand > 0.85 ? 'Hora extra autorizada' : rand < 0.15 ? 'Consulta médica' : undefined,
      });
    } else {
      // Weekend / Rest day (Target and Worked = 0)
      // Occasional extra work on Saturdays or Sundays with 100% bank load
      if (Math.random() > 0.95) {
        records.push({
          id: `sample-weekend-${dateStr}`,
          date: dateStr,
          entry: '09:00',
          lunchStart: undefined,
          lunchEnd: undefined,
          exit: '13:00',
          targetMinutes: 0,
          workedMinutes: 240,
          balanceMinutes: 240,
          isHolidayOrOff: true,
          notes: 'Mutirão técnico',
        });
      }
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Sort chronologically ascending for standard view or list, 
  // but we will order reverse chronological in the table
  return records.sort((a, b) => b.date.localeCompare(a.date));
}
