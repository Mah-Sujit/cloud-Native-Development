// ================= USERS STORE (frontend demo) =================
const USERS_KEY = "mm_users";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser(id, name, password) {
  const users = loadUsers();
  if (users.some((u) => String(u.id) === String(id))) {
    return { ok: false, msg: "User already exists. Choose another ID." };
  }
  users.push({ id: String(id), name: String(name), password: String(password) });
  saveUsers(users);
  return { ok: true };
}

function loginUser(id, password) {
  const users = loadUsers();
  const user = users.find((u) => String(u.id) === String(id));
  if (!user) return { ok: false, msg: "User not registered. Please register first." };
  if (String(user.password) !== String(password))
    return { ok: false, msg: "Wrong password." };
  return { ok: true, user };
}

// =======================================================
// AZURE LOGIC APP ENDPOINTS
// =======================================================
const UIA =
  "https://prod-02.norwayeast.logic.azure.com:443/workflows/08f68c73d43b4d3c954f126c53963e4d/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=1y8trRu4pq9BCjbc5hVv73K9MXjXPZKctOfnQwjooK4";

const RAI =
  "https://prod-09.norwayeast.logic.azure.com:443/workflows/d91235d116d14d14bb5eb0ba0290e87d/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=hxr7e2g2gwBfdTi2rHIHMCbt8kldNHi0gA1qInOIV2k";

const UAI =
  "https://prod-00.norwayeast.logic.azure.com:443/workflows/4d3e8ec2f17741bbbf422784fcc2a002/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=40IWaEOomVbbSS4gwVoKPnqqVLnQa7jlx8JaoYdlf7M";

const DIA =
  "https://prod-29.norwayeast.logic.azure.com:443/workflows/024daee5f327410d9065fcdcae50c4f0/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=MKuL7oNdLdu2IWbYFID-HJ770dv7O8ZyUmUG1lHjAx0";

const BLOB_ACCOUNT = "https://sujitstorage.blob.core.windows.net";

// =======================================================
// SESSION
// =======================================================
function getSession() {
  return {
    id: localStorage.getItem("mm_userId"),
    name: localStorage.getItem("mm_userName"),
  };
}

function clearSession() {
  localStorage.removeItem("mm_userId");
  localStorage.removeItem("mm_userName");
}

function logout() {
  clearSession();
  window.location.href = "./dashboard.html";
}

// =======================================================
// STATE (for search/filter)
// =======================================================
let cachedCards = [];

// =======================================================
// INIT
// =======================================================
$(document).ready(function () {
  const page = window.location.pathname.toLowerCase();
  console.log("✅ app.js loaded:", page);

  // Logout works everywhere
  if ($("#logoutBtn").length) $("#logoutBtn").off("click").on("click", logout);

  // ---------------- REGISTER PAGE ----------------
  if (page.includes("register.html")) {
    $("#registerBtn").off("click").on("click", function () {
      const id = $("#regUserId").val().trim();
      const name = $("#regUserName").val().trim();
      const password = $("#regPassword").val().trim();

      if (!id || !name || !password) {
        $("#registerStatus").removeClass("text-success").addClass("text-warning")
          .text("Please fill all fields.");
        return;
      }
      if (password.length < 4) {
        $("#registerStatus").removeClass("text-success").addClass("text-warning")
          .text("Password must be at least 4 characters.");
        return;
      }

      const res = registerUser(id, name, password);
      if (!res.ok) {
        $("#registerStatus").removeClass("text-success").addClass("text-warning")
          .text(res.msg);
        return;
      }

      $("#registerStatus").removeClass("text-warning").addClass("text-success")
        .text("Registered successfully ✅ Redirecting to login...");

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 700);
    });

    $("#resetUsersBtn").off("click").on("click", function () {
      if (!confirm("Delete all registered users from this browser?")) return;
      localStorage.removeItem(USERS_KEY);
      $("#registerStatus").removeClass("text-success").addClass("text-warning")
        .text("All users cleared.");
    });
  }

  // ---------------- DASHBOARD ----------------
  if (page.includes("dashboard.html")) {
    const s = getSession();

    // Auto-login view
    if (s.id && s.name) {
      $("#loginSection").hide();
      $("#appSection").show();
      $("#loggedInUser").text(`${s.name} (ID: ${s.id})`);
      $("#userID").val(s.id).prop("readonly", true);
      $("#userName").val(s.name).prop("readonly", true);
    } else {
      $("#loginSection").show();
      $("#appSection").hide();
    }

    // ✅ LOGIN requires registered user + password
    $("#loginBtn").off("click").on("click", function () {
      const userId = $("#loginUserId").val().trim();
      const password = ($("#loginPassword").val() || "").trim();

      if (!userId || !password) {
        $("#loginStatus").text("Enter User ID and Password.");
        return;
      }

      const res = loginUser(userId, password);
      if (!res.ok) {
        $("#loginStatus").text(res.msg);
        return;
      }

      localStorage.setItem("mm_userId", res.user.id);
      localStorage.setItem("mm_userName", res.user.name);

      $("#loginSection").hide();
      $("#appSection").show();
      $("#loggedInUser").text(`${res.user.name} (ID: ${res.user.id})`);
      $("#userID").val(res.user.id).prop("readonly", true);
      $("#userName").val(res.user.name).prop("readonly", true);
      $("#loginStatus").text("");
    });

    // Upload
    $("#subNewForm").off("click").on("click", submitNewAssetWithProgress);
  }

  // ---------------- GALLERY ----------------
  if (page.includes("gallery.html")) {
    const s = getSession();
    if (!s.id || !s.name) {
      window.location.href = "./dashboard.html";
      return;
    }

    $("#loggedInUser").text(`${s.name} (ID: ${s.id})`);

    $("#retImages").off("click").on("click", getImages);
    $("#searchBox").off("input").on("input", applySearchAndFilter);
    $("#typeFilter").off("change").on("change", applySearchAndFilter);

    // Owner-only edit/delete handlers
    $(document).off("click", ".btn-edit").on("click", ".btn-edit", function () {
      updateAsset($(this).data("id"), $(this).data("name") || "");
    });

    $(document).off("click", ".btn-delete").on("click", ".btn-delete", function () {
      deleteAsset($(this).data("id"));
    });

    getImages();
  }
});

// =======================================================
// UPLOAD WITH PROGRESS
// =======================================================
function submitNewAssetWithProgress() {
  const file = $("#UpFile")[0].files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }

  const data = new FormData();
  data.append("FileName", $("#FileName").val());
  data.append("userID", $("#userID").val());
  data.append("userName", $("#userName").val());
  data.append("file", file);

  $("#uploadProgress").css("width", "0%");
  $("#status").text("Uploading... 0%");

  $.ajax({
    url: UIA,
    type: "POST",
    data: data,
    contentType: false,
    processData: false,
    xhr: function () {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = function (e) {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        $("#uploadProgress").css("width", pct + "%");
        $("#status").text(`Uploading... ${pct}%`);
      };
      return xhr;
    },
    success: function (res) {
      console.log("✅ Upload response:", res);
      $("#uploadProgress").css("width", "100%");
      $("#status").text("Upload successful ✅");
      $("#newAssetForm")[0].reset();

      const s = getSession();
      $("#userID").val(s.id).prop("readonly", true);
      $("#userName").val(s.name).prop("readonly", true);
    },
    error: function (xhr) {
      console.error("❌ Upload error:", xhr.status, xhr.responseText);
      $("#status").text("Upload failed ❌ (check console)");
    },
  });
}

// =======================================================
// GET & RENDER MEDIA
// =======================================================
function getImages() {
  $("#ImageList").html('<div class="helper">Loading...</div>');

  $.ajax({
    url: RAI,
    type: "POST",
    dataType: "json",
    success: function (data) {
      if (!Array.isArray(data) && data && Array.isArray(data.body)) data = data.body;

      if (!Array.isArray(data) || data.length === 0) {
        cachedCards = [];
        $("#resultCount").text("0 result(s)");
        $("#ImageList").html('<div class="helper">No media found.</div>');
        return;
      }

      cachedCards = data.map((v) => {
        const id = unwrap(v.id || v.Id || "");
        const fileName = unwrap(v.fileName || v.FileName || "(unnamed)");
        const filePath = unwrap(v.filePath || v.FilePath || "");
        const userName = unwrap(v.userName || v.UserName || "");
        const userID = unwrap(v.userID || v.UserID || "");
        const contentType = (v.contentType || v.ContentType || "").toLowerCase();

        const url = buildBlobUrl(filePath);
        const isVideo = isLikelyVideo({ contentType, url, fileName });

        return { id, fileName, url, userName, userID, type: isVideo ? "video" : "image" };
      });

      applySearchAndFilter();
    },
    error: function (xhr) {
      console.error("❌ RAI error:", xhr.status, xhr.responseText);
      $("#ImageList").html("<div class='helper' style='color:#fecaca;'>Error loading media.</div>");
    },
  });
}

function applySearchAndFilter() {
  const q = ($("#searchBox").val() || "").trim().toLowerCase();
  const type = ($("#typeFilter").val() || "all").toLowerCase();

  const filtered = cachedCards.filter((c) => {
    const matchesText =
      !q ||
      (c.fileName || "").toLowerCase().includes(q) ||
      (c.userName || "").toLowerCase().includes(q);

    const matchesType = type === "all" ? true : c.type === type;
    return matchesText && matchesType;
  });

  $("#resultCount").text(`${filtered.length} result(s)`);
  renderCards(filtered);
}

function renderCards(cards) {
  const s = getSession();
  const sessionUserId = s.id || "";

  if (!cards.length) {
    $("#ImageList").html('<div class="helper">No matches.</div>');
    return;
  }

  const html = cards
    .map((c) => {
      const isOwner = String(sessionUserId) === String(c.userID);

      return `
        <div class="media-card">
          <div class="media-thumb">
            ${
              c.type === "video"
                ? `<a class="video-link" href="${c.url}" target="_blank" rel="noopener">Open Video</a>`
                : `<img src="${c.url}" alt="${escapeHtml(c.fileName)}"
                       onerror="imageFallbackToLink(this, '${c.url.replace(/'/g, "\\'")}', '${escapeHtml(c.fileName).replace(/'/g, "\\'")}')" />`
            }
          </div>
          <div class="media-body">
            <span class="media-title">${escapeHtml(c.fileName)}</span>
            <div class="helper">Uploaded by: ${escapeHtml(c.userName)} (id: ${escapeHtml(c.userID)})</div>

            ${
              isOwner
                ? `
                  <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn btn-sm btn-outline-primary btn-edit"
                            data-id="${escapeHtml(c.id)}"
                            data-name="${escapeHtml(c.fileName)}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete"
                            data-id="${escapeHtml(c.id)}">Delete</button>
                  </div>
                `
                : `<div class="helper" style="margin-top:10px; opacity:.7;">View only</div>`
            }
          </div>
        </div>
      `;
    })
    .join("");

  $("#ImageList").html(html);
}

// =======================================================
// UPDATE / DELETE
// =======================================================
function updateAsset(id, currentName) {
  if (!id) return alert("Missing id.");
  const newName = prompt("Enter new file name:", currentName || "");
  if (!newName) return;

  $.ajax({
    url: UAI,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ id, fileName: newName }),
    success: function () {
      alert("Updated ✅");
      getImages();
    },
    error: function (xhr) {
      console.error("❌ Update error:", xhr.status, xhr.responseText);
      alert("Update failed (check console).");
    },
  });
}

function deleteAsset(id) {
  if (!id) return alert("Missing id.");
  if (!confirm("Delete this item?")) return;

  $.ajax({
    url: DIA,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ id }),
    success: function () {
      alert("Deleted ✅");
      getImages();
    },
    error: function (xhr) {
      console.error("❌ Delete error:", xhr.status, xhr.responseText);
      alert("Delete failed (check console).");
    },
  });
}

// =======================================================
// HELPERS
// =======================================================
function unwrap(v) {
  if (v && typeof v === "object" && "$content" in v) {
    try {
      return atob(v.$content);
    } catch {
      return v.$content || "";
    }
  }
  return v || "";
}

function buildBlobUrl(path) {
  if (!path) return "";
  const p = String(path).trim();
  if (/^https?:\/\//i.test(p)) return p;

  const left = (BLOB_ACCOUNT || "").replace(/\/+$/g, "");
  const right = p.replace(/^\/+/, "");
  return `${left}/${right}`;
}

function isLikelyVideo({ contentType, url, fileName }) {
  if ((contentType || "").startsWith("video/")) return true;
  const s = `${url} ${fileName}`.toLowerCase();
  return /\.(mp4|mov|webm|avi|mkv)(\?|#|$)/.test(s);
}

function imageFallbackToLink(imgEl, url, label) {
  const card = imgEl.closest(".media-card");
  if (!card) return;
  const thumb = card.querySelector(".media-thumb");
  if (thumb) {
    thumb.innerHTML = `<a class="video-link" href="${url}" target="_blank" rel="noopener">${label || "Open file"}</a>`;
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
