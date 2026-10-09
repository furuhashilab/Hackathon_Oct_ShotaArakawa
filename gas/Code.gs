/**
 * 行田みんなの書き込みマップ — 投稿受け取り用 Google Apps Script
 *
 * 使い方:
 * 1. Google スプレッドシートを新規作成 → 拡張機能 → Apps Script を開き、このファイルの中身を貼り付ける
 * 2. プロジェクトの設定 → スクリプト プロパティに ADMIN_KEY（閲覧用の合言葉）を追加
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *    実行ユーザー: 自分 / アクセスできるユーザー: 全員
 * 4. 発行された URL を config.js の SUBMIT_URL に貼る
 *
 * @OnlyCurrentDoc  権限をこのスプレッドシートだけに限定する（ドライブ全体にはアクセスしない）
 */

const SHEET_NAME = 'submissions';
const HEADERS = ['受信日時', 'submissionId', '名前', '件数', '使いやすさ', '所要秒数', '描いた数', '直した数', '消した数', 'タッチ端末', '感想', 'GeoJSON'];
const MAX_LENGTH = 45000; // スプレッドシートの 1 セル上限（50,000 文字）より小さく

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

// 利用者の入力が数式（=IMAGE(...) など）として実行されないよう、先頭に ' を付けて文字列として保存する
function cell_(v, maxLen) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  let s = String(v);
  if (maxLen) s = s.slice(0, maxLen);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 参加者ページからの投稿
function doPost(e) {
  try {
    const body = e.postData && e.postData.contents;
    if (!body || body.length > MAX_LENGTH) return json_({ ok: false, error: 'too_large' });
    const data = JSON.parse(body);
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
      return json_({ ok: false, error: 'invalid' });
    }
    const m = data.metadata || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const num = v => (typeof v === 'number' && isFinite(v) ? v : '');
      sheet_().appendRow([
        new Date(), cell_(m.submissionId, 64), cell_(m.name, 40), data.features.length, num(m.rating),
        num(m.secondsSpent), num(m.drawCount), num(m.editCount), num(m.deleteCount), m.touch ? 'yes' : 'no',
        cell_(m.feedback, 1000), cell_(body),
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 閲覧ページ（admin.html）からの読み出し。合言葉が必要
function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || !e.parameter || e.parameter.key !== key) return json_({ ok: false, error: 'unauthorized' });
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, submissions: [] });
  const col = HEADERS.indexOf('GeoJSON') + 1;
  const submissions = sh.getRange(2, col, last - 1, 1).getValues()
    .map(r => { try { return JSON.parse(r[0]); } catch (err) { return null; } })
    .filter(Boolean);
  return json_({ ok: true, submissions });
}
