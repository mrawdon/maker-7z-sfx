# 7z SFX maker for Electron Forge

This will bundle all assets from your build directory to create a self extracting binary

## Configuration
1. Add to dev dependencies
2. Add the following maker configuration
```
{
   "name": "maker-7z-sfx"
}
```
3. You can configure additional options using the options found in the inteface MakerSfxConfig in [MakerSfxConfig.ts](src/Maker7z-sfx.ts)
 * The definition of the 7z fields can be found at [Parameters](https://github.com/chrislake/7zsfxmm/wiki/Parameters)
 * Additional fields can be defined using either additionalConfig or additionalPostConfig (to define something after !@InstallEnd@!)
 * You can also override the 7z method using sevenZMethod, the default came from this StackOverflow answer (https://stackoverflow.com/a/50466389)

Note: the 7zsd sfx files are downloaded from https://github.com/OlegScherbakov/7zSFX they are separetely licensed under the LGPL
