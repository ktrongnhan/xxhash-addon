#ifndef XXHASH3_H_
#define XXHASH3_H_

#include <node_api.h>

#define XXH_INLINE_ALL
/** if set to 1, when input is a NULL pointer, xxhash result is the same as a zero-length input (instead of a
 * dereference segfault). Adds one branch at the beginning of the hash.
 */
#define XXH_ACCEPT_NULL_INPUT_POINTER 1
/** gives access to state declaration for static allocation. Incompatible with dynamic linking, due to risks of
 * ABI changes.
 */
#define XXH_STATIC_LINKING_ONLY
#include "xxhash.h"

class XXHash3
{
public:
  static napi_value Init(napi_env env, napi_value exports);
  static void DestroyNativeObject(napi_env env, void *nativeObject, void *finalize_hint);

private:
  explicit XXHash3(XXH64_hash_t seed);
  XXHash3(const void *secret, size_t secretSize);
  ~XXHash3();

  static napi_value New(napi_env env, napi_callback_info info);
  static napi_value Hash(napi_env env, napi_callback_info info);
  static napi_value Update(napi_env env, napi_callback_info info);
  static napi_value Digest(napi_env env, napi_callback_info info);
  static napi_value Reset(napi_env env, napi_callback_info info);
  napi_env env_;
  napi_ref wrapper_;
  XXH64_hash_t seed_;
  XXH3_state_t* state_ = NULL;
  void *secret_ = NULL;
  size_t secretSize_;
};

#endif