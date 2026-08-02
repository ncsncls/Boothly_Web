const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function json(res, status, payload) {
  res.status(status).json(payload);
}

function roomCode() {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function captureToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function isRoomCode(value) {
  return /^[A-Z0-9]{5}$/.test(value);
}

async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.hint || "Database request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getRoom(code) {
  const rows = await supabase(`photobooth_rooms?room_code=eq.${encodeURIComponent(code)}&select=*`);
  return rows[0] || null;
}

async function createRoom(mode) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = roomCode();
    try {
      const rows = await supabase("photobooth_rooms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ room_code: code, room_mode: mode === "together" ? "together" : "ldr" }),
      });
      return rows[0];
    } catch (error) {
      if (error.status !== 409) throw error;
    }
  }
  throw new Error("Unable to generate a unique room code.");
}

async function ensureRoom(code, mode) {
  return (await getRoom(code)) || createRoom(mode);
}

async function recordParticipant(roomId, role, peerId) {
  await supabase("photobooth_room_participants", {
    method: "POST",
    body: JSON.stringify({ room_id: roomId, role, peer_id: peerId }),
  });
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const action = req.query?.action || req.body?.action || "";
    const input = req.body || {};

    if (req.method === "GET" && action === "health") {
      await supabase("photobooth_rooms?select=id&limit=1");
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && action === "create") {
      const room = await createRoom(input.room_mode);
      json(res, 200, { ok: true, room: { room_code: room.room_code, room_mode: room.room_mode } });
      return;
    }

    if (req.method === "POST" && (action === "claim-host" || action === "claim-guest")) {
      const code = String(input.room_code || "").trim().toUpperCase();
      const peerId = String(input.peer_id || "").trim();
      if (!isRoomCode(code) || !peerId) {
        json(res, 422, { ok: false, message: "Room code and peer id are required." });
        return;
      }
      const role = action === "claim-guest" ? "guest" : "host";
      const patch = role === "guest"
        ? { guest_peer_id: peerId, guest_joined_at: new Date().toISOString() }
        : { host_peer_id: peerId, host_joined_at: new Date().toISOString() };
      const rows = await supabase(`photobooth_rooms?room_code=eq.${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      const room = rows[0];
      if (!room) {
        json(res, 404, { ok: false, message: "Room not found." });
        return;
      }
      await recordParticipant(room.id, role, peerId);
      json(res, 200, { ok: true, room });
      return;
    }

    if (req.method === "POST" && action === "join") {
      const code = String(input.room_code || "").trim().toUpperCase();
      if (!isRoomCode(code)) {
        json(res, 422, { ok: false, message: "Enter a valid 5-character code." });
        return;
      }
      const room = await getRoom(code);
      json(res, room ? 200 : 404, room ? { ok: true, room } : { ok: false, message: "Room not found." });
      return;
    }

    if (req.method === "GET" && action === "room") {
      const code = String(req.query?.room_code || "").trim().toUpperCase();
      if (!isRoomCode(code)) {
        json(res, 422, { ok: false, message: "Enter a valid 5-character code." });
        return;
      }
      const room = await getRoom(code);
      json(res, room ? 200 : 404, room ? { ok: true, room } : { ok: false, message: "Room not found." });
      return;
    }

    if (req.method === "POST" && action === "capture") {
      const code = String(input.room_code || "").trim().toUpperCase();
      const stripUrl = String(input.strip_url || "").trim();
      if (!isRoomCode(code) || !stripUrl) {
        json(res, 422, { ok: false, message: "Room code and capture image are required." });
        return;
      }
      const room = await ensureRoom(code, input.room_mode);
      const token = String(input.capture_token || "").trim() || captureToken();
      const payload = {
        room_id: room.id,
        capture_token: token,
        capture_type: input.capture_type === "strip" ? "strip" : "single",
        title: String(input.title || "Boothly").trim() || "Boothly",
        theme: String(input.theme || "cream").trim() || "cream",
        strip_url: stripUrl,
        shots_json: input.shots || null,
        options_json: input.options || null,
      };
      const existing = await supabase(`photobooth_captures?capture_token=eq.${encodeURIComponent(token)}&select=id`);
      const rows = existing[0]
        ? await supabase(`photobooth_captures?capture_token=eq.${encodeURIComponent(token)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) })
        : await supabase("photobooth_captures", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
      const capture = rows[0];
      json(res, 201, { ok: true, capture: { ...capture, room_code: code } });
      return;
    }

    if (req.method === "GET" && action === "capture") {
      const token = String(req.query?.capture_token || "").trim();
      if (!token) {
        json(res, 422, { ok: false, message: "Capture token is required." });
        return;
      }
      const rows = await supabase(`photobooth_captures?capture_token=eq.${encodeURIComponent(token)}&select=*,photobooth_rooms(room_code)`);
      const capture = rows[0];
      if (!capture) {
        json(res, 404, { ok: false, message: "Capture not found." });
        return;
      }
      capture.room_code = capture.photobooth_rooms?.room_code;
      delete capture.photobooth_rooms;
      json(res, 200, { ok: true, capture });
      return;
    }

    json(res, 400, { ok: false, message: "Unsupported request." });
  } catch (error) {
    json(res, 500, { ok: false, message: "Database request failed.", error: error.message });
  }
};
