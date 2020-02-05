import MakerBase, { MakerOptions } from '@electron-forge/maker-base';
import { ForgePlatform } from '@electron-forge/shared-types';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { finished } from 'stream';

export interface MakerSfxConfig {
  sfxFile?: string,
  //the following map to https://github.com/chrislake/7zsfxmm/wiki/Parameters
  title?: string,
  extractDialogText?: string,
  installPath?: string,
  runProgram: string,
  guiMode?: 1 | 2,
  overwriteMode?: 0 | 1 | 2,
  extractPathTitle?: string,
  extractTitle?: string,
  additionalConfig?: string[],
  additionalPostConfig?: string[],
  sevenZMethod: string[]
}

export default class Maker7zSfx extends MakerBase<MakerSfxConfig> {
  name = 'maker-7z-sfx';

  defaultPlatforms: ForgePlatform[] = ['win32'];

  isSupportedOnCurrentPlatform() {
    return true;
  }

  async make({
    dir,
    makeDir,
    packageJSON,
    targetArch,
    targetPlatform,
  }: MakerOptions) {
    const exePath = path.resolve(makeDir, '7z-sfx', targetPlatform, targetArch, `${path.basename(dir)}-${packageJSON.version}.exe`);
    await this.ensureFile(exePath);
    if (!this.config.runProgram) {
      throw new Error("Option runProgram must be defined");
    }
    await build(exePath, path.join(dir, "*"), this.config, targetArch);
    return [exePath];
  }
}


export const build = async function (output: string, input: string, config: MakerSfxConfig, targetArch: string) {
  // eslint-disable-next-line global-require
  const Seven = require('node-7z');

  const sevenZFile = output.replace("exe", "7z");

  const finishedPromise = promisify(finished);
  console.log(`Compressing ${input} to ${sevenZFile}`);
  await finishedPromise(Seven.add(sevenZFile, input, {
    method: config.sevenZMethod || [
      "0=lzma2",
      "x=9",
      "d=1024m",
      "s=on"
    ],
    $bin: require.resolve("7zip-bin\\win\\x64\\7za.exe")
  }));
  console.log("Compressed");
  console.log(`Building executable ${output}`);
  const exeStream = fs.createWriteStream(output);
  await pipeFileToStream(config.sfxFile || path.join(__dirname, "..", "7zsd_extra_162_3888", targetArch === "x64" ? "7zSD_All_x64.sfx" : "7zSD_All.sfx"), exeStream);
  await writeConfigToStream(config, exeStream);
  await pipeFileToStream(sevenZFile, exeStream);

  exeStream.close();
}

async function pipeFileToStream(file: string, writeStream: fs.WriteStream) {
  console.log(`Copying ${file}`);
  const readStream = fs.createReadStream(file);
  const p = new Promise((resolve: (value?: unknown) => void, reject: (reason?: any) => void) => {

    readStream.on('end', () => {
      resolve();
    });
    readStream.on('error', (err: any) => {
      console.warn(`Rejecting error `, err);
      reject(err);
    });
  });
  readStream.pipe(writeStream, { end: false });
  await p;
  console.log(`Copied ${file}`);
}

async function writeConfigToStream(config: MakerSfxConfig, exeStream: fs.WriteStream) {

  exeStream.write(";!@Install@!UTF-8! \r\n");
  if (config.title) {
    exeStream.write(`Title="${config.title}" \r\n`);
  }

  exeStream.write(`InstallPath="${config.installPath || "extract"}" \r\n`);

  exeStream.write(`GUIMode="${config.guiMode || 1}" \r\n`);
  exeStream.write(`OverwriteMode="${config.overwriteMode || 2}" \r\n`);
  if (config.extractPathTitle) {
    exeStream.write(`ExtractPathTitle="${config.extractPathTitle}" \r\n`);
  }

  exeStream.write(`ExtractTitle="${config.extractTitle || `Launching ${config.runProgram}`}" \r\n`);
  if (config.extractDialogText) {
    exeStream.write(`ExtractDialogText="${config.extractDialogText}" \r\n`);
  }

  exeStream.write(`RunProgram="${config.runProgram}" \r\n`);
  if (config.additionalConfig) {
    config.additionalConfig.forEach(line => {
      exeStream.write(`${line} \r\n`);
    });
  }
  exeStream.write(";!@InstallEnd@! \r\n");
  if (config.additionalPostConfig) {
    config.additionalPostConfig.forEach(line => {
      exeStream.write(`${line} \r\n`);
    });
  }
}