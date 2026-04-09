const express = require("express");
const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8787);
const WORKSPACE_DIR = path.resolve(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), ".openclaw", "workspace"));
const BACKUP_DIR = path.resolve(process.env.OPENCLAW_BACKUP_DIR || path.join(WORKSPACE_DIR, ".builder-backups"));
const RESTART_CMD = process.env.OPENCLAW_GATEWAY_RESTART_CMD || "systemctl restart openclaw-gateway";
const CORE_FILES = new Set(["SOUL.md", "AGENTS.md", "TOOLS.md", "MEMORY.md", "IDENTITY.md"]);

function ensureInDir(base, target) {
  const rel = path.relative(base, target);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function safeName(name) {
  const base = path.basename(String(name || "").trim());
  if (!/^[A-Za-z0-9._-]+\.md$/i.test(base)) return null;
  return base.toUpperCase();
}

async function ensureDirs() {
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function listWorkspaceMdFiles() {
  const entries = await fs.readdir(WORKSPACE_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.md$/i.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readWorkspaceFile(file) {
  const full = path.join(WORKSPACE_DIR, file);
  if (!ensureInDir(WORKSPACE_DIR, full)) throw new Error("invalid path");
  return fs.readFile(full, "utf-8");
}

async function writeWorkspaceFile(file, content) {
  const full = path.join(WORKSPACE_DIR, file);
  if (!ensureInDir(WORKSPACE_DIR, full)) throw new Error("invalid path");
  const tmp = `${full}.tmp-${Date.now()}`;
  await fs.writeFile(tmp, String(content || ""), "utf-8");
  await fs.rename(tmp, full);
}

async function copyFileIfExists(src, dst) {
  try {
    await fs.copyFile(src, dst);
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

function nowId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function createBackup(reason = "manual", name = "") {
  const id = nowId();
  const dir = path.join(BACKUP_DIR, id);
  await fs.mkdir(dir, { recursive: true });

  const files = await listWorkspaceMdFiles();
  const copied = [];
  for (const file of files) {
    const src = path.join(WORKSPACE_DIR, file);
    const dst = path.join(dir, file);
    await copyFileIfExists(src, dst);
    copied.push(file);
  }

  const meta = {
    id,
    createdAt: new Date().toISOString(),
    name: String(name || "").trim() || id,
    reason,
    fileCount: copied.length,
    files: copied,
  };
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");
  return meta;
}

async function listBackups() {
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
  const out = [];
  for (const id of dirs) {
    const metaPath = path.join(BACKUP_DIR, id, "meta.json");
    let meta = { id, name: id, createdAt: null, fileCount: 0, files: [] };
    if (fssync.existsSync(metaPath)) {
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        meta = { ...meta, ...JSON.parse(raw) };
      } catch {}
    } else {
      const files = (await fs.readdir(path.join(BACKUP_DIR, id))).filter((f) => /\.md$/i.test(f));
      meta.fileCount = files.length;
      meta.files = files;
    }
    out.push(meta);
  }
  return out;
}

async function restoreBackup(id) {
  const dir = path.join(BACKUP_DIR, id);
  if (!ensureInDir(BACKUP_DIR, dir) || !fssync.existsSync(dir)) throw new Error("backup not found");

  const files = (await fs.readdir(dir)).filter((f) => /\.md$/i.test(f));
  for (const file of files) {
    const src = path.join(dir, file);
    const dst = path.join(WORKSPACE_DIR, file);
    await fs.copyFile(src, dst);
  }
  return { restoredBackupId: id, fileCount: files.length };
}
async function deleteBackup(id) {
  const dir = path.join(BACKUP_DIR, id);
  if (!ensureInDir(BACKUP_DIR, dir) || !fssync.existsSync(dir)) throw new Error("backup not found");
  await fs.rm(dir, { recursive: true, force: false });
  return { deletedBackupId: id };
}

app.get("/api/health", async (_req, res) => {
  await ensureDirs();
  res.json({ ok: true, workspaceDir: WORKSPACE_DIR, backupDir: BACKUP_DIR });
});

app.get("/api/workspace/files", async (_req, res) => {
  try {
    await ensureDirs();
    const files = await listWorkspaceMdFiles();
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.get("/api/workspace/snapshot", async (_req, res) => {
  try {
    await ensureDirs();
    const files = await listWorkspaceMdFiles();
    const data = {};
    for (const file of files) {
      data[file] = await readWorkspaceFile(file);
    }
    res.json({ workspaceDir: WORKSPACE_DIR, files: data });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.get("/api/workspace/file/:name", async (req, res) => {
  try {
    await ensureDirs();
    const n0 = safeName(req.params.name);
    if (!n0) return res.status(400).json({ message: "invalid file name" });
    const files = await listWorkspaceMdFiles();
    const file = files.find((f) => f.toUpperCase() === n0);
    if (!file) return res.status(404).json({ message: "file not found" });
    const content = await readWorkspaceFile(file);
    res.json({ file, content });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.put("/api/workspace/file/:name", async (req, res) => {
  try {
    await ensureDirs();
    const n0 = safeName(req.params.name);
    if (!n0) return res.status(400).json({ message: "invalid file name" });
    const files = await listWorkspaceMdFiles();
    const existing = files.find((f) => f.toUpperCase() === n0);
    const file = existing || n0;
    await writeWorkspaceFile(file, req.body && req.body.content);
    res.json({ ok: true, file });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.post("/api/workspace/backup", async (req, res) => {
  try {
    await ensureDirs();
    const reason = (req.body && req.body.reason) || "manual";
    const name = (req.body && req.body.name) || "";
    const backup = await createBackup(reason, name);
    res.json({ ok: true, backupId: backup.id, ...backup });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.get("/api/workspace/backups", async (_req, res) => {
  try {
    await ensureDirs();
    const backups = await listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.post("/api/workspace/backups/:id/restore", async (req, res) => {
  try {
    await ensureDirs();
    const id = path.basename(String(req.params.id || ""));
    if (!/^[0-9]{8}-[0-9]{6}$/.test(id)) return res.status(400).json({ message: "invalid backup id" });
    const result = await restoreBackup(id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.delete("/api/workspace/backups/:id", async (req, res) => {
  try {
    await ensureDirs();
    const id = path.basename(String(req.params.id || ""));
    if (!/^[0-9]{8}-[0-9]{6}$/.test(id)) return res.status(400).json({ message: "invalid backup id" });
    const result = await deleteBackup(id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: String(err.message || err) });
  }
});

app.post("/api/system/restart-gateway", async (_req, res) => {
  exec(RESTART_CMD, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ message: `restart failed: ${error.message}`, stderr: String(stderr || "") });
      return;
    }
    res.json({ ok: true, message: "gateway restart command executed", stdout: String(stdout || "") });
  });
});

app.use(express.static(__dirname));

app.listen(PORT, async () => {
  await ensureDirs();
  console.log(`[openclaw-builder] http://0.0.0.0:${PORT}`);
  console.log(`[openclaw-builder] workspace: ${WORKSPACE_DIR}`);
  console.log(`[openclaw-builder] backups: ${BACKUP_DIR}`);
  console.log(`[openclaw-builder] restart cmd: ${RESTART_CMD}`);
  if (CORE_FILES.size) {
    // Keep linter happy for currently reserved set.
  }
});
