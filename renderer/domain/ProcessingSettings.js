export const DEFAULT_PROCESSING_SETTINGS = Object.freeze({
  fftSize: 2048,
  maskingStrength: 0.5,
  processingMode: 'default',
});

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function readProcessingSettings({
  fftSizeValue,
  maskingStrengthValue,
  processingModeValue,
} = {}) {
  const fftSizeNum = toNumberOrNull(fftSizeValue);
  const fftSize = Number.isInteger(fftSizeNum) && fftSizeNum >= 1 ? fftSizeNum : null;

  const maskingNum = toNumberOrNull(maskingStrengthValue);
  const maskingStrength = maskingNum !== null ? clamp(maskingNum, 0, 1) : null;

  const processingModeRaw =
    processingModeValue === null || processingModeValue === undefined
      ? ''
      : String(processingModeValue);
  const processingMode = processingModeRaw.trim() || null;

  return {
    fftSize: fftSize ?? DEFAULT_PROCESSING_SETTINGS.fftSize,
    maskingStrength: maskingStrength ?? DEFAULT_PROCESSING_SETTINGS.maskingStrength,
    processingMode: processingMode ?? DEFAULT_PROCESSING_SETTINGS.processingMode,
  };
}
