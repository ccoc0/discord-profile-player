# COCO profile

A Discord-inspired profile page based on the screenshots you shared. It uses your profile picture, the COCO profile details, a Wuthering Waves stats card, Bootstrap 5.3.9, and your YouTube Music playlist.

## Open in VS Code

1. Open the `discord-profile-player` folder in VS Code.
2. To play the embedded playlist, run the page through **Live Server**. If you have the extension, right-click `index.html` and choose **Open with Live Server**.
3. If Live Server is not installed, open VS Code's terminal in this folder and run `py -m http.server 8000`. Then open `http://localhost:8000` in your browser.
4. Press play in the YouTube player. The **Open in YouTube Music** link is also above it.

Opening `index.html` directly from File Explorer uses a `file://` address. YouTube requires an HTTP referrer for embedded playback, so it can show error 153 from a local file. The page displays a reminder when opened that way. The player and Bootstrap need an internet connection.

## Files

- `index.html` — profile content and playlist embed.
- `styles.css` — page styling and responsive layout.
- `coco-avatar.png` — your profile picture.

References: [Bootstrap quick start](https://getbootstrap.com/docs/5.3/getting-started/introduction/) · [YouTube playlist embeds](https://developers.google.com/youtube/player_parameters#Select_content_to_play) · [YouTube embed playback requirements](https://support.google.com/youtube/answer/171780)
