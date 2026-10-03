let pending: { toolId: string; files: File[]; createdAt: number } | null = null;

/** Keep selected files in this tab only. Never upload or persist them here. */
export function queueToolFiles(toolId: string, files: File[]): void {
  pending = { toolId, files: [...files], createdAt: Date.now() };
}

export function takeToolFiles(toolId?: string): File[] | null {
  if (!pending) return null;
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    pending = null;
    return null;
  }
  if (!toolId || pending.toolId !== toolId) return null;
  const files = pending.files;
  pending = null;
  return files;
}