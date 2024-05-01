// Get reference to the audio element, play/pause image, and progress bar
const audioPlayer = document.getElementById('audioPlayer');
const playPauseImg = document.getElementById('playPauseImg');
const progressBar = document.querySelector('.progress-bar');
const skipForwardBtn = document.getElementById('skipForwardBtn');
const skipBackBtn = document.getElementById('skipBackBtn');

const titleElement = document.getElementById('title');

const songs = [
  { title: 'Waubash Cannonball', fileName: 'waubash.aac' },
  { title: 'Windy & Warm', fileName: 'windy-and-warm.aac' },
  { title: 'Freight Train', fileName: 'freight-train.aac' },
  { title: 'Cannonball Rag', fileName: 'cannonball-rag.aac' },
  { title: "Doc's Guitar", fileName: 'docs-guitar.aac' },
];

// Function to check if the device is connected to Wi-Fi
function isConnectedToWiFi() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (connection) {
    return connection.type === 'wifi';
  }
  // Default to true if connection information is not available
  return false;
}

// Preload audio files only if connected to Wi-Fi
const audioFiles = songs.map((song) => {
  const audio = new Audio(song.fileName);
  if (isConnectedToWiFi()) {
    audio.load(); // Preload the audio file
  }
  return audio;
});

let songIndex = 0;
let playTitle = songs[songIndex].title;

// Function to update play/pause button based on audio playback state
function updatePlayPauseButton() {
  if (audioPlayer.paused) {
    playPauseImg.src = 'play.png'; // Set the play button image
  } else {
    playPauseImg.src = 'pause.png'; // Set the pause button image
  }
}

// Function to toggle play/pause
function togglePlayPause() {
  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
}

// Add event listener for the pause event on the audio player
audioPlayer.addEventListener('pause', () => {
  updatePlayPauseButton(); // Update play/pause button when audio is paused
});

// Add event listener for the play event on the audio player
audioPlayer.addEventListener('play', () => {
  updatePlayPauseButton(); // Update play/pause button when audio is resumed
});

// Function to handle ended event for continuous playback
audioPlayer.addEventListener('ended', () => {
  skipForward();
});

// Function to skip forward
function skipForward() {
  if (songIndex < songs.length) {
    songIndex = (songIndex + 1) % songs.length;
    audioPlayer.src = songs[songIndex].fileName;
    playTitle = songs[songIndex].title;
    togglePlayPause(); // Start playing the next song
    titleElement.textContent = playTitle;
  } else {
    songIndex = 0;
  }
}

// Function to skip backward
function skipBack() {
  if (songIndex > 0) {
    songIndex = (songIndex - 1 + songs.length) % songs.length;
    audioPlayer.src = songs[songIndex].fileName;
    playTitle = songs[songIndex].title;
    togglePlayPause(); // Start playing the previous song
    titleElement.textContent = playTitle;
  } else {
    songIndex = songs.length;
  }
}

// Function to skip to a specific song with smooth scrolling
function skipSpecific(songId) {
  switch (songId) {
    case 'waubash-song':
      songIndex = 0;
      break;
    case 'windyandwarm-song':
      songIndex = 1;
      break;
    case 'freighttrain-song':
      songIndex = 2;
      break;
    case 'cannonballrag-song':
      songIndex = 3;
      break;
    case 'docsguitar-song':
      songIndex = 4;
      break;
    default:
      // Default to the first song
      songIndex = 0;
  }

  audioPlayer.src = songs[songIndex].fileName;
  playTitle = songs[songIndex].title;
  audioPlayer.play(); // Start playing the specified song
  titleElement.textContent = playTitle;

  // Smooth scroll to the top
  document.documentElement.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

document
  .getElementById('waubash-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('waubash-song');
    document.getElementById('image').src = 'down-arrow.png';
  });

document
  .getElementById('windyandwarm-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('windyandwarm-song');
    document.getElementById('image').src = 'down-arrow.png';
  });

document
  .getElementById('freighttrain-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('freighttrain-song');
    document.getElementById('image').src = 'down-arrow.png';
  });

document
  .getElementById('cannonballrag-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('cannonballrag-song');
    document.getElementById('image').src = 'down-arrow.png';
  });

document
  .getElementById('docsguitar-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('docsguitar-song');
    document.getElementById('image').src = 'down-arrow.png';
  });

let progress1 = 0;
let progress2 = 0;
// Function to update progress bar as audio plays
function updateProgressBar() {
  if (!isNaN(audioPlayer.duration)) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.style.width = `${progress}%`;

    // Calculate current time
    const currentTime = audioPlayer.currentTime;

    // Calculate remaining time
    const remainingTime = audioPlayer.duration - currentTime;

    // Update count-up text
    const upMinutes = Math.floor(currentTime / 60);
    const upSeconds = Math.floor(currentTime % 60);
    document.getElementById('count-up').innerText = `${upMinutes}:${upSeconds
      .toString()
      .padStart(2, '0')}`;

    // Update count-down text
    const downMinutes = Math.floor(remainingTime / 60);
    const downSeconds = Math.floor(remainingTime % 60);
    document.getElementById(
      'count-down'
    ).innerText = `-${downMinutes}:${downSeconds.toString().padStart(2, '0')}`;

    // Check if progress has stopped
    if (progress === 100) {
      togglePlayPause();
    }
  }
}

// Function to handle audio file loading
function loadAudio(audioSrc) {
  // Load the audio file
  audioPlayer.src = audioSrc;

  // Add an event listener to the audio element to handle when metadata is loaded
  audioPlayer.addEventListener('loadedmetadata', () => {
    // Add event listener for timeupdate event after metadata is loaded
    audioPlayer.addEventListener('timeupdate', updateProgressBar);
  });
}

// Call loadAudio function with the initial audio file
loadAudio(songs[songIndex].fileName);

// Load the audio file
audioPlayer.src = songs[songIndex].fileName;

// Add an event listener to the audio element to handle when metadata is loaded
audioPlayer.addEventListener('loadedmetadata', () => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: playTitle,
      artist: 'Corey Lawrence',
      album: 'Old-Time Couch Recordings',
      artwork: [
        { src: 'album-art-1024.jpg', sizes: '1024x1024', type: 'image/jpeg' },
      ],
    });

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      togglePlayPause();
      while (audioPlayer.paused) {
        audioPlayer.play();
        console.log('backup play used');
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      togglePlayPause();
      while (!audioPlayer.paused) {
        audioPlayer.pause();
        console.log('backup pause used');
      }
    });
    // Set action handler for skipping forward
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      skipForward();
    });

    // Set action handler for skipping backward
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      skipBack();
    });
  }
});

var noZoomElements = document.querySelectorAll('.no-zoom');

// Loop through each element and bind touchend event listener
noZoomElements.forEach(function (element) {
  element.addEventListener('touchend', function (e) {
    e.preventDefault(); // Prevent default zoom behavior
    element.click(); // Trigger click event on the element
  });
});

document.ontouchmove = function (event) {
  event.preventDefault();
};
let startY = 0;
let endY = 0;
const threshold = 20;

document.addEventListener('touchstart', function (event) {
  startY = event.touches[0].clientY;
});

document.addEventListener('touchend', function (event) {
  endY = event.changedTouches[0].clientY;
  const deltaY = startY - endY;

  if (deltaY > threshold) {
    // Swipe up, snap to bottom (show menu)
    document.getElementById('image').src = 'up-arrow.png';
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  } else if (deltaY < -threshold) {
    // Swipe down, snap to top (hide menu)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('image').src = 'down-arrow.png';
  }
});

const mainPlayerDiv = document.querySelector('.main-player');
mainPlayerDiv.addEventListener('touchend', function (event) {
  // Check if page is at the bottom
  const isAtBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight;
  if (isAtBottom) {
    // Scroll to the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('image').src = 'down-arrow.png';
  }
});

if (window.navigator.standalone !== void 0) {
  $(window).load(function () {
    if (!this.navigator.standalone) {
      this.setTimeout(function () {
        this.scrollTo(this.scrollX, this.scrollY + 1);
      }, 500);
    }
  });
}

// Function to handle scrolling to top or bottom of the page
function scrollPage(direction) {
  if (direction === 'up') {
    // Scroll to the top of the page smoothly
    document.getElementById('image').src = 'down-arrow.png';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (direction === 'down') {
    // Scroll to the bottom of the page smoothly
    document.getElementById('image').src = 'up-arrow.png';
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  }
}

// Function to update the arrow image based on scroll position
function updateArrowImage() {
  const arrowImage = document.getElementById('image');
  if (window.scrollY === 0) {
    arrowImage.src = 'down-arrow.png';
  } else if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight
  ) {
    arrowImage.src = 'up-arrow.png';
  }
}

// Function to handle touch or click event on the arrow image
function handleArrowClick() {
  const arrowImage = document.getElementById('image');
  if (arrowImage.src.endsWith('up-arrow.png')) {
    scrollPage('up');
  } else {
    scrollPage('down');
  }
}

// Add event listener for click event on the arrow image
document.getElementById('image').addEventListener('click', handleArrowClick);

// Add event listener for touchend event on the document
document.addEventListener('touchend', function (event) {
  // Check if the touch event originated from the arrow image
  if (event.target.id === 'image') {
    handleArrowClick();
  }
});

// Add event listener for scroll event on the window
window.addEventListener('scroll', updateArrowImage);

// Update arrow image initially
updateArrowImage();
