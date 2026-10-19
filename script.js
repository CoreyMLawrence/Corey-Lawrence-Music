/**
 * Corey Lawrence Music - Authentic & Polished Controller
 * Modeled on Spotify's control proportions & Queue, with original shallow arrow
 * at bottom, curtain drawer reveal, vertical flip, and reliable iOS playback.
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
    heartBtn: document.getElementById('heartButton'),
    progressContainer: document.getElementById('progressContainer'),
    progressTrack: document.getElementById('progressTrack'),
    progressBar: document.getElementById('progressBar'),
    progressThumb: document.getElementById('progressThumb'),
    countUp: document.getElementById('count-up'),
    countDown: document.getElementById('count-down'),
    shuffleBtn: document.getElementById('shuffleButton'),
    skipBackBtn: document.getElementById('skipBackButton'),
    playPauseBtn: document.getElementById('playPauseButton'),
    playIconSvg: document.getElementById('playIconSvg'),
    skipForwardBtn: document.getElementById('skipForwardButton'),
    repeatBtn: document.getElementById('repeatButton'),
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
    isShuffle: false,
    isRepeat: false,
    likedSongs: new Set(JSON.parse(localStorage.getItem('liked_songs') || '[]')),
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
      // First interaction unlock for iOS Safari
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
      DOM.audio.addEventListener('playing', () => this.onPlaying());
      DOM.audio.addEventListener('pause', () => this.onPause());
      DOM.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      DOM.audio.addEventListener('ended', () => this.onEnded());
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

      // Update liked heart state
      this.updateHeartUI();

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
      MediaSession.bindHandlers();
    }

    onPlaying() {
      state.isPlaying = true;
      this.updatePlayUI(true);
      MediaSession.update();
      MediaSession.bindHandlers();
    }

    onPause() {
      state.isPlaying = false;
      this.updatePlayUI(false);
      MediaSession.setPlaybackState('paused');
      MediaSession.bindHandlers();
    }

    updatePlayUI(isPlaying) {
      if (DOM.playIconSvg) {
        DOM.playIconSvg.innerHTML = isPlaying
          ? '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>'
          : '<polygon points="8,5 19,12 8,19"></polygon>';
      }
      DOM.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause track' : 'Play track');
    }

    updateHeartUI() {
      if (!DOM.heartBtn) return;
      const isLiked = state.likedSongs.has(state.currentIndex);
      if (isLiked) {
        DOM.heartBtn.classList.add('liked');
        DOM.heartBtn.querySelector('svg').setAttribute('fill', '#1ed760');
      } else {
        DOM.heartBtn.classList.remove('liked');
        DOM.heartBtn.querySelector('svg').setAttribute('fill', 'none');
      }
    }

    toggleHeart() {
      if (state.likedSongs.has(state.currentIndex)) {
        state.likedSongs.delete(state.currentIndex);
      } else {
        state.likedSongs.add(state.currentIndex);
      }
      localStorage.setItem('liked_songs', JSON.stringify([...state.likedSongs]));
      this.updateHeartUI();
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
      } else {
        DOM.countUp.textContent = formatTime(cur);
      }
    }

    onEnded() {
      if (state.isRepeat) {
        DOM.audio.currentTime = 0;
        this.play();
      } else if (state.isShuffle) {
        let randIndex = Math.floor(Math.random() * SONGS.length);
        if (randIndex === state.currentIndex && SONGS.length > 1) {
          randIndex = (randIndex + 1) % SONGS.length;
        }
        this.loadTrack(randIndex, true);
      } else {
        this.nextTrack();
      }
    }

    nextTrack() {
      if (state.isShuffle) {
        let randIndex = Math.floor(Math.random() * SONGS.length);
        if (randIndex === state.currentIndex && SONGS.length > 1) {
          randIndex = (randIndex + 1) % SONGS.length;
        }
        this.loadTrack(randIndex, true);
        return;
      }
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

    updateActiveHighlight() {
      DOM.songRows.forEach((row, i) => {
        if (i === state.currentIndex) {
          row.classList.add('playing');
        } else {
          row.classList.remove('playing');
        }
      });
    }

    seekToFraction(fraction) {
      const dur = DOM.audio.duration;
      if (!isNaN(dur) && dur > 0) {
        const newTime = fraction * dur;
        DOM.audio.currentTime = newTime;
        this.updateTimeDisplay();
      }
    }

    toggleShuffle() {
      state.isShuffle = !state.isShuffle;
      if (DOM.shuffleBtn) {
        DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
      }
    }

    toggleRepeat() {
      state.isRepeat = !state.isRepeat;
      if (DOM.repeatBtn) {
        DOM.repeatBtn.classList.toggle('active', state.isRepeat);
      }
    }
  }

  // Scrubber Controller (Precision Pointer Capture)
  class ScrubberController {
    constructor(engine) {
      this.engine = engine;
      this.init();
    }

    init() {
      const container = DOM.progressContainer;
      if (!container) return;

      container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
      window.addEventListener('pointermove', (e) => this.onPointerMove(e));
      window.addEventListener('pointerup', (e) => this.onPointerUp(e));
      window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    calcFraction(e) {
      const rect = DOM.progressTrack.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
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

  // Curtain Drawer Controller (Player slides up to reveal queue behind)
  class DrawerController {
    constructor(engine) {
      this.engine = engine;
      this.init();
    }

    init() {
      // Shallow arrow click toggles drawer
      if (DOM.arrowLink) {
        DOM.arrowLink.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        });
      }

      // Swipe Gestures anywhere on the screen
      window.addEventListener(
        'touchstart',
        (e) => {
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
        if (
          state.isDrawerOpen &&
          !e.target.closest('#arrow-link') &&
          !e.target.closest('.controls-row') &&
          !e.target.closest('.progress-section')
        ) {
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
      if (DOM.songArea) {
        DOM.songArea.classList.add('open');
      }
      if (DOM.arrowLink) {
        DOM.arrowLink.classList.add('open');
      }
    }

    close() {
      state.isDrawerOpen = false;
      DOM.mainPlayer.classList.remove('drawer-open');
      if (DOM.songArea) {
        DOM.songArea.classList.remove('open');
      }
      if (DOM.arrowLink) {
        DOM.arrowLink.classList.remove('open');
      }
    }
  }

  // MediaSession API Integration (iOS Lock Screen & Control Center)
  const MediaSession = {
    init(engine) {
      this.engine = engine;
      if (!('mediaSession' in navigator)) return;
      this.bindHandlers();
    },

    bindHandlers() {
      if (!('mediaSession' in navigator)) return;

      try {
        navigator.mediaSession.setActionHandler('play', () => this.engine.play());
        navigator.mediaSession.setActionHandler('pause', () => this.engine.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.engine.prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.engine.nextTrack());

        // Explicitly set seekbackward, seekforward, and seekto to null so iOS Lock Screen and Control Center
        // display full-song skip buttons (⏮ / ⏭) instead of 10s/15s skip buttons (⟲ / ⟳)
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (err) {
        console.warn('[MediaSession] Handler binding error:', err);
      }
    },

    update() {
      if (!('mediaSession' in navigator)) return;
      const song = SONGS[state.currentIndex];
      const baseUrl = window.location.href.split('?')[0].split('#')[0].replace(/\/[^/]*$/, '/');

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: 'Old-Time Couch Recordings',
          artwork: [
            { src: baseUrl + 'album-art-128.jpg', sizes: '128x128', type: 'image/jpeg' },
            { src: baseUrl + 'album-art-256.jpg', sizes: '256x256', type: 'image/jpeg' },
            { src: baseUrl + 'album-art-512.jpg', sizes: '512x512', type: 'image/jpeg' },
            { src: baseUrl + 'album-art-1024.jpg', sizes: '1024x1024', type: 'image/jpeg' }
          ]
        });
      } catch (err) {
        console.warn('[MediaSession] Metadata error:', err);
      }

      this.bindHandlers();
      this.syncPosition();
    },

    setPlaybackState(status) {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = status;
      this.bindHandlers();
      this.syncPosition();
    },

    syncPosition() {
      if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
      const dur = DOM.audio.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: DOM.audio.playbackRate || 1.0,
            position: Math.min(Math.max(DOM.audio.currentTime || 0, 0), dur)
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

  if (DOM.shuffleBtn) {
    DOM.shuffleBtn.addEventListener('click', () => engine.toggleShuffle());
  }
  if (DOM.repeatBtn) {
    DOM.repeatBtn.addEventListener('click', () => engine.toggleRepeat());
  }
  if (DOM.heartBtn) {
    DOM.heartBtn.addEventListener('click', () => engine.toggleHeart());
  }

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
