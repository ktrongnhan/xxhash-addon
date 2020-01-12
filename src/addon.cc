#include "xxhash32.h"
#include "xxhash64.h"
#include "xxhash3.h"
#include "xxhash128.h"

napi_value Init(napi_env env, napi_value exports) {
  XXHash32::Init(env, exports);
  XXHash64::Init(env, exports);
  XXHash3::Init(env, exports);
  XXHash128::Init(env, exports);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
