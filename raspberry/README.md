# キイチゴ受発注システム ダミーデータ登録プログラム

## 概要
このプログラムは、キイチゴ受発注システムのダミーデータをFIWARE Orionに登録するプログラムです。
2025年1月から12月までの1年間のデータをシミュレートして生成・登録します。

## データの種類
- **生産計画登録** (1月〜4月に登録)
- **出荷予定登録** (5月〜11月に登録、在庫登録の1カ月前くらい)
- **在庫情報登録** (6月〜12月に登録、最大64件)
- **発注依頼登録** (在庫登録後、最大30件)

## セットアップ

### 1. 依存関係のインストール
```bash
cd raspberry
npm ci
```

### 2. 環境変数の設定
`.env`ファイルを作成して以下の内容を設定してください：

```bash
# FIWARE Orion Context Broker URL
FIWARE_ORION_URL=http://localhost/api/orion/ngsi-ld/v1

# FIWARE Service (Tenant)
FIWARE_SERVICE=fresh_order_system

# データ送信間隔 (ミリ秒)
SEND_INTERVAL_MS=200
```

## 使い方

### TypeScriptコードのビルド
```bash
npm run build
```

### プログラムの実行
```bash
npm start
```

または、ビルドせずに直接実行:
```bash
npm run dev
```

## データ仕様

### 品種と単価
| 品種 | 単価（円/kg） |
|------|---------------|
| HERITAGE | 4,500 |
| CHILCOTIN | 5,000 |
| YELLOW | 5,500 |
| HANOVER | 6,000 |

### 生鮮の出荷可能月
| 品種 | 出荷可能月 |
|------|-----------|
| HERITAGE | 7月、10月、11月、12月 |
| CHILCOTIN | 7月、8月 |
| YELLOW | 6月、7月 |
| HANOVER | 6月 |

※ 冷凍(FROZEN)は生鮮の出荷時期以降であればいつでも出荷可能

### 生産者と顧客
- 生産者: 4名
- 顧客: 10名

## プログラム構造
```
raspberry/
├── src/
│   └── index.ts          # メインプログラム
├── dist/                 # コンパイル後のJavaScriptファイル
├── docs/
│   └── functional-specification.md  # 機能仕様書
├── package.json
├── tsconfig.json
├── .env                  # 環境変数（要作成）
└── README.md
```

## 技術スタック
- TypeScript
- Node.js
- Axios (HTTP通信)
- dotenv (環境変数管理)

## ライセンス
ISC
