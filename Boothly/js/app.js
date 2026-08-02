const appState = {
  roomId: null,
  hostId: null,
  peer: null,
  peerId: null,
  call: null,
  conn: null,
  stream: null,
  remoteStream: null,
  inviteLink: "",
  captureBusy: false,
  pendingCapture: null,
};

const GALLERY_STORAGE_KEY = "boothly.gallery.v1";
const GALLERY_PENDING_KEY = "boothly.gallery.pending.v1";
const PHOTobooth_STATE_KEY = "boothly.photobooth.flow.v2";
const CAPTURE_COUNTDOWN_SECONDS = 3;
const GALLERY_THEMES = {
  cream: {
    background: "#fbfaf6",
    frame: "#ffffff",
    inner: "#f7f4ee",
    title: "#ff6e8f",
    accentA: "rgba(255, 182, 148, 0.16)",
    accentB: "rgba(134, 184, 255, 0.16)",
    footer: "#ffffff",
    text: "#66758b",
  },
  blush: {
    background: "#fff7f7",
    frame: "#ffffff",
    inner: "#fff1f4",
    title: "#e95e87",
    accentA: "rgba(255, 158, 184, 0.18)",
    accentB: "rgba(255, 200, 214, 0.16)",
    footer: "#ffffff",
    text: "#6f6270",
  },
  sky: {
    background: "#f6fbff",
    frame: "#ffffff",
    inner: "#eef7ff",
    title: "#5f82d3",
    accentA: "rgba(140, 190, 255, 0.18)",
    accentB: "rgba(183, 221, 255, 0.2)",
    footer: "#ffffff",
    text: "#5e6f86",
  },
  graphite: {
    background: "#f8f7f4",
    frame: "#ffffff",
    inner: "#efede8",
    title: "#2f3b4d",
    accentA: "rgba(88, 95, 111, 0.12)",
    accentB: "rgba(160, 169, 186, 0.16)",
    footer: "#ffffff",
    text: "#556070",
  },
  peach: {
    background: "#fff8f3",
    frame: "#ffffff",
    inner: "#fff1e7",
    title: "#f08a57",
    accentA: "rgba(255, 182, 148, 0.2)",
    accentB: "rgba(255, 216, 186, 0.18)",
    footer: "#ffffff",
    text: "#7a6153",
  },
  mint: {
    background: "#f5fffb",
    frame: "#ffffff",
    inner: "#eafaf3",
    title: "#4fb08a",
    accentA: "rgba(127, 223, 185, 0.18)",
    accentB: "rgba(180, 238, 213, 0.18)",
    footer: "#ffffff",
    text: "#58756b",
  },
  lilac: {
    background: "#faf7ff",
    frame: "#ffffff",
    inner: "#f0eaff",
    title: "#8a6dd8",
    accentA: "rgba(192, 173, 255, 0.2)",
    accentB: "rgba(219, 207, 255, 0.18)",
    footer: "#ffffff",
    text: "#6d638a",
  },
  noir: {
    background: "#000000",
    frame: "#111111",
    inner: "#080808",
    title: "#ffffff",
    accentA: "rgba(255, 255, 255, 0.04)",
    accentB: "rgba(255, 255, 255, 0.06)",
    footer: "#050505",
    text: "#d9d9d9",
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function getPageName() {
  return document.body.dataset.page || "home";
}

function isPhotoboothPage(page = getPageName()) {
  return page === "booth" || page.startsWith("photobooth-");
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function createRoomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function makeBoothUrl() {
  return new URL("/pages/photobooth/camera.html", window.location.origin);
}

function makePhotoboothLandingUrl() {
  return new URL("/pages/photobooth/booth.html", window.location.origin).toString();
}

function makeGalleryCaptureUrl(captureId, roomId = "", role = "host", layout = "1x4") {
  const url = new URL("/pages/gallery.html", window.location.origin);
  if (captureId) url.searchParams.set("capture", captureId);
  if (roomId) url.searchParams.set("room", roomId);
  if (role) url.searchParams.set("role", role);
  if (layout) url.searchParams.set("layout", layout);
  return url.toString();
}

function makePhotoboothCreateUrl() {
  return new URL("/pages/photobooth/create.html", window.location.origin).toString();
}

function makePhotoboothJoinUrl() {
  return new URL("/pages/photobooth/join.html", window.location.origin).toString();
}

function makePhotoboothStepUrl(page, extra = {}) {
  return getPhotoboothPageUrl(page, extra);
}

function resolvePageUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function getPhotoboothState() {
  try {
    return JSON.parse(sessionStorage.getItem(PHOTobooth_STATE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setPhotoboothState(update) {
  const current = getPhotoboothState();
  const next = { ...current, ...update };
  try {
    sessionStorage.setItem(PHOTobooth_STATE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function clearPhotoboothState() {
  try {
    sessionStorage.removeItem(PHOTobooth_STATE_KEY);
  } catch {}
}

function getPhotoboothParamValue(name) {
  return getParam(name) || getPhotoboothState()[name] || "";
}

function getPhotoboothPageUrl(page, extra = {}) {
  const url = new URL(`/pages/photobooth/${page}.html`, window.location.origin);
  const state = getPhotoboothState();
  const merged = { ...state, ...extra };
  ["room", "role", "layout", "theme", "capture", "filter", "step"].forEach((key) => {
    if (merged[key]) url.searchParams.set(key, merged[key]);
  });
  return url.toString();
}

function makeInviteUrl(roomId, hostId, cameraId = "", micId = "") {
  const url = makeBoothUrl();
  url.searchParams.set("room", roomId);
  url.searchParams.set("host", hostId);
  if (cameraId) url.searchParams.set("cam", cameraId);
  if (micId) url.searchParams.set("mic", micId);
  return url.toString();
}

async function includePartials() {
  const partialVersion = "20260802";
  const targets = [
    { selector: "[data-include='header']", url: `/header/site-header.html?v=${partialVersion}` },
    { selector: "[data-include='footer']", url: `/footer/site-footer.html?v=${partialVersion}` },
  ];

  await Promise.all(
    targets.map(async ({ selector, url }) => {
      const host = $(selector);
      if (!host) return;
      try {
        const response = await fetch(url, { cache: "no-store" });
        host.innerHTML = response.ok ? await response.text() : "";
      } catch {
        host.innerHTML = "";
      }
    })
  );
}

function markCurrentPage() {
  const page = getPageName();
  $$("[data-nav]").forEach((link) => {
    const isBooth = link.dataset.nav === "booth" && isPhotoboothPage(page);
    link.classList.toggle("active", link.dataset.nav === page || isBooth);
  });
}

function setupHeroButtons() {
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = button.dataset.go;
    });
  });
}

async function getLocalVideoStream(videoEl, statusEl, options = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    if (statusEl) statusEl.textContent = "Camera access is unavailable in this browser.";
    return null;
  }

  const {
    videoDeviceId = "",
    audioDeviceId = "",
    includeAudio = false,
  } = options;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId } }
        : {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
      audio: includeAudio
        ? audioDeviceId
          ? { deviceId: { exact: audioDeviceId } }
          : true
        : false,
    });
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
    }
    if (statusEl) statusEl.textContent = "Camera is live and ready.";
    return stream;
  } catch {
    if (statusEl) statusEl.textContent = "Camera permission is blocked. Please allow it to join.";
    return null;
  }
}

function drawCoverFrame(ctx, source, x, y, width, height) {
  const sourceWidth = source.videoWidth || source.width || width;
  const sourceHeight = source.videoHeight || source.height || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const destRatio = width / height;

  let sw = sourceWidth;
  let sh = sourceHeight;
  let sx = 0;
  let sy = 0;

  if (sourceRatio > destRatio) {
    sw = sourceHeight * destRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / destRatio;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.drawImage(source, sx, sy, sw, sh, x, y, width, height);
}

function getBoothFilter(filterName) {
  switch (filterName) {
    case "rosy":
      return "saturate(1.28) contrast(1.03) brightness(1.01) hue-rotate(-12deg)";
    case "sepia":
      return "sepia(0.62) saturate(1.05) contrast(0.98)";
    case "bnw":
      return "grayscale(1) contrast(1.08) brightness(1.02)";
    case "soft":
      return "saturate(0.94) contrast(0.97) brightness(1.03)";
    case "none":
    default:
      return "none";
  }
}

function drawFilteredCoverFrame(ctx, source, x, y, width, height, filterName = "none") {
  ctx.save();
  ctx.filter = getBoothFilter(filterName);
  drawCoverFrame(ctx, source, x, y, width, height);
  ctx.restore();
}

function drawFilteredCoverFrameMirrored(ctx, source, x, y, width, height, filterName = "none") {
  ctx.save();
  ctx.translate(x + width, y);
  ctx.scale(-1, 1);
  ctx.filter = getBoothFilter(filterName);
  drawCoverFrame(ctx, source, 0, 0, width, height);
  ctx.restore();
}

const BOOTH_PANE = {
  leftX: 26,
  panelTop: 82,
  panelWidth: 522,
  panelHeight: 590,
};

function drawContainFrame(ctx, source, x, y, width, height) {
  const sourceWidth = source.width || source.videoWidth || width;
  const sourceHeight = source.height || source.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const destRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > destRatio) {
    drawHeight = width / sourceRatio;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    drawX = x + (width - drawWidth) / 2;
  }

  ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function getContainFrameRect(source, x, y, width, height) {
  const sourceWidth = source.width || source.videoWidth || width;
  const sourceHeight = source.height || source.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const destRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > destRatio) {
    drawHeight = width / sourceRatio;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    drawX = x + (width - drawWidth) / 2;
  }

  return { sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight };
}

function drawFilteredContainCrop(ctx, source, crop, x, y, width, height, filterName = "none") {
  const frame = getContainFrameRect(source, x, y, width, height);
  const cropX = crop.x;
  const cropY = crop.y;
  const cropWidth = crop.width;
  const cropHeight = crop.height;
  const sourceWidth = frame.sourceWidth;
  const sourceHeight = frame.sourceHeight;

  ctx.save();
  ctx.filter = getBoothFilter(filterName);
  ctx.drawImage(
    source,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    frame.drawX + (cropX / sourceWidth) * frame.drawWidth,
    frame.drawY + (cropY / sourceHeight) * frame.drawHeight,
    (cropWidth / sourceWidth) * frame.drawWidth,
    (cropHeight / sourceHeight) * frame.drawHeight
  );
  ctx.restore();
}

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getSavedCaptures() {
  if (typeof localStorage === "undefined") return [];
  const stored = safeParseJson(localStorage.getItem(GALLERY_STORAGE_KEY), null);
  if (!stored) return [];
  if (Array.isArray(stored)) {
    return stored.length ? [stored[0]] : [];
  }
  return [stored];
}

function saveGalleryCaptures(captures) {
  if (typeof localStorage === "undefined") return;
  const latest = Array.isArray(captures) ? captures[0] || null : captures || null;
  if (latest) {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(latest));
  } else {
    localStorage.removeItem(GALLERY_STORAGE_KEY);
  }
}

function addGalleryCapture(capture) {
  saveGalleryCaptures(capture);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(GALLERY_PENDING_KEY, capture.id);
  }
  return [capture];
}

function getGalleryPendingId() {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(GALLERY_PENDING_KEY) || "";
}

function setGalleryPendingId(id) {
  if (typeof localStorage === "undefined") return;
  if (id) {
    localStorage.setItem(GALLERY_PENDING_KEY, id);
  } else {
    localStorage.removeItem(GALLERY_PENDING_KEY);
  }
}

function createCaptureId() {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function paintFallbackPane(ctx, x, y, width, height, title, note, accent) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, accent[0]);
  gradient.addColorStop(1, accent[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.arc(x + width * 0.5, y + height * 0.38, Math.min(width, height) * 0.17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#24303f";
  ctx.font = "700 34px Manrope";
  ctx.textAlign = "center";
  ctx.fillText(title, x + width / 2, y + height * 0.67);
  ctx.font = "500 22px Manrope";
  ctx.fillText(note, x + width / 2, y + height * 0.75);
}

function captureSnapshotCanvas({
  selfVideo,
  partnerVideo,
  filterName = "none",
  mirrorSelf = true,
  mode = "together",
}) {
  const width = 1200;
  const height = 760;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fffefb");
  bg.addColorStop(1, "#eef6ff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 182, 148, 0.26)";
  ctx.beginPath();
  ctx.arc(width * 0.13, height * 0.15, 86, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(134, 184, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.14, 108, 0, Math.PI * 2);
  ctx.fill();

  const { leftX, panelTop, panelWidth, panelHeight } = BOOTH_PANE;
  const rightX = 652;
  const togetherWidth = width - 52;

  ctx.fillStyle = "#ffffff";
  if (mode === "ldr") {
    ctx.fillRect(leftX, panelTop, panelWidth, panelHeight);
    ctx.fillRect(rightX, panelTop, panelWidth, panelHeight);
  } else {
    ctx.fillRect(leftX, panelTop, togetherWidth, panelHeight);
  }

  ctx.strokeStyle = "rgba(72,85,104,0.08)";
  ctx.lineWidth = 2;
  if (mode === "ldr") {
    ctx.strokeRect(leftX, panelTop, panelWidth, panelHeight);
    ctx.strokeRect(rightX, panelTop, panelWidth, panelHeight);
  } else {
    ctx.strokeRect(leftX, panelTop, togetherWidth, panelHeight);
  }

  const selfHasVideo = selfVideo && selfVideo.readyState >= 2;
  const partnerHasVideo = partnerVideo && partnerVideo.readyState >= 2;

  if (selfHasVideo) {
    if (mirrorSelf) {
      drawFilteredCoverFrameMirrored(
        ctx,
        selfVideo,
        leftX,
        panelTop,
        mode === "ldr" ? panelWidth : togetherWidth,
        panelHeight,
        filterName
      );
    } else {
      drawFilteredCoverFrame(
        ctx,
        selfVideo,
        leftX,
        panelTop,
        mode === "ldr" ? panelWidth : togetherWidth,
        panelHeight,
        filterName
      );
    }
  } else {
    paintFallbackPane(
      ctx,
      leftX,
      panelTop,
      mode === "ldr" ? panelWidth : togetherWidth,
      panelHeight,
      "You",
      "Camera warming up",
      ["#ffe3c8", "#fff6ec"]
    );
  }

  if (mode === "ldr") {
    if (partnerHasVideo) {
      drawFilteredCoverFrame(ctx, partnerVideo, rightX, panelTop, panelWidth, panelHeight, filterName);
    } else {
      paintFallbackPane(
        ctx,
        rightX,
        panelTop,
        panelWidth,
        panelHeight,
        "Other side",
        "Waiting to join",
        ["#dff0ff", "#f8fbff"]
      );
    }
  }

  ctx.fillStyle = "#ff6e8f";
  ctx.font = "700 34px Fraunces";
  ctx.textAlign = "center";
  ctx.fillText("Boothly", width / 2, 48);

  return canvas;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pulseFlash(flashEl) {
  if (!flashEl) return;
  flashEl.classList.remove("hidden");
  flashEl.classList.add("active");
  await delay(140);
  flashEl.classList.remove("active");
  await delay(80);
  flashEl.classList.add("hidden");
}

function buildStripFromShots(shots, options = {}) {
  const theme = GALLERY_THEMES[options.theme] || GALLERY_THEMES.cream;
  const isNoir = options.theme === "noir";
  const stripFilter = options.filterName || "none";
  const captureMode = options.mode || "together";
  const layout = options.layout || "1x4";
  const canvas = document.createElement("canvas");
  const isGrid = layout === "2x2";
  canvas.width = isGrid ? 1080 : 620;
  canvas.height = isGrid ? 1320 : 1188;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const marginX = isGrid ? 32 : 20;
  const topY = isNoir ? 18 : isGrid ? 28 : 20;
  const gap = isNoir ? 16 : isGrid ? 28 : 12;
  const frameWidth = isGrid ? Math.floor((canvas.width - marginX * 2 - gap) / 2) : canvas.width - marginX * 2;
  const frameHeight = isGrid ? Math.floor((canvas.height - 210 - gap) / 2) : 250;
  const innerPad = isNoir ? 8 : isGrid ? 10 : 6;
  const innerX = marginX + innerPad;
  const innerY = innerPad;
  const innerWidth = frameWidth - innerPad * 2;
  const innerHeight = frameHeight - innerPad * 2;
  const photoCrop =
    captureMode === "ldr"
      ? [
          { x: BOOTH_PANE.leftX, y: BOOTH_PANE.panelTop, width: BOOTH_PANE.panelWidth, height: BOOTH_PANE.panelHeight },
          { x: 652, y: BOOTH_PANE.panelTop, width: BOOTH_PANE.panelWidth, height: BOOTH_PANE.panelHeight },
        ]
      : [
          { x: BOOTH_PANE.leftX, y: BOOTH_PANE.panelTop, width: 1174, height: BOOTH_PANE.panelHeight },
        ];

  shots.forEach((shotCanvas, index) => {
    const frameX = isGrid ? marginX + (index % 2) * (frameWidth + gap) : marginX;
    const frameY = isGrid ? topY + Math.floor(index / 2) * (frameHeight + gap) : topY + index * (frameHeight + gap);

    ctx.fillStyle = isNoir ? "#000000" : theme.frame;
    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

    ctx.fillStyle = isNoir ? "#050505" : theme.inner;
    ctx.fillRect(frameX + innerPad, frameY + innerY, innerWidth, innerHeight);

    if (isGrid) {
      drawContainFrame(ctx, shotCanvas, frameX + innerPad, frameY + innerY, innerWidth, innerHeight);
      photoCrop.forEach((crop) => {
        drawFilteredContainCrop(ctx, shotCanvas, crop, frameX + innerPad, frameY + innerY, innerWidth, innerHeight, stripFilter);
      });
    } else {
      drawFilteredCoverFrame(ctx, shotCanvas, frameX + innerPad, frameY + innerY, innerWidth, innerHeight, stripFilter);
    }

    ctx.strokeStyle = isNoir ? "rgba(255,255,255,0.08)" : "rgba(72, 85, 104, 0.06)";
    ctx.lineWidth = isNoir ? 0.75 : 1.25;
    ctx.strokeRect(frameX + innerPad, frameY + innerY, innerWidth, innerHeight);

    ctx.strokeStyle = isNoir ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)";
    ctx.lineWidth = isNoir ? 0.75 : 1.25;
    ctx.strokeRect(frameX + 2, frameY + 2, frameWidth - 4, frameHeight - 4);
  });

  const footerHeight = isGrid ? 96 : 96;
  const footerY = canvas.height - footerHeight - (isGrid ? 24 : 28);
  const footerTop = footerY + (isGrid ? 38 : 36);
  ctx.fillStyle = isNoir ? "rgba(10,10,10,0.92)" : theme.footer;
  ctx.fillRect(22, footerY, canvas.width - 44, footerHeight);

  ctx.fillStyle = theme.title;
  ctx.font = `700 ${options.titleSize || (isNoir ? 26 : isGrid ? 28 : 22)}px Fraunces`;
  ctx.textAlign = "center";
  ctx.fillText(options.title || "Boothly", canvas.width / 2, footerTop + 22);
  ctx.fillStyle = theme.text;
  ctx.font = isGrid ? "600 14px Manrope" : "600 12px Manrope";
  if (options.showTimestamp !== false) {
    ctx.fillText(options.timestamp || new Date().toLocaleString(), canvas.width / 2, footerTop + 46);
  } else {
    ctx.fillText(options.footerText || "Capture saved in Boothly", canvas.width / 2, footerTop + 46);
  }

  ctx.strokeStyle = isNoir ? "rgba(255,255,255,0.06)" : "rgba(72, 85, 104, 0.07)";
  ctx.lineWidth = 0.75;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function createStripOptions(overrides = {}) {
  return {
    theme: "cream",
    title: "Boothly",
    titleSize: 28,
    showTimestamp: true,
    timestamp: new Date().toLocaleString(),
    footerText: "Capture saved in Boothly",
    ...overrides,
  };
}

function captureVideoFrameDataUrl(source, size = 1200) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  if (source && source.readyState >= 2) {
    drawCoverFrame(ctx, source, 0, 0, size, size);
  }
  return canvas.toDataURL("image/jpeg", 0.88);
}

async function persistCaptureRecord(capture, context = {}) {
  if (!capture || !capture.strip) return null;

  const roomCode = String(context.roomCode || getParam("room") || appState.roomId || "").toUpperCase().trim();
  if (!/^[A-Z0-9]{5}$/.test(roomCode)) {
    return null;
  }

  try {
    const data = await apiRequest("capture", {
      room_code: roomCode,
      room_mode: context.roomMode || "ldr",
      capture_token: capture.id,
      capture_type: Array.isArray(capture.shots) && capture.shots.length > 1 ? "strip" : "single",
      title: capture.options?.title || "Boothly",
      theme: capture.options?.theme || "cream",
      strip_url: capture.strip,
      shots: capture.shots || [],
      options: capture.options || {},
    });
    return data.capture || null;
  } catch (error) {
    console.warn("Capture persistence failed, retrying with a compact payload:", error);
    try {
      const data = await apiRequest("capture", {
        room_code: roomCode,
        room_mode: context.roomMode || "ldr",
        capture_token: capture.id,
        capture_type: "strip",
        title: capture.options?.title || "Boothly",
        theme: capture.options?.theme || "cream",
        strip_url: capture.strip,
        shots: [],
        options: {
          ...capture.options,
          compact: true,
        },
      });
      return data.capture || null;
    } catch (retryError) {
      console.warn("Compact capture persistence failed:", retryError);
      return null;
    }
  }
}

async function saveGalleryItemFromShots(shots, options = {}, context = {}) {
  const itemOptions = createStripOptions(options);
  const strip = buildStripFromShots(shots, itemOptions);
  const capture = {
    id: createCaptureId(),
    createdAt: Date.now(),
    shots: shots.map((shot) => shot.toDataURL("image/jpeg", 0.88)),
    options: itemOptions,
    strip,
  };
  addGalleryCapture(capture);
  await persistCaptureRecord(capture, {
    roomCode: context.roomCode,
    roomMode: context.roomMode || itemOptions.mode || "ldr",
  });
  return capture;
}

function createSharedCapturePayload(capture) {
  if (!capture) return null;
  return {
    id: capture.id,
    createdAt: capture.createdAt,
    options: capture.options || {},
    strip: capture.strip || "",
  };
}

async function renderGalleryPreview(container, capture, options = {}) {
  if (!container || !capture) return null;

  const stripSource = capture.strip || capture.strip_url || "";
  if (!Array.isArray(capture.shots) || capture.shots.length === 0) {
    container.src = stripSource;
    container.dataset.captureId = capture.id;
    return stripSource;
  }

  const shots = await Promise.all((capture.shots || []).map((src) => loadImage(src)));
  const mergedOptions = createStripOptions({
    ...capture.options,
    ...options,
    timestamp: capture.options?.timestamp || new Date(capture.createdAt).toLocaleString(),
  });
  const strip = buildStripFromShots(shots, mergedOptions);
  container.src = strip;
  container.dataset.captureId = capture.id;
  return strip;
}

async function buildStripDataUrlFromCapture(capture, options = {}) {
  const stripSource = capture.strip || capture.strip_url || "";
  if (!Array.isArray(capture.shots) || capture.shots.length === 0) {
    return stripSource;
  }

  const shots = await Promise.all((capture.shots || []).map((src) => loadImage(src)));
  return buildStripFromShots(
    shots,
    createStripOptions({
      ...capture.options,
      ...options,
      timestamp: capture.options?.timestamp || new Date(capture.createdAt).toLocaleString(),
    })
  );
}

function normalizeDbCapture(capture) {
  if (!capture) return null;
  const shots = (() => {
    if (Array.isArray(capture.shots)) return capture.shots;
    if (Array.isArray(capture.shots_json)) return capture.shots_json;
    if (typeof capture.shots_json === "string" && capture.shots_json.trim()) {
      try {
        const parsed = JSON.parse(capture.shots_json);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const options = (() => {
    if (capture.options && typeof capture.options === "object") return capture.options;
    if (typeof capture.options_json === "string" && capture.options_json.trim()) {
      try {
        const parsed = JSON.parse(capture.options_json);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  })();

  return {
    ...capture,
    shots,
    options,
    strip: capture.strip || capture.strip_url || "",
  };
}

function renderGallery(container) {
  if (!container) return;
  container.innerHTML = "";
}

function waitForCountdown(countdownEls, targetAt, label) {
  const countdownList = Array.isArray(countdownEls)
    ? countdownEls
    : countdownEls
      ? [countdownEls]
      : [];

  return new Promise((resolve) => {
    let timer = null;

    const tick = () => {
      const remaining = Math.ceil((targetAt - Date.now()) / 1000);
      countdownList.forEach((countdownEl) => {
        countdownEl.textContent = String(Math.max(remaining, 1));
        countdownEl.classList.toggle("hidden", remaining <= 0);
      });

      if (remaining <= 0) {
        if (timer) clearInterval(timer);
        countdownList.forEach((countdownEl) => countdownEl.classList.add("hidden"));
        resolve();
      }
    };

    countdownList.forEach((countdownEl) => {
      countdownEl.textContent = String(label || CAPTURE_COUNTDOWN_SECONDS);
      countdownEl.classList.remove("hidden");
    });

    tick();
    timer = setInterval(tick, 100);
  });
}

function wireCopyButtons() {
  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = button.getAttribute("data-copy-target");
      const field = target ? $(target) : null;
      const value = field?.value || field?.textContent || "";
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = button.dataset.originalLabel || "Copy";
        }, 1300);
        if (button.hasAttribute("data-copy-and-open")) {
          window.setTimeout(() => {
            window.location.href = value;
          }, 250);
        }
      } catch {
        button.textContent = "Copy failed";
      }
    });
  });
}

function wireHintPreview(buttons, hintEl, descriptions, keyGetter) {
  if (!hintEl) return;
  buttons.forEach((button) => {
    const key = keyGetter(button);
    const defaultText = hintEl.textContent;

    const showHint = () => {
      hintEl.textContent = descriptions[key] || defaultText;
    };

    const resetHint = () => {
      if (button.classList.contains("active")) {
        hintEl.textContent = descriptions[key] || defaultText;
        return;
      }
      const activeButton = buttons.find((item) => item.classList.contains("active"));
      if (activeButton) {
        const activeKey = keyGetter(activeButton);
        hintEl.textContent = descriptions[activeKey] || defaultText;
        return;
      }
      hintEl.textContent = defaultText;
    };

    button.addEventListener("mouseenter", showHint);
    button.addEventListener("focus", showHint);
    button.addEventListener("mouseleave", resetHint);
    button.addEventListener("blur", resetHint);
  });
}

function setupHome() {
  // Home page only presents the product; no persistence or gallery wall.
}

function createPhotoboothCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function getOrCreatePhotoboothCode() {
  const key = "boothly.photobooth.code.v1";
  try {
    const current = sessionStorage.getItem(key);
    if (current) return current;
    const created = createPhotoboothCode();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return createPhotoboothCode();
  }
}

function setTextContent(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

async function apiRequest(action, payload = {}, method = "POST") {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (method !== "GET") {
    options.body = JSON.stringify({ action, ...payload });
  }

  const appScript = Array.from(document.scripts).find((script) =>
    script.src.endsWith("/js/app.js")
  );
  const apiBase = appScript?.src || window.location.href;
  const makeUrl = (endpoint) => {
    const url = new URL(endpoint, apiBase);
    url.searchParams.set("action", action);
    if (method === "GET") {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, value);
        }
      });
    }
    return url;
  };

  let response = await fetch(makeUrl("../api/photobooth").toString(), options);
  if (response.status === 404) {
    response = await fetch(makeUrl("../local-api/photobooth.php").toString(), options);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

function setupPhotoboothLanding() {
  $$("[data-pb-go]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = button.dataset.pbGo || makePhotoboothLandingUrl();
    });
  });
}

function setupPhotoboothCreate() {
  const codeSlots = $$("[data-pb-code-slot]");
  const statusText = $("[data-pb-status]");
  const startButton = $("[data-pb-start]");
  const backButton = $("[data-pb-back]");
  let codeValue = (getParam("room") || getOrCreatePhotoboothCode()).toUpperCase().slice(0, 5);

  const renderCode = (value) => {
    codeSlots.forEach((slot, index) => {
      slot.textContent = value[index] || "";
    });
    setTextContent("[data-pb-code]", value);
  };

  const setStatus = (message) => {
    if (statusText) statusText.textContent = message;
  };

  renderCode(codeValue);
  setStatus("Creating your room...");
  if (startButton) startButton.disabled = true;

  apiRequest("create", { room_mode: "ldr" })
    .then((data) => {
      const serverCode = String(data.room?.room_code || "").toUpperCase().slice(0, 5);
      if (serverCode) {
        codeValue = serverCode;
        renderCode(codeValue);
        if (startButton) startButton.disabled = false;
      }
      setStatus("Waiting for partner...");
    })
    .catch(() => {
      setStatus("Room creation failed. Please try again.");
    });

  startButton?.addEventListener("click", () => {
    setPhotoboothState({ room: codeValue, role: "host" });
    const layoutUrl = makePhotoboothStepUrl("layout", {
      room: codeValue,
      role: "host",
      step: "layout",
    });
    window.location.href = layoutUrl;
  });

  backButton?.addEventListener("click", () => {
    window.location.href = makePhotoboothLandingUrl();
  });
}

function setupPhotoboothJoin() {
  const slots = $$("[data-pb-join-slot]");
  const joinButton = $("[data-pb-join]");
  const backButton = $("[data-pb-back]");

  const syncValue = () => {
    const value = slots.map((slot) => slot.value.trim().toUpperCase().slice(0, 1)).join("");
    if (joinButton) joinButton.disabled = value.length !== slots.length;
    return value;
  };

  slots.forEach((slot, index) => {
    slot.addEventListener("input", () => {
      slot.value = slot.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 1);
      if (slot.value && index < slots.length - 1) {
        slots[index + 1].focus();
      }
      syncValue();
    });

    slot.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !slot.value && index > 0) {
        slots[index - 1].focus();
      }
    });
  });

  joinButton?.addEventListener("click", () => {
    const value = syncValue();
    if (value.length !== slots.length) return;
    joinButton.disabled = true;
    apiRequest("join", { room_code: value })
      .then(() => {
        setPhotoboothState({ room: value, role: "guest" });
        const layoutUrl = makePhotoboothStepUrl("layout", {
          room: value,
          role: "guest",
          step: "layout",
        });
        window.location.href = layoutUrl;
      })
      .catch(() => {
        joinButton.disabled = false;
      });
  });

  backButton?.addEventListener("click", () => {
    window.location.href = makePhotoboothLandingUrl();
  });

  syncValue();
}

function setupPhotoboothLayout() {
  const cards = $$("[data-layout-choice]");
  const nextButton = $("[data-layout-next]");
  const backButton = $("[data-layout-back]");
  const selectedLabel = $("[data-layout-selected]");
  const state = getPhotoboothState();
  let selectedLayout = getParam("layout") || state.layout || "1x4";

  function setActiveLayout(layout) {
    selectedLayout = layout;
    setPhotoboothState({ layout });
    cards.forEach((card) => {
      card.classList.toggle("active", card.dataset.layoutChoice === layout);
    });
    if (selectedLabel) selectedLabel.textContent = layout === "2x2" ? "2 x 2" : "1 x 4";
    if (nextButton) nextButton.disabled = !layout;
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => setActiveLayout(card.dataset.layoutChoice || "1x4"));
  });

  nextButton?.addEventListener("click", () => {
    const frameUrl = makePhotoboothStepUrl("frame", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: selectedLayout,
      step: "frame",
    });
    window.location.href = frameUrl;
  });

  backButton?.addEventListener("click", () => {
    const target = state.role === "guest" ? makePhotoboothJoinUrl() : makePhotoboothCreateUrl();
    window.location.href = target;
  });

  setActiveLayout(selectedLayout);
}

function setupPhotoboothFrame() {
  const cards = $$("[data-theme-choice]");
  const nextButton = $("[data-frame-next]");
  const backButton = $("[data-frame-back]");
  const selectedLabel = $("[data-frame-selected]");
  const state = getPhotoboothState();
  let selectedTheme = getParam("theme") || state.theme || "cream";

  function setActiveTheme(theme) {
    selectedTheme = theme;
    setPhotoboothState({ theme });
    cards.forEach((card) => {
      card.classList.toggle("active", card.dataset.themeChoice === theme);
    });
    if (selectedLabel) selectedLabel.textContent = theme;
    if (nextButton) nextButton.disabled = !theme;
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => setActiveTheme(card.dataset.themeChoice || "cream"));
  });

  nextButton?.addEventListener("click", () => {
    const cameraUrl = makePhotoboothStepUrl("camera", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: selectedTheme,
      step: "camera",
    });
    window.location.href = cameraUrl;
  });

  backButton?.addEventListener("click", () => {
    const target = makePhotoboothStepUrl("layout", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || "1x4",
      step: "layout",
    });
    window.location.href = target;
  });

  setActiveTheme(selectedTheme);
}

function getStoredPhotoboothCapture() {
  const state = getPhotoboothState();
  const captures = getSavedCaptures();
  const activeId = getParam("capture") || state.capture || getGalleryPendingId();
  return captures.find((capture) => capture.id === activeId) || captures[0] || null;
}

function updateStoredPhotoboothCapture(update) {
  const current = getStoredPhotoboothCapture();
  if (!current) return null;
  const next = { ...current, ...update };
  addGalleryCapture(next);
  setPhotoboothState({ capture: next.id });
  return next;
}

function setupPhotoboothSelect() {
  const board = $("[data-select-board]");
  const slotNodes = $$("[data-select-slot]");
  const sourceNodes = $$("[data-select-source]");
  const nextButton = $("[data-select-next]");
  const backButton = $("[data-select-back]");
  const state = getPhotoboothState();
  const capture = getStoredPhotoboothCapture();
  const shots = Array.isArray(capture?.shots) ? capture.shots.slice(0, 4) : [];
  const selectedShots = [shots[0] || "", shots[1] || "", shots[2] || "", shots[3] || ""];
  let activeSlot = 0;

  if (capture && !state.capture) {
    setPhotoboothState({ capture: capture.id });
  }

  function renderSlots() {
    slotNodes.forEach((slot, index) => {
      const src = selectedShots[index];
      slot.classList.toggle("filled", Boolean(src));
      slot.dataset.slotIndex = String(index);
      slot.innerHTML = src
        ? `<img src="${src}" alt="Selected shot ${index + 1}" />`
        : `<span>${index + 1}</span>`;
      slot.classList.toggle("active", index === activeSlot);
    });
    if (nextButton) {
      nextButton.disabled = selectedShots.some((shot) => !shot);
    }
  }

  function fillNextSlot(src) {
    selectedShots[activeSlot] = src;
    renderSlots();
  }

  function clearSlot(index) {
    selectedShots[index] = "";
    renderSlots();
  }

  sourceNodes.forEach((node, index) => {
    const src = shots[index];
    if (!src) return;
    node.innerHTML = `<img src="${src}" alt="Shot ${index + 1}" />`;
    node.addEventListener("click", () => fillNextSlot(src));
  });

  slotNodes.forEach((slot, index) => {
    slot.addEventListener("click", () => {
      activeSlot = index;
      if (selectedShots[index]) {
        clearSlot(index);
      }
      renderSlots();
    });
  });

  nextButton?.addEventListener("click", () => {
    const chosen = selectedShots.filter(Boolean);
    const selectedCapture = capture || getStoredPhotoboothCapture();
    if (!selectedCapture || chosen.length !== 4) return;
    updateStoredPhotoboothCapture({ shots: chosen });
    const filterUrl = makePhotoboothStepUrl("filter", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: state.theme || getParam("theme") || "cream",
      capture: selectedCapture.id,
      step: "filter",
    });
    window.location.href = filterUrl;
  });

  backButton?.addEventListener("click", () => {
    const cameraUrl = makePhotoboothStepUrl("camera", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: state.theme || getParam("theme") || "cream",
      step: "camera",
    });
    window.location.href = cameraUrl;
  });

  if (!capture || !shots.length) {
    if (board) {
      board.innerHTML = `<p class="photobooth-empty">No capture found yet. Go back to the camera and take a photo first.</p>`;
    }
    if (nextButton) nextButton.disabled = true;
    return;
  }

  renderSlots();
}

function setupPhotoboothFilter() {
  const preview = $("[data-filter-preview]");
  const filterButtons = $$("[data-filter-choice]");
  const nextButton = $("[data-filter-next]");
  const backButton = $("[data-filter-back]");
  const state = getPhotoboothState();
  const capture = getStoredPhotoboothCapture();
  const filters = ["none", "rosy", "sepia", "bnw", "soft"];
  let selectedFilter = getParam("filter") || state.filter || "none";

  function renderPreview() {
    if (!preview || !capture) return;
    buildStripDataUrlFromCapture(capture, {
      layout: state.layout || "1x4",
      theme: state.theme || "cream",
      filterName: selectedFilter,
      showTimestamp: true,
      title: "Boothly",
    }).then((strip) => {
      preview.src = strip;
    });
    filterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.filterChoice === selectedFilter);
    });
    if (nextButton) nextButton.disabled = false;
  }

  if (!capture) {
    if (nextButton) nextButton.disabled = true;
    return;
  }

  filterButtons.forEach((button) => {
    if (!filters.includes(button.dataset.filterChoice || "")) return;
    button.addEventListener("click", () => {
      selectedFilter = button.dataset.filterChoice || "none";
      setPhotoboothState({ filter: selectedFilter });
      renderPreview();
    });
  });

  nextButton?.addEventListener("click", () => {
    setPhotoboothState({ filter: selectedFilter });
    const downloadUrl = makePhotoboothStepUrl("download", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: state.theme || getParam("theme") || "cream",
      filter: selectedFilter,
      capture: capture.id,
      step: "download",
    });
    window.location.href = downloadUrl;
  });

  backButton?.addEventListener("click", () => {
    const selectUrl = makePhotoboothStepUrl("select", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: state.theme || getParam("theme") || "cream",
      capture: capture.id,
      step: "select",
    });
    window.location.href = selectUrl;
  });

  setPhotoboothState({ filter: selectedFilter });
  renderPreview();
}

function setupPhotoboothDownload() {
  const preview = $("[data-download-preview]");
  const downloadButton = $("[data-download-final]");
  const backButton = $("[data-download-back]");
  const state = getPhotoboothState();
  const capture = getStoredPhotoboothCapture();

  if (!capture || !preview) return;

  buildStripDataUrlFromCapture(capture, {
    layout: state.layout || "1x4",
    theme: state.theme || "cream",
    filterName: state.filter || "none",
    showTimestamp: true,
    title: "Boothly",
  }).then((strip) => {
    preview.src = strip;
    downloadButton?.addEventListener("click", () => {
      downloadDataUrl(strip, `boothly-${capture.id}.png`);
    });
  });

  backButton?.addEventListener("click", () => {
    const filterUrl = makePhotoboothStepUrl("filter", {
      room: state.room || getParam("room") || "",
      role: state.role || getParam("role") || "",
      layout: state.layout || getParam("layout") || "1x4",
      theme: state.theme || getParam("theme") || "cream",
      capture: capture.id,
      filter: state.filter || "none",
      step: "filter",
    });
    window.location.href = filterUrl;
  });
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function setInviteLink(value) {
  appState.inviteLink = value;
  const input = $("[data-invite-link]");
  if (input) input.value = value;
  const helper = $("[data-invite-status]");
  if (helper) {
    helper.textContent = value
      ? "Room is ready. Share the code with your partner."
      : "Waiting to generate your room code.";
  }
}

function setConnectionState(message, tone = "neutral") {
  const status = $("[data-room-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function setupBooth() {
  const sessionState = getPhotoboothState();
  const selfVideo = $("[data-self-video]");
  const partnerVideo = $("[data-partner-video]");
  const selfStatus = $("[data-self-status]");
  const partnerStatus = $("[data-partner-status]");
  const inviteInput = $("[data-invite-link]");
  const inviteButton = $("[data-copy-invite]");
  const captureButton = $("[data-capture]");
  const cameraStage = $(".camera-stage");
  const captureResult = $("[data-capture-result]");
  const captureLink = $("[data-capture-link]");
  const captureStripPreview = $("[data-capture-strip-preview]");
  const copyLinkButton = $("[data-copy-link]");
  const openLinkButton = $("[data-open-link]");
  const retakeButton = $("[data-retake-photo]");
  const countdowns = $$("[data-countdown]");
  const flash = $("[data-camera-flash]");
  const roomStatus = $("[data-room-status]");
  const selfLabel = $("[data-self-label]");
  const partnerLabel = $("[data-partner-label]");
  const inviteField = $("[data-invite-field]");
  const partnerPill = $("[data-partner-pill]");
  const partnerPane = $("[data-partner-pane]");
  const gallery = $("[data-live-gallery]");
  const controlTitle = $("[data-control-title]");
  const controlCopy = $("[data-control-copy]");
  const modeButtons = $$("[data-room-mode]");
  const boothStage = $("[data-booth-stage]");
  const mirrorToggle = $("[data-mirror-toggle]");
  const mirrorLabel = $("[data-mirror-label]");
  const roomOnly = modeButtons.length === 0;
  const roomId = getParam("room") || sessionState.room || createRoomId();
  const hostId = getParam("host");
  const role = getParam("role") || sessionState.role || "";
  const cameraId = getParam("cam") || "";
  const micId = getParam("mic") || "";
  const isGuest = role === "guest" || Boolean(hostId);
  const selectedLayout = getParam("layout") || sessionState.layout || "1x4";
  const selectedTheme = getParam("theme") || sessionState.theme || "cream";
  let latestCapture = null;

  appState.roomId = roomId;
  appState.hostId = hostId;
  setPhotoboothState({ room: roomId, role: role || "host", layout: selectedLayout, theme: selectedTheme });
  if (boothStage) boothStage.dataset.remoteReady = "false";
  if (partnerPane) partnerPane.classList.add("hidden");
  showCameraScreen();

  function applyMirrorState(isMirrored) {
    if (!selfVideo) return;
    selfVideo.classList.toggle("mirror", isMirrored);
    if (mirrorLabel) {
      mirrorLabel.textContent = isMirrored ? "On" : "Off";
    }
  }

  function setCaptureScreenVisible(isVisible) {
    if (cameraStage) cameraStage.hidden = !isVisible;
    if (captureButton) captureButton.hidden = false;
    if (captureResult) {
      captureResult.hidden = isVisible;
      captureResult.classList.toggle("hidden", isVisible);
    }
  }

  function showCameraScreen() {
    latestCapture = null;
    if (captureStripPreview) {
      captureStripPreview.src = "";
      captureStripPreview.classList.add("hidden");
    }
    if (captureButton) captureButton.textContent = "Take photo";
    if (captureButton) {
      captureButton.hidden = false;
      captureButton.classList.remove("hidden");
    }
    setCaptureScreenVisible(true);
  }

  function showCaptureResult(capture) {
    latestCapture = capture || null;
    const captureId = capture?.capture_token || capture?.id || "";
    const shareUrl = makeGalleryCaptureUrl(captureId, roomId, isGuest ? "guest" : "host", selectedLayout);
    if (captureLink) captureLink.value = shareUrl;
    if (openLinkButton) openLinkButton.href = shareUrl;
    if (captureStripPreview) {
      captureStripPreview.src = capture?.strip || capture?.strip_url || "";
      captureStripPreview.classList.add("hidden");
    }
    if (captureButton) {
      captureButton.hidden = true;
      captureButton.classList.add("hidden");
      captureButton.disabled = false;
      captureButton.textContent = "Take photo";
    }
    if (cameraStage) cameraStage.hidden = true;
    if (captureResult) {
      captureResult.hidden = false;
      captureResult.classList.remove("hidden");
    }
    setGalleryPendingId(captureId);
    setPhotoboothState({ capture: captureId });
    try {
      captureLink?.select?.();
    } catch {}
  }

  function setModeButtonsLocked(locked) {
    modeButtons.forEach((button) => {
      button.disabled = locked;
      button.classList.toggle("is-locked", locked);
    });
  }

  function getActiveMode() {
    return boothStage?.dataset.mode || (roomOnly ? "room" : "together");
  }

  function teardownPeerSession() {
    if (appState.call) {
      try {
        appState.call.close();
      } catch {}
      appState.call = null;
    }
    if (appState.conn) {
      try {
        appState.conn.close();
      } catch {}
      appState.conn = null;
    }
    if (appState.peer) {
      try {
        appState.peer.destroy();
      } catch {}
      appState.peer = null;
      appState.peerId = null;
    }
    appState.remoteStream = null;
    if (partnerVideo) partnerVideo.srcObject = null;
  }

  function startPeerSessionIfNeeded() {
    if (!roomOnly && getActiveMode() !== "ldr") return;
    if (!appState.stream) return;
    maybeStartPeerSession();
  }

  function applyMode(mode) {
    if (!boothStage) return;
    boothStage.dataset.mode = mode;
    appState.roomMode = mode;

    if (selfLabel) selfLabel.textContent = "You";
    if (partnerLabel) partnerLabel.textContent = roomOnly ? "Partner" : mode === "ldr" ? "Them" : "Other side";

    if (roomOnly) {
      if (controlTitle) controlTitle.textContent = "Capture";
      if (controlCopy) controlCopy.textContent = "Take a photo when both of you are ready.";
      if (inviteField) inviteField.classList.add("hidden");
      if (inviteButton) inviteButton.classList.add("hidden");
      if (partnerPill) partnerPill.classList.remove("hidden");
      return;
    }

    if (modeButtons.length) {
      modeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.roomMode === mode);
      });
    }

    if (controlTitle) {
      controlTitle.textContent = "Capture";
    }
    if (controlCopy) {
      controlCopy.textContent = "Take a photo when both of you are ready.";
    }
    updateRoomStatus("Room ready. Keep the energy sweet across the distance.", "good");
    updatePartnerStatus("The other side feels a little farther, but still right here.");
    if (inviteField) inviteField.classList.add("hidden");
    if (inviteButton) inviteButton.classList.add("hidden");
    if (partnerPill) partnerPill.classList.remove("hidden");
    startPeerSessionIfNeeded();
  }

  if (mirrorToggle) {
    applyMirrorState(mirrorToggle.checked);
    mirrorToggle.addEventListener("change", () => {
      applyMirrorState(mirrorToggle.checked);
    });
  }

  getLocalVideoStream(selfVideo, selfStatus, {
    videoDeviceId: cameraId,
    audioDeviceId: micId,
    includeAudio: false,
  }).then((stream) => {
    appState.stream = stream;
    startPeerSessionIfNeeded();
  });

  if (partnerVideo) {
    partnerVideo.poster = "";
  }

  function updatePartnerStatus(message) {
    if (partnerStatus) partnerStatus.textContent = message;
  }

  function updateRoomStatus(message, tone = "neutral") {
    setConnectionState(message, tone);
    if (roomStatus) roomStatus.textContent = message;
  }

  function attachRemoteStream(stream) {
    appState.remoteStream = stream;
    if (partnerVideo) {
      if (partnerPane) partnerPane.classList.remove("hidden");
      if (boothStage) boothStage.dataset.remoteReady = "true";
      partnerVideo.srcObject = stream;
      partnerVideo.play().catch(() => {});
    }
    updatePartnerStatus(
      getActiveMode() === "ldr"
        ? "The other side is live. Distance just got a little smaller."
        : "The other side is live in the room."
    );
    updateRoomStatus("Both cameras are connected.", "good");
  }

  async function runCaptureSequence(startAt = Date.now() + CAPTURE_COUNTDOWN_SECONDS * 1000, options = {}) {
    if (appState.captureBusy) return;
    appState.captureBusy = true;
    setModeButtonsLocked(true);
    const shots = [];
    const hasPartner = partnerPane ? !partnerPane.classList.contains("hidden") : Boolean(appState.remoteStream);
    const captureMode = hasPartner ? "ldr" : "together";
    const captureRoomMode = getActiveMode() === "room" ? captureMode : getActiveMode();

    try {
      for (let index = 0; index < 4; index += 1) {
        const shotNumber = index + 1;
        updateRoomStatus(`Shot ${shotNumber} of 4 in ${CAPTURE_COUNTDOWN_SECONDS}...`, "alert");
        await waitForCountdown(countdowns, startAt, CAPTURE_COUNTDOWN_SECONDS);
        await pulseFlash(flash);
        shots.push(
        captureSnapshotCanvas({
            selfVideo,
            partnerVideo: hasPartner ? partnerVideo : null,
            mirrorSelf: selfVideo?.classList.contains("mirror") ?? true,
            mode: captureMode,
          })
        );
        if (index < 3) {
          startAt = Date.now() + CAPTURE_COUNTDOWN_SECONDS * 1000;
          updateRoomStatus(`Preparing shot ${shotNumber + 1} of 4...`, "alert");
          await delay(250);
        }
      }

      const capture = await saveGalleryItemFromShots(shots, {
        theme: selectedTheme,
        layout: selectedLayout,
        mode: captureMode,
        title: "Boothly",
        showTimestamp: true,
      }, {
        roomCode: roomId,
        roomMode: captureRoomMode,
      });
      setPhotoboothState({ capture: capture.id });
      setGalleryPendingId(capture.id);
      updateRoomStatus("Photo saved. Choosing your strip now.", "good");
      if (appState.conn?.open) {
        appState.conn.send({
          type: "capture-shared",
          capture: createSharedCapturePayload(capture),
        });
      }
      showCaptureResult(capture);
    } finally {
      appState.captureBusy = false;
      setModeButtonsLocked(false);
    }
  }

  function wireConnection(conn) {
    appState.conn = conn;

    conn.on("open", () => {
      conn.send({ type: "hello", roomId, role: isGuest ? "guest" : "host" });
      updateRoomStatus("Invite connected.", "good");
      updatePartnerStatus(
        getActiveMode() === "ldr"
          ? "The invite landed. Your person can see the room now."
          : "The invite landed. The other side can see the room now."
      );
    });

    conn.on("data", (data) => {
      try {
        console.debug("conn.on.data received", data);
      } catch (e) {}
      if (!data || typeof data !== "object") return;

      if (data.type === "capture-sequence") {
        runCaptureSequence(data.startAt || Date.now() + CAPTURE_COUNTDOWN_SECONDS * 1000);
      }

      if (data.type === "capture-shared" && data.capture) {
        // Attempt to save the capture sent by the other side.
        addGalleryCapture(data.capture);
        persistCaptureRecord(data.capture, {
          roomCode: roomId,
          roomMode: getActiveMode(),
        }).catch(() => {});

        // If the capture has either the individual shots or a prebuilt strip,
        // redirect immediately. Otherwise ask the sender to resend the full payload.
        const hasShots = Array.isArray(data.capture.shots) && data.capture.shots.length > 0;
        const hasStrip = typeof data.capture.strip === "string" && data.capture.strip.length > 0;
        if (hasShots || hasStrip) {
          try {
            showCaptureResult(data.capture);
          } catch (e) {}
        } else {
          // Ask the sender to re-send the capture payload.
          try {
            conn.send({ type: "request-capture", id: data.capture.id });
          } catch (e) {}
        }
      }

      if (data.type === "request-capture" && data.id) {
        // The peer is asking us to resend a capture they requested.
        try {
          const saved = getSavedCaptures();
          const found = saved.find((c) => c.id === data.id) || null;
          if (found && conn.open) {
            conn.send({ type: "capture-response", capture: found });
          }
        } catch (e) {}
      }

      if (data.type === "capture-response" && data.capture) {
        addGalleryCapture(data.capture);
        persistCaptureRecord(data.capture, {
          roomCode: roomId,
          roomMode: getActiveMode(),
        }).catch(() => {});
        showCaptureResult(data.capture);
        return;
      }

      if (data.type === "hello") {
        updateRoomStatus("Room paired successfully.", "good");
      }
    });

    conn.on("close", () => {
      updateRoomStatus("The other side disconnected. You can send a new invite.", "alert");
      updatePartnerStatus("Waiting for the other side to rejoin.");
    });
  }

  function maybeStartPeerSession() {
    if (typeof Peer === "undefined") {
      updateRoomStatus("Peer connection library is unavailable.", "alert");
      updatePartnerStatus("Camera is local only for now.");
      return;
    }

    if (appState.peer) return;

    appState.peer = new Peer();
    appState.peer.on("open", (peerId) => {
      appState.peerId = peerId;
      if (roomOnly) {
        setInviteLink("");
        updateRoomStatus("Room ready. Waiting for your partner.", "good");
        const claimAction = isGuest ? "claim-guest" : "claim-host";
        apiRequest(claimAction, { room_code: roomId, peer_id: peerId }, "POST").catch(() => {});
        if (isGuest) {
          updatePartnerStatus("Looking for your partner...");
          startGuestRoomPolling();
        } else {
          startHostRoomPolling();
        }
      } else if (!isGuest) {
        const inviteUrl = makeInviteUrl(roomId, peerId);
        setInviteLink(inviteUrl);
        updateRoomStatus(
          getActiveMode() === "ldr"
            ? "LDR room ready. Share the invite link with your person."
            : "Together room ready. Share the invite link with the other person."
        );
      } else {
        updateRoomStatus(
          getActiveMode() === "ldr" ? "Joining the LDR room..." : "Joining the room...",
          "good"
        );
      }

      if (appState.stream && (roomOnly || (isGuest && getActiveMode() === "ldr"))) {
        connectToHost();
      }
    });

    appState.peer.on("call", (call) => {
      appState.call = call;
      call.answer(appState.stream || undefined);
      call.on("stream", (remoteStream) => {
        attachRemoteStream(remoteStream);
      });
    });

    appState.peer.on("connection", (conn) => {
      wireConnection(conn);
    });

    appState.peer.on("error", (error) => {
      updateRoomStatus(`Connection error: ${error.type || "unknown"}.`, "alert");
    });
  }

  function connectToHost() {
    const targetHostId = hostId || appState.hostId;
    if (!appState.peer || !appState.stream || !targetHostId) return;
    if (appState.call || appState.conn) return;

    const call = appState.peer.call(targetHostId, appState.stream);
    appState.call = call;
    call.on("stream", (remoteStream) => {
      attachRemoteStream(remoteStream);
    });

    call.on("close", () => {
      updateRoomStatus("Call ended.", "alert");
    });

    const conn = appState.peer.connect(targetHostId);
    wireConnection(conn);
  }

  let hostPollTimer = null;
  let guestPollTimer = null;

  async function fetchRoomState() {
    try {
      const data = await apiRequest("room", { room_code: roomId }, "GET");
      return data.room || null;
    } catch {
      return null;
    }
  }

  async function updateRemoteConnectionFromRoom(room) {
    const remoteId = room?.host_peer_id || "";
    if (remoteId) {
      appState.hostId = remoteId;
      if (!appState.call && !appState.conn && appState.peer && appState.stream) {
        connectToHost();
      }
    }
  }

  function startHostRoomPolling() {
    if (hostPollTimer) return;
    hostPollTimer = window.setInterval(async () => {
      const room = await fetchRoomState();
      if (room?.guest_peer_id) {
        updatePartnerStatus("Your partner joined.");
      }
      if (room?.guest_peer_id) {
        const pane = partnerPane;
        if (pane && pane.classList.contains("hidden")) {
          pane.classList.remove("hidden");
          if (boothStage) boothStage.dataset.remoteReady = "true";
        }
      }
      if (room?.guest_peer_id && appState.remoteStream) {
        window.clearInterval(hostPollTimer);
        hostPollTimer = null;
      }
    }, 1500);
  }

  function startGuestRoomPolling() {
    if (guestPollTimer) return;
    guestPollTimer = window.setInterval(async () => {
      const room = await fetchRoomState();
      if (!room) return;
      await updateRemoteConnectionFromRoom(room);
      if (room.host_peer_id && appState.remoteStream) {
        window.clearInterval(guestPollTimer);
        guestPollTimer = null;
      }
    }, 1200);
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyMode(button.dataset.roomMode || "together");
    });
  });

  const initialMode = getParam("mode") === "ldr" || getParam("mode") === "create" ? "ldr" : getParam("mode") === "together" ? "together" : modeButtons[0]?.dataset.roomMode || "together";
  applyMode(initialMode);

  inviteButton?.addEventListener("click", async () => {
    const value = inviteInput?.value || appState.inviteLink;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      inviteButton.textContent = "Copied";
      setTimeout(() => (inviteButton.textContent = "Copy invite link"), 1200);
    } catch {
      inviteButton.textContent = "Copy failed";
    }
  });

  captureButton?.addEventListener("click", async () => {
    if (captureButton.disabled) return;
    captureButton.disabled = true;
    try {
      if (appState.conn?.open) {
        const startAt = Date.now() + CAPTURE_COUNTDOWN_SECONDS * 1000;
        appState.conn.send({ type: "capture-sequence", startAt });
        await runCaptureSequence(startAt);
        return;
      }

      await runCaptureSequence(Date.now() + CAPTURE_COUNTDOWN_SECONDS * 1000);
    } finally {
      captureButton.disabled = false;
    }
  });

  copyLinkButton?.addEventListener("click", async () => {
    if (!captureLink?.value) return;
    try {
      await navigator.clipboard.writeText(captureLink.value);
      copyLinkButton.textContent = "Copied";
      setTimeout(() => {
        copyLinkButton.textContent = "Copy link";
      }, 1200);
    } catch {
      captureLink.select?.();
    }
  });

  retakeButton?.addEventListener("click", () => {
    showCameraScreen();
  });

  const shareRow = $("[data-share-row]");
  shareRow?.addEventListener("click", () => {
    if (inviteInput?.value) {
      inviteInput.select();
    }
  });

  renderGallery(gallery);

  if (roomOnly) {
    applyMode("room");
  }

  if (isGuest) {
    updateRoomStatus("Joining the room...", "good");
  } else {
    updateRoomStatus("Room ready. Waiting for your partner.", "good");
    updatePartnerStatus("Waiting for the other side to join.");
  }

  if (appState.stream && isGuest) connectToHost();
}

async function setupGalleryPage() {
  const preview = $("[data-gallery-preview]");
  const emptyState = $("[data-gallery-empty]");
  const titleInput = $("[data-gallery-title]");
  const effectButtons = $$("[data-gallery-filter]");
  const effectHint = $("[data-gallery-filter-hint]");
  const timestampToggle = $("[data-gallery-timestamp]");
  const downloadButton = $("[data-gallery-download]");
  const selectedLabel = $("[data-gallery-selected]");
  const backToBooth = $("[data-go-booth]");

  const captureToken = getParam("capture") || getGalleryPendingId() || "";
  let selectedCapture = null;
  let activeStrip = "";
  let renderToken = 0;

  function getFormState() {
    return {
      title: titleInput?.value?.trim() || "Boothly",
      filterName: getSelectedEffect(),
      showTimestamp: Boolean(timestampToggle?.checked),
    };
  }

  function getSelectedEffect() {
    return effectButtons.find((button) => button.classList.contains("active"))?.dataset.galleryFilter || "none";
  }

  function setSelectedEffect(effectName) {
    const targetButton =
      effectButtons.find((button) => button.dataset.galleryFilter === effectName) || effectButtons[0];
    if (!targetButton) return;
    effectButtons.forEach((button) => button.classList.remove("active"));
    targetButton.classList.add("active");
    if (effectHint) {
      effectHint.textContent =
        {
          none: "No effects keeps the strip clean and natural.",
          rosy: "Rosy adds warmth and a soft blush for a playful look.",
          sepia: "Sepia gives the strip a nostalgic, warm-toned finish.",
          bnw: "B&W strips away color for a clean, classic look.",
          soft: "Soft Light lowers contrast for a gentle, dreamy feel.",
        }[effectName] || "Choose an effect for your saved strip.";
    }
  }

  async function updatePreview() {
    if (!preview || !selectedCapture) return;
    const token = ++renderToken;
    const strip = await buildStripDataUrlFromCapture(selectedCapture, getFormState());
    if (token !== renderToken) return;
    activeStrip = strip;
    preview.src = strip;
    preview.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (selectedLabel) {
      selectedLabel.textContent = selectedCapture.created_at
        ? new Date(selectedCapture.created_at).toLocaleString()
        : new Date(selectedCapture.createdAt || Date.now()).toLocaleString();
    }
    if (downloadButton) downloadButton.disabled = false;
  }

  async function loadCapture() {
    if (captureToken) {
      try {
        const data = await apiRequest("capture", { capture_token: captureToken }, "GET");
        const remote = normalizeDbCapture(data.capture);
        if (remote) return remote;
      } catch {}
    }

    const localCaptures = getSavedCaptures().map(normalizeDbCapture).filter(Boolean);
    return localCaptures.find((capture) => capture.capture_token === captureToken || String(capture.id) === captureToken) || localCaptures[0] || null;
  }

  selectedCapture = await loadCapture();

  if (!selectedCapture) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (preview) {
      preview.removeAttribute("src");
      preview.classList.add("hidden");
    }
    if (selectedLabel) selectedLabel.textContent = "No capture selected";
    if (downloadButton) downloadButton.disabled = true;
    return;
  }

  setGalleryPendingId(selectedCapture.capture_token || String(selectedCapture.id));
  setPhotoboothState({
    room: selectedCapture.room_code || getParam("room") || getPhotoboothState().room || "",
    capture: selectedCapture.capture_token || String(selectedCapture.id),
    layout: getParam("layout") || getPhotoboothState().layout || "1x4",
    role: getParam("role") || getPhotoboothState().role || "host",
  });

  setSelectedEffect(selectedCapture?.options?.filterName || "none");

  if (emptyState) emptyState.classList.add("hidden");
  if (selectedLabel) {
    selectedLabel.textContent = selectedCapture.created_at
      ? new Date(selectedCapture.created_at).toLocaleString()
      : new Date(selectedCapture.createdAt || Date.now()).toLocaleString();
  }
  if (titleInput) titleInput.value = selectedCapture.options?.title || selectedCapture.title || "Boothly";
  await updatePreview();

  titleInput?.addEventListener("input", () => updatePreview());
  timestampToggle?.addEventListener("change", () => updatePreview());

  effectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedEffect(button.dataset.galleryFilter || "none");
      updatePreview();
    });
  });

  wireHintPreview(
    effectButtons,
    effectHint,
    {
      none: "No effects keeps the strip clean and natural.",
      rosy: "Rosy adds warmth and a soft blush for a playful look.",
      sepia: "Sepia gives the strip a nostalgic, warm-toned finish.",
      bnw: "B&W strips away color for a clean, classic look.",
      soft: "Soft Light lowers contrast for a gentle, dreamy feel.",
    },
    (button) => button.dataset.galleryFilter || "none"
  );

  downloadButton?.addEventListener("click", async () => {
    if (!selectedCapture) return;
    const current = activeStrip || (await buildStripDataUrlFromCapture(selectedCapture, getFormState()));
    downloadDataUrl(current, `boothly-${selectedCapture.capture_token || selectedCapture.id}.png`);
  });

  backToBooth?.addEventListener("click", () => {
    window.location.href = makePhotoboothLandingUrl();
  });
}

async function boot() {
  await includePartials();
  markCurrentPage();
  setupHeroButtons();
  wireCopyButtons();

  const page = getPageName();
  if (page === "photobooth-home") setupPhotoboothLanding();
  if (page === "photobooth-create") setupPhotoboothCreate();
  if (page === "photobooth-join") setupPhotoboothJoin();
  if (page === "photobooth-layout") setupPhotoboothLayout();
  if (page === "photobooth-frame") setupPhotoboothFrame();
  if (page === "photobooth-select") setupPhotoboothSelect();
  if (page === "photobooth-filter") setupPhotoboothFilter();
  if (page === "photobooth-download") setupPhotoboothDownload();
  if (page === "booth") setupBooth();
  if (page === "gallery") await setupGalleryPage();
  if (page === "home") setupHome();
}

document.addEventListener("DOMContentLoaded", boot);
