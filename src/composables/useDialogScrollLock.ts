import { onScopeDispose } from 'vue';

const owners = new Set<symbol>();
let previousStyles: { overflow: string; paddingRight: string } | null = null;

// The event fade and ending entrance overlap. Keep the shared body locked until
// every dialog has finished closing, rather than unlocking it per instance.
export const useDialogScrollLock = () => {
  const owner = Symbol('game-dialog');

  const lock = () => {
    if (typeof document === 'undefined' || owners.has(owner)) return;

    if (owners.size === 0) {
      const body = document.body;
      previousStyles = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const paddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;
    }

    owners.add(owner);
  };

  const unlock = () => {
    if (!owners.delete(owner) || owners.size > 0 || !previousStyles) return;

    document.body.style.overflow = previousStyles.overflow;
    document.body.style.paddingRight = previousStyles.paddingRight;
    previousStyles = null;
  };

  onScopeDispose(unlock);
  return { lock, unlock };
};
