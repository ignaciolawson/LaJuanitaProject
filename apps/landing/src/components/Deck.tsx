"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";

const BPM = 124;
const METER_BARS = 5;

type DeckEngine = {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  freq: Uint8Array<ArrayBuffer>;
  timer: ReturnType<typeof setInterval> | null;
  nextTime: number;
  step: number;
};

/**
 * Persistent bottom bar with a small synthesized house/techno loop
 * (Web Audio oscillators + noise — no audio file, so no licensing to worry
 * about) and a live VU meter reading the actual signal. Lives in the root
 * layout, so it keeps playing across page navigations like a real deck.
 * Never autoplays — everything starts from the click on the play button.
 */
export function Deck() {
  const [playing, setPlaying] = useState(false);
  const meterRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const engine = useRef<DeckEngine | null>(null);
  const isPlaying = useRef(false);

  useGSAP(() => {
    const button = buttonRef.current;
    if (!button) return;

    const onClick = () => {
      if (!engine.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0.5;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        master.connect(analyser);
        analyser.connect(ctx.destination);
        engine.current = {
          ctx,
          master,
          analyser,
          freq: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
          timer: null,
          nextTime: 0,
          step: 0,
        };
      }

      const eng = engine.current;
      if (eng.ctx.state === "suspended") eng.ctx.resume();

      const next = !isPlaying.current;
      isPlaying.current = next;
      setPlaying(next);

      if (next) {
        eng.nextTime = eng.ctx.currentTime + 0.05;
        eng.step = 0;
        eng.timer = setInterval(() => schedule(eng), 25);
      } else if (eng.timer) {
        clearInterval(eng.timer);
        eng.timer = null;
      }
    };

    button.addEventListener("click", onClick);
    return () => button.removeEventListener("click", onClick);
  });

  useGSAP(() => {
    const bars = meterRef.current?.children;
    if (!bars) return;

    const tick = () => {
      const eng = engine.current;
      for (let i = 0; i < bars.length; i++) {
        let v: number;
        if (playing && eng) {
          eng.analyser.getByteFrequencyData(eng.freq);
          v = eng.freq[i * 3] / 255;
        } else {
          v = 0.08;
        }
        (bars[i] as HTMLElement).style.height = `${10 + v * 90}%`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [playing]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-12 items-stretch border-t border-border-subtle bg-bg/90 font-mono text-[11px] uppercase tracking-wide text-text-secondary backdrop-blur-md">
      <button
        ref={buttonRef}
        type="button"
        data-magnetic
        aria-label={playing ? "Pausar" : "Escuchar un loop de referencia"}
        className="flex cursor-pointer items-center gap-2 bg-red px-5 text-white transition-colors hover:bg-red-hover"
      >
        {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
        <span className="hidden sm:inline">{playing ? "Pausa" : "Escuchar"}</span>
      </button>

      <div className="flex items-center gap-2 border-r border-border-subtle px-4">
        <b className="font-body tabular-nums text-white">{BPM}</b> BPM
      </div>

      <div className="hidden items-center border-r border-border-subtle px-4 md:flex">
        La Juanita Studio · loop de referencia
      </div>

      <div className="ml-auto flex items-center gap-2 px-5">
        <span className="hidden sm:inline">Salida</span>
        <div ref={meterRef} className="flex h-3.5 items-end gap-[3px]">
          {Array.from({ length: METER_BARS }).map((_, i) => (
            <span key={i} className="h-[10%] w-[3px] bg-red" />
          ))}
        </div>
      </div>
    </div>
  );
}

function schedule(eng: DeckEngine) {
  const spb = 60 / BPM / 4; // sixteenth note
  const { ctx, master } = eng;
  while (eng.nextTime < ctx.currentTime + 0.12) {
    const s = eng.step % 16;
    if (s % 4 === 0) kick(ctx, master, eng.nextTime);
    if (s % 2 === 0) hat(ctx, master, eng.nextTime, s === 2 || s === 10);
    if (s === 0 || s === 8) bass(ctx, master, eng.nextTime);
    eng.step++;
    eng.nextTime += spb;
  }
}

function kick(ctx: AudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.085);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.32);
}

function noiseBuffer(ctx: AudioContext, d: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * d, ctx.sampleRate);
  const c = buf.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  return buf;
}

function hat(ctx: AudioContext, out: AudioNode, t: number, open: boolean) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx, 0.12);
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 8200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(open ? 0.16 : 0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.16 : 0.045));
  s.connect(f);
  f.connect(g);
  g.connect(out);
  s.start(t);
  s.stop(t + 0.2);
}

const BASS = [55, 55, 65.41, 55];
function bass(ctx: AudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const fl = ctx.createBiquadFilter();
  o.type = "sawtooth";
  o.frequency.value = BASS[Math.floor(Math.random() * BASS.length)];
  fl.type = "lowpass";
  fl.frequency.setValueAtTime(900, t);
  fl.frequency.exponentialRampToValueAtTime(220, t + 0.25);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  o.connect(fl);
  fl.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.3);
}
