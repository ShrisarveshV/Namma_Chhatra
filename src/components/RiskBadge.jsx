import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';

export default function RiskBadge({ level, score, showScore = true }) {
  const normalizedLevel = (level || 'SAFE').toUpperCase();

  const badgeConfigs = {
    SAFE: {
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: ShieldCheck,
      label: 'SAFE'
    },
    YELLOW: {
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: AlertTriangle,
      label: 'YELLOW'
    },
    ORANGE: {
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: AlertCircle,
      label: 'ORANGE'
    },
    RED: {
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: ShieldAlert,
      label: 'RED ALERT'
    }
  };

  const config = badgeConfigs[normalizedLevel] || badgeConfigs.SAFE;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-80 border-l border-current pl-1.5">
          {score}%
        </span>
      )}
    </span>
  );
}
