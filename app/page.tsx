"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight, Heart, Play, Sparkles, Volume2, X } from "lucide-react";

type Memory = { src: string; title: string; caption: string; art: string; position: string };
type Film = { src: string; poster: string; title: string; number: string; art: string };

const photos: Memory[] = [
  { src: "/images/memory-01.jpg", title: "The little things", caption: "The moments I wish I could pause.", art: "art-rose", position: "center" },
  { src: "/images/memory-02.jpg", title: "My favourite days", caption: "Ordinary days made unforgettable.", art: "art-lilac", position: "center" },
  { src: "/images/memory-03.jpg", title: "Just us", caption: "My favourite place is beside you.", art: "art-sunset", position: "center" },
  { src: "/images/memory-04.jpg", title: "A thousand memories", caption: "And a thousand more to come.", art: "art-night", position: "center" },
];

const films: Film[] = [
  { src: "/videos/moment-01.mp4", poster: "/images/video-poster-01.jpg", title: "A moment to remember", number: "FILM 01", art: "film-rose" },
  { src: "/videos/moment-02.mp4", poster: "/images/video-poster-02.jpg", title: "If only time could pause", number: "FILM 02", art: "film-lilac" },
];

function MemoryCard({ memory, index, onOpen }: { memory: Memory; index: number; onOpen: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`memory-card memory-card-${index + 1}`}
      onClick={onOpen}
      aria-label={`Open ${memory.title}`}
      initial={reduceMotion ? false : { opacity: 0, y: 34, rotate: index % 2 ? 1.5 : -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      whileHover={reduceMotion ? undefined : { y: -9, rotate: index % 2 ? -0.5 : 0.5 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`memory-image ${memory.art}`}>
        {!imageFailed ? (
          <img src={memory.src} alt={memory.title} loading="lazy" onError={() => setImageFailed(true)} style={{ objectPosition: memory.position }} />
        ) : (
          <div className="memory-art-fallback" aria-label="Decorative memory placeholder">
            <span className="fallback-orb" />
            <span className="fallback-ring" />
            <Heart size={25} strokeWidth={1} />
            <span className="fallback-label">A MEMORY, JUST FOR YOU</span>
          </div>
        )}
        <span className="memory-index">0{index + 1}</span>
        <span className="memory-open"><ArrowUpRight size={19} /></span>
      </div>
      <div className="memory-caption"><span className="caption-number">0{index + 1}</span><div><h3>{memory.title}</h3><p>{memory.caption}</p></div></div>
    </motion.button>
  );
}

function FilmCard({ film, index }: { film: Film; index: number }) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      try { await video.play(); } catch { setFailed(true); }
    } else video.pause();
  }

  return (
    <motion.article className="film-card" initial={reduceMotion ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, delay: index * 0.13 }}>
      <div className={`film-frame ${film.art}`}>
        {!failed && <video ref={videoRef} src={film.src} poster={film.poster} preload="none" playsInline onError={() => setFailed(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
        {failed && <div className="film-art-fallback"><span className="film-glow" /><Sparkles size={27} strokeWidth={1} /><span>YOUR LITTLE FILM</span><small>Add a clip at <code>{film.src}</code></small></div>}
        {!failed && <button className="film-play" type="button" onClick={togglePlayback} aria-label={playing ? "Pause film" : "Play film"}>{playing ? <span className="pause-mark">Ⅱ</span> : <Play size={22} fill="currentColor" />}</button>}
        <span className="film-number">{film.number}</span>
        {playing && <span className="playing-indicator"><i /> PLAYING</span>}
      </div>
      <div className="film-caption"><h3>{film.title}</h3><p>A little moment, kept forever.</p></div>
    </motion.article>
  );
}

export default function Home() {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [opened, setOpened] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setSelectedPhoto(null); setMusicOpen(false); }
      if (event.key === "ArrowRight" && selectedPhoto !== null) setSelectedPhoto((selectedPhoto + 1) % photos.length);
      if (event.key === "ArrowLeft" && selectedPhoto !== null) setSelectedPhoto((selectedPhoto - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPhoto]);

  function goToMemories() {
    setOpened(true);
    document.getElementById("memories")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setMusicPlaying(true); }
      catch { setMusicOpen(true); }
    } else { audio.pause(); setMusicPlaying(false); }
  }

  return (
    <main className="birthday-site" id="top">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" /><div className="grain" aria-hidden="true" />
      <header className="topbar"><a className="brand" href="#top" aria-label="Back to beginning"><Heart size={17} strokeWidth={1.5} /><span>FOR YOU, ALWAYS</span></a><div className="topbar-note"><span className="status-dot" /> A LITTLE SOMETHING SPECIAL</div></header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <motion.div className="eyebrow hero-eyebrow" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}><span className="eyebrow-line" />A LITTLE WORLD, MADE FOR YOU<span className="eyebrow-line" /></motion.div>
          <motion.h1 id="hero-title" className="hero-title" initial={reduceMotion ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.12 }}>For my<br /><em>favourite</em><br />person.</motion.h1>
          <motion.p className="hero-description" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.32 }}>A collection of moments, memories, and words<br className="desktop-break" /> to celebrate the most beautiful you.</motion.p>
          <motion.button className="enter-button" type="button" onClick={goToMemories} whileHover={reduceMotion ? undefined : { scale: 1.025 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}><Sparkles size={17} strokeWidth={1.5} /><span>{opened ? "CONTINUE OUR STORY" : "ENTER YOUR LITTLE WORLD"}</span><ArrowRight size={17} /></motion.button>
          <div className="hero-footnote"><Heart size={13} /> MADE WITH ALL MY LOVE</div>
        </div>

        <motion.div className="hero-art" initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.12 }}>
          <div className="art-halo" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <motion.div className="polaroid polaroid-back" animate={reduceMotion ? undefined : { y: [0, -7, 0], rotate: [7, 8.5, 7] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}><div className="photo-placeholder photo-sunset"><span className="photo-sun" /><span className="photo-horizon" /></div><div className="polaroid-caption">the days we keep</div></motion.div>
          <motion.div className="polaroid polaroid-front" animate={reduceMotion ? undefined : { y: [0, 8, 0], rotate: [-8, -6.5, -8] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}><div className="photo-placeholder photo-rose"><span className="rose-glow" /><span className="rose-petal petal-one" /><span className="rose-petal petal-two" /><span className="rose-petal petal-three" /><span className="rose-stem" /></div><div className="polaroid-caption">my favourite person ♡</div></motion.div>
          <motion.div className="floating-note note-top" animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Sparkles size={15} /><span>a thousand little moments</span></motion.div>
          <motion.div className="floating-note note-bottom" animate={reduceMotion ? undefined : { y: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}><Heart size={15} /><span>you make life beautiful</span></motion.div>
        </motion.div>
        <a href="#memories" className="scroll-cue" onClick={(event) => { event.preventDefault(); goToMemories(); }}><span>SCROLL TO DISCOVER</span><ArrowDown size={15} /></a>
        <div className="hero-index"><span>01</span><span className="index-line" /><span>THE BEGINNING</span></div>
      </section>

      <section id="memories" className="memories-section">
        <div className="section-heading"><span className="eyebrow">CHAPTER ONE · OUR LITTLE UNIVERSE</span><h2>If I could keep<br /><em>anything forever...</em></h2><p>It would be the little moments that somehow became my favourite memories.</p></div>
        <div className="memory-grid">{photos.map((memory, index) => <MemoryCard key={memory.src} memory={memory} index={index} onOpen={() => setSelectedPhoto(index)} />)}</div>
        <div className="section-endnote"><span /> FOUR LITTLE WINDOWS INTO OUR WORLD <span /></div>
      </section>

      <section className="films-section"><div className="section-heading"><span className="eyebrow">CHAPTER TWO · LITTLE FILMS, BIG FEELINGS</span><h2>Some moments<br /><em>should move forever.</em></h2><p>The little clips, the laughter, the days we wish lasted longer.</p></div><div className="film-grid">{films.map((film, index) => <FilmCard key={film.src} film={film} index={index} />)}</div></section>

      <section className="letter-section"><motion.div className="letter-panel" initial={reduceMotion ? false : { opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8 }}><div className="letter-sparkle"><Sparkles size={22} strokeWidth={1.2} /></div><span className="eyebrow">CHAPTER THREE · A NOTE FROM ME TO YOU</span><h2>And if there is<br /><em>one thing I hope you know...</em></h2><p>You make ordinary days feel extraordinary. This little world is only a small way to celebrate you.</p><button type="button" className="enter-button" onClick={() => setMusicOpen(true)}><Heart size={16} /><span>A LITTLE MORE LOVE</span><ArrowRight size={16} /></button><div className="letter-watermark">♡</div></motion.div></section>

      <footer className="site-footer"><span>MADE WITH LOVE, JUST FOR YOU</span><Heart size={14} /><a href="#top">BACK TO THE BEGINNING ↑</a></footer>
      <audio ref={audioRef} src="/audio/birthday-song.mp3" loop preload="none" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)} />
      <button className={`music-toggle ${musicPlaying ? "music-active" : ""}`} type="button" onClick={toggleMusic} aria-label={musicPlaying ? "Pause music" : "Play music"} title="Play or pause your soundtrack"><Volume2 size={15} /><span>{musicPlaying ? "MUSIC ON" : "MUSIC OFF"}</span><span className="music-equalizer" aria-hidden="true"><i /><i /><i /></span></button>

      <AnimatePresence>
        {selectedPhoto !== null && <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Memory photo viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPhoto(null)}><button className="lightbox-close" type="button" onClick={() => setSelectedPhoto(null)} aria-label="Close photo viewer"><X size={23} /></button><motion.div className="lightbox-content" initial={reduceMotion ? false : { scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(event) => event.stopPropagation()}><div className={`lightbox-image ${photos[selectedPhoto].art}`}><img src={photos[selectedPhoto].src} alt={photos[selectedPhoto].title} onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><span className="eyebrow">MEMORY 0{selectedPhoto + 1} / 0{photos.length}</span><h3>{photos[selectedPhoto].title}</h3><p>{photos[selectedPhoto].caption}</p><div className="lightbox-navigation"><button type="button" onClick={() => setSelectedPhoto((selectedPhoto - 1 + photos.length) % photos.length)}>← PREVIOUS</button><button type="button" onClick={() => setSelectedPhoto((selectedPhoto + 1) % photos.length)}>NEXT MEMORY →</button></div></motion.div></motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {musicOpen && <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMusicOpen(false)}><motion.div className="music-message" role="dialog" aria-modal="true" aria-label="A little note" initial={reduceMotion ? false : { scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(event) => event.stopPropagation()}><button className="lightbox-close" type="button" onClick={() => setMusicOpen(false)} aria-label="Close"><X size={22} /></button><Heart size={28} strokeWidth={1.2} /><span className="eyebrow">A SMALL NOTE, WITH A LOT OF LOVE</span><h3>Every little thing<br /><em>reminds me of you.</em></h3><p>Add your own soundtrack at <code>public/audio/birthday-song.mp3</code>. Music starts only when someone presses play, so the experience stays in their hands.</p><button type="button" className="enter-button" onClick={() => setMusicOpen(false)}><span>BACK TO OUR STORY</span><ArrowRight size={16} /></button></motion.div></motion.div>}
      </AnimatePresence>
    </main>
  );
}
