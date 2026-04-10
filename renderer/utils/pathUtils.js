export function basename(filePath) {
  if (!filePath) return null;
  return String(filePath).split(/[/\\]/).pop() || null;
}
