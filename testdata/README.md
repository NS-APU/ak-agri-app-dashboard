# 水位データ投入スクリプト

## 概要
FIWAREに河川の水位データを投入するテスト用のスクリプトです。
当スクリプトは以下の仕様をもとに、生成AIによって作られたものです。

## 仕様
* FIWAREに指定された時間間隔で定期的に河川の水位データを送信する
* 河川の水位は状態に合わせて変化する
* 河川の水位状態は平常時と豪雨時の状態をもつ
* 平常時のベース水位が1m
* 豪雨時のベース水位は5m
* それぞれの状態が継続するときベース水位から±5%の水位の変化をする
* 状態は5分かけて変化するものとし、それぞれのベース水位への変化は一定スピードで変化する
* 状態が移行したとき、その状態は10分は継続するものとする

# セットアップ

## 前提条件

* Node.jsがインストールされていること
* npm（Node.jsに同梱）またはYarnがインストールされていること
* [秋田版農業情報基盤](https://github.com/NS-APU/ak-agri-platform)が起動していること

## 環境構築

当ディレクトリで以下のコマンドを実行し、依存関係をインストールする。

``npm ci``

# 使い方

## 実行方法

以下のコマンドを実行し、当スクリプトを実行する。

``npm run ingest``

または

``node index.js``

## 設定の変更

.env を修正することで設定を変更することができる。
