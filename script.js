/**
 * Corey Lawrence Music - Authentic & Polished Client Controller
 * Faithful to original architecture: Fixed drawer behind player with curtain reveal,
 * natural full-screen swipe gestures, reliable iOS playback, and precision scrubbing.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Playlist Definition
  const SONGS = Object.freeze([
    {
      id: 'waubash-song',
      title: 'Waubash Cannonball',
      artist: 'Corey Lawrence',
      fileName: 'waubash.aac',
      duration: '1:35'
    },
    {
      id: 'windyandwarm-song',
      title: 'Windy & Warm',
      artist: 'Corey Lawrence',
      fileName: 'windy-and-warm.aac',
      duration: '2:19'
    },
    {
      id: 'freighttrain-song',
      title: 'Freight Train',
      artist: 'Corey Lawrence',
      fileName: 'freight-train.aac',
      duration: '1:54'
    },
    {
      id: 'cannonballrag-song',
      title: 'Cannonball Rag',
      artist: 'Corey Lawrence',
      fileName: 'cannonball-rag.aac',
      duration: '1:40'
    },
    {
      id: 'docsguitar-song',
      title: "Doc's Guitar",
      artist: 'Corey Lawrence',
      fileName: 'docs-guitar.aac',
      duration: '0:58'
    }
  ]);

  // DOM Elements
  const DOM = {
    audio: document.getElementById('audioPlayer'),
    albumArt: document.getElementById('album-art'),
    title: document.getElementById('title'),
    artist: document.getElementById('artist'),
    progressContainer: document.getElementById('progressContainer'),
    progressTrack: document.getElementById('progressTrack'),
    progressBar: document.getElementById('progressBar'),
    progressThumb: document.getElementById('progressThumb'),
    countUp: document.getElementById('count-up'),
    countDown: document.getElementById('count-down'),
    skipBackBtn: document.getElementById('skipBackButton'),
    playPauseBtn: document.getElementById('playPauseButton'),
    playPauseImg: document.getElementById('playPauseImg'),
    skipForwardBtn: document.getElementById('skipForwardButton'),
    arrowLink: document.getElementById('arrow-link'),
    arrowImg: document.getElementById('image'),
    mainPlayer: document.getElementById('mainPlayer'),
    songArea: document.getElementById('song-area'),
    songRows: document.querySelectorAll('.song')
  };

  // State Management
  const state = {
    currentIndex: 0,
    isPlaying: false,
    isScrubbing: false,
    wasPlayingBeforeScrub: false,
    isDrawerOpen: false,
    touchStartY: 0,
    touchStartX: 0
  };

  // Time formatter
  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Audio Engine
  class AudioEngine {
    constructor() {
      this.initEvents();
      this.initUnlock();
    }

    initUnlock() {
      // First interaction unlock for iOS
      const unlock = () => {
        if (DOM.audio.paused && !state.isPlaying) {
          DOM.audio.load();
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }

    initEvents() {
      DOM.audio.addEventListener('play', () => this.onPlay());
      DOM.audio.addEventListener('pause', () => this.onPause());
      DOM.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      DOM.audio.addEventListener('ended', () => this.nextTrack());
      DOM.audio.addEventListener('loadedmetadata', () => {
        this.updateTimeDisplay();
        MediaSession.update();
      });
      DOM.audio.addEventListener('error', (e) => {
        console.warn('Audio playback error:', e);
        this.updatePlayUI(false);
      });
    }

    loadTrack(index, autoPlay = true) {
      if (index < 0 || index >= SONGS.length) return;
      state.currentIndex = index;
      const song = SONGS[state.currentIndex];

      DOM.audio.src = song.fileName;
      DOM.title.textContent = song.title;
      DOM.artist.textContent = song.artist;

      // Reset scrubber
      DOM.progressBar.style.width = '0%';
      DOM.progressThumb.style.left = '0%';
      DOM.countUp.textContent = '0:00';
      DOM.countDown.textContent = `-${song.duration}`;

      this.updateActiveHighlight();
      MediaSession.update();

      if (autoPlay) {
        this.play();
      } else {
        this.updatePlayUI(false);
      }
    }

    async play() {
      try {
        await DOM.audio.play();
        this.updatePlayUI(true);
      } catch (err) {
        console.warn('Playback postponed by browser policy:', err);
        this.updatePlayUI(false);
      }
    }

    pause() {
      DOM.audio.pause();
      this.updatePlayUI(false);
    }

    togglePlayPause() {
      if (DOM.audio.paused) {
        this.play();
      } else {
        this.pause();
      }
    }

    onPlay() {
      state.isPlaying = true;
      this.updatePlayUI(true);
      MediaSession.setPlaybackState('playing');
    }

    onPause() {
      state.isPlaying = false;
      this.updatePlayUI(false);
      MediaSession.setPlaybackState('paused');
    }

    updatePlayUI(isPlaying) {
      DOM.playPauseImg.src = isPlaying ? 'pause.png' : 'play.png';
      DOM.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause track' : 'Play track');
    }

    onTimeUpdate() {
      if (state.isScrubbing) return;
      this.updateTimeDisplay();
    }

    updateTimeDisplay() {
      const cur = DOM.audio.currentTime || 0;
      const dur = DOM.audio.duration;

      if (!isNaN(dur) && dur > 0) {
        const pct = (cur / dur) * 100;
        DOM.progressBar.style.width = `${pct}%`;
        DOM.progressThumb.style.left = `${pct}%`;
        DOM.countUp.textContent = formatTime(cur);
        DOM.countDown.textContent = `-${formatTime(dur - cur)}`;
        MediaSession.syncPosition();
      } else {
        DOM.countUp.textContent = formatTime(cur);
      }
    }

    nextTrack() {
      const nextIndex = (state.currentIndex + 1) % SONGS.length;
      this.loadTrack(nextIndex, true);
    }

    prevTrack() {
      if (DOM.audio.currentTime > 3) {
        DOM.audio.currentTime = 0;
        this.updateTimeDisplay();
        return;
      }
      const prevIndex = (state.currentIndex - 1 + SONGS.length) % SONGS.length;
      this.loadTrack(prevIndex, true);
    }

    seekToFraction(fraction) {
      if (isNaN(DOM.audio.duration)) return;
      const targetTime = fraction * DOM.audio.duration;
      DOM.audio.currentTime = targetTime;
      this.updateTimeDisplay();
    }

    updateActiveHighlight() {
      DOM.songRows.forEach((row, idx) => {
        row.classList.toggle('playing', idx === state.currentIndex);
      });
    }
  }

  // Pointer Scrubber Controller
  class ScrubberController {
    constructor(engine) {
      this.engine = engine;
      this.init();
    }

    init() {
      const container = DOM.progressContainer;

      container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
      window.addEventListener('pointermove', (e) => this.onPointerMove(e));
      window.addEventListener('pointerup', (e) => this.onPointerUp(e));
      window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    calcFraction(e) {
      const rect = DOM.progressTrack.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
      const offset = clientX - rect.left;
      return Math.min(Math.max(offset / rect.width, 0), 1);
    }

    onPointerDown(e) {
      e.preventDefault();
      state.isScrubbing = true;
      state.wasPlayingBeforeScrub = !DOM.audio.paused;

      DOM.progressContainer.classList.add('scrubbing');
      DOM.progressContainer.setPointerCapture(e.pointerId);

      this.updateVisualScrub(e);
    }

    onPointerMove(e) {
      if (!state.isScrubbing) return;
      e.preventDefault();
      this.updateVisualScrub(e);
    }

    updateVisualScrub(e) {
      const fraction = this.calcFraction(e);
      const pct = fraction * 100;

      DOM.progressBar.style.width = `${pct}%`;
      DOM.progressThumb.style.left = `${pct}%`;

      if (!isNaN(DOM.audio.duration) && DOM.audio.duration > 0) {
        const previewTime = fraction * DOM.audio.duration;
        DOM.countUp.textContent = formatTime(previewTime);
        DOM.countDown.textContent = `-${formatTime(DOM.audio.duration - previewTime)}`;
      }
    }

    onPointerUp(e) {
      if (!state.isScrubbing) return;
      const fraction = this.calcFraction(e);
      state.isScrubbing = false;
      DOM.progressContainer.classList.remove('scrubbing');

      try {
        DOM.progressContainer.releasePointerCapture(e.pointerId);
      } catch (_) {}

      this.engine.seekToFraction(fraction);

      if (state.wasPlayingBeforeScrub) {
        this.engine.play();
      }
    }
  }

  // Curtain Drawer Controller (Player slides up to reveal drawer behind)
  class DrawerController {
    constructor(engine) {
      this.engine = engine;
      this.init();
    }

    init() {
      // Arrow link click toggles drawer
      DOM.arrowLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });

      // Swipe Gestures anywhere on the screen
      window.addEventListener(
        'touchstart',
        (e) => {
          // Ignore if user is touching the scrubber
          if (e.target.closest('.progress-container')) return;
          state.touchStartY = e.touches[0].clientY;
          state.touchStartX = e.touches[0].clientX;
        },
        { passive: true }
      );

      window.addEventListener(
        'touchend',
        (e) => {
          if (e.target.closest('.progress-container')) return;
          const deltaY = state.touchStartY - e.changedTouches[0].clientY;
          const deltaX = state.touchStartX - e.changedTouches[0].clientX;

          // Require predominantly vertical swipe of at least 35px
          if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 35) {
            if (deltaY > 0) {
              // Swiped UP -> open drawer (slide player up)
              this.open();
            } else {
              // Swiped DOWN -> close drawer (slide player down)
              this.close();
            }
          }
        },
        { passive: true }
      );

      // If user taps on the main player while it is slid up, close the drawer
      DOM.mainPlayer.addEventListener('click', (e) => {
        if (state.isDrawerOpen && !e.target.closest('#arrow-link') && !e.target.closest('.controls') && !e.target.closest('.progress-container')) {
          this.close();
        }
      });
    }

    toggle() {
      if (state.isDrawerOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      state.isDrawerOpen = true;
      DOM.mainPlayer.classList.add('drawer-open');
    }

    close() {
      state.isDrawerOpen = false;
      DOM.mainPlayer.classList.remove('drawer-open');
    }
  }

  // MediaSession API Integration
  const MediaSession = {
    init(engine) {
      this.engine = engine;
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.setActionHandler('play', () => this.engine.play());
      navigator.mediaSession.setActionHandler('pause', () => this.engine.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.engine.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.engine.nextTrack());

      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            DOM.audio.currentTime = details.seekTime;
            this.engine.updateTimeDisplay();
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          DOM.audio.currentTime = Math.max(DOM.audio.currentTime - skip, 0);
          this.engine.updateTimeDisplay();
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skip = details.seekOffset || 10;
          DOM.audio.currentTime = Math.min(DOM.audio.currentTime + skip, DOM.audio.duration || 0);
          this.engine.updateTimeDisplay();
        });
      } catch (_) {}
    },

    update() {
      if (!('mediaSession' in navigator)) return;
      const song = SONGS[state.currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: 'Old-Time Couch Recordings',
        artwork: [
          { src: 'album-art-128.jpg', sizes: '128x128', type: 'image/jpeg' },
          { src: 'album-art-256.jpg', sizes: '256x256', type: 'image/jpeg' },
          { src: 'album-art-512.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: 'album-art-1024.jpg', sizes: '1024x1024', type: 'image/jpeg' }
        ]
      });
      this.syncPosition();
    },

    setPlaybackState(status) {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = status;
    },

    syncPosition() {
      if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
      const dur = DOM.audio.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: DOM.audio.playbackRate || 1.0,
            position: Math.min(DOM.audio.currentTime || 0, dur)
          });
        } catch (_) {}
      }
    }
  };

  // Wire App
  const engine = new AudioEngine();
  const scrubber = new ScrubberController(engine);
  const drawer = new DrawerController(engine);
  MediaSession.init(engine);

  // Bind Buttons
  DOM.playPauseBtn.addEventListener('click', () => engine.togglePlayPause());
  DOM.skipBackBtn.addEventListener('click', () => engine.prevTrack());
  DOM.skipForwardBtn.addEventListener('click', () => engine.nextTrack());

  // Bind Song Rows in Drawer
  DOM.songRows.forEach((row) => {
    const idx = parseInt(row.dataset.index, 10);
    row.addEventListener('click', (e) => {
      e.preventDefault();
      engine.loadTrack(idx, true);
      if (window.innerWidth < 668) {
        drawer.close();
      }
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' && e.target !== DOM.progressContainer) {
      e.preventDefault();
      engine.togglePlayPause();
    }
  });

  // Load initial track
  engine.loadTrack(0, false);
});
