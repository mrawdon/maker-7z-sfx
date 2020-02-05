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
  extractTitle?: string
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
    appName,
    forgeConfig,
    packageJSON,
    targetArch,
    targetPlatform,
  }: MakerOptions) {

    const exePath = path.resolve(makeDir, '7z-sfx', targetPlatform, targetArch, `${path.basename(dir)}-${packageJSON.version}.exe`);

    await this.ensureFile(exePath);
    if (!this.config.runProgram) {
      throw new Error("Option runProgram must be defined");
    }
    await build(exePath, path.join(dir, "*"), this.config);

    return [exePath];
  }
}


export const build = async function (output: string, input: string, config: MakerSfxConfig) {
  // eslint-disable-next-line global-require
  const Seven = require('node-7z');

  const sevenZFile = output.replace("exe", "7z");

  const finishedPromise = promisify(finished);
  console.log(`Compressing ${input} to ${sevenZFile}`);
  await finishedPromise(Seven.add(sevenZFile, input, {
    method: ['0=BCJ', '1=LZMA:d=21'],
    $bin: require.resolve("7zip-bin\\win\\x64\\7za.exe")
  }));
  console.log("Compressed");
  console.log(`Building executable ${output}`);
  const exeStream = fs.createWriteStream(output);

  await pipeFileToStream(config.sfxFile || path.join(__dirname, "..", "7zSD_All_CustomIcon.sfx"), exeStream);
  //await pipeFileToStream(path.join(__dirname,"..","sfxConfig.txt"),exeStream);

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
  exeStream.write(";!@InstallEnd@! \r\n");
  exeStream.write(`7zSFXBuilder_7zArchive=${path.basename(sevenZFile)} \r\n`);
  exeStream.write("7zSFXBuilder_SFXIcon=Launcher\\icon-01.ico \r\n");
  exeStream.write("7zSFXBuilder_UseDefMod=7zsd_All \r\n");

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