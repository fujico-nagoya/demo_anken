# Genba One

自社専用の現場案件管理PWAです。建設、設備、リフォーム会社の10〜30人規模の社員利用を想定し、案件、予定、日報、写真/図面、見積、請求、入金、原価、粗利、監査ログを一つの画面で扱えます。

## 実装済み

- Next.js / TypeScript / App Router
- PWA manifest and service worker
- PC左メニュー、スマホ下部ナビ
- 顧客、現場、案件、工程、日報、写真/ファイル、見積、原価、請求、入金、監査ログの型定義
- サンプル業務データとローカル保存
- Googleフォーム項目を参考にした新規案件登録
- 案件登録時の8桁ランダム案件番号発番
- 顧客マスタ選択による元請名、担当者、住所の入力補助
- 顧客マスタ一覧、追加、編集
- 権限ロール: 管理者、現場管理者、現場担当、経理
- 経理操作のロール制御
- CSV/XLSX取り込みプレビュー
- 材料・固定費などの単価マスタ登録
- 選択案件への見積作成
- 案件CSV、粗利CSV出力
- 見積書、請求書、日報、写真台帳の印刷PDF出力
- Supabase接続用クライアントとPostgreSQLスキーマ

## 起動

```powershell
npm.cmd run dev
```

ブラウザで `http://localhost:3000` を開きます。

## クライアント共有

現時点のデモ共有は、GitHub Pages または Vercel で公開できます。

### GitHub Pages

GitHub Pagesは静的公開なので、現在の画面デモ向けです。入力データは閲覧者それぞれのブラウザに保存され、全員で同じデータを共有する本番DBにはまだつながりません。

1. GitHubでリポジトリを作成し、このフォルダの中身をpushします。
2. GitHubの `Settings > Pages` で `Source` を `GitHub Actions` にします。
3. `main` ブランチにpushすると `.github/workflows/deploy-pages.yml` が自動実行されます。
4. 完了後、`https://ユーザー名.github.io/リポジトリ名/` のURLで共有できます。

ローカルで静的ファイルを書き出す場合:

```powershell
npm.cmd run build:static
```

出力先は `out` フォルダです。

### Vercel

ログイン、API、Supabase連携まで含めた確認に進む場合はVercelの方が向いています。GitHubリポジトリをVercelに接続すると、Next.jsアプリとしてそのまま公開できます。

### 注意

GitHub Pagesで公開する場合、URLを知っている人が見られる状態になります。実在の顧客名、住所、電話番号などの機密情報は、本番ログインを入れるまで載せないでください。

## API

`/api/customers`、`/api/projects`、`/api/schedules`、`/api/reports`、`/api/files`、`/api/estimates`、`/api/catalog-items`、`/api/costs`、`/api/invoices`、`/api/payments`、`/api/imports`、`/api/exports` を用意しています。現在はSupabase未接続でも確認できるモック応答です。

## Supabase

`.env.example` を `.env.local` にコピーし、SupabaseのURLとキーを設定します。DB定義は `supabase/schema.sql` にあります。Storageでは案件ごとに `project-id/photos`、`project-id/drawings`、`project-id/documents` のようなパスで保存する前提です。

## 検証ポイント

- 案件登録から日報、写真、見積/請求、入金、原価、粗利確認まで一連で操作できること
- 現場担当ロールで請求・入金・原価登録がロックされること
- 経理ロールで入金と原価登録ができ、監査ログに残ること
- CSV/XLSXを選択するとプレビューが出ること
- スマホ幅で予定、日報、写真、案件確認が下部ナビから使えること
- ホーム画面追加後にPWAとして起動できること

## 本番化で残す作業

- Supabase Authの社員招待とログイン画面接続
- APIをモック応答からSupabase CRUDへ接続
- Storageアップロードの実体保存
- RLSポリシーをロール別に拡張
- 自社書式の帳票デザインと印影画像の反映
