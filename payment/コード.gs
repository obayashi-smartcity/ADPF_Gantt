/**
 * 契約支払ダッシュボード用 GAS（ADPF_Gantt と同じ構成）
 * スクリプトプロパティ：PASSWORD（必須） / SHEET_ID・SHEET_NAME・HTML_FILE_ID（任意。未設定なら下の既定値）
 *
 * 画面（index.html）は Drive 上の HTML ファイルを読み込んで表示する。
 * 画面を直すときは Drive の ADPF_Payment_index.html を差し替えるだけでよい（再デプロイ不要）。
 *
 * シートの1行目をヘッダーとして、全列を「ヘッダー名 → 値」で返す。
 * ヘッダー名の改行・空白は除去して返す（例：「当初\n支払予定日」→「当初支払予定日」）。
 * 列名とフィールドの対応は index.html 側の FIELDS で管理。
 */
const DEFAULT_SHEET_ID = '1XsAbNVJ9tbystnHDRYMBH0iclcp2UvKEASyYQL7Guck'; // ADPF_契約支払管理
const DEFAULT_SHEET_NAME = '契約支払';
const DEFAULT_HTML_FILE_ID = '1Jef60nMdD8ATROE4zMLQjWGWDbu_DAsN';          // ADPF_Payment_index.html
const MAX_FAILS = 20;
const LOCK_SECONDS = 600;

function doGet() {
  const id = PropertiesService.getScriptProperties().getProperty('HTML_FILE_ID') || DEFAULT_HTML_FILE_ID;
  const html = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
  return HtmlService.createHtmlOutput(html)
    .setTitle('Contract & Payment')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (_) {}
  return ContentService.createTextOutput(JSON.stringify(getData(body.password)))
    .setMimeType(ContentService.MimeType.JSON);
}

/** google.script.run / doPost 共通の入口。常に { ok, ... } を返す */
function getData(password) {
  try {
    return checkPassword_(password) || Object.assign({ ok: true }, readSheet_());
  } catch (err) {
    return { ok: false, error: 'SERVER', message: String((err && err.message) || err) };
  }
}

/** OKなら null、NGなら エラー情報オブジェクトを返す */
function checkPassword_(password) {
  const expected = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  if (!expected) throw new Error('スクリプトプロパティ PASSWORD が未設定です');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('auth_fails') || 0);
  if (fails >= MAX_FAILS) {
    return { ok: false, error: 'LOCKED', message: '試行回数が多すぎます。しばらくしてから再度お試しください' };
  }
  if (password && password === expected) return null;
  cache.put('auth_fails', String(fails + 1), LOCK_SECONDS);
  Utilities.sleep(800);
  return { ok: false, error: 'AUTH', message: 'パスワードが違います' };
}

function readSheet_() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID') || DEFAULT_SHEET_ID);
  const sheetName = props.getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME;
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('シートが見つかりません: ' + sheetName);
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();

  const range = sh.getDataRange();
  const values = range.getValues();          // 日付判定用
  const displays = range.getDisplayValues(); // 表示どおりの文字列
  const headers = displays[0].map(function (h) { return String(h).replace(/\s+/g, ''); });

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    if (displays[r].every(function (v) { return String(v).trim() === ''; })) continue;
    const row = { _row: r + 1 };
    headers.forEach(function (h, c) {
      if (!h) return;
      const v = values[r][c];
      row[h] = v instanceof Date && !isNaN(v.getTime())
        ? Utilities.formatDate(v, tz, 'yyyy-MM-dd')
        : String(displays[r][c]).trim();
    });
    rows.push(row);
  }
  return {
    title: ss.getName(), sheetName: sh.getName(), url: ss.getUrl(), gid: sh.getSheetId(),
    updatedAt: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'),
    headers: headers, rows: rows,
  };
}

function testRead() { Logger.log(JSON.stringify(readSheet_(), null, 2)); }
function resetAuthLock() { CacheService.getScriptCache().remove('auth_fails'); }
