import { useEffect } from 'react';

/** Asks the browser to confirm before closing or reloading the tab while there are unsaved edits. */
export function useUnsavedChangesWarning(dirty: boolean, saving = false) {
  useEffect(() => {
    if (!dirty || saving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);
}
