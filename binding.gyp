{
  "target_defaults": {
    "include_dirs": [
      "xxHash",
      "src"
    ],
    "sources": [
      "src/addon.c",
      "src/xxhash128_addon.c",
      "src/xxhash3_addon.c",
      "src/xxhash64_addon.c",
      "src/xxhash32_addon.c"
    ],
    # "defines": [ "ENABLE_RUNTIME_TYPE_CHECK" ]
  },
  "targets": [
    {
      "target_name": "addon",
      "conditions": [
        [
          "(OS!='win' and '<!(echo $DEBUG)'=='1') or (OS=='win' and '<!(echo %DEBUG%)'=='1')",
          {
            "cflags": [
              "-g",
              "-O0",
              "-std=c99", # C99 is for GCC on Linux to compile. When using clang on Linux, switch to C89.
              "-pedantic",
              "-Wall",
              "-Wextra",
              "-Werror",
              "-Wstrict-prototypes",
              # "-Wno-long-long",
              "-fsanitize=address",
              "-fsanitize=undefined",
            ],
            "ldflags": [
              "-fsanitize=address",
              "-fsanitize=undefined",
            ],
            "xcode_settings": {
              "GCC_OPTIMIZATION_LEVEL": "0", # stop gyp from defaulting to -Os
              "OTHER_CFLAGS": [
                "-g",
                "-O0",
                "-std=c99",
                "-pedantic",
                "-Wall",
                "-Wextra",
                "-Werror",
                "-Wstrict-prototypes",
                # "-Wno-long-long",
                "-fsanitize=address",
                "-fsanitize=undefined",
              ],
              "OTHER_LDFLAGS": [
                "-fsanitize=address",
                "-fsanitize=undefined"
              ]
            },
            "msvs_settings": {
              "VCCLCompilerTool": {
                "BasicRuntimeChecks": 3, # /RTC1
                "MinimalRebuild": "false",
                "OmitFramePointers": "false",
                "Optimization": 0, # /Od, no optimization
                "WarningLevel": 4, # /W4, max level of warning
                # "CompileAs": 1 # /TC, compile as C
              }
            }
          },
          {
            "cflags": [
              "-O3",
              "-std=c99",
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "Optimization": 2, # /O2, max speed
                # "CompileAs": 1 # /TC, compile as C
              }
            },
            "xcode_settings": {
              "GCC_OPTIMIZATION_LEVEL": "3", # stop gyp from defaulting to -Os
              "OTHER_CFLAGS": [
                "-O3",
                "-std=c99",
              ]
            }
          }
        ]
      ]
    }
  ]
}