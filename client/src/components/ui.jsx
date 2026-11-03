import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Info, LoaderCircle, Search, X } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', type = 'button', disabled, ...props }) {
  return (
    <button
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="ui-button-spinner" size={15} />}
      {children}
    </button>
  );
}

export function Input({ label, hint, error, id: providedId, className = '', ...props }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <label className="ui-field" htmlFor={id}>
      {label && <span className="ui-field-label">{label}</span>}
      <input
        className={`ui-input ${error ? 'ui-input-error' : ''} ${className}`.trim()}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint && <span className="ui-field-hint" id={hintId}>{hint}</span>}
      {error && <span className="ui-field-error" id={errorId}>{error}</span>}
    </label>
  );
}

export function Select({ label, hint, error, options, id: providedId, className = '', ...props }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <label className="ui-field" htmlFor={id}>
      {label && <span className="ui-field-label">{label}</span>}
      <span className="ui-select-wrap">
        <select
          className={`ui-select ${error ? 'ui-input-error' : ''} ${className}`.trim()}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="ui-select-icon" size={15} />
      </span>
      {hint && <span className="ui-field-hint" id={hintId}>{hint}</span>}
      {error && <span className="ui-field-error" id={errorId}>{error}</span>}
    </label>
  );
}

export function Dropdown({ label, trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function dismiss(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [open]);

  function handleMenuKeyDown(event) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [])];
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div className="ui-dropdown" onKeyDown={handleMenuKeyDown} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="ui-dropdown-trigger"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
            window.requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
          }
        }}
        ref={triggerRef}
        type="button"
      >
        {trigger}
      </button>
      {open && (
        <div className={`ui-dropdown-menu ui-dropdown-${align}`} ref={menuRef} role="menu" onClick={(event) => {
          if (event.target.closest('[role="menuitem"]')) setOpen(false);
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="ui-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-modal="true"
        className="ui-modal"
        ref={dialogRef}
        role="dialog"
      >
        <header className="ui-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <Button aria-label="Close dialog" className="ui-modal-close" onClick={onClose} variant="ghost" size="icon"><X size={18} /></Button>
        </header>
        {children && <div className="ui-modal-body">{children}</div>}
        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', busy = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={(
        <>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={busy} loading={busy} onClick={onConfirm} variant="danger">{confirmLabel}</Button>
        </>
      )}
    />
  );
}

export function Card({ children, className = '', as: Element = 'section', ...props }) {
  return <Element className={`ui-card ${className}`.trim()} {...props}>{children}</Element>;
}

export function Table({ children, caption, className = '' }) {
  return (
    <div className="ui-table-wrap">
      <table className={className}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label = 'Sections', panelId }) {
  if (!tabs.length) return null;
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.value === value));

  function handleKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = selectedIndex;
    if (event.key === 'ArrowRight') nextIndex = (selectedIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (selectedIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    onChange(tabs[nextIndex].value);
    event.currentTarget.parentElement?.querySelector(`[data-tab-index="${nextIndex}"]`)?.focus();
  }

  return (
    <div aria-label={label} className="ui-tabs" onKeyDown={handleKeyDown} role="tablist">
      {tabs.map((tab, index) => (
        <button
          aria-controls={panelId}
          aria-selected={value === tab.value}
          className={`ui-tab ${value === tab.value ? 'ui-tab-active' : ''}`}
          data-tab-index={index}
          id={panelId ? `${panelId}-tab-${tab.value}` : undefined}
          key={tab.value}
          onClick={() => onChange(tab.value)}
          role="tab"
          tabIndex={value === tab.value ? 0 : -1}
          type="button"
        >
          {tab.label}
          {tab.count !== undefined && <span className="ui-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`ui-badge ui-badge-${tone} ${className}`.trim()}>
      {dot && <span aria-hidden="true" className="ui-badge-dot" />}
      {children}
    </span>
  );
}

export function Tooltip({ children, label }) {
  return <span className="ui-tooltip" title={label}>{children}</span>;
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, tone = 'success') => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, message, tone }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), 5000));
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-label="Notifications" className="ui-toast-region" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <div className={`ui-toast ui-toast-${toast.tone}`} key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'}>
            {toast.tone === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} type="button"><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used within ToastProvider');
  return notify;
}

export function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="ui-pagination">
      <span className="ui-pagination-summary">Page {page} of {pageCount}</span>
      <div>
        <Button aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="sm" variant="secondary"><ChevronLeft size={15} /> Previous</Button>
        <Button aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} size="sm" variant="secondary">Next <ChevronRight size={15} /></Button>
      </div>
    </nav>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search', label = 'Search', className = '' }) {
  return (
    <label className={`ui-search ${className}`.trim()}>
      <Search aria-hidden="true" size={16} />
      <input aria-label={label} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" value={value} />
      {value && <button aria-label="Clear search" onClick={() => onChange('')} type="button"><X size={14} /></button>}
    </label>
  );
}

export function LoadingSkeleton({ className = '', lines = 1 }) {
  return (
    <div aria-label="Loading" className={`ui-skeleton-group ${className}`.trim()} role="status">
      {Array.from({ length: lines }, (_, index) => <span className="ui-skeleton" key={index} />)}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title, description, action }) {
  return (
    <div className="ui-state ui-empty-state">
      <span className="ui-state-icon"><Icon aria-hidden="true" size={22} /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, action }) {
  return (
    <div className="ui-state ui-error-state" role="alert">
      <span className="ui-state-icon"><AlertCircle aria-hidden="true" size={22} /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
