import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

const CHART_COLORS = {
  green:  { border: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  red:    { border: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  blue:   { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  orange: { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { color: '#000000', font: { size: 11 }, boxWidth: 12 } },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#0f172a',
      bodyColor: '#000000',
      borderColor: '#e2e8f0',
      borderWidth: 1,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#000000', font: { size: 11 } } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#000000', font: { size: 11 } } },
  },
};

// ── Attendance Trend Line (weekly or daily) ────────────────────────────────
// Accepts graphData = { labels, datasets: [{label, data}, ...] }
export function AttendanceTrendChart({ graphData }) {
  if (!graphData?.labels?.length) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-800">No data</div>;
  }
  const colorKeys = [CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.blue];
  const datasets = (graphData.datasets || []).map((ds, i) => {
    const c = colorKeys[i % colorKeys.length];
    return {
      label: ds.label,
      data: ds.data,
      borderColor: c.border,
      backgroundColor: c.bg,
      fill: i === 0,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: c.border,
    };
  });
  const data = { labels: graphData.labels, datasets };
  return <Line data={data} options={{ ...BASE_OPTIONS, plugins: { ...BASE_OPTIONS.plugins } }} />;
}

// ── 30-day Attendance Line (rate %) ───────────────────────────────────────
export function AttendanceRateLine({ chartData }) {
  if (!chartData?.labels?.length) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-800">No data</div>;
  }
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: chartData.rate,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true, tension: 0.4, pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
      },
    ],
  };
  const options = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins, legend: { display: false } },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, min: 0, max: 100,
           ticks: { ...BASE_OPTIONS.scales.x.ticks, callback: v => `${v}%` } },
    },
  };
  return <Line data={data} options={options} />;
}

// ── Present vs Absent Bar ─────────────────────────────────────────────────
export function PresentAbsentBar({ chartData }) {
  if (!chartData?.labels?.length) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-800">No data</div>;
  }
  const data = {
    labels: chartData.labels,
    datasets: [
      { label: 'Present', data: chartData.present, backgroundColor: '#10b981' },
      { label: 'Absent',  data: chartData.absent,  backgroundColor: '#ef4444' },
    ],
  };
  return <Bar data={data} options={{ ...BASE_OPTIONS, scales: { ...BASE_OPTIONS.scales, x: { ...BASE_OPTIONS.scales.x, stacked: true }, y: { ...BASE_OPTIONS.scales.y, stacked: true } } }} />;
}

// ── Class-wise Attendance Bar ─────────────────────────────────────────────
export function ClassWiseBar({ data: rows }) {
  if (!rows?.length) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-800">No data</div>;
  }
  const data = {
    labels: rows.map(r => r.class_name),
    datasets: [{
      label: 'Attendance Rate (%)',
      data: rows.map(r => r.attendance_rate),
      backgroundColor: rows.map(r => r.attendance_rate >= 85 ? 'rgba(16,185,129,0.8)' : r.attendance_rate >= 70 ? 'rgba(245,158,11,0.8)' : 'rgba(239,68,68,0.8)'),
    }],
  };
  const options = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins, legend: { display: false } },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, min: 0, max: 100,
           ticks: { ...BASE_OPTIONS.scales.x.ticks, callback: v => `${v}%` } },
    },
  };
  return <Bar data={data} options={options} />;
}

// ── Section-wise Attendance Bar ───────────────────────────────────────────
export function SectionWiseBar({ data: rows }) {
  if (!rows?.length) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-800">No data</div>;
  }
  const data = {
    labels: rows.map(r => r.label),
    datasets: [{
      label: 'Attendance Rate (%)',
      data: rows.map(r => r.attendance_rate),
      backgroundColor: rows.map(r => r.attendance_rate >= 85 ? 'rgba(16,185,129,0.8)' : r.attendance_rate >= 70 ? 'rgba(245,158,11,0.8)' : 'rgba(239,68,68,0.8)'),
    }],
  };
  const options = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins, legend: { display: false } },
    indexAxis: 'y',
    scales: {
      x: { ...BASE_OPTIONS.scales.x, min: 0, max: 100, ticks: { ...BASE_OPTIONS.scales.x.ticks, callback: v => `${v}%` } },
      y: { ...BASE_OPTIONS.scales.y, ticks: { color: '#000000', font: { size: 10 } } },
    },
  };
  return <Bar data={data} options={options} />;
}

// ── Risk Breakdown Doughnut ───────────────────────────────────────────────
export function RiskBreakdownDoughnut({ breakdown }) {
  const safe   = breakdown?.SAFE   || 0;
  const yellow = breakdown?.YELLOW || 0;
  const orange = breakdown?.ORANGE || 0;
  const red    = breakdown?.RED    || 0;
  const data = {
    labels: ['Safe (0-39)', 'Low Risk (40-60)', 'Medium Risk (61-80)', 'High Risk (81-100)'],
    datasets: [{
      data: [safe, yellow, orange, red],
      backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 0,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#000000', font: { size: 11 }, boxWidth: 12 } },
    },
    cutout: '70%',
  };
  return <Doughnut data={data} options={options} />;
}

// ── Risk Doughnut (for Teacher Analytics) ────────────────────────────────
export function RiskDoughnut({ risk }) {
  const data = {
    labels: ['Safe', 'Low', 'Medium', 'High'],
    datasets: [{
      data: [risk?.Safe || 0, risk?.Low || 0, risk?.Medium || 0, risk?.High || 0],
      backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 0,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#000000', font: { size: 11 }, boxWidth: 12 } },
    },
    cutout: '65%',
  };
  return <Doughnut data={data} options={options} />;
}

// ── Legacy: SchoolComparisonBar (kept for compatibility) ──────────────────
export function SchoolComparisonBar({ schools }) {
  const labels = schools?.map(s => s.name?.replace('Govt ', '')) || [];
  const rates  = schools?.map(s => s.attendance_rate) || [];
  const data = {
    labels,
    datasets: [{
      label: 'Attendance Rate (%)',
      data: rates,
      backgroundColor: rates.map(r => r > 85 ? 'rgba(37,99,235,0.8)' : 'rgba(30,58,138,0.8)'),
    }],
  };
  return <Bar data={data} options={BASE_OPTIONS} />;
}
