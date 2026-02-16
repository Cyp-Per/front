import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  // Added flex, items-center, justify-center, and gap-2 to ensuring vertical centering of icons
  const baseStyles = "flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const variants = {
    primary: "bg-gradient-to-r from-[#141585] to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 focus:ring-indigo-500 border border-transparent",
    secondary: "bg-white text-indigo-900 hover:bg-gray-50 border border-gray-200 focus:ring-gray-200",
    outline: "bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};