# CCSC Helper for VS Code

> [!important]
> JP only
> 
> このコードは不完全なので不具合を見つけたらご連絡ください。

CCSC コンパイラ向けのビルドタスクと IntelliSense を提供する VS Code 拡張機能です。
拡張機能IDは `user.vscode-extension-for-ccsc` です。

## 主な機能

この拡張機能は、現在以下の機能を提供します。

1. **CCSCプロジェクトの自動認識**
   - ワークスペース内に `.ccspjt` ファイルが存在する場合、自動的にCCSCプロジェクトとして認識し、必要な設定を有効化します。

2. **IntelliSenseの強化**
   - **型定義の自動追加**: CCSCコンパイラ特有の型（`int8`, `boolean`, `BYTE` など）をIntelliSenseに自動で定義します。これにより、標準のC言語にはない型に起因する多くの誤ったエラー表示を抑制します。
   - **インクルードパスの自動設定**: CCSCの `Devices` および `Drivers` フォルダへのインクルードパスを自動的に設定し、デバイスヘッダファイル（例: `18F67J94.h`）や標準ドライバライブラリが正しく認識されるようにします。
   - **コンパイラ種別の判定**: プロジェクトファイル (`.ccspjt`) を解析し、使用されているコンパイラ（`PCH` または `PCM`）を特定。`__PCH__=1` のような定義を自動で追加し、コンパイラに応じたIntelliSenseを提供します。

3. **ビルドタスクの提供**
   - `.ccspjt` ファイルの情報をもとに、`ccscompile.exe` を実行するビルドタスクを自動で生成します。
   - VS Codeのコマンドパレットから `Tasks: Run Build Task` (`Ctrl+Shift+B`) を実行するだけで、簡単にプロジェクトのコンパイルが可能です。
   - メモリ使用量の表示とビルド後の不要ファイル自動削除機能を含みます。

4. **Flash（書き込み）機能** ※MPLAB X IDE + プログラマーが必要
   - MPLAB IPECMD（JavaベースのipecCmd.jar）を使用したHEXファイルの書き込み機能を提供します。
   - PICkit 5、PICkit 4、MPLAB Snap等の各種プログラマーに対応しています。
   - ステータスバーのボタンから直接Flash実行、またはBuild & Flash（ビルド後自動書き込み）が可能です。

5. **シンタックスハイライト**
   - `#use` や `#fuses` など、CCSC固有のディレクティブがカラー表示されます。

## 必須要件

- **Visual Studio Code**
- **[C/C++ 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)** (Microsoft提供)
- **CCSC (PIC C Compiler)**
  - CCS C Compiler for PIC Microcontrollers
  - **注意:** CCSC のインストールパスは設定 `ccscHelper.ccscInstallPath` で変更できます。（既定値は `C:\Program Files (x86)\PICC`）
- **MPLAB X IPE** (Flash機能を使用する場合)
  - MPLAB IPE (Integrated Programming Environment) が含まれている必要があります
  - **対応バージョン:** MPLAB X IDE v5.0以降推奨
  - **インストールパス例:** `C:\Program Files\Microchip\MPLABX\v6.20\`
- **Java Runtime Environment (JRE) 8以降** (Flash機能を使用する場合)
  - **Flash機能を使用する場合に必要:** MPLAB IPECMDはJavaベースのアプリケーション（ipecmd.jar）のため、Javaのインストールが必要です。
  - **注意:** `java`コマンドがPATH環境変数に含まれていない場合は、設定 `ccscHelper.flash.javaPath` でJavaの実行パスを指定してください。

### 追加要件（推奨）

- **PICプログラマー** (Flash機能を使用する場合)
  - PICkit 5, PICkit 4, PICkit 3, MPLAB Snap, ICD4, ICD3, Real ICE等
  - 対象PICデバイスに対応したプログラマーが必要

## 使い方

1. **プロジェクトを開く**: `.ccspjt` ファイルを含むフォルダをVS Codeで開きます。
2. **自動設定**: 拡張機能がプロジェクトを自動で認識し、IntelliSenseの設定を行います。
3. **ビルド**: `Ctrl+Shift+B` を押下し、表示されたメニューから `Build CCSC Project` を選択すると、プロジェクトがコンパイルされます。
4. **タスクボタン**: ステータスバーに表示される **Build**, **Flash**, **Build&Flash** ボタンから各タスクを直接実行できます。
5. **設定の確認**: この拡張機能が C/C++ の構成プロバイダーを自動的に `CCSC Helper` に設定します。必要に応じて C/C++ の設定メニューから別のプロバイダーを選択できます。

## 設定

以下の設定を `settings.json` または VS Code の設定画面で変更できます：

### 基本設定

- `ccscHelper.ccscInstallPath`: CCSC のインストールパス（既定値: `C:\Program Files (x86)\PICC`）
- `ccscHelper.compilerOptions`: `ccscompile.exe` に渡すコンパイルオプション（既定値: `+FH +Ex`）

### ビルド設定

- `ccscHelper.build.deleteUnnecessaryFiles`: ビルド終了後に削除する不要ファイルのパターン（既定値: `["pc$.err"]`）

### Flash（書き込み）設定

- `ccscHelper.flash.enabled`: Flash機能を有効にする（既定値: `true`）
- `ccscHelper.flash.useJava`: JavaベースのIPECMD（ipecmd.jar）を使用する（既定値: `true`）
- `ccscHelper.flash.javaPath`: Javaの実行パス（既定値: `java`）
- `ccscHelper.flash.toolPath`: MPLAB IPEのパス（既定値: ipecmd.jarがあるディレクトリ）
- `ccscHelper.flash.deviceId`: PICデバイスID（既定値: `18F67J94`）
- `ccscHelper.flash.programmer`: プログラマーの種類（既定値: `PK5`）
  - 選択肢: `PK5`, `PK4`, `PK3`, `SNAP`, `ICD4`, `ICD3`, `REALICE`, `SIMULATOR`
- `ccscHelper.flash.voltage`: プログラミング電圧（既定値: `3.3`）
  - 選択肢: `3.3`, `5.0`
- `ccscHelper.flash.extraArgs`: 追加引数（既定値: `-M`）

### IntelliSense設定

- `ccscHelper.intellisense.enabled`: IntelliSense機能を有効にする（既定値: `true`）
- `ccscHelper.intellisense.standard`: C言語標準（既定値: `c99`）
- `ccscHelper.intellisense.mode`: IntelliSenseモード（既定値: `windows-clang-x86`）
- `ccscHelper.intellisense.compilerArgs`: コンパイラ引数（警告抑制など）
- `ccscHelper.intellisense.standardDefines`: 標準的な定義
- `ccscHelper.intellisense.modeDefines`: コンパイルモード別定義
- `ccscHelper.intellisense.compilerArguments`: IntelliSenseコンパイラ引数
- `ccscHelper.intellisense.customDefines`: 独自定義
- `ccscHelper.intellisense.customIncludePaths`: 独自インクルードパス

### Live Linting設定

- `ccscHelper.liveLinting.enabled`: Live Linting機能を有効にする（既定値: `false`）
- `ccscHelper.liveLinting.delay`: ファイル保存後の待機時間（既定値: `500`ms）
- `ccscHelper.liveLinting.errorPattern`: 正規表現パターン

### エラー解析設定

- `ccscHelper.errorAnalysis.errorPattern`: エラー解析用正規表現
- `ccscHelper.errorAnalysis.warningPattern`: 警告解析用正規表現

### MPLAB環境での設定例

```json
{
  "ccscHelper.flash.enabled": true,
  "ccscHelper.flash.useJava": true,
  "ccscHelper.flash.javaPath": "java",
  "ccscHelper.flash.toolPath": "C:\\Program Files\\Microchip\\MPLABX\\v6.20\\mplab_platform\\mplab_ipe",
  "ccscHelper.flash.deviceId": "18F67J94",
  "ccscHelper.flash.programmer": "PK5",
  "ccscHelper.flash.voltage": "3.3",
  "ccscHelper.flash.extraArgs": "-M"
}
```

#### 生成されるコマンド例

```bash
# Flash のみの場合
cd "C:\Program Files\Microchip\MPLABX\v6.20\mplab_platform\mplab_ipe"
java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"C:\Code\main.hex" -M

# Build & Flash の場合（ビルド後にFlash）
cd "C:\Code\MyProject"
"C:\Program Files (x86)\PICC\ccscompile.exe" +FH +Ex main.c
cd "C:\Program Files\Microchip\MPLABX\v6.20\mplab_platform\mplab_ipe"
java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"C:\Code\MyProject\main.hex" -M
```

## トラブルシューティング

### Java環境の問題

Flash機能でJavaが見つからないエラーが発生した場合：

1. **Java（JRE 8以降）がインストールされているか確認**
   - コマンドプロンプトで `java -version` を実行
   - バージョン情報が表示されればJavaはインストール済み

2. **VSCodeでJavaが認識されない場合**
   - VSCode設定から `ccscHelper.flash.javaPath` を開く
   - Javaの絶対パスを指定：

     ```text
     C:\Program Files\Java\jre1.8.0_XXX\bin\java.exe
     ```

   - または、Java実行可能ファイルの完全パスを指定：

     ```text
     C:\Program Files\Eclipse Adoptium\jdk-11.0.XX-hotspot\bin\java.exe
     ```

3. **一般的なJavaインストールパス**

   ```text
   C:\Program Files\Java\jre1.8.0_XXX\bin\java.exe
   C:\Program Files\Java\jdk-XX.X.X\bin\java.exe
   C:\Program Files\Eclipse Adoptium\jdk-XX.X.X-hotspot\bin\java.exe
   C:\Program Files\Microsoft\jdk-XX.X.X\bin\java.exe
   ```

4. **環境変数PATHにJavaを追加する場合**
   - システムの環境変数設定を開く
   - PATH変数に `C:\Program Files\Java\jre1.8.0_XXX\bin` を追加
   - VSCodeを再起動

### MPLAB X IDEのパス設定

MPLAB X IDEのバージョンが異なる場合は、`ccscHelper.flash.toolPath` 設定を適切なパスに変更してください：

```text
C:\Program Files\Microchip\MPLABX\v6.XX\mplab_platform\mplab_ipe
```

### MPLAB X IDEが見つからない場合

1. **MPLAB X IDEがインストールされているか確認**
   - [Microchip公式サイト](https://www.microchip.com/en-us/tools-resources/develop/mplab-x-ide)からダウンロード・インストール
   - MPLAB IPE (Integrated Programming Environment) も含まれていることを確認

2. **インストールパスの確認**
   - 標準インストールパス: `C:\Program Files\Microchip\MPLABX\`
   - ipecmd.jarの場所: `C:\Program Files\Microchip\MPLABX\v6.XX\mplab_platform\mplab_ipe\ipecmd.jar`

3. **プログラマーの接続確認**
   - PICkit等のプログラマーがPCに正しく接続されているか
   - デバイスドライバーが正しくインストールされているか

## 注意事項

- 拡張機能の設定 `ccsc-helper.ccscInstallPath` で CCSC のインストールパスを変更できます。
- IntelliSenseは多くのCCSC固有の構文をサポートしますが、一部の特殊なディレクティブやインラインアセンブリなど、解釈できない場合があります。

## リリースノート

全ての変更履歴は CHANGELOG.md を参照してください。
