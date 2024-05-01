import NoSleep from 'nosleep.js';

// Initialize NoSleep
const noSleep = new NoSleep();

// Function to enable NoSleep
function enableNoSleep() {
  noSleep.enable();
}

// Function to disable NoSleep
function disableNoSleep() {
  noSleep.disable();
}

// Listen for the visibilitychange event
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    // App is sent to the background, enable NoSleep
    enableNoSleep();
  } else {
    // App is brought back to the foreground, disable NoSleep
    disableNoSleep();
  }
});
