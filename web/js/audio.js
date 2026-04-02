/**
 * 程序化音效：粉噪 + 低频铺底 + 「车站钢琴」式琶音 BGM（Web Audio 合成，无外部音频文件）。
 */

let audioCtx = null;
let master = null;
const nodes = [];
let currentPreset = null;
let pianoFillTimer = null;
let pianoLoopStart = 0;
let pianoLoopLen = 1;
let pianoRunning = false;

function ensureCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createGain();
    master.gain.value = 0;
    master.connect(audioCtx.destination);
  }
  return audioCtx;
}

function stopAll() {
  pianoRunning = false;
  if (pianoFillTimer != null) {
    clearInterval(pianoFillTimer);
    pianoFillTimer = null;
  }
  for (const n of nodes) {
    try {
      n.stop?.();
      n.disconnect?.();
    } catch {
      /* ignore */
    }
  }
  nodes.length = 0;
}

function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function makeReverbIR(ctx, seconds = 0.45) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t) * 0.6;
    }
  }
  return buffer;
}

/**
 * 单音：三角波基频 + 弱倍频，低通 + ADSR，接混响母线。
 */
function playPianoNote(ctx, t0, midi, durationSec, velocity, dryGain, wetGain, dryBus, wetBus) {
  const fund = ctx.createOscillator();
  fund.type = "triangle";
  fund.frequency.value = midiToHz(midi);
  const harm = ctx.createOscillator();
  harm.type = "sine";
  harm.frequency.value = midiToHz(midi + 12);
  const harmG = ctx.createGain();
  harmG.gain.value = 0.12;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 3200;
  filt.Q.value = 0.6;
  const g = ctx.createGain();
  const peak = Math.max(0.0001, velocity);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.018);
  g.gain.exponentialRampToValueAtTime(peak * 0.55, t0 + durationSec * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
  fund.connect(filt);
  harm.connect(harmG).connect(filt);
  filt.connect(g);
  const dry = ctx.createGain();
  dry.gain.value = dryGain;
  const wet = ctx.createGain();
  wet.gain.value = wetGain;
  g.connect(dry);
  g.connect(wet);
  dry.connect(dryBus);
  wet.connect(wetBus);
  fund.start(t0);
  harm.start(t0);
  const stopT = t0 + durationSec + 0.08;
  fund.stop(stopT);
  harm.stop(stopT);
  nodes.push(fund, harm, harmG, filt, g, dry, wet);
}

/** 车站候车厅感：Am7 / Fmaj7 交替意象的稀疏琶音（非完整和声课，仅听感） */
const STATION_SEQUENCE = [
  { t: 0.0, m: 57, d: 1.15 },
  { t: 0.95, m: 60, d: 0.95 },
  { t: 1.85, m: 64, d: 1.05 },
  { t: 2.75, m: 67, d: 1.1 },
  { t: 3.85, m: 65, d: 0.85 },
  { t: 4.65, m: 62, d: 0.95 },
  { t: 5.55, m: 60, d: 1.0 },
  { t: 6.65, m: 57, d: 1.2 },
  { t: 7.85, m: 53, d: 1.0 },
  { t: 8.75, m: 57, d: 0.9 },
  { t: 9.55, m: 60, d: 1.05 },
  { t: 10.45, m: 64, d: 1.25 },
];
const STATION_LOOP_SEC = 12.2;

function makePinkNoiseBuffer(ctx, seconds = 2) {
  const len = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function startPianoScheduler(ctx, opts) {
  const {
    transpose,
    tempo,
    vel,
    dry,
    wet,
    dryBus,
    wetBus,
  } = opts;
  pianoRunning = true;
  pianoLoopLen = STATION_LOOP_SEC * tempo;
  pianoLoopStart = ctx.currentTime + 0.08;

  const fill = () => {
    if (!pianoRunning || !audioCtx) return;
    const now = audioCtx.currentTime;
    if (pianoLoopStart < now - 0.25) {
      pianoLoopStart = now + 0.06;
    }
    const horizon = now + 1.25;
    while (pianoLoopStart < horizon) {
      for (const step of STATION_SEQUENCE) {
        const t = pianoLoopStart + step.t * tempo;
        if (t >= now - 0.02) {
          playPianoNote(
            ctx,
            t,
            step.m + transpose,
            step.d * tempo,
            vel,
            dry,
            wet,
            dryBus,
            wetBus
          );
        }
      }
      pianoLoopStart += pianoLoopLen;
    }
  };

  fill();
  pianoFillTimer = setInterval(fill, 280);
}

export async function playAmbience(preset, enabled) {
  const ctx = ensureCtx();
  if (ctx.state === "suspended") await ctx.resume();
  stopAll();
  currentPreset = preset;
  if (!enabled) {
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    return;
  }

  const presets = {
    hub: { noise: 0.032, hum: 0.014, humFreq: 196, lfo: 0.1, piano: { transpose: 0, tempo: 1, vel: 0.085, dry: 0.55, wet: 0.9 } },
    L01: { noise: 0.045, hum: 0.022, humFreq: 155.56, lfo: 0.07, piano: { transpose: 0, tempo: 1.02, vel: 0.08, dry: 0.5, wet: 1 } },
    L02: { noise: 0.03, hum: 0.018, humFreq: 220, lfo: 0.12, piano: { transpose: 2, tempo: 0.98, vel: 0.09, dry: 0.55, wet: 0.85 } },
    L03: { noise: 0.028, hum: 0.02, humFreq: 246.94, lfo: 0.09, piano: { transpose: 3, tempo: 1.06, vel: 0.075, dry: 0.5, wet: 1.05 } },
    L04: { noise: 0.022, hum: 0.016, humFreq: 174.61, lfo: 0.14, piano: { transpose: -2, tempo: 0.92, vel: 0.07, dry: 0.45, wet: 1.15 } },
    L05: { noise: 0.04, hum: 0.012, humFreq: 164.81, lfo: 0.05, piano: { transpose: -5, tempo: 1.08, vel: 0.065, dry: 0.6, wet: 1.2 } },
  };
  const p = presets[preset] || presets.hub;
  const pianoCfg = p.piano;

  const ambBus = ctx.createGain();
  ambBus.gain.value = 1;
  ambBus.connect(master);

  const noiseBuf = makePinkNoiseBuffer(ctx, 2);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 720;
  bp.Q.value = 0.45;
  const ng = ctx.createGain();
  ng.gain.value = p.noise;
  noise.connect(bp).connect(ng).connect(ambBus);
  noise.start();
  nodes.push(noise, bp, ng, ambBus);

  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = p.humFreq;
  const hg = ctx.createGain();
  hg.gain.value = p.hum;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = p.lfo;
  const lfoG = ctx.createGain();
  lfoG.gain.value = p.hum * 0.75;
  lfo.connect(lfoG);
  lfoG.connect(hg.gain);
  hum.connect(hg).connect(ambBus);
  lfo.start();
  hum.start();
  nodes.push(hum, hg, lfo, lfoG);

  const pianoDryBus = ctx.createGain();
  pianoDryBus.gain.value = 0.55;
  const conv = ctx.createConvolver();
  conv.buffer = makeReverbIR(ctx, 0.55);
  const revGain = ctx.createGain();
  revGain.gain.value = 0.55;
  pianoDryBus.connect(master);
  pianoDryBus.connect(conv).connect(revGain).connect(master);
  nodes.push(pianoDryBus, conv, revGain);

  const pianoWetDirect = ctx.createGain();
  pianoWetDirect.gain.value = 0.35;
  pianoWetDirect.connect(master);
  nodes.push(pianoWetDirect);

  startPianoScheduler(ctx, {
    transpose: pianoCfg.transpose,
    tempo: pianoCfg.tempo,
    vel: pianoCfg.vel,
    dry: pianoCfg.dry,
    wet: pianoCfg.wet,
    dryBus: pianoDryBus,
    wetBus: pianoWetDirect,
  });

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.2, ctx.currentTime, 0.12);
}

export function setEnabled(enabled) {
  if (!enabled) {
    stopAll();
    if (master && audioCtx) master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);
    return;
  }
  playAmbience(currentPreset || "hub", true).catch(() => {});
}

export function sfxBlip() {
  const ctx = ensureCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(523.25, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.15);
}
