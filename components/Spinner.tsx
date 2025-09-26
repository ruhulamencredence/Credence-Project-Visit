import React from 'react';

interface SpinnerProps {
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className = 'h-10' }) => {
  // The className controls height, and CSS aspect-ratio handles width.
  // The animation and appearance are handled by global CSS in index.html.
  return (
    <div className={`loader ${className}`}></div>
  );
};

export default Spinner;