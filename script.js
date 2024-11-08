// Add at the beginning of the file
function setupiOSAudio() {
  if (window.navigator.standalone) {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        // Attempt to resume audio context if it was suspended
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setupiOSAudio();

  // Constants and DOM element caching
  const DOM = {
    audioPlayer: document.getElementById('audioPlayer'),
    playPauseImg: document.getElementById('playPauseImg'),
    progressBar: document.querySelector('.progress-bar'),
    titleElement: document.getElementById('title'),
    countUp: document.getElementById('count-up'),
    countDown: document.getElementById('count-down'),
    arrowImage: document.getElementById('image'),
    mainPlayer: document.querySelector('.main-player'),
    progressBarContainer: document.querySelector('.progress-container'),
    skipBackButton: document.getElementById('skipBackButton'),
    playPauseButton: document.getElementById('playPauseButton'),
    skipForwardButton: document.getElementById('skipForwardButton'),
  };

  const SONGS = Object.freeze([
    {
      title: 'Waubash Cannonball',
      fileName: 'waubash.aac',
      id: 'waubash-song',
    },
    {
      title: 'Windy & Warm',
      fileName: 'windy-and-warm.aac',
      id: 'windyandwarm-song',
    },
    {
      title: 'Freight Train',
      fileName: 'freight-train.aac',
      id: 'freighttrain-song',
    },
    {
      title: 'Cannonball Rag',
      fileName: 'cannonball-rag.aac',
      id: 'cannonballrag-song',
    },
    {
      title: "Doc's Guitar",
      fileName: 'docs-guitar.aac',
      id: 'docsguitar-song',
    },
  ]);

  const CRITICAL_ASSETS = {
    firstSong: SONGS[0],
    requiredImages: [
      'play.png',
      'pause.png',
      'skipback.png',
      'skipforward.png',
    ],
  };

  // Audio Player State Management
  const PlayerState = {
    songIndex: 0,
    get currentSong() {
      return SONGS[this.songIndex];
    },
    audioCache: new Map(),
    touchStartY: 0,
    SCROLL_THRESHOLD: 20,
  };

  // Memoized network connection check
  const isWiFiConnected = (() => {
    let cachedResult = null;
    let lastCheck = 0;
    const CACHE_DURATION = 5000; // 5 seconds

    return () => {
      const now = Date.now();
      if (cachedResult !== null && now - lastCheck < CACHE_DURATION) {
        return cachedResult;
      }

      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      cachedResult = connection ? connection.type === 'wifi' : false;
      lastCheck = now;
      return cachedResult;
    };
  })();

  // Audio Control Functions
  const AudioController = {
    togglePlayPause() {
      if (DOM.audioPlayer.paused) {
        DOM.audioPlayer.play();
      } else {
        DOM.audioPlayer.pause();
      }
    },

    updatePlayPauseButton() {
      DOM.playPauseImg.src = DOM.audioPlayer.paused ? 'play.png' : 'pause.png';
    },

    async skipToSong(index) {
      DOM.audioPlayer.currentTime = 0; // Reset time immediately
      PlayerState.songIndex = index;
      this.loadAndPlaySong();
    },

    skipForward() {
      DOM.audioPlayer.currentTime = 0; // Reset time immediately
      PlayerState.songIndex = (PlayerState.songIndex + 1) % SONGS.length;
      this.loadAndPlaySong();
    },

    skipBack() {
      DOM.audioPlayer.currentTime = 0; // Reset time immediately
      PlayerState.songIndex =
        (PlayerState.songIndex - 1 + SONGS.length) % SONGS.length;
      this.loadAndPlaySong();
    },

    async loadAndPlaySong() {
      const song = PlayerState.currentSong;

      // If not in cache and not on WiFi, load it on demand
      if (!PlayerState.audioCache.has(song.fileName) && !isWiFiConnected()) {
        const audio = new Audio(song.fileName);
        await new Promise((resolve, reject) => {
          audio.addEventListener('loadeddata', resolve);
          audio.addEventListener('error', reject);
          audio.load();
        });
        PlayerState.audioCache.set(song.fileName, audio);
      }

      DOM.audioPlayer.src = song.fileName;
      DOM.titleElement.textContent = song.title;
      await DOM.audioPlayer.play();
      updatePlayingClass();
    },

    // Memoized progress bar update
    updateProgressBar: (() => {
      let lastUpdate = 0;
      const UPDATE_INTERVAL = 16; // ~60fps

      return () => {
        const now = performance.now();
        if (now - lastUpdate < UPDATE_INTERVAL) return;
        lastUpdate = now;

        if (isNaN(DOM.audioPlayer.duration)) return;

        const currentTime = DOM.audioPlayer.currentTime;
        const duration = DOM.audioPlayer.duration;
        const progress = (currentTime / duration) * 100;

        DOM.progressBar.style.width = `${progress}%`;

        // Update timestamps
        const formatTime = (time) => {
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        DOM.countUp.innerText = formatTime(currentTime);
        DOM.countDown.innerText = `-${formatTime(duration - currentTime)}`;
      };
    })(),
  };

  const ProgressBarController = {
    isScrubbing: false,
    userPaused: false,

    init() {
      DOM.progressBarContainer.addEventListener(
        'click',
        this.handleClick.bind(this)
      );
      DOM.progressBarContainer.addEventListener(
        'mousedown',
        this.startScrubbing.bind(this)
      );
      DOM.progressBarContainer.addEventListener(
        'touchstart',
        this.startScrubbing.bind(this)
      );
      document.addEventListener('mouseup', this.stopScrubbing.bind(this));
      document.addEventListener('touchend', this.stopScrubbing.bind(this));
      document.addEventListener('mousemove', this.scrub.bind(this));
      document.addEventListener('touchmove', this.scrub.bind(this));
    },

    handleClick(event) {
      const rect = DOM.progressBarContainer.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const totalWidth = rect.width;
      const percentage = offsetX / totalWidth;
      const newTime = percentage * DOM.audioPlayer.duration;
      DOM.audioPlayer.currentTime = newTime;

      // If the audio is not paused by user action, play it
      if (!this.userPaused) {
        DOM.audioPlayer.play();
      }
    },

    startScrubbing(event) {
      event.preventDefault(); // Prevent text selection
      this.isScrubbing = true;
      this.userPaused = true; // Set flag to indicate pause initiated by user
      DOM.audioPlayer.pause(); // Pause audio while scrubbing
      this.scrub(event);
    },

    scrub(event) {
      if (!this.isScrubbing) return;

      const rect = DOM.progressBarContainer.getBoundingClientRect();
      const offsetX = event.touches
        ? event.touches[0].clientX - rect.left
        : event.clientX - rect.left;
      const totalWidth = rect.width;
      const percentage = Math.min(Math.max(offsetX / totalWidth, 0), 1); // Clamp value between 0 and 1
      const newTime = percentage * DOM.audioPlayer.duration;

      DOM.audioPlayer.currentTime = newTime;

      // Optionally update the progress bar's width visually during scrubbing
      DOM.progressBar.style.width = `${percentage * 100}%`;
    },

    stopScrubbing() {
      this.isScrubbing = false;
      // Only resume if the pause was due to scrubbing
      if (this.userPaused) {
        DOM.audioPlayer.play(); // Resume audio after scrubbing
        this.userPaused = false; // Reset the flag
      }
    },
  };

  // Scroll Management
  const ScrollManager = {
    scrollToPosition(position) {
      window.scrollTo({
        top: position,
        behavior: 'smooth',
      });
    },

    scrollToTop() {
      this.scrollToPosition(0);
      DOM.arrowImage.src = 'down-arrow.png';
    },

    scrollToBottom() {
      this.scrollToPosition(document.documentElement.scrollHeight);
      DOM.arrowImage.src = 'up-arrow.png';
    },

    handleArrowClick() {
      if (DOM.arrowImage.src.endsWith('up-arrow.png')) {
        this.scrollToTop();
      } else {
        this.scrollToBottom();
      }
    },

    updateArrowImage() {
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight;
      DOM.arrowImage.src =
        window.scrollY === 0
          ? 'down-arrow.png'
          : isAtBottom
          ? 'up-arrow.png'
          : DOM.arrowImage.src;
    },
    // Check if drawer is open
    isDrawerOpen() {
      return window.scrollY > 10; // Using small threshold to account for rubber-banding
    },

    // Handle click outside song drawer
    handleClickOutside(event) {
      // Only proceed if drawer is open
      if (!this.isDrawerOpen()) return;

      // Get the song area element
      const songArea = document.getElementById('song-area');
      const songDrawer = document.getElementById('song-drawer');

      // Check if click is outside both song area and song drawer
      if (
        !songArea.contains(event.target) &&
        !songDrawer.contains(event.target) &&
        !DOM.arrowImage.contains(event.target)
      ) {
        this.scrollToTop();
      }
    },
    // Initialize click outside handling
    initClickOutsideHandler() {
      document.addEventListener('click', (event) =>
        this.handleClickOutside(event)
      );
      document.addEventListener('touchend', (event) =>
        this.handleClickOutside(event)
      );
    },
  };
  // Media Session API Setup
  const setupMediaSession = () => {
    if (!('mediaSession' in navigator)) return;

    const updateMetadata = () => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: PlayerState.currentSong.title,
        artist: 'Corey Lawrence',
        album: 'Old-Time Couch Recordings',
        artwork: [
          { src: 'album-art-1024.jpg', sizes: '1024x1024', type: 'image/jpeg' },
        ],
      });
    };

    updateMetadata();

    // Action handlers for play/pause and track navigation
    navigator.mediaSession.setActionHandler('play', () =>
      AudioController.togglePlayPause()
    );
    navigator.mediaSession.setActionHandler('pause', () =>
      AudioController.togglePlayPause()
    );
    navigator.mediaSession.setActionHandler('nexttrack', () =>
      AudioController.skipForward()
    );
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      AudioController.skipBack()
    );

    // Add seek action handler for lockscreen scrubbing
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.fastSeek && 'fastSeek' in DOM.audioPlayer) {
        DOM.audioPlayer.fastSeek(details.seekTime);
        return;
      }
      DOM.audioPlayer.currentTime = details.seekTime;
      updatePositionState();
    });

    // Update the position state for scrubbing support
    const updatePositionState = () => {
      if (DOM.audioPlayer.duration) {
        navigator.mediaSession.setPositionState({
          duration: DOM.audioPlayer.duration,
          playbackRate: DOM.audioPlayer.playbackRate,
          position: DOM.audioPlayer.currentTime,
        });
      }
    };

    // Listen for time updates to update position state
    DOM.audioPlayer.addEventListener('timeupdate', updatePositionState);
  };

  // Event Listeners Setup
  const setupEventListeners = () => {
    // Audio player events
    DOM.audioPlayer.addEventListener('play', () =>
      AudioController.updatePlayPauseButton()
    );
    DOM.audioPlayer.addEventListener('pause', () =>
      AudioController.updatePlayPauseButton()
    );
    DOM.audioPlayer.addEventListener('timeupdate', () =>
      AudioController.updateProgressBar()
    );
    DOM.audioPlayer.addEventListener('ended', () =>
      AudioController.skipForward()
    );
    DOM.audioPlayer.addEventListener('loadedmetadata', setupMediaSession);

    // Scroll and touch events
    window.addEventListener('scroll', () => ScrollManager.updateArrowImage());
    DOM.arrowImage.addEventListener('click', () =>
      ScrollManager.handleArrowClick()
    );

    // Touch events with throttling
    let touchThrottle;
    document.addEventListener('touchstart', (e) => {
      PlayerState.touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      clearTimeout(touchThrottle);
      touchThrottle = setTimeout(() => {
        const deltaY = PlayerState.touchStartY - e.changedTouches[0].clientY;

        if (Math.abs(deltaY) > PlayerState.SCROLL_THRESHOLD) {
          deltaY > 0
            ? ScrollManager.scrollToBottom()
            : ScrollManager.scrollToTop();
        }
      }, 50);
    });

    // Song selection events
    SONGS.forEach((song, index) => {
      document.getElementById(song.id)?.addEventListener('click', (e) => {
        e.preventDefault();
        AudioController.skipToSong(index);
        ScrollManager.scrollToTop();
      });
    });

    // Prevent zoom on mobile
    document.querySelectorAll('.no-zoom').forEach((element) => {
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        element.click();
      });
    });

    // Player control buttons
    DOM.skipBackButton?.addEventListener('click', () =>
      AudioController.skipBack()
    );
    DOM.playPauseButton?.addEventListener('click', () =>
      AudioController.togglePlayPause()
    );
    DOM.skipForwardButton?.addEventListener('click', () =>
      AudioController.skipForward()
    );
  };

  // Make AudioController available globally if needed
  window.AudioController = AudioController;

  // Initialize the player
  const initializePlayer = async () => {
    // Load initial song (the first song)
    DOM.audioPlayer.src = PlayerState.currentSong.fileName;
    DOM.titleElement.textContent = PlayerState.currentSong.title;

    // Cache the first song's Audio object
    PlayerState.audioCache.set(
      PlayerState.currentSong.fileName,
      DOM.audioPlayer
    );

    // Initialize other components
    setupEventListeners();
    ScrollManager.updateArrowImage();
    ScrollManager.initClickOutsideHandler();
    ProgressBarController.init();

    // After initialization, check if on WiFi and load the rest of the songs
    if (isWiFiConnected()) {
      // On WiFi - load all songs in the background
      preloadAllSongs();
    }
  };

  // Function to preload all songs
  const preloadAllSongs = () => {
    SONGS.forEach((song) => {
      // Skip if the song is already cached
      if (!PlayerState.audioCache.has(song.fileName)) {
        const audio = new Audio();
        audio.src = song.fileName;
        audio.preload = 'auto';
        audio.load();
        PlayerState.audioCache.set(song.fileName, audio);
      }
    });
  };

  // Modify loadAndPlaySong to use cached audio or load as needed
  AudioController.loadAndPlaySong = async function () {
    const song = PlayerState.currentSong;

    // Check if song is cached
    let audio = PlayerState.audioCache.get(song.fileName);
    if (!audio) {
      // If not cached, create a new Audio object and load the song
      audio = new Audio();
      audio.src = song.fileName;
      audio.preload = 'auto';
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });
      PlayerState.audioCache.set(song.fileName, audio);
    }

    DOM.audioPlayer.src = song.fileName;
    DOM.titleElement.textContent = song.title;
    await DOM.audioPlayer.play();
    updatePlayingClass();
  };

  // Function to update the playing class on the song elements
  function updatePlayingClass() {
    // Remove the 'playing' class from all song elements
    document.querySelectorAll('.song').forEach((song) => {
      song.classList.remove('playing');
    });

    // Add the 'playing' class to the currently playing song
    const currentSongId = PlayerState.currentSong.id;
    const currentSongElement = document.getElementById(currentSongId);
    if (currentSongElement) {
      currentSongElement.classList.add('playing');
    }
  }

  updatePlayingClass();

  // Start the application
  initializePlayer();
});
