import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { getCcscInstallPath, CCSCTaskProvider } from '../extension';

class TestMemento implements vscode.Memento {
    private store = new Map<string, any>();
    keys(): readonly string[] { return Array.from(this.store.keys()); }
    get<T>(key: string, defaultValue?: T): T | undefined {
        return this.store.has(key) ? this.store.get(key) : defaultValue;
    }
    update(key: string, value: any): Thenable<void> {
        this.store.set(key, value);
        return Promise.resolve();
    }
}

suite('CCSC Helper Test Suite', () => {
    const fixtureDir = path.join(__dirname, 'fixtures', 'project');
    const workspaceUri = vscode.Uri.file(fixtureDir);

    suiteSetup(async () => {
        fs.mkdirSync(fixtureDir, { recursive: true });
        fs.writeFileSync(path.join(fixtureDir, 'main.c'), 'void main() {}');
        fs.writeFileSync(path.join(fixtureDir, 'sample.ccspjt'), 'FileList=main.c');
        vscode.workspace.updateWorkspaceFolders(0, 0, { uri: workspaceUri });
    });

    suiteTeardown(async () => {
        vscode.workspace.updateWorkspaceFolders(0, 1);
        fs.rmSync(path.join(__dirname, 'fixtures'), { recursive: true, force: true });
    });

    test('getCcscInstallPath respects configuration', async () => {
        const config = vscode.workspace.getConfiguration('ccscHelper');
        await config.update('ccscInstallPath', 'D\\CCSC', vscode.ConfigurationTarget.Workspace);
        assert.strictEqual(getCcscInstallPath(), 'D\\CCSC');
        await config.update('ccscInstallPath', undefined, vscode.ConfigurationTarget.Workspace);
        assert.strictEqual(getCcscInstallPath(), 'C\\Program Files (x86)\\PICC');
    });

    test('provideTasks creates all tasks', async () => {
        const context: any = { subscriptions: [], workspaceState: new TestMemento() };
        const provider = new CCSCTaskProvider(context as vscode.ExtensionContext);
        const tasks = await provider.provideTasks();
        const labels = tasks.map((t: vscode.Task) => t.name).sort();
        assert.deepStrictEqual(labels, ['Build CCSC Project', 'Build and Flash', 'Flash HEX'].sort());
    });

    test('onDidEndTaskProcess parses ROM/RAM', async () => {
        const context: any = { subscriptions: [], workspaceState: new TestMemento() };
        const provider = new CCSCTaskProvider(context as vscode.ExtensionContext);
        const logPath = path.join(fixtureDir, 'ccsc_build.log');
        fs.writeFileSync(logPath, 'ROM=10% RAM=20%');
        const dummyTask = new vscode.Task({ type: 'ccsc', task: 'build' }, vscode.TaskScope.Workspace, 'Build', 'ccsc');
        const event: vscode.TaskProcessEndEvent = { execution: { task: dummyTask } as any, exitCode: 0 };
        await (provider as any).onDidEndTaskProcess(event);
        assert.strictEqual(context.workspaceState.get('ccsc.memory.rom'), '10');
        assert.strictEqual(context.workspaceState.get('ccsc.memory.ram'), '20');
    });

    test('onDidEndTaskProcess handles failure', async () => {
        const context: any = { subscriptions: [], workspaceState: new TestMemento() };
        const provider = new CCSCTaskProvider(context as vscode.ExtensionContext);
        const logPath = path.join(fixtureDir, 'ccsc_build.log');
        fs.writeFileSync(logPath, 'ROM=30% RAM=40%');
        const dummyTask = new vscode.Task({ type: 'ccsc', task: 'build' }, vscode.TaskScope.Workspace, 'Build', 'ccsc');
        const event: vscode.TaskProcessEndEvent = { execution: { task: dummyTask } as any, exitCode: 1 };
        await (provider as any).onDidEndTaskProcess(event);
        assert.strictEqual(context.workspaceState.get('ccsc.memory.rom'), '30');
        assert.strictEqual(context.workspaceState.get('ccsc.memory.ram'), '40');
    });
});
