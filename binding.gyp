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
    ]
  },
  "targets": [
    {
      "target_name": "addon",
      "conditions": [
        [
          "'<!(echo $DEBUG)'=='1'",
          {
            "cflags": [
              "-g",
              "-O0",
              "-std=c89",
              "-Wall",
              "-Werror",
              "-Wextra",
              "-Wno-comment", # node, libuv headers contain // comment which is not C89
              "-fsanitize=address"
            ],
            "ldflags": [
              "-fsanitize=address"
            ],
            "xcode_settings": {
              "GCC_OPTIMIZATION_LEVEL": "0", # stop gyp from defaulting to -Os
              "OTHER_CFLAGS": [
                "-g",
                "-O0",
                "-std=c89",
                "-Wall",
                "-Werror",
                "-Wextra",
                "-Wno-comment",
                "-fsanitize=address"
              ],
              "OTHER_LDFLAGS": [
                "-fsanitize=address"
              ]
            },
            "msvs_settings": {
              "VCCLCompilerTool": {
                "BasicRuntimeChecks": 3, # /RTC1
                "MinimalRebuild": "false",
                "OmitFramePointers": "false",
                "Optimization": 0, # /Od, no optimization
                "CompileAs": 1 # /TC, compile as C
              },
              "VCLinkerTool": {
                "LinkIncremental": 2 # enable incremental linking
              }
            }
          },
          {
            "cflags": [
              "-O3",
              "-std=c89",
              "-Wall",
              "-Werror",
              "-Wextra",
              "-Wno-comment" # node, libuv headers contain # comment which is not C89
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "FavorSizeOrSpeed": 1, # /Ot, favor speed over size
                "InlineFunctionExpansion": 2, # /Ob2, inline anything eligible
                "OmitFramePointers": "true",
                "Optimization": 3, # /Ox, full optimization
                "CompileAs": 1 # /TC, compile as C
              }
            },
            "xcode_settings": {
              "GCC_OPTIMIZATION_LEVEL": "3", # stop gyp from defaulting to -Os
              "OTHER_CFLAGS": [
                "-O3",
                "-std=c89",
                "-Wall",
                "-Werror",
                "-Wextra",
                "-Wno-comment" # node, libuv headers contain // comment which is not C89
              ]
            }
          }
        ]
      ]
    }
  ]
}