#include "xxhash64.h"
#include <assert.h>

XXHash64::XXHash64(XXH64_hash_t seed)
    : env_(nullptr), wrapper_(nullptr), seed_(seed)
{
  state_ = XXH64_createState();
  XXH64_reset(state_, seed);
}

XXHash64::~XXHash64()
{
  if (state_ != NULL)
  {
    XXH64_freeState(state_);
    state_ = NULL;
  }
  napi_delete_reference(env_, wrapper_);
}

void XXHash64::DestroyNativeObject(napi_env env,
                                   void *nativeObject,
                                   void * /*finalize_hint*/)
{
  reinterpret_cast<XXHash64 *>(nativeObject)->~XXHash64();
}

#define DECLARE_NAPI_METHOD(name, func)     \
  {                                         \
    name, 0, func, 0, 0, 0, napi_default, 0 \
  }

napi_value XXHash64::Init(napi_env env, napi_value exports)
{
  napi_status status;
  napi_property_descriptor properties[] = {
      DECLARE_NAPI_METHOD("hash", XXHash64::Hash),
      DECLARE_NAPI_METHOD("update", XXHash64::Update),
      DECLARE_NAPI_METHOD("digest", XXHash64::Digest),
      DECLARE_NAPI_METHOD("reset", XXHash64::Reset),
  };

  napi_value cons;
  status = napi_define_class(
      env, "XXHash64", NAPI_AUTO_LENGTH, New, nullptr, 4, properties, &cons);
  assert(status == napi_ok);

  status = napi_set_named_property(env, exports, "XXHash64", cons);
  assert(status == napi_ok);
  return exports;
}

napi_value XXHash64::New(napi_env env, napi_callback_info info)
{
  napi_status status;
  napi_value target;
  status = napi_get_new_target(env, info, &target);
  assert(status == napi_ok);
  bool is_constructor = target != nullptr;

  if (!is_constructor)
  {
    status = napi_throw_error(env, "", "You must invoke a constructor call using 'new'");
    assert(status == napi_ok);
    return nullptr;
  }

  size_t argc = 1;
  napi_value args[1];
  napi_value jsthis;
  status = napi_get_cb_info(env, info, &argc, args, &jsthis, nullptr);
  assert(status == napi_ok);

  uint64_t seed = 0;

  if (argc == 0)
  {
    goto skip_all_type_checks;
  }

  napi_valuetype valuetype;
  status = napi_typeof(env, args[0], &valuetype);
  assert(status == napi_ok);

  if (valuetype != napi_undefined)
  {
    // try to get a 4-byte or 8-byte Buffer or an UInt32
    bool is_buffer = false;
    status = napi_is_buffer(env, args[0], &is_buffer);
    assert(status == napi_ok);

    if (!is_buffer)
    {
      // got a non-buffer type
      uint32_t data;
      status = napi_get_value_uint32(env, args[0], &data);
      assert(status == napi_ok || status == napi_number_expected);

      if (status == napi_number_expected)
      {
        status = napi_throw_type_error(env, "", "seed must be a buffer or a number");
        assert(status == napi_ok);
        return nullptr;
      }

      seed = data;
    }
    else
    {
      // got a buffer, now try to convert it into UInt64
      void *data;
      size_t buf_len;
      status = napi_get_buffer_info(env, args[0], &data, &buf_len);
      assert(status == napi_ok);

      if (buf_len == 4)
      {
        seed = XXH32_hashFromCanonical(reinterpret_cast<XXH32_canonical_t *>(data));
      }
      else if (buf_len == 8)
      {
        seed = XXH64_hashFromCanonical(reinterpret_cast<XXH64_canonical_t *>(data));
      }
      else
      {
        status = napi_throw_error(env, "", "seed must be 4-byte or 8-byte long");
        assert(status == napi_ok);
        return nullptr;
      }
    }
  }

skip_all_type_checks:
  XXHash64 *native_obj = new XXHash64(seed);

  native_obj->env_ = env;
  status = napi_wrap(env,
                     jsthis,
                     reinterpret_cast<void *>(native_obj),
                     XXHash64::DestroyNativeObject,
                     nullptr, // finalize_hint
                     &native_obj->wrapper_);
  assert(status == napi_ok);

  return jsthis;
}

napi_value XXHash64::Hash(napi_env env, napi_callback_info info)
{
  napi_status status;
  size_t argc = 1;
  napi_value args[1];
  napi_value jsthis;
  bool is_buffer;
  status = napi_get_cb_info(env, info, &argc, args, &jsthis, nullptr);
  assert(status == napi_ok);

  if (argc < 1)
  {
    status = napi_throw_error(env, "", "You must pass me a buffer");
    assert(status == napi_ok);
    return nullptr;
  }

  status = napi_is_buffer(env, args[0], &is_buffer);
  assert(status == napi_ok);

  if (!is_buffer)
  {
    status = napi_throw_type_error(env, "", "You must pass me a buffer");
    assert(status == napi_ok);
    return nullptr;
  }

  void *data;
  size_t buf_len;

  status = napi_get_buffer_info(env, args[0], &data, &buf_len);
  assert(status == napi_ok);

  XXHash64 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH64_canonical_t canonical_sum;
  XXH64_hash_t sum = XXH64(data, buf_len, hasher->seed_);

  // canonicalize the hash value
  XXH64_canonicalFromHash(&canonical_sum, sum);

  napi_value result;
  void *result_data;
  status = napi_create_buffer(env, sizeof(XXH64_canonical_t), &result_data, &result);

  *(reinterpret_cast<XXH64_canonical_t *>(result_data)) = canonical_sum;

  return result;
}

napi_value XXHash64::Update(napi_env env, napi_callback_info info)
{
  napi_status status;
  size_t argc = 1;
  napi_value args[1];
  napi_value jsthis;
  bool is_buffer;
  status = napi_get_cb_info(env, info, &argc, args, &jsthis, nullptr);
  assert(status == napi_ok);

  if (argc < 1)
  {
    status = napi_throw_error(env, "", "You must pass me a buffer");
    assert(status == napi_ok);
    return nullptr;
  }

  status = napi_is_buffer(env, args[0], &is_buffer);
  assert(status == napi_ok);

  if (!is_buffer)
  {
    status = napi_throw_type_error(env, "", "You must pass me a buffer");
    assert(status == napi_ok);
    return nullptr;
  }

  void *data;
  size_t buf_len;

  status = napi_get_buffer_info(env, args[0], &data, &buf_len);
  assert(status == napi_ok);

  XXHash64 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH_errorcode hash_error = XXH64_update(hasher->state_,
                                          reinterpret_cast<void *>(data),
                                          buf_len);
  assert(hash_error == XXH_OK);

  return nullptr;
}

napi_value XXHash64::Digest(napi_env env, napi_callback_info info)
{
  napi_status status;
  napi_value jsthis;

  status = napi_get_cb_info(env, info, nullptr, nullptr, &jsthis, nullptr);
  assert(status == napi_ok);

  XXHash64 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH64_canonical_t canonical_sum;
  XXH64_hash_t sum = XXH64_digest(hasher->state_);

  // canonicalize the hash value
  XXH64_canonicalFromHash(&canonical_sum, sum);

  napi_value result;
  void *result_data;
  status = napi_create_buffer(env, sizeof(XXH64_canonical_t), reinterpret_cast<void **>(&result_data), &result);
  assert(status == napi_ok);
  *(reinterpret_cast<XXH64_canonical_t *>(result_data)) = canonical_sum;

  return result;
}

napi_value XXHash64::Reset(napi_env env, napi_callback_info info)
{
  napi_status status;
  napi_value jsthis;

  status = napi_get_cb_info(env, info, nullptr, nullptr, &jsthis, nullptr);
  assert(status == napi_ok);

  XXHash64 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  assert(XXH64_reset(hasher->state_, hasher->seed_) == XXH_OK);

  return nullptr;
}