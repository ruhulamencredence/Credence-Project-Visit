
import React from 'react';

interface SuggestedTagProps {
  label: string;
  colorClasses: {
    bg: string;
    text: string;
    border: string;
  };
  icon?: React.ReactNode;
}

const SuggestedTag: React.FC<SuggestedTagProps> = ({ label, colorClasses, icon }) => (
  <span
    className={`inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}
  >
    {icon}
    {label}
  </span>
);

export default SuggestedTag;
