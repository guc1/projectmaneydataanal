import React from 'react';
import './SurfaceCard.css';

interface SurfaceCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  asButton?: boolean;
  children?: React.ReactNode;
}

const SurfaceCard: React.FC<SurfaceCardProps> = ({
  title,
  description,
  icon,
  footer,
  onClick,
  asButton = false,
  children
}) => {
  const Component = asButton ? 'button' : 'div';
  return (
    <Component className={`surface-card ${asButton ? 'clickable' : ''}`} onClick={onClick}>
      <div className="card-top">
        {icon && <div className="card-icon">{icon}</div>}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children && <div className="card-body">{children}</div>}
      {footer && <div className="card-footer">{footer}</div>}
    </Component>
  );
};

export default SurfaceCard;
