# Corey Lawrence Music Web App

Welcome to the Corey Lawrence Music Web App! This single-page web app allows you to enjoy the music of Corey Lawrence with ease. Whether you're a fan of "Waubash Cannonball" or "Doc's Guitar," you can easily select and play your favorite tracks.

## Overview

This music player is built using JavaScript and offers a seamless experience for playing Corey Lawrence's music. It features:

- Play/pause functionality
- Song selection menu
- Progress bar for tracking playback
- Smooth scrolling for navigation

## Features

- **Play/Pause:** Easily control playback with a simple click on the play/pause button.
- **Song Selection:** Choose your desired song from the menu, featuring a list of Corey Lawrence's tracks. The menu is implemented dynamically using JavaScript, allowing for easy addition of new songs without modifying the HTML code.
- **Progress Bar:** Track the progress of the currently playing song with the interactive progress bar.
- **Smooth Scrolling:** Navigate through the app smoothly with smooth scrolling functionality.
- **Media Session API Integration:** Control the music player directly from your device's lock screen or notification center using the Media Session API. This integration allows you to play, pause, skip forward, and skip backward without having to unlock your device or open the app.
- **Responsive Design:** Optimized for both mobile and larger screens using CSS, ensuring a fantastic user experience across all devices.


## Usage

1. Visit [coreylawrencemusic.duckdns.org](coreylawrencemusic.duckdns.org) in your web browser.
2. Press play, or select a song from the menu.
3. Enjoy Corey Lawrence's music!

## Technologies Used

- JavaScript
- HTML
- CSS

## Menu Implementation

- The menu is dynamically generated using JavaScript. The list of songs is stored in an array, and for each song, a corresponding HTML element is created and appended to the menu. This approach allows for easy maintenance and scalability, as adding or removing songs only requires updating the JavaScript array.

- The menu is easily accessed and hidden with a simple swipe up or down gesture, providing a completely natural and intuitive user experience.

## Media Session API Integration

The JavaScript code utilizes the Media Session API to provide seamless control over the music player from the user's lock screen or notification center. By setting metadata such as the song title, artist, and album, as well as defining action handlers for play, pause, skip forward, and skip backward events, the app seamlessly integrates with the device's media controls.
