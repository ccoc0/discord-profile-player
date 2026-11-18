const copyButton = document.querySelector("#copy-name");
const copyStatus = document.querySelector("#copy-status");
const songPicker = document.querySelector("#song-picker");
const audioPlayer = document.querySelector("#audio-player");
const queueElement = document.querySelector("#track-queue");
const libraryNote = document.querySelector("#library-note");
const playButton = document.querySelector("#play-pause");
const seekBar = document.querySelector("#seek-bar");
const coverCacheKey = "coco-profile-cover-cache-v1";

let tracks = [];
let currentIndex = -1;
let artLookupQueue = [];
let isLookingUpArt = false;
let lastArtLookup = 0;
let jsonpCounter = 0;
let coverCache = {};

try {
  coverCache = JSON.parse(localStorage.getItem(coverCacheKey) || "{}");
} catch {
  coverCache = {};
}

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("cocospells_");
    copyStatus.textContent = "Username copied: cocospells_";
  } catch {
    copyStatus.textContent = "Username: cocospells_";
  }
});

document.querySelector("#more-button").addEventListener("click", () => {
  copyStatus.textContent = "COCO · cocospells_";
});

document.querySelector("#add-songs-button").addEventListener("click", () => songPicker.click());

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(feat\.?[^)]*\)/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseTrack(file) {
  const baseName = file.name.replace(/\.(opus|ogg|oga)$/i, "");
  const separator = baseName.lastIndexOf(" - ");
  const artist = separator > -1 ? baseName.slice(0, separator).trim() : "Unknown artist";
  const title = separator > -1 ? baseName.slice(separator + 3).trim() : baseName;

  return {
    file,
    fileName: file.name,
    artist,
    title,
    audioUrl: URL.createObjectURL(file),
    artworkUrl: "",
    albumUrl: "",
    artState: "idle",
    row: null,
  };
}

function makeQueueRow(track, index) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "queue-row";
  row.setAttribute("role", "listitem");
  row.dataset.index = String(index);
  row.setAttribute("aria-label", `Play ${track.title} by ${track.artist}`);

  const thumb = document.createElement("span");
  thumb.className = "queue-thumb";
  const placeholder = document.createElement("span");
  placeholder.className = "queue-thumb-placeholder";
  placeholder.textContent = "♫";
  const image = document.createElement("img");
  image.alt = "";
  image.hidden = true;
  thumb.append(placeholder, image);

  const info = document.createElement("span");
  info.className = "queue-track-info";
  const title = document.createElement("span");
  title.className = "queue-track-title";
  title.textContent = track.title;
  const artist = document.createElement("span");
  artist.className = "queue-track-artist";
  artist.textContent = track.artist;
  info.append(title, artist);
  row.append(thumb, info);
  row.addEventListener("click", () => selectTrack(index, true));
  track.row = row;
  track.thumbImage = image;
  track.thumbPlaceholder = placeholder;
  return row;
}

function renderQueue() {
  queueElement.replaceChildren();
  document.querySelector("#queue-count").textContent = String(tracks.length);
  document.querySelector("#track-counter").textContent = tracks.length ? `${tracks.length} tracks` : "0 tracks";

  if (!tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-empty";
    empty.textContent = "Add songs to build your playlist.";
    queueElement.append(empty);
    return;
  }

  tracks.forEach((track, index) => {
    queueElement.append(makeQueueRow(track, index));
    applyTrackArtwork(track);
  });
  artworkObserver?.disconnect();
  tracks.forEach((track) => artworkObserver?.observe(track.row));
}

function applyTrackArtwork(track) {
  if (track.artworkUrl && track.thumbImage) {
    track.thumbImage.src = track.artworkUrl;
    track.thumbImage.hidden = false;
    track.thumbPlaceholder.hidden = true;
  }

  if (tracks[currentIndex] !== track) return;

  const mainCover = document.querySelector("#main-cover");
  const placeholder = document.querySelector("#cover-placeholder");
  const coverLink = document.querySelector("#cover-link");
  if (track.artworkUrl) {
    mainCover.src = track.artworkUrl;
    mainCover.hidden = false;
    placeholder.hidden = true;
    if (track.albumUrl) {
      coverLink.href = track.albumUrl;
      coverLink.hidden = false;
    }
  } else {
    mainCover.hidden = true;
    placeholder.hidden = false;
    coverLink.hidden = true;
  }
}

function scoreResult(result, track) {
  const resultArtist = normalize(result.artistName || "");
  const resultTitle = normalize(result.trackName || "");
  const wantedArtist = normalize(track.artist);
  const wantedTitle = normalize(track.title);
  let score = 0;

  if (resultTitle === wantedTitle) score += 5;
  else if (resultTitle.includes(wantedTitle) || wantedTitle.includes(resultTitle)) score += 2;

  if (resultArtist === wantedArtist) score += 5;
  else if (resultArtist.includes(wantedArtist) || wantedArtist.includes(resultArtist)) score += 2;

  return score;
}

function lookupCover(track) {
  const cacheId = `${normalize(track.artist)}|${normalize(track.title)}`;
  if (coverCache[cacheId]) {
    track.artworkUrl = coverCache[cacheId].artworkUrl || "";
    track.albumUrl = coverCache[cacheId].albumUrl || "";
    applyTrackArtwork(track);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const callbackName = `cocoArtworkCallback${Date.now()}${jsonpCounter++}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      term: `${track.artist} ${track.title}`,
      entity: "song",
      limit: "8",
      country: "US",
      callback: callbackName,
    });
    let complete = false;
    let timeoutId;

    const finish = (payload) => {
      if (complete) return;
      complete = true;
      clearTimeout(timeoutId);
      script.remove();
      delete window[callbackName];

      const results = payload?.results || [];
      const best = results
        .filter((result) => result.artworkUrl100 && result.trackViewUrl)
        .map((result) => ({ result, score: scoreResult(result, track) }))
        .sort((a, b) => b.score - a.score)[0];

      if (best && best.score >= 6) {
        track.artworkUrl = best.result.artworkUrl100
          .replace(/^http:/, "https:")
          .replace(/100x100/i, "600x600");
        track.albumUrl = (best.result.collectionViewUrl || best.result.trackViewUrl).replace(/^http:/, "https:");
        coverCache[cacheId] = { artworkUrl: track.artworkUrl, albumUrl: track.albumUrl };
        try {
          localStorage.setItem(coverCacheKey, JSON.stringify(coverCache));
        } catch {
          // Keep the artwork available for this session if storage is disabled or full.
        }
      }

      applyTrackArtwork(track);
      resolve();
    };

    window[callbackName] = finish;
    script.onerror = () => finish(null);
    script.src = `https://itunes.apple.com/search?${params.toString()}`;
    document.head.appendChild(script);
    timeoutId = window.setTimeout(() => finish(null), 10000);
  });
}

async function processArtworkQueue() {
  if (isLookingUpArt) return;
  isLookingUpArt = true;
  while (artLookupQueue.length) {
    const track = artLookupQueue.shift();
    if (track.artState !== "queued") continue;
    track.artState = "loading";
    const pause = Math.max(0, 3000 - (Date.now() - lastArtLookup));
    if (pause) await new Promise((resolve) => window.setTimeout(resolve, pause));
    lastArtLookup = Date.now();
    await lookupCover(track);
    track.artState = "done";
  }
  isLookingUpArt = false;
}

function requestArtwork(track, prioritize = false) {
  if (!track || track.artState !== "idle") return;
  const cached = coverCache[`${normalize(track.artist)}|${normalize(track.title)}`];
  if (cached) {
    track.artworkUrl = cached.artworkUrl || "";
    track.albumUrl = cached.albumUrl || "";
    track.artState = "done";
    applyTrackArtwork(track);
    return;
  }
  track.artState = "queued";
  if (prioritize) artLookupQueue.unshift(track);
  else artLookupQueue.push(track);
  processArtworkQueue();
}

const artworkObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const track = tracks[Number(entry.target.dataset.index)];
        requestArtwork(track);
        artworkObserver.unobserve(entry.target);
      });
    }, { root: queueElement, rootMargin: "80px" })
  : null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function updateProgress() {
  const duration = audioPlayer.duration;
  const current = audioPlayer.currentTime || 0;
  seekBar.value = Number.isFinite(duration) && duration > 0 ? String((current / duration) * 100) : "0";
  document.querySelector("#current-time").textContent = formatTime(current);
  document.querySelector("#track-duration").textContent = formatTime(duration);
}

function selectTrack(index, shouldPlay = false) {
  if (!tracks.length) return;
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audioPlayer.src = track.audioUrl;
  audioPlayer.load();
  document.querySelector("#track-artist").textContent = track.artist;
  document.querySelector("#track-title").textContent = track.title;
  document.querySelector("#track-file-name").textContent = track.fileName;
  document.querySelector("#cover-link").hidden = true;
  document.querySelector("#main-cover").hidden = true;
  document.querySelector("#cover-placeholder").hidden = false;
  document.querySelectorAll(".queue-row").forEach((row, rowIndex) => {
    row.classList.toggle("active", rowIndex === currentIndex);
    if (rowIndex === currentIndex) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
  requestArtwork(track, true);
  libraryNote.textContent = shouldPlay ? `Playing ${track.title} · files remain on this device.` : `Ready · ${tracks.length} songs loaded locally.`;
  if (shouldPlay) {
    audioPlayer.play().catch(() => {
      libraryNote.textContent = "Press play to start this track.";
    });
  }
  updateProgress();
}

songPicker.addEventListener("change", () => {
  const files = Array.from(songPicker.files || []).filter((file) => /\.(opus|ogg|oga)$/i.test(file.name));
  const existing = new Set(tracks.map((track) => track.fileName.toLowerCase()));
  const added = files
    .filter((file) => !existing.has(file.name.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map(parseTrack);

  if (!added.length) {
    libraryNote.textContent = files.length ? "Those songs are already in the playlist." : "Choose .opus, .ogg, or .oga audio files.";
    songPicker.value = "";
    return;
  }

  const wasEmpty = tracks.length === 0;
  tracks.push(...added);
  renderQueue();
  if (wasEmpty) selectTrack(0);
  libraryNote.textContent = `${added.length} song${added.length === 1 ? "" : "s"} added. Files stay on this device.`;
  songPicker.value = "";
});

playButton.addEventListener("click", () => {
  if (currentIndex < 0 && tracks.length) selectTrack(0);
  if (!tracks.length) {
    songPicker.click();
    return;
  }
  if (audioPlayer.paused) audioPlayer.play().catch(() => {});
  else audioPlayer.pause();
});

document.querySelector("#previous-track").addEventListener("click", () => {
  if (currentIndex < 0 || !tracks.length) return;
  if (audioPlayer.currentTime > 3) audioPlayer.currentTime = 0;
  else selectTrack(currentIndex - 1, true);
});

document.querySelector("#next-track").addEventListener("click", () => {
  if (tracks.length) selectTrack(currentIndex + 1, true);
});

audioPlayer.addEventListener("play", () => {
  playButton.textContent = "Ⅱ";
  playButton.setAttribute("aria-label", "Pause");
  playButton.title = "Pause";
  libraryNote.textContent = `Playing ${tracks[currentIndex]?.title || "track"} · files remain on this device.`;
});

audioPlayer.addEventListener("pause", () => {
  playButton.textContent = "▶";
  playButton.setAttribute("aria-label", "Play");
  playButton.title = "Play";
});

audioPlayer.addEventListener("timeupdate", updateProgress);
audioPlayer.addEventListener("loadedmetadata", updateProgress);
audioPlayer.addEventListener("ended", () => {
  if (tracks.length) selectTrack(currentIndex + 1, true);
});
audioPlayer.addEventListener("error", () => {
  if (currentIndex >= 0) libraryNote.textContent = "This browser could not play that file. Try selecting an .opus or .ogg file again.";
});

seekBar.addEventListener("input", () => {
  if (Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
    audioPlayer.currentTime = (Number(seekBar.value) / 100) * audioPlayer.duration;
  }
});
