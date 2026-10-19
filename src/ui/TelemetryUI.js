/**
 * HUD Telemetry & User Controls Overlay Manager
 * Updates displacement metrics, peak displacement, plexus node tags,
 * and handles UI button events (audio toggle, intro replay, camera reset).
 */
export class TelemetryUI {
  constructor() {
    this.elDisplaced = document.getElementById('telemetry-displaced');
    this.elPeak = document.getElementById('telemetry-peak');
    this.elPlexus = document.getElementById('telemetry-plexus');
    this.btnAudio = document.getElementById('btn-audio');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnReset = document.getElementById('btn-reset');
    this.iconSoundOn = document.getElementById('icon-sound-on');
    this.iconSoundOff = document.getElementById('icon-sound-off');
    this.labelAudio = document.getElementById('label-audio');
  }

  updateMetrics(displacedCount, totalCount, peakDisp, activePlexusCount) {
    if (this.elDisplaced) {
      this.elDisplaced.textContent = `${String(displacedCount).padStart(2, '0')} / ${totalCount}`;
    }
    if (this.elPeak) {
      this.elPeak.textContent = `+${peakDisp.toFixed(2)} m`;
    }
    if (this.elPlexus) {
      this.elPlexus.textContent = `${String(activePlexusCount).padStart(2, '0')} / 05 ACTIVE`;
    }
  }

  bindEvents({ onAudioToggle, onReplay, onReset }) {
    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', () => {
        const isMuted = onAudioToggle();
        if (this.iconSoundOn && this.iconSoundOff && this.labelAudio) {
          if (isMuted) {
            this.iconSoundOn.classList.add('hidden');
            this.iconSoundOff.classList.remove('hidden');
            this.labelAudio.textContent = 'AUDIO: OFF';
          } else {
            this.iconSoundOn.classList.remove('hidden');
            this.iconSoundOff.classList.add('hidden');
            this.labelAudio.textContent = 'AUDIO: ON';
          }
        }
      });
    }

    if (this.btnReplay) {
      this.btnReplay.addEventListener('click', () => {
        onReplay();
      });
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => {
        onReset();
      });
    }
  }
}
