import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ className = '', size = 24 }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <Loader2 
        size={size} 
        className="animate-spin text-blue-500" 
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>
  );
};

export default Loader;
