import React from 'react';

const Badge = ({ children, variant = "default" }) => {
  const getBadgeClass = () => {
    switch (variant) {
      case 'success':
        return 'badge-success';
      case 'warning':
        return 'badge-warning';
      case 'danger':
        return 'badge-danger';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {children}
    </span>
  );
};

export default Badge;
