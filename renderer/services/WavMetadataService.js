import { basename } from '../utils/pathUtils.js';

export class WavMetadataService {
  toBasicInfoFromInspect(filePath, inspectResponse) {
    const meta = inspectResponse && inspectResponse.metadata ? inspectResponse.metadata : null;
    return this.toBasicInfo(filePath, meta);
  }

  toBasicInfoFromProcess(filePath, processResponse) {
    const meta = processResponse && processResponse.metadata ? processResponse.metadata : null;
    return this.toBasicInfo(filePath, meta);
  }

  toBasicInfo(filePath, meta) {
    const filename = basename(filePath);
    const sampleRate = meta && typeof meta.sampleRate === 'number' ? meta.sampleRate : null;
    const channels = meta && typeof meta.numChannels === 'number' ? meta.numChannels : null;
    const durationSec = this._durationSec(meta, sampleRate, channels);

    return { filename, durationSec, sampleRate, channels };
  }

  _durationSec(meta, sampleRate, channels) {
    if (!meta || !sampleRate || !channels) return null;

    if (typeof meta.numSamples === 'number') {
      const frames = meta.numSamples / channels;
      return frames / sampleRate;
    }

    if (typeof meta.subchunk2Size === 'number' && meta.bitsPerSample) {
      const bytesPerSample = meta.bitsPerSample / 8;
      if (bytesPerSample > 0) {
        const totalSamples = meta.subchunk2Size / bytesPerSample;
        return totalSamples / (channels * sampleRate);
      }
    }

    return null;
  }
}
