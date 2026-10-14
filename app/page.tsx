"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Gift, GitBranch, Heart, LockKeyhole, Menu, Music2, Palette, Play, ShieldCheck, Sparkles, Video, X } from "lucide-react";

const features = [
  { number: "01", icon: Camera, title: "Beautiful memories", description: "Turn favourite photos into a little gallery worth revisiting." },
  { number: "02", icon: Video, title: "Moving moments", description: "Bring clips and little everyday scenes into the story." },
  { number: "03", icon: Music2, title: "A personal soundtrack", description: "Set the mood with a song that means something to you." },
  { number: "04", icon: Heart, title: "Words from the heart", description: "Add a letter that says what a photo never quite can." },
  { number: "05", icon: Palette, title: "Your own atmosphere", description: "Shape the colours, details, and feeling around your person." },
  { number: "06", icon: LockKeyhole, title: "Private by design", description: "Share a dedicated gift link with protected media support." },
];

const steps = [
  { icon: Camera, title: "Add your moments", text: "Choose photos, videos, a song, and a heartfelt note." },
  { icon: Palette, title: "Make it yours", text: "Arrange the story and give it a look that feels personal." },
  { icon: Gift, title: "Send the surprise", text: "Publish your gift and share its private link." },
];

const demos = [
  { title: "A memory in motion", label: "VIDEO MOMENT", poster: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=85", src: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4" },
  { title: "A little world of us", label: "PHOTO STORY", poster: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85", src: "https://videos.pexels.com/video-files/854072/854072-hd_1920_1080_25fps.mp4" },
];

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <main className="afterglow-landing" id="top">
      <div className="landing-aurora aurora-a" aria-hidden="true" /><div className="landing-aurora aurora-b" aria-hidden="true" />
      <motion.div className="landing-progress" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
      <header className="landing-nav">
        <a href="#top" className="landing-brand" aria-label="Afterglow home"><span className="brand-mark"><Heart size={20} /><Sparkles size={11} /></span><span>Afterglow</span></a>
        <nav className={menuOpen ? "landing-links nav-open" : "landing-links"} aria-label="Main navigation">
          <a href="#top" onClick={() => setMenuOpen(false)}>Home</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
        </nav>
        <div className="landing-nav-actions"><a className="nav-login" href="/login">Log in</a><a className="landing-button landing-button-small" href="/studio">Create a gift <ArrowRight size={15} /></a><a className="github-link" href="https://github.com/OvO-ZeD/birthday-gift" target="_blank" rel="noreferrer" aria-label="View Afterglow on GitHub" title="View on GitHub"><GitBranch size={16} /><span>GitHub</span></a></div>
        <button className="landing-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <motion.div className="landing-kicker" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}><span /> A DIGITAL GIFT FOR YOUR FAVOURITE PEOPLE</motion.div>
          <motion.h1 id="landing-title" initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .08 }}>Turn moments into <em>an unforgettable story.</em></motion.h1>
          <motion.p className="landing-lede" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .2 }}>A beautiful, interactive website to celebrate someone special. Bring photos, videos, music, and a heartfelt letter together in one little world made just for them.</motion.p>
          <motion.div className="landing-hero-actions" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .32 }}><a className="landing-button" href="/studio">Create your gift <ArrowRight size={17} /></a><a className="landing-button landing-button-ghost" href="#demo"><span className="play-outline"><Play size={13} fill="currentColor" /></span> Explore the demo</a></motion.div>
          <motion.div className="landing-trust-row" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }}><span><ShieldCheck size={15} /> Private sharing</span><span><Sparkles size={15} /> Personal by design</span><span><Heart size={15} /> Made with love</span></motion.div>
        </div>
        <motion.div className="landing-hero-visual" initial={reduceMotion ? false : { opacity: 0, scale: .96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, delay: .15 }}>
          <div className="hero-image-frame"><img src="/images/afterglow-landing.png" alt="A cinematic obsidian-violet gift box surrounded by floating photographs and glowing memory cards" onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="hero-image-shade" /></div>
          <motion.div className="floating-chip chip-photo" animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}><Camera size={15} /><span>Little moments</span></motion.div>
          <motion.div className="floating-chip chip-love" animate={reduceMotion ? undefined : { y: [0, 6, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}><Heart size={15} /><span>Made personal</span></motion.div>
          <div className="hero-visual-caption"><span className="caption-sparkle"><Sparkles size={15} /></span><span><strong>A little world, just for them</strong><small>Photos · films · music · words</small></span><ArrowUpRight size={18} /></div>
        </motion.div>
        <a className="landing-scroll" href="#features"><span>DISCOVER THE EXPERIENCE</span><ArrowDown size={14} /></a>
      </section>

      <section className="landing-feature-strip" id="features" aria-label="Afterglow features">
        {features.map((feature, index) => { const Icon = feature.icon; return <motion.article className="landing-feature" key={feature.number} {...reveal} transition={{ duration: .65, delay: index * .055 }}><div className="feature-topline"><span>{feature.number}</span><Icon size={18} strokeWidth={1.5} /></div><h2>{feature.title}</h2><p>{feature.description}</p></motion.article>; })}
      </section>

      <section className="landing-how" id="how-it-works">
        <motion.div className="landing-how-copy" {...reveal}><span className="landing-section-kicker">SMALL STEPS, BIG FEELINGS</span><h2>Create a gift <em>in minutes.</em></h2><p>Everything you need to turn a few meaningful things into an experience they can open, explore, and keep.</p><a className="text-link" href="/studio">Start making yours <ArrowRight size={16} /></a>
          <div className="landing-steps">{steps.map((step, index) => { const Icon = step.icon; return <motion.div className="landing-step" key={step.title} {...reveal} transition={{ duration: .6, delay: index * .08 }}><div className="step-icon"><Icon size={19} /></div><div className="step-copy"><span>STEP 0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div>{index < steps.length - 1 && <div className="step-connector" aria-hidden="true"><ArrowRight size={15} /></div>}</motion.div>; })}</div>
        </motion.div>
        <motion.div className="landing-demo-panel" id="demo" {...reveal}>
          <div className="demo-panel-heading"><div><span className="landing-section-kicker">TAKE A LITTLE LOOK</span><h3>Feel the story.</h3></div><span className="demo-live"><i /> DEMO PREVIEW</span></div>
          <div className="demo-card-grid">{demos.map((demo, index) => <button className="demo-card" type="button" key={demo.title} onClick={() => { setActiveVideo(index); setVideoFailed(false); }} style={{ backgroundImage: `linear-gradient(180deg,rgba(18,7,20,.05),rgba(18,7,20,.82)),url("${demo.poster}")` }}><span className="demo-card-label">{demo.label}</span><span className="demo-play"><Play size={19} fill="currentColor" /></span><span className="demo-card-title">{demo.title}</span><span className="demo-card-open">PLAY PREVIEW <ArrowUpRight size={13} /></span></button>)}</div>
          <p className="demo-disclaimer">Preview clips are illustrative examples. Your published gift uses the media you choose.</p>
        </motion.div>
      </section>

      <section className="landing-final-cta"><motion.div {...reveal}><span className="landing-section-kicker">THE BEST GIFTS FEEL PERSONAL</span><h2>Make something <em>they'll remember.</em></h2><p>Start with a photo. Add the song. Write the words. Let the little things become the whole story.</p><a className="landing-button" href="/studio">Create your first gift <ArrowRight size={17} /></a></motion.div><motion.div className="cta-orbit" aria-hidden="true" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 55, repeat: Infinity, ease: "linear" }}><span /><Heart size={31} strokeWidth={1} /><i /><b /></motion.div></section>

      <footer className="landing-footer"><a href="#top" className="landing-brand"><span className="brand-mark"><Heart size={18} /><Sparkles size={10} /></span><span>Afterglow</span></a><span>Little moments. Lasting feelings.</span><div><a href="/login">Log in</a><a href="/studio">Create a gift</a><a href="https://github.com/OvO-ZeD/birthday-gift" target="_blank" rel="noreferrer"><GitBranch size={14} /> GitHub</a></div></footer>

      <AnimatePresence>{activeVideo !== null && <motion.div className="landing-video-modal" role="dialog" aria-modal="true" aria-label={`${demos[activeVideo].title} preview`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveVideo(null)}><motion.div className="landing-video-dialog" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={event => event.stopPropagation()}><button className="landing-video-close" type="button" onClick={() => setActiveVideo(null)} aria-label="Close video"><X size={21} /></button><div className="video-modal-heading"><span className="landing-section-kicker">ILLUSTRATIVE PREVIEW</span><h3>{demos[activeVideo].title}</h3></div>{videoFailed ? <div className="video-fallback" style={{ backgroundImage: `linear-gradient(180deg,transparent,#170b1a),url("${demos[activeVideo].poster}")` }}><Video size={28} /><p>This sample clip could not load. The rest of the demo is still available.</p><a href={demos[activeVideo].poster} target="_blank" rel="noreferrer">View preview image <ArrowUpRight size={14} /></a></div> : <video className="landing-video" controls autoPlay playsInline poster={demos[activeVideo].poster} src={demos[activeVideo].src} onError={() => setVideoFailed(true)} /> }<p className="video-note">Sample footage is loaded from an external video host. Use your own media when creating a real gift.</p></motion.div></motion.div>}</AnimatePresence>
    </main>
  );
}
