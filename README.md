# Notion残コメントチェックシステム

Notionのページやサブページに残されたコメントを効率的に管理するためのウェブアプリケーションです。未解決のコメント、一定期間返信のないコメント、自分宛のコメント、自分が参加しているスレッドなどを簡単に確認できます。

## 機能

- Notion OAuth認証によるアカウント連携
- ページ検索機能
- サブページを含めた再帰的なコメント取得
- 以下の条件でのコメントフィルタリング：
  - 未解決コメントのみ表示
  - 一定期間（日数指定可能）返信がないコメントのみ表示
  - 自分宛てのコメントのみ表示
  - 自分が参加しているスレッドのみ表示
- レスポンシブデザイン対応

## 技術スタック

- **フロントエンド**: Next.js (App Router), TypeScript, Material-UI
- **バックエンド**: Next.js API Routes
- **認証**: NextAuth.js (OAuth)
- **API**: Notion API

## セットアップ方法

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上
- Notion Integration設定済み（OAuth対応）

### 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Notion OAuth設定
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
```

### インストールと実行

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバーの起動
npm start
```

## 使用方法

1. トップページにアクセスし、「Notionでログイン」ボタンをクリックします
2. Notionの認証画面でアクセスを許可します
3. ログイン後、ページ検索ボックスにページ名を入力してNotionページを検索します
4. 検索結果からページを選択すると、そのページとサブページのコメント一覧が表示されます
5. フィルターを使用して、表示するコメントを絞り込むことができます

## プロジェクト構造

```
notion-comment-checker/
├── src/
│   ├── app/                    # App Router
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # 認証API
│   │   │   └── notion/         # Notion API
│   │   ├── comments/           # コメント一覧ページ
│   │   ├── layout.tsx          # ルートレイアウト
│   │   └── page.tsx            # トップページ（検索画面）
│   ├── components/             # 共通コンポーネント
│   ├── hooks/                  # カスタムフック
│   ├── lib/                    # ユーティリティ関数
│   ├── styles/                 # スタイル定義
│   └── types/                  # 型定義
├── public/                     # 静的ファイル
└── package.json                # 依存パッケージ定義
```

## 主要コンポーネント

### ページ

- **トップページ (`src/app/page.tsx`)**: ログイン状態の管理とページ検索機能を提供
- **コメント一覧ページ (`src/app/comments/page.tsx`)**: 選択したページのコメント一覧とフィルタリング機能を提供

### API

- **認証API (`src/app/api/auth/[...nextauth]/route.ts`)**: NextAuth.jsによるOAuth認証
- **ページ検索API (`src/app/api/notion/search/route.ts`)**: Notionページの検索
- **コメント取得API (`src/app/api/notion/comments/route.ts`)**: ページとサブページのコメント取得

### コンポーネント

- **AuthButton**: ログイン/ログアウトボタン
- **CommentFilters**: コメントフィルタリングUI
- **CommentTable**: コメント一覧表示
- **ErrorHandler**: エラー処理と表示

## 注意事項

- Notion APIのレート制限に注意してください
- 大量のサブページを持つページを検索すると、処理に時間がかかる場合があります
- OAuth認証には有効なNotionアカウントが必要です

