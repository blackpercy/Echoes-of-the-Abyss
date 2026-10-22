// Ambient sound, generated with the Web Audio API (no sound files):
// waves that rise and fall, a low drone in dark places, and whispers that grow as sanity fades.

const SoundScape = {
  ctx: null,
  nodes: null,
  nextWhisper: 0,

  // Browsers only allow audio after a user gesture, so this is called from a click.
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Waves: brown noise through a low-pass filter, swelled by a slow oscillator.
    const waves = ctx.createBufferSource();
    waves.buffer = this.noiseBuffer(ctx, true);
    waves.loop = true;
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 500;
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.15;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.12;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.1;
    swell.connect(swellDepth).connect(waveGain.gain);
    waves.connect(waveFilter).connect(waveGain).connect(master);
    waves.start();
    swell.start();

    // Drone: two slightly detuned low tones that beat against each other.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    for (const f of [55, 55.6, 82.4]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(droneGain);
      o.start();
    }
    droneGain.connect(master);

    // Whispers: band-passed noise bursts.
    const whisperFilter = ctx.createBiquadFilter();
    whisperFilter.type = 'bandpass';
    whisperFilter.frequency.value = 2400;
    whisperFilter.Q.value = 3;
    const whisperGain = ctx.createGain();
    whisperGain.gain.value = 0;
    const whisper = ctx.createBufferSource();
    whisper.buffer = this.noiseBuffer(ctx, false);
    whisper.loop = true;
    whisper.connect(whisperFilter).connect(whisperGain).connect(master);
    whisper.start();

    this.nodes = { master, waveGain, waveFilter, droneGain, whisperGain, whisperFilter };
  },

  stop() {
    if (this.ctx) this.ctx.suspend();
  },

  noiseBuffer(ctx, brown) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buf;
  },

  // Called a few times a second with the game's state of mind and place.
  update() {
    if (!this.ctx || this.ctx.state !== 'running' || !Game.state.settings.audio) return;
    const now = this.ctx.currentTime;
    const loc = Game.here();
    const coastal = ['saltmire', 'saltmire_shore', 'devils_reef', 'lighthouse', 'the_abyss'].includes(Game.state.location);
    const dark = loc.kind === 'dungeon' || loc.kind === 'hidden' || !!Game.state.combat;
    const unease = 1 - Game.state.sanity / 100;
    const n = this.nodes;
    n.waveGain.gain.setTargetAtTime(coastal ? 0.2 : 0.06, now, 2);
    n.waveFilter.frequency.setTargetAtTime(Game.isNight() ? 350 : 550, now, 2);
    n.droneGain.gain.setTargetAtTime((dark ? 0.05 : 0.01) + Game.state.madness * 0.01, now, 3);
    // Whispers come in bursts once sanity drops below about 60.
    if (now > this.nextWhisper) {
      const strength = Math.max(0, unease - 0.4) * 0.25;
      if (strength > 0) {
        n.whisperFilter.frequency.setValueAtTime(1800 + Math.random() * 1600, now);
        n.whisperGain.gain.setTargetAtTime(strength, now, 0.05);
        n.whisperGain.gain.setTargetAtTime(0, now + 0.3 + Math.random() * 0.6, 0.1);
      }
      this.nextWhisper = now + 1 + Math.random() * 4 * (1 - unease);
    }
  },
};
