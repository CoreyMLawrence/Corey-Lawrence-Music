// Get reference to the audio element, play/pause image, and progress bar
const audioPlayer = document.getElementById('audioPlayer');
const playPauseImg = document.getElementById('playPauseImg');
const progressBar = document.querySelector('.progress-bar');
const skipForwardBtn = document.getElementById('skipForwardBtn');
const skipBackBtn = document.getElementById('skipBackBtn');

const titleElement = document.getElementById('title');

const songs = [
  { title: 'Waubash Cannonball', fileName: 'waubash.mp3' },
  { title: 'Windy & Warm', fileName: 'windy-and-warm.aac' },
  { title: 'Freight Train', fileName: 'freight-train.aac' },
  { title: 'Cannonball Rag', fileName: 'cannonball-rag.aac' },
  { title: "Doc's Guitar", fileName: 'docs-guitar.aac' },
];
const audioFiles = songs.map((song) => new Audio(song.fileName));

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

// Example usage with smooth scrolling
document
  .getElementById('waubash-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('waubash-song');
  });

document
  .getElementById('windyandwarm-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('windyandwarm-song');
  });

document
  .getElementById('freighttrain-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('freighttrain-song');
  });

document
  .getElementById('cannonballrag-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('cannonballrag-song');
  });

document
  .getElementById('docsguitar-song')
  .addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default anchor behavior
    skipSpecific('docsguitar-song');
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
      if (audioPlayer.paused) {
        audioPlayer.play();
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (!audioPlayer.paused) {
        audioPlayer.pause();
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

// Get all elements with the class 'no-zoom'
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
