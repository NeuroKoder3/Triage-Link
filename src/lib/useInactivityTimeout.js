import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
const WARNING_BEFORE_MS = 60 * 1000;

export default function useInactivityTimeout(onTimeout, onWarning, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const lastActivity = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      if (onWarning) onWarning(WARNING_BEFORE_MS / 1000);
    }, timeoutMs - WARNING_BEFORE_MS);

    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [onTimeout, onWarning, timeoutMs]);

  useEffect(() => {
    resetTimer();

    const handler = () => resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handler);
      }
    };
  }, [resetTimer]);

  return { resetTimer, lastActivity };
}
