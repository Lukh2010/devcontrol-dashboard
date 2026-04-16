import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

const ToastViewport = ({ notice, onDismiss }) => (
  <AnimatePresence>
    {notice ? (
      <motion.div
        className="toast-shell"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        role="status"
        aria-live="polite"
      >
        <div className={`toast-card toast-${notice.severity || 'neutral'}`}>
          <div className="action-feed-title">{notice.message || notice.action}</div>
          <div className="muted-note wrap-text">
            {notice.retry_after ? `Try again in about ${notice.retry_after}s.` : notice.action}
          </div>
          <button className="ghost-button toast-dismiss" type="button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default ToastViewport;
