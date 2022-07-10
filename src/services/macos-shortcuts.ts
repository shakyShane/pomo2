import {Command} from "@tauri-apps/api/shell";
import {invoke} from "@tauri-apps/api/tauri";

export function listShortcuts(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const command = new Command('macos-shortcuts-list');
    const lines: string[] = [];
    const errLines: string[] = [];
    command.on('close', data => {
      console.log(`command finished with code ${data.code} and signal ${data.signal}`)
      if (data.code === 0) {
        resolve(lines);
      } else {
        console.error('none-zero exit code')
        reject(new Error(errLines.join('\n')));
      }
    });
    command.on('error', error => console.error(`command error: "${error}"`));
    command.stdout.on('data', line => lines.push(line.toString()));
    command.stderr.on('data', line => errLines.push(line.toString()));

    command.spawn().then((res) => {
      console.log('got list', res);
    }).catch((e) => {
      console.log('couldnt get list', e)
    })
  })
}

export function invokeShortcut(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    invoke('my_custom_command').then((res) => {
      console.log('got result', res);
      resolve(res);
    }).catch((e) => {
      reject(e);
    })
  })
}
