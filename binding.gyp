{
    "targets": [
        {
            "target_name": "addon",
            "include_dirs": [
                "deps/xxHash",
                "src"
            ],
            "sources": ["src/addon.cc",
                        "src/xxhash32.cc",
                        "src/xxhash64.cc",
                        "src/xxhash3.cc"]
        }
    ]
}
