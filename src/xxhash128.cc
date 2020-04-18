#include "xxhash128.h"
#include <assert.h>
#include <sstream>

XXHash128::XXHash128(XXH64_hash_t seed)
    : env_(nullptr), wrapper_(nullptr), seed_(seed)
{
  state_ = XXH3_createState();
  XXH3_128bits_reset_withSeed(state_, seed);
}

XXHash128::XXHash128(const void *secret, size_t secretSize)
    : env_(nullptr), wrapper_(nullptr), secretSize_(secretSize)
{
  secret_ = malloc(secretSize);
  if (secret_ == NULL)
  {
    napi_fatal_error(nullptr, 0, "Could not allocate memory for secret", NAPI_AUTO_LENGTH);
  }
  assert(secret_);

  secret_ = memcpy(secret_, secret, secretSize);
  state_ = XXH3_createState();
  XXH3_128bits_reset_withSecret(state_, secret_, secretSize);
}

XXHash128::~XXHash128()
{
  if (secret_ != NULL)
  {
    free(secret_);
    secret_ = NULL;
  }

  if (state_ != NULL)
  {
    XXH3_freeState(state_);
    state_ = NULL;
  }

  napi_delete_reference(env_, wrapper_);
}

void XXHash128::DestroyNativeObject(napi_env env,
                                        void *nativeObject,
                                        void * /*finalize_hint*/)
{
  reinterpret_cast<XXHash128 *>(nativeObject)->~XXHash128();
}

#define DECLARE_NAPI_METHOD(name, func)     \
  {                                         \
    name, 0, func, 0, 0, 0, napi_default, 0 \
  }

napi_value XXHash128::Init(napi_env env, napi_value exports)
{
  napi_status status;
  napi_property_descriptor properties[] = {
      DECLARE_NAPI_METHOD("hash", XXHash128::Hash),
      DECLARE_NAPI_METHOD("update", XXHash128::Update),
      DECLARE_NAPI_METHOD("digest", XXHash128::Digest),
      DECLARE_NAPI_METHOD("reset", XXHash128::Reset),
  };

  napi_value cons;
  status = napi_define_class(
      env, "XXHash128", NAPI_AUTO_LENGTH, New, nullptr, 4, properties, &cons);
  assert(status == napi_ok);

  status = napi_set_named_property(env, exports, "XXHash128", cons);
  assert(status == napi_ok);
  return exports;
}

napi_value XXHash128::New(napi_env env, napi_callback_info info)
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
  void *secret = NULL;
  size_t buf_len;

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
      else if (buf_len >= XXH3_SECRET_SIZE_MIN)
      {
        secret = data;
      }
      else
      {
        std::ostringstream error_msg;
        error_msg << "secret too small, must be at least " << XXH3_SECRET_SIZE_MIN << "-byte long";
        const std::string tmp_msg = error_msg.str();
        status = napi_throw_error(env, "", tmp_msg.c_str());
        assert(status == napi_ok);
        return nullptr;
      }
    }
  }

skip_all_type_checks:
  XXHash128 *native_obj;

  if (secret != NULL)
    native_obj = new XXHash128(secret, buf_len);
  else
    native_obj = new XXHash128(seed);

  native_obj->env_ = env;
  status = napi_wrap(env,
                     jsthis,
                     reinterpret_cast<void *>(native_obj),
                     XXHash128::DestroyNativeObject,
                     nullptr, // finalize_hint
                     &native_obj->wrapper_);
  assert(status == napi_ok);

  return jsthis;
}

napi_value XXHash128::Hash(napi_env env, napi_callback_info info)
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

  XXHash128 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH128_canonical_t canonical_sum;
  XXH128_hash_t sum;

  if (hasher->secret_ != NULL)
    sum = XXH3_128bits_withSecret(data, buf_len, hasher->secret_, hasher->secretSize_);
  else
    sum = XXH3_128bits_withSeed(data, buf_len, hasher->seed_);

  // canonicalize the hash value
  XXH128_canonicalFromHash(&canonical_sum, sum);

  napi_value result;
  void *result_data;
  status = napi_create_buffer(env, sizeof(XXH128_canonical_t), &result_data, &result);

  *(reinterpret_cast<XXH128_canonical_t *>(result_data)) = canonical_sum;

  return result;
}

napi_value XXHash128::Update(napi_env env, napi_callback_info info)
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

  XXHash128 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH_errorcode hash_error = XXH3_128bits_update(hasher->state_,
                                                reinterpret_cast<void *>(data),
                                                buf_len);
  assert(hash_error == XXH_OK);

  return nullptr;
}

napi_value XXHash128::Digest(napi_env env, napi_callback_info info)
{
  napi_status status;
  napi_value jsthis;

  status = napi_get_cb_info(env, info, nullptr, nullptr, &jsthis, nullptr);
  assert(status == napi_ok);

  XXHash128 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  XXH128_canonical_t canonical_sum;
  XXH128_hash_t sum = XXH3_128bits_digest(hasher->state_);

  // canonicalize the hash value
  XXH128_canonicalFromHash(&canonical_sum, sum);

  napi_value result;
  void *result_data;
  status = napi_create_buffer(env, sizeof(XXH128_canonical_t), reinterpret_cast<void **>(&result_data), &result);
  assert(status == napi_ok);
  *(reinterpret_cast<XXH128_canonical_t *>(result_data)) = canonical_sum;

  return result;
}

napi_value XXHash128::Reset(napi_env env, napi_callback_info info)
{
  napi_status status;
  napi_value jsthis;

  status = napi_get_cb_info(env, info, nullptr, nullptr, &jsthis, nullptr);
  assert(status == napi_ok);

  XXHash128 *hasher;
  status = napi_unwrap(env, jsthis, reinterpret_cast<void **>(&hasher));
  assert(status == napi_ok);

  if (hasher->secret_ == NULL)
    assert(XXH3_128bits_reset_withSeed(hasher->state_, hasher->seed_) == XXH_OK);
  else
    assert(XXH3_128bits_reset_withSecret(hasher->state_, hasher->secret_, hasher->secretSize_) == XXH_OK);

  return nullptr;
}