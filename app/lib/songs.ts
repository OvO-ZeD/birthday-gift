/**
 * Built-in soundtracks, generated in the browser.
 *
 * Choosing one renders it to a small WAV file and hands it to the studio exactly as if the
 * person had uploaded it, so it is stored and played like any other soundtrack with no change
 * to the database or the recipient page. Nothing is downloaded and no recordings are licensed:
 * the melodies are either traditional (Happy Birthday is in the public domain) or simple
 * patterns written for this app.
 */

export type SongId = "happy-birthday" | "music-box" | "sparkle";

export type BuiltInSong = { id: SongId; title: string; blurb: string };

export const BUILT_IN_SONGS: BuiltInSong[] = [
  { id: "happy-birthday", title: "Happy Birthday (music box)", blurb: "The classic tune, twice through." },
  { id: "music-box", title: "Soft lullaby", blurb: "Slow, warm and gentle." },
  { id: "sparkle", title: "Sparkle", blurb: "Light, twinkling and celebratory." },
];

export type ScheduledNote = { midi: number; start: number; duration: number; gain: number };
export type Schedule = { notes: ScheduledNote[]; length: number };

const SAMPLE_RATE = 22050;

/** Beats are converted to seconds by the caller; this keeps the melody easy to read. */
function melody(tempoSeconds: number, steps: Array<[number, number]>, startAt: number, gain: number): ScheduledNote[] {
  const notes: ScheduledNote[] = [];
  let cursor = startAt;
  for (const [midi, beats] of steps) {
    notes.push({ midi, start: cursor, duration: Math.max(0.5, beats * tempoSeconds * 1.6), gain });
    cursor += beats * tempoSeconds;
  }
  return notes;
}

const HAPPY_BIRTHDAY: Array<[number, number]> = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 1],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 2],
];

const CHORDS: number[][] = [
  [60, 64, 67, 72],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
];

const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 3];

const SPARKLE_SCALE = [72, 74, 76, 79, 81, 84];

export function buildSchedule(id: SongId): Schedule {
  if (id === "happy-birthday") {
    const tempo = 0.6;
    const oneRound = HAPPY_BIRTHDAY.reduce((total, [, beats]) => total + beats, 0) * tempo;
    const notes = [
      ...melody(tempo, HAPPY_BIRTHDAY, 0.3, 0.2),
      ...melody(tempo, HAPPY_BIRTHDAY, 0.3 + oneRound + 1.2, 0.2),
    ];
    return { notes, length: 0.3 + oneRound * 2 + 1.2 + 3 };
  }

  if (id === "music-box") {
    const eighth = 0.36;
    const notes: ScheduledNote[] = [];
    const bars = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
    bars.forEach((chordIndex, barIndex) => {
      const chord = CHORDS[chordIndex];
      ARPEGGIO.forEach((noteIndex, stepIndex) => {
        notes.push({
          midi: chord[noteIndex] - (stepIndex === 0 ? 12 : 0),
          start: 0.3 + barIndex * ARPEGGIO.length * eighth + stepIndex * eighth,
          duration: 1.4,
          gain: stepIndex === 0 ? 0.2 : 0.13,
        });
      });
    });
    return { notes, length: 0.3 + bars.length * ARPEGGIO.length * eighth + 3 };
  }

  // "sparkle": a repeatable pseudo-random walk over a pentatonic scale, so it always sounds the same.
  const notes: ScheduledNote[] = [];
  let seed = 7;
  let position = 2;
  for (let i = 0; i < 72; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const step = (seed % 5) - 2;
    position = Math.min(SPARKLE_SCALE.length - 1, Math.max(0, position + (step === 0 ? 1 : step)));
    notes.push({
      midi: SPARKLE_SCALE[position],
      start: 0.3 + i * 0.4,
      duration: 1.1,
      gain: i % 4 === 0 ? 0.2 : 0.13,
    });
    if (i % 8 === 0) notes.push({ midi: SPARKLE_SCALE[0] - 12, start: 0.3 + i * 0.4, duration: 2.4, gain: 0.12 });
  }
  return { notes, length: 0.3 + 72 * 0.4 + 3 };
}

function frequencyOf(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A soft bell: a fundamental plus two quieter, faster-fading overtones. */
function scheduleBell(ctx: OfflineAudioContext, note: ScheduledNote, destination: AudioNode) {
  const base = frequencyOf(note.midi);
  const partials: Array<[number, number, number]> = [
    [1, 1, 1],
    [2, 0.35, 0.55],
    [3, 0.12, 0.3],
  ];
  for (const [multiple, level, decay] of partials) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = base * multiple;
    const end = note.start + note.duration * decay;
    envelope.gain.setValueAtTime(0.0001, note.start);
    envelope.gain.exponentialRampToValueAtTime(note.gain * level, note.start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(note.start);
    oscillator.stop(end + 0.05);
  }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

/** Renders a built-in song to a WAV file the studio can treat like an uploaded soundtrack. */
export async function renderSong(id: SongId): Promise<File> {
  const song = BUILT_IN_SONGS.find((entry) => entry.id === id);
  if (!song) throw new Error("Unknown song.");

  const schedule = buildSchedule(id);
  const ctx = new OfflineAudioContext(1, Math.ceil(schedule.length * SAMPLE_RATE), SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.9, 0);
  master.gain.setValueAtTime(0.9, Math.max(0, schedule.length - 2.5));
  master.gain.linearRampToValueAtTime(0.0001, schedule.length - 0.05);
  master.connect(ctx.destination);

  for (const note of schedule.notes) scheduleBell(ctx, note, master);

  const rendered = await ctx.startRendering();
  return new File([encodeWav(rendered)], `${song.title}.wav`, { type: "audio/wav" });
}
