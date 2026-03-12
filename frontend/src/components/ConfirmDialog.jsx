import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({ isOpen, title = 'Confirm', message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="confirm-dialog-body">
        <p>
          {message.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < message.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
        <div className="confirm-dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
