// All sound is synthesized with the Web Audio API — no audio files.
// A small synth for effects and a quiet looping bass arpeggio for music.
// Audio starts only after the player's first gesture (the browser's rule),
// so `unlock()` is called from the first key or click.

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // A minor-key bass line that walks under the game, one note per beat.
  const BASSLINE = [55.0, 55.0, 65.41, 49.0, 55.0, 82.41, 73.42, 65.41];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.15, volume = 0.3, when = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function noise({ duration = 0.3, volume = 0.3, lowpass = 1200, when = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  function startMusic() {
    if (!context || musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = BASSLINE[musicStep % BASSLINE.length];
      musicStep += 1;
      tone({ type: 'triangle', from: note, duration: 0.42, volume: 0.5 });
      tone({ type: 'sine', from: note * 2, duration: 0.2, volume: 0.12 });
    }, 340);
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      if (!ensure()) return;
      if (context.state === 'suspended') void context.resume();
      startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 880, to: 320, duration: 0.09, volume: 0.14 });
    },
    pickup(combo) {
      // The blip climbs with the combo, so a hot streak sounds hot.
      const base = 520 + Math.min(combo, 12) * 36;
      tone({ type: 'sine', from: base, duration: 0.1, volume: 0.28 });
      tone({ type: 'sine', from: base * 1.5, duration: 0.14, volume: 0.22, when: 0.06 });
    },
    explosion(big) {
      noise({ duration: big ? 0.5 : 0.28, volume: big ? 0.5 : 0.3, lowpass: big ? 700 : 1400 });
      tone({ type: 'sine', from: 160, to: 40, duration: big ? 0.5 : 0.3, volume: 0.4 });
    },
    hurt() {
      tone({ type: 'sawtooth', from: 220, to: 55, duration: 0.35, volume: 0.3 });
      noise({ duration: 0.25, volume: 0.25, lowpass: 900 });
    },
    waveClear() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
        tone({ type: 'triangle', from: frequency, duration: 0.22, volume: 0.25, when: i * 0.09 });
      });
    },
    upgrade() {
      tone({ type: 'triangle', from: 392, duration: 0.12, volume: 0.25 });
      tone({ type: 'triangle', from: 587.33, duration: 0.2, volume: 0.25, when: 0.08 });
    },
    gameOver() {
      [392, 311.13, 233.08, 155.56].forEach((frequency, i) => {
        tone({ type: 'triangle', from: frequency, duration: 0.4, volume: 0.25, when: i * 0.22 });
      });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, i) => {
        tone({ type: 'triangle', from: frequency, duration: 0.3, volume: 0.25, when: i * 0.11 });
      });
    },
  };
}
