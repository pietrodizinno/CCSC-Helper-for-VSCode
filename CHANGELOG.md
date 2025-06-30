# Change Log

All notable changes to the "vscode-extension-for-ccsc" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]
### Added

- Flash（書き込み）機能の実装
  - FlashおよびBuild&Flashタスクの追加
  - Flash関連の設定項目（デバイスID、ツールパス、追加引数）
  - ステータスバーにFlashボタンを追加
- MPLAB IPECMD対応
  - JavaベースのIPECMD（ipecmd.jar）対応
  - MPLAB v6.20の標準パス設定
  - プログラマー種類の選択（PK5, PK4, PK3, SNAP等）
  - プログラミング電圧設定（3.3V, 5.0V）
  - 正しいコマンド形式での実行（java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"hex_path" -M）
- Java環境の自動検出とエラーハンドリング機能
  - 自動的なJavaパス検出（一般的なインストールパスをスキャン）
  - Flash実行前のJava環境検証
  - Java環境が見つからない場合のユーザーガイダンス機能
  - トラブルシューティング情報の表示
- 設定項目の体系的整理
  - 関連項目のグループ化（基本/ビルド/Flash/IntelliSense/Live Linting/エラー解析）
  - 設定項目の階層化と命名規則の統一
  - Flash機能の有効/無効制御
- ビルド終了時の不要ファイル自動削除機能
- メモリ使用量表示の改善（範囲表示の短縮化、重複削除）
- 設定可能なエラー・警告解析正規表現パターン
- IntelliSenseの詳細設定（標準、モード、コンパイラ引数）
- 必須要件の明確化とドキュメント改善
  - MPLAB X IDEの要件を明記
  - プログラマー（PICkit等）の要件を追加
  - 各コンポーネントの役割と必要性を詳細化
  - MPLAB X IDEのインストールとパス設定に関するトラブルシューティングガイド

### Changed

- メモリ使用量の表示形式を統一（「20% - 30%」→「20~30%」）
- ステータスバーの表示内容を整理（重複表示を削除）
- エラー解析ロジックを設定ベースに変更
- IntelliSense設定を設定ファイルから取得するように変更

### Removed

- 未使用の `ccscHelper.buildLogFileName` 設定項目を削除

### Fixed

- ビルドメモリ使用量の重複表示問題を解決
- メモリ使用量表示の改行・余計な文字混入問題を修正
- ステータスバー表示の統一化

## [0.1.0] - 2025-06-26

### Added

- 基本的な IntelliSense サポートとビルドタスクの提供
- `.ccspjt` ファイルに基づくプロジェクトの自動認識
- ハードコードされた定義による IntelliSense エラーの削減
