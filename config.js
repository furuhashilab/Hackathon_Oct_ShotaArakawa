// 行田みんなの書き込みマップ — 共通設定
window.GYODA_CONFIG = {
  // Google Apps Script のウェブアプリ URL（gas/Code.gs をデプロイして貼り付ける）
  // 空のままだと「送る」でファイルをダウンロードする方式になる
  SUBMIT_URL: 'https://script.google.com/macros/s/AKfycby1WRgtzBA9WQKxTz4JiXvWlG7b8YZ8YuBz_Y-gQVxuQA-OxBjktkQ1guab_qo0Lgw0yw/exec',

  CENTER: [139.474, 36.134],
  ZOOM: 13,

  CATEGORIES: [
    { id: 'recommend', label: 'おすすめ', emoji: '👍', color: '#2b8a3e' },
    { id: 'want', label: '行ってみたい', emoji: '👀', color: '#1971c2' },
    { id: 'caution', label: '注意・不便', emoji: '⚠️', color: '#e03131' },
    { id: 'other', label: 'その他', emoji: '💬', color: '#7048e8' },
  ],
  DEFAULT_COLOR: '#f08c00',

  // 目印（座標は OpenStreetMap / Nominatim による）
  LANDMARKS: [
    { name: '忍城', lngLat: [139.45333, 36.13859] },
    { name: '水城公園', lngLat: [139.45922, 36.13416] },
    { name: 'さきたま古墳公園', lngLat: [139.47879, 36.12605] },
    { name: '古代蓮の里', lngLat: [139.50031, 36.13223] },
  ],
};
