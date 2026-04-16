import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const ConfirmDialog = ({
  open,
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  disabled = false
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-card"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="panel-title-wrap">
            <span className="panel-icon">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 id="confirm-dialog-title" className="panel-title">{title}</h3>
              <p className="panel-subtitle">{description}</p>
            </div>
          </div>

          {details ? (
            <div className="mini-card modal-detail-card" style={{ marginTop: '18px' }}>
              {Array.isArray(details)
                ? details.map((detail) => <div key={detail} className="muted-note">{detail}</div>)
                : <div className="muted-note">{details}</div>}
            </div>
          ) : null}

          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={disabled}>
              {cancelLabel}
            </button>
            <button
              className={tone === 'danger' ? 'danger-button' : 'button'}
              type="button"
              onClick={onConfirm}
              disabled={disabled}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default ConfirmDialog;
