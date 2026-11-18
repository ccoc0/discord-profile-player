# COCO profile

A Discord-inspired profile page based on the screenshots you shared. It uses your profile picture, COCO profile details, a Wuthering Waves stats card, Bootstrap 5.3.9, and a local music player.

## Add and play your songs

1. Open the `discord-profile-player` folder in VS Code and run `index.html` with Live Server.
2. Click **Add songs** and select your `.opus` files from Downloads. You can select all 52 at once.
3. Click a track in the queue, then use the player controls to play, pause, seek, or skip.

The audio files stay on your device; the page does not upload them. Cover art is looked up as tracks are shown and linked to the matching Apple Music listing. That lookup needs an internet connection. The **YouTube Music** link still opens your original playlist.

Opening the HTML directly from File Explorer can prevent the local audio chooser or external cover lookup from working as expected. Use VS Code Live Server for the full experience.

## Files

- `index.html` — profile markup and player layout.
- `styles.css` — page styling and responsive layout.
- `player.js` — local audio controls, playlist queue, and cover art lookup.
- `coco-avatar.png` — your profile picture.

References: [Bootstrap quick start](https://getbootstrap.com/docs/5.3/getting-started/introduction/) · [Apple Search API](https://performance-partners.apple.com/search-api) · [Apple Search API artwork fields](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html)
