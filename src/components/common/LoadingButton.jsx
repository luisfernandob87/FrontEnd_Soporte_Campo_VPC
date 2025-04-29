import React from 'react';
import './LoadingButton.css';

const LoadingButton = ({ isLoading, children, type = 'button', onClick, className = '' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`loading-button ${className} ${isLoading ? 'loading' : ''}`}
    >
      {isLoading ? (
        <>
          <span className="spinner"></span>
          <span className="loading-text">Cargando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;