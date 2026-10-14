"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Gift,
  GitBranch,
  Heart,
  LockKeyhole,
  Menu,
  Music2,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from "lucide-react";

const features = [
  {
    icon: Heart,
    number: "01",
    title: "Made personal",
    description:
      "Turn your memories, inside jokes, photos, and messages into a gift that feels unmistakably yours.",
  },
  {
    icon: Video,
    number: "02",
    title: "Moments in motion",
    description:
      "Combine photos, videos, music, and thoughtful messages in one cinematic experience.",
  },
  {
    icon: LockKeyhole,
    number: "03",
    title: "Just for them",
    description:
      "Share a private gift experience through a link made for the person receiving it.",
  },
  {
    icon: Palette,
    number: "04",
    title: "Your own atmosphere",
    description:
      "Build a visual experience with expressive layouts, beautiful details, and smooth animations.",
  },
];

const steps = [
  {
    number: "01",
    title: "Collect the moments",
    description:
      "Choose the photos, videos, messages, and little details that tell your story.",
  },
  {
    number: "02",
    title: "Make it yours",
    description:
      "Arrange your memories into a personal experience with its own look and feel.",
  },
  {
    number: "03",
    title: "Send the feeling",
    description:
      "Publish your creation and share the link when the moment is right.",
  },
];

const demos = [
  {
    title: "A little more you",
    category: "BIRTHDAY EXPERIENCE",
    description: "A personal collection of memories and messages.",
    poster: "/images/afterglow-landing.png",
    icon: Gift,
  },
  {
    title: "Moments that stay",
    category: "MEMORY COLLECTION",
    description: "Bring your favourite photos into one place.",
    poster: "/images/afterglow-landing.png",
    icon: Camera,
  },
  {
    title: "Press play on us",
    category: "VIDEO & MUSIC",
    description: "Give your memories a soundtrack of their own.",
    poster: "/images/afterglow-landing.png",
    icon: Music2,
  },
];

const githubUrl = "https://github.com/OvO-ZeD/birthday-gift";

export default function Home() {
  const [activeDemo, setActiveDemo] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b10] text-[#f4f0fa] selection:bg-violet-400/30 selection:text-white">
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
      >
        <div className="absolute -top-64 left-1/3 h-[540px] w-[540px] rounded-full bg-violet-700/10 blur-[150px]" />
        <div className="absolute top-[45%] -right-60 h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-[150px]" />
        <div className="absolute bottom-0 -left-40 h-[400px] w-[400px] rounded-full bg-purple-900/10 blur-[130px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-30 border-b border-white/[0.07] bg-[#0b0b10]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#home"
            className="group flex items-center gap-3"
            aria-label="Afterglow home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-200 transition group-hover:border-violet-300/50 group-hover:bg-violet-400/20">
              <Sparkles size={18} />
            </span>
            <span className="text-[15px] font-semibold tracking-[0.12em]">
              AFTERGLOW
              <span className="ml-1.5 font-normal text-white/40">STUDIO</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-white/60 transition hover:text-white"
            >
              Features
            </a>
            <a
              href="#showcase"
              className="text-sm text-white/60 transition hover:text-white"
            >
              Showcase
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-white/60 transition hover:text-white"
            >
              How it works
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"
            >
              <GitBranch size={16} />
              GitHub
              <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="hidden md:block">
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium transition hover:border-violet-300/40 hover:bg-violet-400/10"
            >
              Explore the experience
              <ArrowRight size={15} />
            </a>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/80 md:hidden"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/[0.07] bg-[#0b0b10] md:hidden"
            >
              <div className="flex flex-col gap-1 px-5 py-4">
                <a
                  href="#features"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-sm text-white/75 hover:bg-white/5"
                >
                  Features
                </a>
                <a
                  href="#showcase"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-sm text-white/75 hover:bg-white/5"
                >
                  Showcase
                </a>
                <a
                  href="#how-it-works"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-sm text-white/75 hover:bg-white/5"
                >
                  How it works
                </a>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-white/75 hover:bg-white/5"
                >
                  <GitBranch size={16} />
                  GitHub repository
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-12 lg:pb-28 lg:pt-28"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3.5 py-2 text-xs font-medium tracking-wide text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.8)]" />
            A different kind of digital gift
          </div>

          <h1 className="max-w-2xl text-[clamp(2.9rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.065em]">
            Some moments
            <br />
            deserve
            <br />
            <span className="bg-gradient-to-r from-violet-200 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              more than a message.
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
            Create a personal digital experience with your favourite memories,
            videos, music, and messages. Something they can open, explore, and
            remember.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#showcase"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#c4b5fd] px-6 py-3.5 text-sm font-semibold text-[#171020] transition hover:bg-[#ddd4ff]"
            >
              Discover Afterglow
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              How it works
            </a>
          </div>

          <div className="mt-10 flex items-center gap-4 border-t border-white/[0.09] pt-6">
            <div className="flex -space-x-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b0b10] bg-[#33294a] text-violet-200">
                <Heart size={15} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b0b10] bg-[#262c3f] text-indigo-200">
                <Camera size={15} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b0b10] bg-[#37313f] text-white/80">
                <Music2 size={15} />
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white/85">
                Your memories, your way
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                Personal by design. Made to be shared.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Hero artwork */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-2xl"
        >
          <div className="absolute -inset-5 rounded-[2rem] bg-violet-500/[0.08] blur-3xl" />

          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#14131b] shadow-2xl shadow-black/40 sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-white/[0.09] px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#c4b5fd]" />
                <span className="text-[10px] font-medium tracking-[0.22em] text-white/55 sm:text-xs">
                  A GIFT, REIMAGINED
                </span>
              </div>
              <span className="text-[10px] tracking-wide text-white/35 sm:text-xs">
                EXPERIENCE 001
              </span>
            </div>

            <div className="relative aspect-[5/4] overflow-hidden sm:aspect-[1.13/1]">
              <img
                src="/images/afterglow-landing.png"
                alt="Afterglow Studio visual concept in an atmospheric violet palette"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100d18]/95 via-[#100d18]/10 to-transparent" />

              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-4 top-5 rounded-xl border border-white/15 bg-[#17131e]/80 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:right-6 sm:top-7 sm:px-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-200" />
                  <span className="text-[10px] text-white/80 sm:text-xs">
                    Made just for you
                  </span>
                </div>
              </motion.div>

              <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
                <p className="mb-2 text-[10px] font-medium tracking-[0.25em] text-violet-200 sm:text-xs">
                  THE THINGS WE KEEP
                </p>
                <h2 className="max-w-md text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                  Every memory
                  <br />
                  has a place.
                </h2>
                <p className="mt-3 max-w-sm text-xs leading-5 text-white/65 sm:text-sm sm:leading-6">
                  A collection of moments, gathered into something meaningful.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.08] bg-[#121119]">
              <div className="flex items-center gap-2 px-3 py-4 sm:gap-3 sm:px-5">
                <Camera size={16} className="shrink-0 text-violet-200" />
                <span className="text-[10px] text-white/55 sm:text-xs">
                  Your photos
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-4 sm:gap-3 sm:px-5">
                <Video size={16} className="shrink-0 text-violet-200" />
                <span className="text-[10px] text-white/55 sm:text-xs">
                  Your videos
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-4 sm:gap-3 sm:px-5">
                <Music2 size={16} className="shrink-0 text-violet-200" />
                <span className="text-[10px] text-white/55 sm:text-xs">
                  Your soundtrack
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-5 -right-2 hidden rounded-2xl border border-white/10 bg-[#18151f]/95 p-4 shadow-2xl backdrop-blur-xl sm:block lg:-right-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-white/90">
                  A personal experience
                </p>
                <p className="mt-1 text-[10px] text-white/45">
                  Thoughtfully put together
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature strip */}
      <section className="relative z-10 border-y border-white/[0.07] bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 py-5 sm:px-8 md:grid-cols-4 lg:px-12">
          {[
            "Personal storytelling",
            "Photos and video",
            "Smooth animations",
            "Shareable experiences",
          ].map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
              className="flex items-center justify-center gap-2 px-2 py-3 text-center text-[11px] text-white/50 sm:text-xs"
            >
              <Sparkles
                size={12}
                className="shrink-0 text-violet-300/70"
              />
              {item}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
        >
          <div>
            <p className="mb-3 text-xs font-medium tracking-[0.22em] text-violet-200">
              THE DETAILS MATTER
            </p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              More than a gift.
              <br />
              <span className="text-white/45">A whole experience.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/50">
            The best gifts are personal. Afterglow brings the little things
            together in one thoughtful digital experience.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-colors hover:border-violet-300/25 hover:bg-violet-300/[0.035] sm:p-6"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.07] text-violet-200 transition group-hover:bg-violet-300/[0.13]">
                    <Icon size={19} />
                  </span>
                  <span className="text-xs tracking-widest text-white/25">
                    {feature.number}
                  </span>
                </div>

                <h3 className="text-lg font-medium tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  {feature.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Showcase */}
      <section
        id="showcase"
        className="relative z-10 scroll-mt-20 border-y border-white/[0.07] bg-[#100f16]/75"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-medium tracking-[0.22em] text-violet-200">
                THE SHOWCASE
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Imagine what you could make.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/45">
              Explore the kinds of experiences you can create with your own
              memories and stories.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {demos.map((demo, index) => {
              const Icon = demo.icon;

              return (
                <motion.button
                  key={demo.title}
                  type="button"
                  onClick={() => setActiveDemo(index)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#17151f] text-left transition-colors hover:border-violet-300/30"
                >
                  <div className="relative aspect-[1.2/1] overflow-hidden bg-[#1b1625]">
                    <img
                      src={demo.poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-105 group-hover:opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#100d17] via-[#100d17]/15 to-transparent" />

                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                      <Icon size={13} className="text-violet-200" />
                      <span className="text-[9px] font-medium tracking-[0.15em] text-white/80">
                        {demo.category}
                      </span>
                    </div>

                    <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition group-hover:bg-violet-300 group-hover:text-[#171020]">
                      <Play size={16} fill="currentColor" />
                    </span>

                    <div className="absolute bottom-5 left-5 right-16">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {demo.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-5 text-white/60">
                        {demo.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-xs text-white/45">
                      View concept
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="text-white/45 transition group-hover:text-violet-200"
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="mt-5 text-xs leading-5 text-white/35">
            These cards are concept previews. They are not finished example
            gifts or live customer projects.
          </p>
        </div>
      </section>

      {/* Demo preview modal */}
      <AnimatePresence>
        {activeDemo !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDemo(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-modal-title"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#14121b] shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setActiveDemo(null)}
                aria-label="Close preview"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-white/10"
              >
                <X size={17} />
              </button>

              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={demos[activeDemo].poster}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14121b] to-transparent" />
              </div>

              <div className="px-6 pb-6 pt-1 sm:px-8 sm:pb-8">
                <p className="mb-2 text-[10px] font-medium tracking-[0.2em] text-violet-200">
                  {demos[activeDemo].category}
                </p>
                <h2
                  id="demo-modal-title"
                  className="text-2xl font-semibold tracking-tight"
                >
                  {demos[activeDemo].title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  {demos[activeDemo].description} This is a visual concept
                  preview. Your own published gift can use your selected
                  content and personal details.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveDemo(null)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-300 px-5 py-3 text-sm font-semibold text-[#171020] transition hover:bg-violet-200"
                >
                  Back to showcase
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 text-xs font-medium tracking-[0.22em] text-violet-200">
              SIMPLE BY DESIGN
            </p>
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              Three steps.
              <br />
              <span className="text-white/45">One lasting memory.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/50">
              No elaborate gift wrapping required. Just the moments that matter
              and a little creativity.
            </p>
            <a
              href="#home"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-violet-200 transition hover:text-white"
            >
              Back to the beginning
              <ArrowDown size={15} className="rotate-180" />
            </a>
          </motion.div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group grid grid-cols-[46px_1fr] gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-violet-300/20 hover:bg-white/[0.035] sm:grid-cols-[56px_1fr] sm:gap-5 sm:p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.06] text-sm font-medium text-violet-200 sm:h-12 sm:w-12">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-base font-medium sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative z-10 px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-300/15 bg-[#14111c] px-6 py-12 text-center sm:px-12 sm:py-16 lg:py-20"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
          <div className="relative">
            <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
              <Gift size={22} />
            </span>
            <p className="mb-3 text-[10px] font-medium tracking-[0.24em] text-violet-200 sm:text-xs">
              MAKE IT MEAN SOMETHING
            </p>
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              The most personal gifts
              <br className="hidden sm:block" /> start with a memory.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/50">
              Bring your favourite moments together and make something worth
              opening again.
            </p>
            <a
              href="#showcase"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c4b5fd] px-6 py-3.5 text-sm font-semibold text-[#171020] transition hover:bg-[#ddd4ff]"
            >
              Explore the showcase
              <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <a href="#home" className="flex items-center gap-2.5">
            <Sparkles size={17} className="text-violet-200" />
            <span className="text-xs font-semibold tracking-[0.14em]">
              AFTERGLOW STUDIO
            </span>
          </a>

          <p className="text-xs leading-5 text-white/35">
            Made for the moments that matter.
          </p>

          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-white/50 transition hover:text-white"
          >
            <GitBranch size={15} />
            View on GitHub
            <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </main>
  );
}