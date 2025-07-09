import React from 'react';

const Loading = ({
  size = 'md',
  variant = 'spinner',
  className = '',
  text = '',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const spinnerClasses = `${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-600`;

  const dotsClasses = 'flex space-x-1';
  const dotClasses = `${sizes[size]} bg-primary-600 rounded-full animate-pulse`;

  const renderSpinner = () => (
    <div className={spinnerClasses} />
  );

  const renderDots = () => (
    <div className={dotsClasses}>
      <div className={`${dotClasses} animation-delay-0`} />
      <div className={`${dotClasses} animation-delay-150`} />
      <div className={`${dotClasses} animation-delay-300`} />
    </div>
  );

  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div className={`${sizes[size]} bg-gray-300 rounded`} />
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'skeleton':
        return renderSkeleton();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderLoader()}
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export default Loading; 