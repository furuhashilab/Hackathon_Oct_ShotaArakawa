# 行田みんなの書き込みマップ

GIS に触れたことのない一般の人でも、地図に「場所・ルート・エリア」を書き込んで共有できるかを試すプロトタイプです。
古橋研究室 10 月ハッカソン（FOSS4G Hiroshima 2026 / SotM Asia 2026 Osaka 振り返り）の成果物です。

- 試した技術: [Terra Draw](https://github.com/JamesLMilner/terra-draw)（FOSS4G 2026 で紹介）＋ [MapLibre GL JS](https://maplibre.org/)
- 背景地図: [OpenStreetMap](https://www.openstreetmap.org/copyright)（© OpenStreetMap contributors）

## ページ

| ファイル | 内容 |
| --- | --- |
| `index.html` | 参加者用。場所・ルート・エリアを描き、種類とコメントを付けて送る |
| `admin.html` | 管理者用ビューア。集まった書き込みを地図で見て、GeoJSON で書き出す |
| `config.js` | 送信先 URL、カテゴリ、目印などの設定 |
| `gas/Code.gs` | 投稿を Google スプレッドシートに貯める Google Apps Script |

## 仕組み

1. 参加者が `index.html` で描く（Terra Draw の point / linestring / polygon / select モード）
2. 「送る」と、GeoJSON（FeatureCollection）に使いやすさ評価・所要時間・操作回数を付けて Apps Script に POST
3. Apps Script がスプレッドシートに 1 投稿 1 行で保存
4. 管理者が `admin.html` で合言葉を入れて読み込み、地図で確認

`SUBMIT_URL` が空のときは、送る代わりに GeoJSON ファイルをダウンロードし、`admin.html` にドロップして見られます。

## 送信先（Apps Script）の準備

1. Google スプレッドシートを新規作成 → 拡張機能 → Apps Script
2. `gas/Code.gs` の中身を貼り付けて保存
3. プロジェクトの設定 → スクリプト プロパティに `ADMIN_KEY`（閲覧用の合言葉）を追加
4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」、実行ユーザー「自分」、アクセス「全員」
5. 発行された URL を `config.js` の `SUBMIT_URL` に貼る

## ライセンス

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)
