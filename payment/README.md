# ADPF_Payment（契約支払アラート ダッシュボード）

ADPF_Gantt と同じデザイン・構成で、スプレッドシート「ADPF_契約支払管理 › 契約支払」を可視化し、
契約工期の終了・支払予定日の接近／超過をアラート表示する。

## 構成
| 場所 | 内容 |
|---|---|
| Apps Script「ADPF_Payment」 | `コード.gs`。パスワード確認後にシートを JSON で返す（doPost / google.script.run）。doGet は Drive の HTML を表示 |
| Drive `ADPF_Payment_index.html` | 画面。GAS の /exec を開くとこれが表示される（差し替えるだけで反映、再デプロイ不要） |
| このフォルダの `index.html` | 外部ホスティング用（API_URL に /exec を設定済み） |

- Web アプリ URL: https://script.google.com/macros/s/AKfycbzkjXaP9IVSTNNWt09hCn8juJWHWbHE5vfjBDuvLlCytL-yZq40t2DsSWIeQibSx5OHPQ/exec
- スクリプトプロパティ: `PASSWORD`（必須）／`SHEET_ID`・`SHEET_NAME`・`HTML_FILE_ID`（任意。未設定時はコード内の既定値）

## アラート判定（今日基準）
| 種別 | 条件 |
|---|---|
| 支払超過 | 支払予定日 < 今日、かつ 支払処理日 が空欄 |
| 支払接近 | 支払予定日まで 30 日以内、かつ 支払処理日 が空欄 |
| 工期終了 | 契約終了日 < 今日、かつ 検収日 が空欄 |
| 工期間近 | 契約終了日まで 14 日以内、かつ 検収日 が空欄 |

- 日付は「変更後」に入力があればそちらを、なければ「当初」を使う
- Status＝Close、または 支払処理日 入力済みの契約はアラート対象外
- A列（非表示）＝1 の行は表示しない（Filter の「非表示行も表示」で表示可）
- 支払予定日が空欄の契約は Alerts 画面下部「支払予定日 未設定」に表示
- しきい値は index.html の `DUE_SOON` / `END_SOON` で変更
