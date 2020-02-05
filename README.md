# 7z SFX maker for Electron Forge

This will bundle all assets from your build directory to create a self extracting binary

## Configuration
1. Add to dev dependencies
2. Add the following maker configuration
```
  {
          "name": "maker-7z-sfx",
          "config": {
            "runProgram": "MyApplication.exe"
          }
        }
```
3. Configure additional options you can find the ones currently defined in [MakerSfxConfig.ts](src/Maker7z-sfx.ts)
The definition of the fields can be found at [Parameters](https://github.com/chrislake/7zsfxmm/wiki/Parameters)
