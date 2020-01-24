{
  "targets": [{
    "target_name": "addon",
    "include_dirs": [
      "deps/xxHash",
      "src"
    ],
    "sources": [
      "src/addon.cc",
      "src/xxhash32.cc",
      "src/xxhash64.cc",
      "src/xxhash3.cc",
      "src/xxhash128.cc"
    ],
    "conditions": [
      ["OS=='linux'", { "cflags": [ "-O3" ]}],
      ["OS=='mac'", { "xcode_settings": { "OTHER_CFLAGS": [ "-O3" ]}}],
      # Optimization for Windows with MSBuild is not necessary as for Release
      # build the optimization is at Full, which seems reasonable if
      # compared to node's common.gypi, by default.
    ]
  }]
}
