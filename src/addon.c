#include "xxhash_addon.h"

static napi_value init_all(napi_env env, napi_value exports) {
   CALL_INIT(XXHash128)
   CALL_INIT(XXHash3)
   CALL_INIT(XXHash64)
   CALL_INIT(XXHash32)
   return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init_all)
