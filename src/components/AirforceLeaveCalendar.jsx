import React, { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";

// ✈️ 기수별 입대/수료/전역일 데이터 (853~874)
const CLASS_TABLE = {
  853: { enlist: "2023-12-04", graduate: undefined,           discharge: "2025-09-03" },
  854: { enlist: "2024-01-08", graduate: "2024-02-08", discharge: "2025-10-07" },
  855: { enlist: "2024-02-13", graduate: "2024-03-15", discharge: "2025-11-12" },
  856: { enlist: "2024-03-18", graduate: "2024-04-19", discharge: "2025-12-17" },
  857: { enlist: "2024-04-22", graduate: "2024-05-24", discharge: "2026-01-21" },
  858: { enlist: "2024-05-27", graduate: "2024-06-28", discharge: "2026-02-26" },
  859: { enlist: "2024-07-01", graduate: "2024-08-02", discharge: "2026-03-31" },
  860: { enlist: "2024-08-05", graduate: "2024-09-06", discharge: "2026-05-04" },
  861: { enlist: "2024-09-09", graduate: "2024-10-11", discharge: "2026-06-08" },
  862: { enlist: "2024-10-14", graduate: "2024-11-15", discharge: "2026-07-13" },
  863: { enlist: "2024-11-18", graduate: "2024-12-20", discharge: "2026-08-17" },
  864: { enlist: "2024-12-23", graduate: "2025-01-23", discharge: "2026-09-22" },
  865: { enlist: "2025-02-03", graduate: "2025-03-07", discharge: "2026-11-02" },
  866: { enlist: "2025-03-10", graduate: "2025-04-11", discharge: "2026-12-09" },
  867: { enlist: "2025-04-14", graduate: "2025-05-16", discharge: "2027-01-13" },
  868: { enlist: "2025-05-19", graduate: "2025-06-20", discharge: "2027-02-18" },
  869: { enlist: "2025-06-23", graduate: "2025-07-25", discharge: "2027-03-22" },
  870: { enlist: "2025-07-28", graduate: "2025-08-29", discharge: "2027-04-27" },
  871: { enlist: "2025-09-01", graduate: "2025-10-02", discharge: "2027-05-31" },
  872: { enlist: "2025-10-13", graduate: "2025-11-14", discharge: "2027-07-12" },
  873: { enlist: "2025-11-17", graduate: "2025-12-19", discharge: "2027-08-16" },
  874: { enlist: "2025-12-22", graduate: "2026-01-23", discharge: "2027-09-21" },
};

function computeGraduateFallback(enlistISO) {
  const enlist = parseISO(enlistISO);
  return addDays(enlist, 35);
}

// 🔁 성과제 외박 규칙
// • 6주 사이클: 첫 외박 2박3일, 이후 외박 2박3일, 마지막은 +1일 → 3박4일
// • 8주 사이클: 첫 외박 2박3일, 이후 외박 3박4일, 마지막은 +1일 → 4박5일
// • 사이클 계산은 수료일부터 주기*n으로 진행 (외박 기간 포함)
function genPerformanceLeaves(graduateISO, dischargeISO, cycleWeeks) {
  const grad = parseISO(graduateISO);
  const discharge = parseISO(dischargeISO);

  const spans = [];

  let i = 1;
  let start = grad;
  let end = addDays(start, 2); // 첫 외박은 2박3일 고정
  spans.push({ start, end, idx: i });

  while (true) {
    i++;
    start = addWeeks(grad, cycleWeeks * (i - 1));
    if (start > discharge) break;

    // 사이클에 따른 기본 기간 설정
    if (cycleWeeks === 6) {
      end = addDays(start, 2); // 2박3일
    } else {
      end = addDays(start, 3); // 3박4일
    }

    const nextStart = addWeeks(grad, cycleWeeks * i);
    if (nextStart > discharge) {
      // 마지막 외박은 +1일
      end = cycleWeeks === 6 ? addDays(start, 3) : addDays(start, 4);
    }

    spans.push({ start, end, idx: i });
  }

  return spans;
}

function MonthGrid({ monthDate, leaves, enlistDate, graduateDate, dischargeDate }) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  const isMarked = (d) => leaves.some((s) => isWithinInterval(d, { start: s.start, end: s.end }));

  const badge = (d) => {
    if (enlistDate && isSameDay(d, enlistDate))
      return <span className="ml-1 rounded-full bg-blue-500 text-white text-[10px] px-1.5">입대</span>;
    if (graduateDate && isSameDay(d, graduateDate))
      return <span className="ml-1 rounded-full bg-green-600 text-white text-[10px] px-1.5">수료</span>;
    if (dischargeDate && isSameDay(d, dischargeDate))
      return <span className="ml-1 rounded-full bg-rose-600 text-white text-[10px] px-1.5">전역</span>;
    return null;
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 shadow-md p-4 bg-gradient-to-br from-slate-50 to-white">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-700">{format(monthDate, "yyyy.MM")}</h3>
        <div className="text-xs text-slate-400">일 월 화 수 목 금 토</div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === monthDate.getMonth();
          const leave = isMarked(d);
          return (
            <div
              key={i}
              className={[
                "relative h-20 rounded-xl border text-sm flex flex-col items-start p-2 transition-all duration-200",
                inMonth ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400",
                leave ? "ring-2 ring-offset-2 ring-purple-400 bg-purple-50" : "hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center">
                <span className="font-medium text-slate-700">{format(d, "d")}</span>
                {badge(d)}
              </div>
              {leave && (
                <div className="absolute bottom-1 right-2 text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded px-1.5 shadow-sm">
                  외박
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AirforceLeaveCalendar() {
  const defaultGi = 859;
  const [gi, setGi] = useState(defaultGi);
  const [cycle, setCycle] = useState(6); // 6주 or 8주 선택

  const [enlist, setEnlist] = useState(CLASS_TABLE[defaultGi]?.enlist ?? "");
  const [graduate, setGraduate] = useState(CLASS_TABLE[defaultGi]?.graduate ?? "");
  const [discharge, setDischarge] = useState(CLASS_TABLE[defaultGi]?.discharge ?? "");

  useEffect(() => {
    const row = CLASS_TABLE[gi];
    if (row) {
      setEnlist(row.enlist);
      setGraduate(row.graduate ?? "");
      setDischarge(row.discharge);
    }
  }, [gi]);

  const enlistDate = useMemo(() => (enlist ? parseISO(enlist) : null), [enlist]);
  const graduateDate = useMemo(() => {
    if (graduate && graduate.length) return parseISO(graduate);
    if (enlist) return computeGraduateFallback(enlist);
    return null;
  }, [graduate, enlist]);
  const dischargeDate = useMemo(() => (discharge ? parseISO(discharge) : null), [discharge]);

  const leaves = useMemo(() => {
    if (!graduateDate || !dischargeDate) return [];
    return genPerformanceLeaves(format(graduateDate, "yyyy-MM-dd"), format(dischargeDate, "yyyy-MM-dd"), cycle);
  }, [graduateDate, dischargeDate, cycle]);

  const months = useMemo(() => {
    if (!enlistDate || !dischargeDate) return [];
    const arr = [];
    let cur = startOfMonth(enlistDate);
    const end = startOfMonth(dischargeDate);
    while (cur <= end) {
      arr.push(cur);
      cur = addMonths(cur, 1);
    }
    return arr;
  }, [enlistDate, dischargeDate]);

  return (
    <div className="mx-auto max-w-6xl p-6 text-slate-800">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800">공군 성과제 외박 캘린더</h1>
        <p className="text-sm text-slate-500 mt-1">
          6주 사이클: 첫 외박 <b>2박3일</b>, 이후 2박3일 반복, 마지막은 <b>3박4일</b><br />
          8주 사이클: 첫 외박 <b>2박3일</b>, 이후 3박4일 반복, 마지막은 <b>4박5일</b>
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 p-4 shadow bg-gradient-to-br from-white to-slate-50">
          <label className="text-sm font-medium text-slate-600">기수 선택</label>
          <select
            className="w-full mt-2 rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={gi}
            onChange={(e) => setGi(Number(e.target.value))}
          >
            {Object.keys(CLASS_TABLE).map((k) => (
              <option key={k} value={k}>
                {k}기
              </option>
            ))}
          </select>
          <label className="text-sm font-medium text-slate-600 mt-4 block">사이클 선택</label>
          <select
            className="w-full mt-2 rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={cycle}
            onChange={(e) => setCycle(Number(e.target.value))}
          >
            <option value={6}>6주</option>
            <option value={8}>8주</option>
          </select>
          <div className="mt-4 text-sm space-y-1 text-slate-700">
            <p>입대일: {enlistDate ? format(enlistDate, "yyyy.MM.dd (EEE)") : "-"}</p>
            <p>수료일: {graduateDate ? format(graduateDate, "yyyy.MM.dd (EEE)") : "-"}</p>
            <p>전역일: {dischargeDate ? format(dischargeDate, "yyyy.MM.dd (EEE)") : "-"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {months.map((m) => (
          <MonthGrid
            key={m.toISOString()}
            monthDate={m}
            leaves={leaves}
            enlistDate={enlistDate}
            graduateDate={graduateDate}
            dischargeDate={dischargeDate}
          />
        ))}
      </section>

      <footer className="mt-8 text-xs text-slate-400 text-center">
        * 수료일은 병무청 연간모집일정 PDF 기준(2024/2025) 반영, 853기는 임시 계산. 실제 부대 공지/행정 통보가 우선합니다.
      </footer>
    </div>
  );
}
