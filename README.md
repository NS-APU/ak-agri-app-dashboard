# ak-agri-app-dashbord
このリポジトリは、[秋田版農業情報基盤](https://github.com/NS-APU/ak-agri-platform)を参照する[Grafana](https://grafana.com/ja/)ダッシュボードアプリをまとめたものです。

# 起動
## 前提条件
* [秋田版農業情報基盤](https://github.com/NS-APU/ak-agri-platform)が起動していること。

## 実行方法

```console
docker compose up -d
```
services スクリプトを実行することによって、アプリケーションを初期化した状態で起動することができます。
```console
./services start
```
> 次のコマンドで、すべてのリソースを解放して終了させることができます。
> ```colsole
> ./services stop
> ```


# データの可視化
[Grafana](https://grafana.com/ja/)を使って情報基盤のデータを確認できます。Webブラウザで[http://localhost:3000](http://localhost:3000)にアクセスしてください。  
(ユーザ名：admin、パスワード：ak-agri)