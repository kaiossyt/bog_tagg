const readline = require("readline");
const Database = require("better-sqlite3");
const path = require("path");

const dbpath = path.join(__dirname, "gamedata.db");
const db = new Database(dbpath);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise((r) => rl.question(q, r)); }

function showmenu() {
  console.log("\n========== ADMIN PANEL ==========");
  console.log("1) Create poll");
  console.log("2) List polls");
  console.log("3) Close poll");
  console.log("4) Delete poll");
  console.log("5) List players");
  console.log("6) Ban player");
  console.log("7) Unban player");
  console.log("8) Set title data key");
  console.log("9) List title data");
  console.log("10) List mothership players");
  console.log("11) Run custom SQL query");
  console.log("0) Exit");
  console.log("=================================");
}

async function createpoll() {
  const question = await ask("Poll question: ");
  if (!question.trim()) { console.log("Cancelled."); return; }

  const optionstr = await ask("Options (comma separated, e.g. Option A,Option B,Option C): ");
  const options = optionstr.split(",").map((s) => s.trim()).filter((s) => s);
  if (options.length < 2) { console.log("Need at least 2 options."); return; }

  const durationstr = await ask("Duration in hours (default 24): ");
  const hours = parseInt(durationstr, 10) || 24;

  const now = new Date();
  const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const starttime = now.toISOString();
  const endtime = end.toISOString();
  const voteoptions = JSON.stringify(options);
  const votecount = JSON.stringify(new Array(options.length).fill(0));
  const predictioncount = JSON.stringify(new Array(options.length).fill(0));

  const result = db.prepare(
    "INSERT INTO polls (question, voteoptions, votecount, predictioncount, starttime, endtime, isactive, titleid) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
  ).run(question, voteoptions, votecount, predictioncount, starttime, endtime, "15AD4");

  console.log(`\nPoll created! ID: ${result.lastInsertRowid}`);
  console.log(`  Question: ${question}`);
  console.log(`  Options: ${options.join(", ")}`);
  console.log(`  Ends: ${endtime}`);
}

function listpolls() {
  const rows = db.prepare("SELECT * FROM polls ORDER BY pollid DESC LIMIT 20").all();
  if (rows.length === 0) { console.log("No polls found."); return; }
  for (const row of rows) {
    const options = JSON.parse(row.voteoptions || "[]");
    const votes = JSON.parse(row.votecount || "[]");
    const status = row.isactive ? "ACTIVE" : "CLOSED";
    console.log(`\n  [${row.pollid}] [${status}] ${row.question}`);
    for (let i = 0; i < options.length; i++) {
      console.log(`    ${i + 1}. ${options[i]} -- ${votes[i] || 0} votes`);
    }
    console.log(`    Ends: ${row.endtime}`);
  }
}

async function closepoll() {
  listpolls();
  const id = await ask("\nPoll ID to close: ");
  const pollid = parseInt(id, 10);
  if (isNaN(pollid)) { console.log("Invalid ID."); return; }
  const result = db.prepare("UPDATE polls SET isactive = 0 WHERE pollid = ?").run(pollid);
  console.log(result.changes ? `Poll ${pollid} closed.` : "Poll not found.");
}

async function deletepoll() {
  listpolls();
  const id = await ask("\nPoll ID to delete: ");
  const pollid = parseInt(id, 10);
  if (isNaN(pollid)) { console.log("Invalid ID."); return; }
  const confirm = await ask(`Delete poll ${pollid} and all its votes? (yes/no): `);
  if (confirm.toLowerCase() !== "yes") { console.log("Cancelled."); return; }
  db.prepare("DELETE FROM votes WHERE pollid = ?").run(pollid);
  const result = db.prepare("DELETE FROM polls WHERE pollid = ?").run(pollid);
  console.log(result.changes ? `Poll ${pollid} deleted.` : "Poll not found.");
}

function listplayers() {
  const rows = db.prepare("SELECT playfabid, oculusid, displayname, platform, lastlogin FROM players ORDER BY lastlogin DESC LIMIT 30").all();
  if (rows.length === 0) { console.log("No players found."); return; }
  console.log(`\n  ${"PlayFabId".padEnd(18)} ${"OculusId".padEnd(22)} ${"Name".padEnd(16)} ${"Platform".padEnd(8)} Last Login`);
  console.log("  " + "-".repeat(90));
  for (const r of rows) {
    console.log(`  ${(r.playfabid || "").padEnd(18)} ${(r.oculusid || "").padEnd(22)} ${(r.displayname || "").padEnd(16)} ${(r.platform || "").padEnd(8)} ${r.lastlogin || ""}`);
  }
}

async function banplayer() {
  const id = await ask("PlayFab ID or Oculus ID to ban: ");
  if (!id.trim()) { console.log("Cancelled."); return; }
  const reason = await ask("Reason: ");
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bans'").get();
  if (!existing) {
    db.exec("CREATE TABLE IF NOT EXISTS bans (playfabid TEXT PRIMARY KEY, reason TEXT, bannedat TEXT DEFAULT (datetime('now')))");
  }
  db.prepare("INSERT OR REPLACE INTO bans (playfabid, reason) VALUES (?, ?)").run(id.trim(), reason.trim());
  console.log(`Banned: ${id.trim()}`);
}

async function unbanplayer() {
  const id = await ask("PlayFab ID or Oculus ID to unban: ");
  if (!id.trim()) { console.log("Cancelled."); return; }
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bans'").get();
  if (!existing) { console.log("No bans table."); return; }
  const result = db.prepare("DELETE FROM bans WHERE playfabid = ?").run(id.trim());
  console.log(result.changes ? `Unbanned: ${id.trim()}` : "Not found in bans.");
}

async function settitledata() {
  const key = await ask("Title data key: ");
  if (!key.trim()) { console.log("Cancelled."); return; }
  const value = await ask("Value (JSON or string): ");
  db.prepare("INSERT OR REPLACE INTO mothershiptitledata (datakey, datavalue, updatedat) VALUES (?, ?, datetime('now'))").run(key.trim(), value);
  console.log(`Set title data: ${key.trim()}`);
}

function listtitledata() {
  const rows = db.prepare("SELECT * FROM mothershiptitledata ORDER BY datakey").all();
  if (rows.length === 0) { console.log("No title data found."); return; }
  for (const r of rows) {
    const preview = r.datavalue.length > 80 ? r.datavalue.substring(0, 80) + "..." : r.datavalue;
    console.log(`  [${r.datakey}] ${preview}`);
  }
}

function listmothershipplayers() {
  const rows = db.prepare("SELECT userid, mothershipid, platform, lastlogin FROM mothershipplayers ORDER BY lastlogin DESC LIMIT 30").all();
  if (rows.length === 0) { console.log("No mothership players found."); return; }
  console.log(`\n  ${"UserId".padEnd(22)} ${"MothershipId".padEnd(38)} ${"Platform".padEnd(8)} Last Login`);
  console.log("  " + "-".repeat(95));
  for (const r of rows) {
    console.log(`  ${(r.userid || "").padEnd(22)} ${(r.mothershipid || "").padEnd(38)} ${(r.platform || "").padEnd(8)} ${r.lastlogin || ""}`);
  }
}

async function customquery() {
  const sql = await ask("SQL> ");
  if (!sql.trim()) return;
  try {
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      const rows = db.prepare(sql).all();
      console.log(JSON.stringify(rows, null, 2));
    } else {
      const result = db.prepare(sql).run();
      console.log(`Done. Changes: ${result.changes}`);
    }
  } catch (err) {
    console.error("SQL error:", err.message);
  }
}

async function main() {
  console.log("Gorilla Tag Backend - Admin Panel");
  console.log(`Database: ${dbpath}\n`);

  while (true) {
    showmenu();
    const choice = await ask("\nChoice: ");
    switch (choice.trim()) {
      case "1": await createpoll(); break;
      case "2": listpolls(); break;
      case "3": await closepoll(); break;
      case "4": await deletepoll(); break;
      case "5": listplayers(); break;
      case "6": await banplayer(); break;
      case "7": await unbanplayer(); break;
      case "8": await settitledata(); break;
      case "9": listtitledata(); break;
      case "10": listmothershipplayers(); break;
      case "11": await customquery(); break;
      case "0": console.log("Bye!"); rl.close(); process.exit(0);
      default: console.log("Invalid choice.");
    }
  }
}

main();
