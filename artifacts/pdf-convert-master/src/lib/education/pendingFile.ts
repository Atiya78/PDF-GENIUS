// In-memory only hand-off between the hub upload shortcut and a tool page.
let pending: File | null = null;
export const setPendingFile = (f: File | null) => { pending = f; };
export const takePendingFile = (): File | null => { const f = pending; pending = null; return f; };
