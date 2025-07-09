import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  const widthClass = fullWidth ? 'w-full' : '';
  const iconPadding = leftIcon ? 'pl-10' : '';
  const rightIconPadding = rightIcon ? 'pr-10' : '';

  const classes = `${baseClasses} ${errorClasses} ${widthClass} ${iconPadding} ${rightIconPadding} ${className}`;

  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        <input
          ref={ref}
          className={classes}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{rightIcon}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 