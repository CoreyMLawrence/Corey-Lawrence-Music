/**
 * Corey Lawrence Music - Refactored Audio Engine & UI Controller
 * Modernized for iOS PWA, MediaSession, fluid bottom sheet, and precision scrubbing.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Playlist Configuration
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

  // DOM Elements Cache
  const DOM = {
    audio: document.getElementById('audioPlayer'),
    albumArt: document.getElementById('albumArt'),
    songTitle: document.getElementById('songTitle'),
    artistName: document.getElementById('artistName'),
    progressContainer: document.getElementById('progressContainer'),
    progressTrack: document.getElementById('progressTrack'),
    progressBar: document.getElementById('progressBar'),
    progressThumb: document.getElementById('progressThumb'),
    countUp: document.getElementById('countUp'),
    countDown: document.getElementById('countDown'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playPauseImg: document.getElementById('playPauseImg'),
    skipBackBtn: document.getElementById('skipBackBtn'),
    skipForwardBtn: document.getElementById('skipForwardBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    drawerToggleBtn: document.getElementById('drawerToggleBtn'),
    drawerChevron: document.getElementById('drawerChevron'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    songDrawer: document.getElementById('songDrawer'),
    drawerPullBar: document.getElementById('drawerPullBar'),
    songList: document.getElementById('songList')
  };

  // Application State
  const state = {
    currentIndex: 0,
    isPlaying: false,
    isScrubbing: false,
    wasPlayingBeforeScrub: false,
    isShuffle: false,
    repeatMode: 0, // 0: Off, 1: Repeat All, 2: Repeat One
    shuffledOrder: [],
    isDrawerOpen: false,
    startY: 0,
    currentPullY: 0,
    isDraggingDrawer: false
  };

  // Helper: Format seconds to M:SS
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Audio Engine
  class AudioEngine {
    constructor() {
      this.initEvents();
      this.initAudioUnlock();
    }

    initAudioUnlock() {
      // Silent iOS audio unlock on first user pointer/touch interaction
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
      DOM.audio.addEventListener('ended', () => this.onEnded());
      DOM.audio.addEventListener('loadedmetadata', () => {
        this.updateTimeDisplay();
        MediaSessionManager.update();
      });
      DOM.audio.addEventListener('error', (e) => {
        console.warn('Audio playback error:', e);
        this.setPlayingUI(false);
      });
    }

    loadTrack(index, autoPlay = true) {
      if (index < 0 || index >= SONGS.length) return;
      state.currentIndex = index;
      const song = SONGS[state.currentIndex];

      DOM.audio.src = song.fileName;
      DOM.songTitle.textContent = song.title;
      DOM.artistName.textContent = song.artist;

      // Reset scrubber position
      DOM.progressBar.style.width = '0%';
      DOM.progressThumb.style.left = '0%';
      DOM.countUp.textContent = '0:00';
      DOM.countDown.textContent = `-${song.duration}`;

      UI.updateActivePlaylistItem();
      MediaSessionManager.update();

      if (autoPlay) {
        this.play();
      } else {
        this.setPlayingUI(false);
      }
    }

    async play() {
      try {
        await DOM.audio.play();
        this.setPlayingUI(true);
      } catch (err) {
        // Autoplay may be restricted until user taps
        console.warn('Play was prevented or postponed:', err);
        this.setPlayingUI(false);
      }
    }

    pause() {
      DOM.audio.pause();
      this.setPlayingUI(false);
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
      this.setPlayingUI(true);
      MediaSessionManager.setPlaybackState('playing');
    }

    onPause() {
      state.isPlaying = false;
      this.setPlayingUI(false);
      MediaSessionManager.setPlaybackState('paused');
    }

    setPlayingUI(isPlaying) {
      DOM.playPauseImg.src = isPlaying ? './pause.png' : './play.png';
      DOM.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause track' : 'Play track');
      DOM.albumArt.classList.toggle('playing', isPlaying);
      UI.updateEqualizerState(isPlaying);
    }

    onTimeUpdate() {
      if (state.isScrubbing) return; // Do not overwrite while user is dragging
      this.updateTimeDisplay();
    }

    updateTimeDisplay() {
      const current = DOM.audio.currentTime || 0;
      const duration = DOM.audio.duration;

      if (!isNaN(duration) && duration > 0) {
        const percent = (current / duration) * 100;
        DOM.progressBar.style.width = `${percent}%`;
        DOM.progressThumb.style.left = `${percent}%`;
        DOM.progressContainer.setAttribute('aria-valuenow', Math.round(percent));
        DOM.countUp.textContent = formatTime(current);
        DOM.countDown.textContent = `-${formatTime(duration - current)}`;
        MediaSessionManager.updatePositionState();
      } else {
        DOM.countUp.textContent = formatTime(current);
      }
    }

    onEnded() {
      if (state.repeatMode === 2) {
        // Repeat current track
        DOM.audio.currentTime = 0;
        this.play();
      } else {
        this.nextTrack(true);
      }
    }

    nextTrack(isFromEnded = false) {
      if (state.isShuffle) {
        let nextIndex = Math.floor(Math.random() * SONGS.length);
        if (SONGS.length > 1 && nextIndex === state.currentIndex) {
          nextIndex = (nextIndex + 1) % SONGS.length;
        }
        this.loadTrack(nextIndex, true);
        return;
      }

      if (state.currentIndex < SONGS.length - 1) {
        this.loadTrack(state.currentIndex + 1, true);
      } else {
        // At the last song
        if (state.repeatMode === 1 || !isFromEnded) {
          this.loadTrack(0, true);
        } else {
          // Reached end with Repeat Off
          this.loadTrack(0, false);
          DOM.audio.currentTime = 0;
        }
      }
    }

    prevTrack() {
      // If song played more than 3s, restart track
      if (DOM.audio.currentTime > 3) {
        DOM.audio.currentTime = 0;
        this.updateTimeDisplay();
        return;
      }

      if (state.isShuffle) {
        let prevIndex = Math.floor(Math.random() * SONGS.length);
        this.loadTrack(prevIndex, true);
        return;
      }

      const prev = (state.currentIndex - 1 + SONGS.length) % SONGS.length;
      this.loadTrack(prev, true);
    }

    seekToPercent(percent) {
      if (isNaN(DOM.audio.duration)) return;
      const targetTime = percent * DOM.audio.duration;
      DOM.audio.currentTime = targetTime;
      this.updateTimeDisplay();
    }
  }

  // Scrubber / Progress Controller (Fluid touch & mouse dragging)
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

      // Keyboard Accessibility
      container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          DOM.audio.currentTime = Math.min(DOM.audio.currentTime + 5, DOM.audio.duration || 0);
          this.engine.updateTimeDisplay();
        } else if (e.key === 'ArrowLeft') {
          DOM.audio.currentTime = Math.max(DOM.audio.currentTime - 5, 0);
          this.engine.updateTimeDisplay();
        } else if (e.key === ' ') {
          e.preventDefault();
          this.engine.togglePlayPause();
        }
      });
    }

    getPercentage(e) {
      const rect = DOM.progressTrack.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
      const offsetX = clientX - rect.left;
      return Math.min(Math.max(offsetX / rect.width, 0), 1);
    }

    onPointerDown(e) {
      e.preventDefault();
      state.isScrubbing = true;
      state.wasPlayingBeforeScrub = !DOM.audio.paused;

      DOM.progressContainer.classList.add('scrubbing');
      DOM.progressContainer.setPointerCapture(e.pointerId);

      this.updateScrubVisuals(e);
    }

    onPointerMove(e) {
      if (!state.isScrubbing) return;
      e.preventDefault();
      this.updateScrubVisuals(e);
    }

    updateScrubVisuals(e) {
      const percent = this.getPercentage(e);
      const percentDisplay = percent * 100;

      DOM.progressBar.style.width = `${percentDisplay}%`;
      DOM.progressThumb.style.left = `${percentDisplay}%`;

      if (!isNaN(DOM.audio.duration) && DOM.audio.duration > 0) {
        const previewTime = percent * DOM.audio.duration;
        DOM.countUp.textContent = formatTime(previewTime);
        DOM.countDown.textContent = `-${formatTime(DOM.audio.duration - previewTime)}`;
      }
    }

    onPointerUp(e) {
      if (!state.isScrubbing) return;
      const percent = this.getPercentage(e);
      state.isScrubbing = false;
      DOM.progressContainer.classList.remove('scrubbing');

      try {
        DOM.progressContainer.releasePointerCapture(e.pointerId);
      } catch (_) {}

      this.engine.seekToPercent(percent);

      if (state.wasPlayingBeforeScrub) {
        this.engine.play();
      }
    }
  }

  // Modern Drawer / Bottom Sheet Controller
  class DrawerController {
    constructor(engine) {
      this.engine = engine;
      this.init();
    }

    init() {
      // Toggle button
      DOM.drawerToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      // Tap backdrop to close
      DOM.drawerBackdrop.addEventListener('click', () => this.close());

      // Pull bar drag gesture to close on mobile
      const pullBar = DOM.drawerPullBar;
      pullBar.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
      pullBar.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
      pullBar.addEventListener('touchend', (e) => this.onTouchEnd(e));
      pullBar.addEventListener('click', () => this.close());

      // Close on Escape key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.isDrawerOpen) {
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
      DOM.songDrawer.classList.add('open');
      DOM.drawerBackdrop.classList.add('open');
      DOM.drawerChevron.classList.add('flipped');
      DOM.drawerToggleBtn.setAttribute('aria-expanded', 'true');
      DOM.songDrawer.setAttribute('aria-hidden', 'false');
    }

    close() {
      state.isDrawerOpen = false;
      DOM.songDrawer.classList.remove('open');
      DOM.drawerBackdrop.classList.remove('open');
      DOM.drawerChevron.classList.remove('flipped');
      DOM.drawerToggleBtn.setAttribute('aria-expanded', 'false');
      DOM.songDrawer.setAttribute('aria-hidden', 'true');
      DOM.songDrawer.style.transform = '';
    }

    onTouchStart(e) {
      state.startY = e.touches[0].clientY;
      state.isDraggingDrawer = true;
      DOM.songDrawer.style.transition = 'none';
    }

    onTouchMove(e) {
      if (!state.isDraggingDrawer) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - state.startY;

      if (deltaY > 0) {
        // Pulling down
        e.preventDefault();
        DOM.songDrawer.style.transform = `translateY(${deltaY}px)`;
        state.currentPullY = deltaY;
      }
    }

    onTouchEnd() {
      if (!state.isDraggingDrawer) return;
      state.isDraggingDrawer = false;
      DOM.songDrawer.style.transition = '';

      if (state.currentPullY > 60) {
        this.close();
      } else {
        DOM.songDrawer.style.transform = '';
      }
      state.currentPullY = 0;
    }
  }

  // MediaSession API Manager
  const MediaSessionManager = {
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
      } catch (e) {
        console.warn('Seek action handlers not supported:', e);
      }
    },

    update() {
      if (!('mediaSession' in navigator)) return;
      const song = SONGS[state.currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: 'Corey Lawrence',
        album: 'Old-Time Guitar Recordings',
        artwork: [
          { src: './album-art-128.jpg', sizes: '128x128', type: 'image/jpeg' },
          { src: './album-art-256.jpg', sizes: '256x256', type: 'image/jpeg' },
          { src: './album-art-512.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: './album-art-1024.jpg', sizes: '1024x1024', type: 'image/jpeg' }
        ]
      });
      this.updatePositionState();
    },

    setPlaybackState(playState) {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = playState;
    },

    updatePositionState() {
      if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
      const duration = DOM.audio.duration;
      if (duration && !isNaN(duration) && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: DOM.audio.playbackRate || 1.0,
            position: Math.min(DOM.audio.currentTime || 0, duration)
          });
        } catch (_) {}
      }
    }
  };

  // UI Controller & Render
  const UI = {
    renderPlaylist(engine, drawer) {
      DOM.songList.innerHTML = '';
      SONGS.forEach((song, idx) => {
        const item = document.createElement('div');
        item.className = 'song-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `Play ${song.title}`);

        item.innerHTML = `
          <div class="song-index-col">
            <span class="song-num">${idx + 1}</span>
            <div class="playing-eq" aria-hidden="true">
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
            </div>
          </div>
          <div class="song-info-col">
            <span class="song-item-title">${song.title}</span>
            <span class="song-item-artist">${song.artist}</span>
          </div>
          <span class="song-item-duration">${song.duration}</span>
        `;

        const selectSong = () => {
          engine.loadTrack(idx, true);
          if (window.innerWidth < 820) {
            drawer.close();
          }
        };

        item.addEventListener('click', selectSong);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectSong();
          }
        });

        DOM.songList.appendChild(item);
      });

      this.updateActivePlaylistItem();
    },

    updateActivePlaylistItem() {
      const items = DOM.songList.querySelectorAll('.song-item');
      items.forEach((item, idx) => {
        const isActive = idx === state.currentIndex;
        item.classList.toggle('active', isActive);
        item.classList.toggle('is-playing', isActive && state.isPlaying);
      });
    },

    updateEqualizerState(isPlaying) {
      const activeItem = DOM.songList.querySelector('.song-item.active');
      if (activeItem) {
        activeItem.classList.toggle('is-playing', isPlaying);
      }
    }
  };

  // Main Initialization
  const engine = new AudioEngine();
  const scrubber = new ScrubberController(engine);
  const drawer = new DrawerController(engine);

  MediaSessionManager.init(engine);
  UI.renderPlaylist(engine, drawer);

  // Bind Control Buttons
  DOM.playPauseBtn.addEventListener('click', () => engine.togglePlayPause());
  DOM.skipBackBtn.addEventListener('click', () => engine.prevTrack());
  DOM.skipForwardBtn.addEventListener('click', () => engine.nextTrack());

  // Shuffle Toggle
  DOM.shuffleBtn.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
    DOM.shuffleBtn.setAttribute('aria-label', `Shuffle mode: ${state.isShuffle ? 'On' : 'Off'}`);
  });

  // Repeat Toggle (Cycles: Off -> Repeat All -> Repeat One)
  DOM.repeatBtn.addEventListener('click', () => {
    state.repeatMode = (state.repeatMode + 1) % 3;
    const modeNames = ['Off', 'Repeat All', 'Repeat One'];
    DOM.repeatBtn.classList.toggle('active', state.repeatMode > 0);
    DOM.repeatBtn.setAttribute('aria-label', `Repeat mode: ${modeNames[state.repeatMode]}`);
    DOM.repeatBtn.setAttribute('title', `Repeat: ${modeNames[state.repeatMode]}`);
  });

  // Load initial track (without autoplay on initial page load)
  engine.loadTrack(0, false);
});
