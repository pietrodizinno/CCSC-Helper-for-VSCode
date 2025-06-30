import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { promisify } from 'util';
import {
        CustomConfigurationProvider,
        SourceFileConfiguration,
        SourceFileConfigurationItem,
        Version,
        WorkspaceBrowseConfiguration,
        getCppToolsApi
} from 'vscode-cpptools';

const execAsync = promisify(cp.exec);

// --- グローバル定数 ---
const PROVIDER_NAME = 'CCSC Helper';

// --- グローバル変数 ---
let diagnosticCollection: vscode.DiagnosticCollection;
let lintingTimeout: NodeJS.Timeout | undefined = undefined;
let lintingStatusBarItem: vscode.StatusBarItem;

// 設定からCCSCのインストールパスを取得する
export function getCcscInstallPath(): string {
        const config = vscode.workspace.getConfiguration('ccscHelper');
        return config.get<string>('ccscInstallPath', 'C:\\Program Files (x86)\\PICC');
}

// メモリ使用量の文字列を解析し、整形する関数
function parseMemoryUsage(memoryLine: string): { rom: string, ram: string } | null {
        console.log('Parsing memory line:', JSON.stringify(memoryLine));

        // ROM=74%      RAM=20% - 30% のような形式をパース
        const romMatch = memoryLine.match(/ROM\s*=\s*(\d+(?:% - \d+)?%)/i);
        const ramMatch = memoryLine.match(/RAM\s*=\s*(\d+(?:% - \d+)?%)/i);

        if (!romMatch || !ramMatch) {
                console.log('Failed to parse memory usage:', { romMatch, ramMatch });
                return null;
        }

        const rom = romMatch[1].replace(/% - /g, '~');
        const ram = ramMatch[1].replace(/% - /g, '~');

        console.log('Parsed memory usage:', { rom, ram });
        return { rom, ram };
}

// Javaパスの自動検出機能
async function detectJavaPath(): Promise<string> {
        const config = vscode.workspace.getConfiguration('ccscHelper');
        const configuredPath = config.get<string>('flash.javaPath', '');

        // 設定でパスが指定されている場合は、それを使用
        if (configuredPath && configuredPath !== 'java') {
                return configuredPath;
        }

        // PATHからjavaコマンドを確認
        try {
                await execAsync('java -version');
                return 'java';
        } catch (error) {
                console.log('Java not found in PATH, trying to detect...');
        }

        // Windows での一般的なJavaインストールパスを検索
        const commonJavaPaths = [
                'C:\\Program Files\\Java',
                'C:\\Program Files (x86)\\Java',
                'C:\\Program Files\\Eclipse Adoptium',
                'C:\\Program Files (x86)\\Eclipse Adoptium',
                'C:\\Program Files\\Microsoft\\jdk-',
                'C:\\Program Files (x86)\\Microsoft\\jdk-'
        ];

        for (const basePath of commonJavaPaths) {
                try {
                        if (fs.existsSync(basePath)) {
                                const items = fs.readdirSync(basePath);
                                // JREまたはJDKディレクトリを探す
                                const javaDir = items.find(item =>
                                        item.toLowerCase().includes('jre') ||
                                        item.toLowerCase().includes('jdk') ||
                                        item.toLowerCase().includes('java')
                                );

                                if (javaDir) {
                                        const javaExePath = path.join(basePath, javaDir, 'bin', 'java.exe');
                                        if (fs.existsSync(javaExePath)) {
                                                console.log('Found Java at:', javaExePath);
                                                return `"${javaExePath}"`;
                                        }
                                }
                        }
                } catch (error) {
                        // ディレクトリアクセスエラーは無視
                }
        }

        // どこにも見つからない場合は設定値をそのまま返す
        return configuredPath || 'java';
}

// Java環境の検証とユーザーガイダンス
async function validateJavaEnvironment(javaPath: string): Promise<boolean> {
        try {
                const command = javaPath === 'java' ? 'java -version' : `${javaPath} -version`;
                await execAsync(command);
                return true;
        } catch (error) {
                // Java が見つからない場合のエラーメッセージとガイダンス
                const message = 'Java環境が見つかりません。Flash機能を使用するにはJavaが必要です。';
                const action = await vscode.window.showErrorMessage(
                        message,
                        '設定を開く',
                        'ガイドを表示'
                );

                if (action === '設定を開く') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'ccscHelper.flash.javaPath');
                } else if (action === 'ガイドを表示') {
                        const infoMessage = `Java環境の設定方法：
1. Java（JRE 8以降）をインストール
2. 設定 > ccscHelper.flash.javaPath にJavaの絶対パスを設定
   例: "C:\\Program Files\\Java\\jre1.8.0_XXX\\bin\\java.exe"
3. または、Javaを環境変数PATHに追加`;
                        vscode.window.showInformationMessage(infoMessage);
                }

                return false;
        }
}

//================================================================================
// activate: 拡張機能が有効化されたときに呼ばれるメイン関数
//================================================================================
export async function activate(context: vscode.ExtensionContext) {

        console.log('--- CCSC Helper Extension is now fully active! ---');

        // --- 1. ビルドタスクの提供 (Task Provider) ---
        context.subscriptions.push(vscode.tasks.registerTaskProvider('ccsc', new CCSCTaskProvider(context)));

        // コマンド登録
        context.subscriptions.push(
                vscode.commands.registerCommand('ccsc-helper.build', async () => {
                        const tasks = await vscode.tasks.fetchTasks({ type: 'ccsc' });
                        const task = tasks.find(t => t.name === 'Build CCSC Project');
                        if (task) { vscode.tasks.executeTask(task); }
                }),
                vscode.commands.registerCommand('ccsc-helper.flash', async () => {
                        // Flash実行前にJava環境の検証を行う
                        const config = vscode.workspace.getConfiguration('ccscHelper');
                        const flashUseJava = config.get<boolean>('flash.useJava', true);

                        if (flashUseJava) {
                                const javaPath = await detectJavaPath();
                                const isJavaValid = await validateJavaEnvironment(javaPath);
                                if (!isJavaValid) {
                                        return; // Java環境が無効な場合は処理を中断
                                }
                        }

                        const tasks = await vscode.tasks.fetchTasks({ type: 'ccsc' });
                        const task = tasks.find(t => t.name === 'Flash HEX');
                        if (task) { vscode.tasks.executeTask(task); }
                }),
                vscode.commands.registerCommand('ccsc-helper.buildAndFlash', async () => {
                        // Build&Flash実行前にJava環境の検証を行う
                        const config = vscode.workspace.getConfiguration('ccscHelper');
                        const flashUseJava = config.get<boolean>('flash.useJava', true);

                        if (flashUseJava) {
                                const javaPath = await detectJavaPath();
                                const isJavaValid = await validateJavaEnvironment(javaPath);
                                if (!isJavaValid) {
                                        return; // Java環境が無効な場合は処理を中断
                                }
                        }

                        const tasks = await vscode.tasks.fetchTasks({ type: 'ccsc' });
                        const task = tasks.find(t => t.name === 'Build and Flash');
                        if (task) { vscode.tasks.executeTask(task); }
                })
        );

        // ステータスバーにボタンを配置
        const buildBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        buildBtn.text = '$(gear) Build';
        buildBtn.command = 'ccsc-helper.build';
        buildBtn.tooltip = 'CCSC プロジェクトをビルド';
        buildBtn.show();
        context.subscriptions.push(buildBtn);

        // Flash機能が有効な場合のみFlashボタンを表示
        const config = vscode.workspace.getConfiguration('ccscHelper');
        const flashEnabled = config.get<boolean>('flash.enabled', true);

        if (flashEnabled) {
                const flashBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
                flashBtn.text = '$(rocket) Flash';
                flashBtn.command = 'ccsc-helper.flash';
                flashBtn.tooltip = 'HEX を書き込み';
                flashBtn.show();
                context.subscriptions.push(flashBtn);

                const buildFlashBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
                buildFlashBtn.text = '$(play) Build&Flash';
                buildFlashBtn.command = 'ccsc-helper.buildAndFlash';
                buildFlashBtn.tooltip = 'ビルドして書き込み';
                buildFlashBtn.show();
                context.subscriptions.push(buildFlashBtn);
        }


        // --- 2. IntelliSense設定の提供 (Configuration Provider) ---
        const cppToolsApi = await getCppToolsApi(Version.v6);
        if (cppToolsApi) {
                console.log('C/C++ API (v6 or later) found.');
                const provider = new CCSCConfigurationProvider();
                cppToolsApi.registerCustomConfigurationProvider(provider);
                cppToolsApi.notifyReady(provider);
                const cppConfig = vscode.workspace.getConfiguration('C_Cpp');
                const providerId = provider.extensionId;
                if (cppConfig.get<string>('default.configurationProvider') !== providerId) {
                        await cppConfig.update('default.configurationProvider', providerId, vscode.ConfigurationTarget.Workspace);
                }
                context.subscriptions.push(provider);
                console.log('CCSC IntelliSense Provider has been registered.');
        } else {
                vscode.window.showErrorMessage("C/C++ Tools Extension is not available.");
        }

        // --- 3. Live Linting (Background Compilation) ---
        diagnosticCollection = vscode.languages.createDiagnosticCollection('ccsc');
        lintingStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96);
        context.subscriptions.push(diagnosticCollection, lintingStatusBarItem);

        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
                const config = vscode.workspace.getConfiguration('ccscHelper');
                if (!config.get<boolean>('liveLinting.enabled')) {
                        return;
                }
                if (document.languageId !== 'c') {
                        return;
                }

                // 連続保存時の重複実行を防ぐ
                if (lintingTimeout) {
                        clearTimeout(lintingTimeout);
                }
                const delay = config.get<number>('liveLinting.delay', 500);
                lintingTimeout = setTimeout(() => runLiveLinting(document), delay);
        }));
}

export function deactivate() { }

//================================================================================
// CCSCTaskProvider: ビルドタスクを提供するクラス
//================================================================================
export class CCSCTaskProvider implements vscode.TaskProvider {
        private statusBar: vscode.StatusBarItem;

        constructor(private context: vscode.ExtensionContext) {
                this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
                this.statusBar.tooltip = 'CCSC Build Memory Usage';

                const rom = context.workspaceState.get<string>('ccsc.memory.rom');
                const ram = context.workspaceState.get<string>('ccsc.memory.ram');
                if (rom && ram) {
                        this.statusBar.text = `ROM ${rom} RAM ${ram}`;
                } else {
                        this.statusBar.text = 'ROM -- RAM --';
                }
                this.statusBar.show();

                context.subscriptions.push(
                        vscode.tasks.onDidEndTaskProcess(this.onDidEndTaskProcess, this),
                        this.statusBar
                );
        }
        public async provideTasks(): Promise<vscode.Task[]> {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) { return []; }

                const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.ccspjt'));
                if (projectFiles.length === 0) { return []; }

                const projectFileUri = projectFiles[0];
                const projectDir = vscode.Uri.joinPath(projectFileUri, '..');

                try {
                        const fileContent = await vscode.workspace.fs.readFile(projectFileUri);
                        const match = fileContent.toString().match(/FileList=(.*\.c)/i);
                        if (!match) { return []; }

                        const mainCFile = match[1].trim();
                        const hexFileName = mainCFile.replace(/\.c$/i, '.hex');
                        const installPath = getCcscInstallPath();
                        const config = vscode.workspace.getConfiguration('ccscHelper');
                        const compilerOptions = config.get<string>('compilerOptions', '+FH +Ex');

                        // Flash設定を取得
                        const flashEnabled = config.get<boolean>('flash.enabled', true);
                        const flashUseJava = config.get<boolean>('flash.useJava', true);
                        const flashToolPath = config.get<string>('flash.toolPath', 'C:\\Program Files\\Microchip\\MPLABX\\v6.20\\mplab_platform\\mplab_ipe');
                        const flashDeviceId = config.get<string>('flash.deviceId', '18F67J94');
                        const flashProgrammer = config.get<string>('flash.programmer', 'PK5');
                        const flashVoltage = config.get<string>('flash.voltage', '3.3');
                        const flashExtraArgs = config.get<string>('flash.extraArgs', '-M');

                        const shellOptions: vscode.ShellExecutionOptions = { executable: 'cmd.exe', shellArgs: ['/C'] };
                        const tasks: vscode.Task[] = [];

                        // --- build task ---
                        const buildCmd = `cd "${projectDir.fsPath}" && "${installPath}\\ccscompile.exe" ${compilerOptions} ${mainCFile}`;
                        const buildExecution = new vscode.ShellExecution(buildCmd, shellOptions);
                        const buildTask = new vscode.Task(
                                { type: 'ccsc', task: 'build' },
                                workspaceFolder, 'Build CCSC Project', PROVIDER_NAME, buildExecution, '$ccsc'
                        );
                        buildTask.group = vscode.TaskGroup.Build;
                        tasks.push(buildTask);

                        // Flash機能が有効な場合のみFlashタスクを追加
                        if (flashEnabled) {
                                // HEXファイルパスを絶対パスで構築
                                const hexFilePath = `${projectDir.fsPath}\\${hexFileName}`;

                                let flashCmd: string;
                                if (flashUseJava) {
                                        // Java環境の自動検出とパス取得
                                        const detectedJavaPath = await detectJavaPath();

                                        // JavaベースのIPECMD形式: java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"C:\Code\main.hex" -M
                                        flashCmd = `cd "${flashToolPath}" && ${detectedJavaPath} -jar ipecmd.jar -P${flashDeviceId} -TP${flashProgrammer} -W${flashVoltage} -F"${hexFilePath}" ${flashExtraArgs}`;
                                } else {
                                        // 従来のEXE形式（下位互換）
                                        flashCmd = `cd "${projectDir.fsPath}" && "${flashToolPath}\\ipecmd.exe" -TP${flashProgrammer} -P${flashDeviceId} -F${hexFileName} ${flashExtraArgs}`;
                                }

                                const flashExecution = new vscode.ShellExecution(flashCmd, shellOptions);
                                const flashTask = new vscode.Task(
                                        { type: 'ccsc', task: 'flash' },
                                        workspaceFolder, 'Flash HEX', PROVIDER_NAME, flashExecution
                                );
                                tasks.push(flashTask);

                                // --- build and flash task ---
                                let buildAndFlashCmd: string;
                                if (flashUseJava) {
                                        // Java環境の自動検出とパス取得（既に上で取得済み）
                                        const detectedJavaPath = await detectJavaPath();
                                        buildAndFlashCmd = `cd "${projectDir.fsPath}" && "${installPath}\\ccscompile.exe" ${compilerOptions} ${mainCFile} && cd "${flashToolPath}" && ${detectedJavaPath} -jar ipecmd.jar -P${flashDeviceId} -TP${flashProgrammer} -W${flashVoltage} -F"${hexFilePath}" ${flashExtraArgs}`;
                                } else {
                                        buildAndFlashCmd = `cd "${projectDir.fsPath}" && "${installPath}\\ccscompile.exe" ${compilerOptions} ${mainCFile} && "${flashToolPath}\\ipecmd.exe" -TP${flashProgrammer} -P${flashDeviceId} -F${hexFileName} ${flashExtraArgs}`;
                                }

                                const buildAndFlashExecution = new vscode.ShellExecution(buildAndFlashCmd, shellOptions);
                                const buildAndFlashTask = new vscode.Task(
                                        { type: 'ccsc', task: 'buildAndFlash' },
                                        workspaceFolder, 'Build and Flash', PROVIDER_NAME, buildAndFlashExecution, '$ccsc'
                                );
                                buildAndFlashTask.group = vscode.TaskGroup.Build;
                                tasks.push(buildAndFlashTask);
                        }

                        return tasks;
                } catch (e) {
                        console.error("Error providing tasks:", e);
                        return [];
                }
        }

        private async onDidEndTaskProcess(e: vscode.TaskProcessEndEvent) {
                if (e.execution.task.definition.type !== 'ccsc') { return; }

                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) { return; }

                try {
                        // --- .err ファイルのパスを特定 ---
                        const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.ccspjt'));
                        if (projectFiles.length === 0) {
                                this.statusBar.text = 'ROM -- RAM -- (Project not found)';
                                return;
                        }
                        const projectFileUri = projectFiles[0];
                        const projectDir = vscode.Uri.joinPath(projectFileUri, '..');
                        const fileContent = await vscode.workspace.fs.readFile(projectFileUri);
                        const match = fileContent.toString().match(/FileList=(.*\.c)/im);
                        if (!match) {
                                this.statusBar.text = 'ROM -- RAM -- (Main file not found)';
                                return;
                        }
                        const mainCFile = match[1].trim();
                        const errFileName = mainCFile.replace(/\.c$/i, '.err');
                        const errFilePath = path.join(projectDir.fsPath, errFileName);

                        if (!fs.existsSync(errFilePath)) {
                                this.statusBar.text = 'ROM -- RAM -- (.err not found)';
                                return;
                        }

                        const output = fs.readFileSync(errFilePath, 'utf8');
                        console.log('Reading .err file content:', JSON.stringify(output.substring(0, 500)));

                        // Memory usage: の行を探す
                        const memoryLines = output.split(/\r?\n/).filter(line =>
                                line.toLowerCase().includes('memory usage') ||
                                line.toLowerCase().includes('rom=') ||
                                line.toLowerCase().includes('ram=')
                        );

                        console.log('Found memory lines:', memoryLines);

                        let romValue = '';
                        let ramValue = '';

                        for (const line of memoryLines) {
                                const parsed = parseMemoryUsage(line);
                                if (parsed) {
                                        romValue = parsed.rom;
                                        ramValue = parsed.ram;
                                        break;
                                }
                        }

                        if (romValue && ramValue) {
                                // ビルド成功時のみ状態を保存
                                if (e.exitCode === 0) {
                                        await this.context.workspaceState.update('ccsc.memory.rom', romValue);
                                        await this.context.workspaceState.update('ccsc.memory.ram', ramValue);
                                }
                                this.statusBar.text = `ROM ${romValue} RAM ${ramValue}`;
                        } else {
                                this.statusBar.text = 'ROM -- RAM --';
                        }

                        // 不要なファイルを削除（設定から取得）
                        const config = vscode.workspace.getConfiguration('ccscHelper');
                        const filesToDelete = config.get<string[]>('build.deleteUnnecessaryFiles', ['pc$.err']);

                        for (const fileName of filesToDelete) {
                                const filePath = path.join(projectDir.fsPath, fileName);
                                if (fs.existsSync(filePath)) {
                                        try {
                                                fs.unlinkSync(filePath);
                                                console.log(`Deleted unnecessary file: ${fileName}`);
                                        } catch (deleteErr) {
                                                console.error(`Failed to delete ${fileName}:`, deleteErr);
                                        }
                                }
                        }

                } catch (err) {
                        console.error('Failed to parse build result file:', err);
                        this.statusBar.text = 'ROM -- RAM --';
                }

                if (e.exitCode !== 0) {
                        this.statusBar.text += ' (Error)';
                }
        }

        public resolveTask(_task: vscode.Task): vscode.Task | undefined { return undefined; }
}

async function runLiveLinting(document: vscode.TextDocument) {
        // Live Linting開始のフィードバック
        lintingStatusBarItem.text = `$(sync~spin) Linting`;
        lintingStatusBarItem.show();

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
                lintingStatusBarItem.hide();
                return;
        }

        const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.ccspjt'));
        if (projectFiles.length === 0) {
                lintingStatusBarItem.hide();
                return;
        }

        const projectFileUri = projectFiles[0];
        const projectDir = vscode.Uri.joinPath(projectFileUri, '..');

        try {
                const fileContent = await vscode.workspace.fs.readFile(projectFileUri);
                const match = fileContent.toString().match(/FileList=(.*\.c)/im);
                if (!match) {
                        lintingStatusBarItem.hide();
                        return;
                }

                const mainCFile = match[1].trim();
                const installPath = getCcscInstallPath();
                const config = vscode.workspace.getConfiguration('ccscHelper');
                const compilerOptions = config.get<string>('compilerOptions', '+FH +Ex');

                // .err ファイルのパスを決定
                const errorFileName = mainCFile.replace(/\.c$/i, '.err');
                const errorFilePath = path.join(projectDir.fsPath, errorFileName);

                // コンパイルコマンドを組み立てる
                const command = `"${installPath}\\ccscompile.exe" ${compilerOptions} ${mainCFile}`;

                cp.exec(command, { cwd: projectDir.fsPath }, (execErr, stdout, stderr) => {
                        try {
                                // コンパイルが開始されたら、まずすべての問題をクリアする
                                diagnosticCollection.clear();
                                const diagnosticsByFile: Map<string, vscode.Diagnostic[]> = new Map();

                                if (!fs.existsSync(errorFilePath)) {
                                        if (execErr) { vscode.window.showErrorMessage(`Live Linting failed: ${execErr.message}`); }
                                        return;
                                }

                                const errorFileContent = fs.readFileSync(errorFilePath, 'utf8');
                                const errorFileLines = errorFileContent.split(/\r?\n/);

                                // エラー解析の正規表現を設定から取得
                                const config = vscode.workspace.getConfiguration('ccscHelper');
                                const errorPattern = config.get<string>('liveLinting.errorPattern', '^(.*?):(\\d+):(\\d+):\\s+(Error|Warning)#\\d+\\s+(.*)$');
                                const errorRegex = new RegExp(errorPattern);

                                for (const line of errorFileLines) {
                                        const problemMatch = line.match(errorRegex);
                                        if (problemMatch) {
                                                const filePath = problemMatch[1];
                                                const fileUriString = vscode.Uri.file(filePath).toString();
                                                const lineNum = parseInt(problemMatch[2], 10) - 1; // 0-based
                                                const colNum = parseInt(problemMatch[3], 10) - 1; // 0-based
                                                const severity = problemMatch[4].toUpperCase() === 'ERROR'
                                                        ? vscode.DiagnosticSeverity.Error
                                                        : vscode.DiagnosticSeverity.Warning;
                                                const message = problemMatch[5].trim();

                                                const range = new vscode.Range(lineNum, colNum, lineNum, 200); // End column is a guess
                                                const diagnostic = new vscode.Diagnostic(range, message, severity);
                                                diagnostic.source = 'ccsc-compiler';

                                                if (!diagnosticsByFile.has(fileUriString)) {
                                                        diagnosticsByFile.set(fileUriString, []);
                                                }
                                                diagnosticsByFile.get(fileUriString)!.push(diagnostic);
                                        }
                                }

                                // Mapに溜めたDiagnosticをセット
                                diagnosticsByFile.forEach((diags, uriString) => {
                                        diagnosticCollection.set(vscode.Uri.parse(uriString), diags);
                                });
                        } finally {
                                // 処理が完了したらステータスバーを非表示
                                lintingStatusBarItem.hide();
                        }
                });
        } catch (e) {
                console.error("Error running live linting:", e);
                lintingStatusBarItem.hide();
        }
}

//================================================================================
// CCSCConfigurationProvider: IntelliSense設定を提供するクラス
//================================================================================
export class CCSCConfigurationProvider implements CustomConfigurationProvider {
        // Indicates whether this provider can provide browse configurations per folder.
        async canProvideBrowseConfigurationsPerFolder(token?: vscode.CancellationToken): Promise<boolean> {
                // This provider supports per-folder browse configurations if there is at least one workspace folder.
                return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
        }

        // Provides a browse configuration for a specific folder.
        async provideFolderBrowseConfiguration(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<WorkspaceBrowseConfiguration | null> {
                // Use the same browse paths as in provideBrowseConfiguration, but scoped to the given folder.
                const installPath = getCcscInstallPath();
                const browsePath = [
                        `${installPath}\\Drivers`,
                        `${installPath}\\Devices`,
                        uri.fsPath // Add the folder itself for local includes
                ];
                return { browsePath };
        }
        public readonly name = PROVIDER_NAME;
        // package.jsonの `publisher` と `name` を結合した拡張機能ID
        public readonly extensionId = 'user.vscode-extension-for-ccsc';

        public async canProvideConfiguration(uri: vscode.Uri): Promise<boolean> {
                const folder = vscode.workspace.getWorkspaceFolder(uri);
                if (folder) {
                        const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.ccspjt'));
                        return projectFiles.length > 0;
                }
                return false;
        }

        public async provideConfigurations(uris: vscode.Uri[]): Promise<SourceFileConfigurationItem[]> {
                const configs: SourceFileConfigurationItem[] = [];
                const ccscConfig = await this.detectCcscConfiguration();

                // IntelliSense設定を取得
                const config = vscode.workspace.getConfiguration('ccscHelper');
                const cStandard = config.get<string>('intellisense.standard', 'c99');
                const intelliSenseMode = config.get<string>('intellisense.mode', 'windows-clang-x86');
                const compilerArgs = config.get<string[]>('intellisense.compilerArgs', ["-Wno-unknown-pragmas", "-Wno-invalid-pp-token"]);

                for (const uri of uris) {
                        const configuration: SourceFileConfiguration = {
                                includePath: ccscConfig.includePath,
                                defines: ccscConfig.defines,
                                // ClangベースのIntelliSenseエンジンに対し、未知のディレクティブに関するエラーを抑制する
                                compilerArgs: compilerArgs,
                                // ccscompile.exeはGCC/Clang互換のI/Fを持たないため、cpptoolsが解釈に失敗します。
                                // compilerPathを空に設定することで、cpptoolsが特定のコンパイラの挙動に依存せず、
                                // definesやcompilerArgsの設定をより素直に解釈するようになり、独自ディレクティブのエラーが抑制されます。
                                compilerPath: "",
                                standard: cStandard as any,
                                intelliSenseMode: intelliSenseMode as any
                        };
                        configs.push({ uri: uri, configuration: configuration });
                }
                return configs;
        }

        private async detectCcscConfiguration(): Promise<{ includePath: string[], defines: string[] }> {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                        return { includePath: [], defines: [] };
                }

                const config = vscode.workspace.getConfiguration('ccscHelper');
                const customIncludePaths = config.get<string[]>('intellisense.customIncludePaths', []);
                const customDefines = config.get<string[]>('intellisense.customDefines', []);

                const installPath = getCcscInstallPath();
                const includePath = [
                        `${workspaceFolder.uri.fsPath}/**`,
                        `${installPath}\\Devices`,
                        `${installPath}\\Drivers`,
                        ...customIncludePaths
                ];

                // CCSC独自の型を、標準的なCの型としてIntelliSenseに教える
                const defines: string[] = [
                        // --- Type Aliases ---
                        "int1=unsigned int",
                        "boolean=unsigned int",
                        "int8=signed char",
                        "BYTE=unsigned char",
                        "int16=signed long",
                        "int32=signed long long",
                        "uint1=unsigned int",
                        "uint8=unsigned char",
                        "uint16=unsigned int",
                        "uint32=unsigned long",
                        "float32=float",
                        "short=int",

                        // --- Constants ---
                        "true=1",
                        "false=0",
                        "HIGH=1",
                        "LOW=0",

                        // --- CCSC Preprocessor Directives (as dummy macros) ---
                        // These help suppress "unexpected token" errors from IntelliSense.
                        "asm",
                        "endasm",
                        "bit(x,y,z)=", // For #bit id = var.bit
                        "byte(x,y)= ",  // For #byte id = addr
                        "word(x,y)= ",  // For #word id = addr
                        "device(x,...)= ",
                        "fuses(x,...)= ",
                        "id(x,...)= ",
                        "include(x)= ",
                        "org(x,y)= ",
                        "pin_select(x,...)= ",
                        "rom(x,y)= ",
                        "use(x,...)= ",
                        "task(x,...)= ",
                        "zero_ram",

                        // --- Common #use library names (as dummy macros) ---
                        "delay(...)= ",
                        "rs232(...)= ",
                        "i2c(...)= ",
                        "spi(...)= ",

                        // --- Interrupt names (as dummy macros) ---
                        "INT_AD", "INT_ADOF", "INT_BUSCOL", "INT_BUTTON", "INT_CCP1",
                        "INT_CCP2", "INT_COMP", "INT_EEPROM", "INT_EXT", "INT_I2C",
                        "INT_LCD", "INT_LVD", "INT_PMP", "INT_PSP", "INT_RB", "INT_RC",
                        "INT_RDA", "INT_RDA2", "INT_RTCC", "INT_SPP", "INT_SSP",
                        "INT_TBE", "INT_TBE2", "INT_TIMER0", "INT_TIMER1", "INT_TIMER2",
                        "INT_TIMER3", "INT_USB"
                ];

                defines.push(...customDefines);

                // プロジェクトファイルからコンパイラ種別を読み取り、対応する定義を追加
                const projectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.ccspjt'));
                if (projectFiles.length > 0) {
                        try {
                                const fileContent = (await vscode.workspace.fs.readFile(projectFiles[0])).toString();
                                const compilerMatch = fileContent.match(/Compiler=(.*)/i);
                                if (compilerMatch && compilerMatch[1].trim().toUpperCase() === 'PCH') {
                                        defines.push('__PCH__=1');
                                } else {
                                        defines.push('__PCM__=1');
                                }
                        } catch (e) { console.error("Error reading .ccspjt:", e); }
                } else {
                        defines.push('__PCH__=1');
                }

                return { includePath, defines };
        }

        // --- API仕様で必須のメソッド ---
        public async canProvideBrowseConfiguration(): Promise<boolean> { return true; }
        public async provideBrowseConfiguration(): Promise<WorkspaceBrowseConfiguration> {
                const installPath = getCcscInstallPath();
                return { browsePath: [`${installPath}\\Drivers`, `${installPath}\\Devices`] };
        }

        public dispose() { }
}
