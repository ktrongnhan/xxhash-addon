#ifndef XXHASH_ADDON_H_
#define XXHASH_ADDON_H_

#include <stdlib.h>

/* DON'T REMOVE: I use clang to verify this file is C89-compliant. */
#if 0
#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wc99-extensions"
#pragma clang diagnostic ignored "-Wcomment"
#endif
#endif

#include <node_api.h>

/* DON'T REMOVE: I use clang to verify this file is C89-compliant. */
#if 0
#if defined(__clang__)
#pragma clang diagnostic pop
#endif
#endif

#define XXH_INLINE_ALL
#include "xxhash.h"

#define STRINGIZE(x) #x
#define QUOTE(x) STRINGIZE(x)

/* xxHash convention */
typedef enum { ADDON_OK = 0, ADDON_ERROR } ADDON_errorcode;

#ifdef ENABLE_RUNTIME_TYPE_CHECK
static ADDON_errorcode type_check_data_buffer(napi_env env, napi_value args[],
                                              size_t argc) {
   int is_buffer = 0;
   if (argc < 1) {
      napi_throw_range_error(env, NULL, "One param is expected");
      return ADDON_ERROR;
   }
   napi_is_buffer(env, args[0], &is_buffer);
   if (!is_buffer) {
      napi_throw_type_error(env, NULL, "Input is not a buffer");
      return ADDON_ERROR;
   }
   return ADDON_OK;
}
#else
#define type_check_data_buffer(ENV, ARGS, ARGC) ADDON_OK
#endif /* ENABLE_RUNTIME_TYPE_CHECK */

#define UPDATE(WRAPPER_TYPE, INTERNAL_UPDATE)                                 \
   static napi_value update(napi_env env, napi_callback_info info) {          \
      size_t argc = 1;                                                        \
      napi_value args[1];                                                     \
      napi_value jsthis;                                                      \
      void *data;                                                             \
      size_t buf_len;                                                         \
      WRAPPER_TYPE *hasher;                                                   \
                                                                              \
      napi_get_cb_info(env, info, &argc, args, &jsthis, NULL);                \
      if (type_check_data_buffer(env, args, argc) != ADDON_OK) {              \
         return NULL;                                                         \
      }                                                                       \
      napi_get_buffer_info(env, args[0], &data, &buf_len);                    \
      napi_unwrap(env, jsthis, (void **)&hasher);                             \
                                                                              \
      INTERNAL_UPDATE(hasher->state_, data, buf_len);                         \
      return NULL;                                                            \
   }

#define CANONICALIZE(TYPE_PREFIX)                                             \
   TYPE_PREFIX##canonicalFromHash(&canonical_sum, sum);                       \
                                                                              \
   napi_create_buffer(env, sizeof(TYPE_PREFIX##canonical_t),                  \
                      (void **)&result_data, &result);                        \
   *result_data = canonical_sum;

#define DIGEST(WRAPPER_TYPE, INTERNAL_DIGEST, TYPE_PREFIX)                    \
   static napi_value digest(napi_env env, napi_callback_info info) {          \
      napi_value jsthis;                                                      \
      napi_value result;                                                      \
      WRAPPER_TYPE *hasher;                                                   \
      TYPE_PREFIX##hash_t sum;                                                \
      TYPE_PREFIX##canonical_t canonical_sum;                                 \
      TYPE_PREFIX##canonical_t *result_data;                                  \
                                                                              \
      napi_get_cb_info(env, info, NULL, NULL, &jsthis, NULL);                 \
      napi_unwrap(env, jsthis, (void **)&hasher);                             \
                                                                              \
      sum = INTERNAL_DIGEST(hasher->state_);                                  \
      CANONICALIZE(TYPE_PREFIX)                                               \
                                                                              \
      return result;                                                          \
   }

#define HASH(TYPE_PREFIX, HASH_FUNC)                                          \
   static napi_value hash(napi_env env, napi_callback_info info) {            \
      size_t argc = 1;                                                        \
      napi_value args[1];                                                     \
      napi_value result;                                                      \
      void *data;                                                             \
      size_t buf_len;                                                         \
      TYPE_PREFIX##hash_t sum;                                                \
      TYPE_PREFIX##canonical_t canonical_sum;                                 \
      TYPE_PREFIX##canonical_t *result_data;                                  \
                                                                              \
      napi_get_cb_info(env, info, &argc, args, NULL, NULL);                   \
      if (type_check_data_buffer(env, args, argc) != ADDON_OK) {              \
         return NULL;                                                         \
      }                                                                       \
      napi_get_buffer_info(env, args[0], &data, &buf_len);                    \
      sum = HASH_FUNC(data, buf_len, 0);                                      \
                                                                              \
      CANONICALIZE(TYPE_PREFIX)                                               \
      return result;                                                          \
   }

#define RESET3(WRAPPER_TYPE, INTERNAL_RESET)                                  \
   static napi_value reset(napi_env env, napi_callback_info info) {           \
      napi_value jsthis;                                                      \
      WRAPPER_TYPE *hasher;                                                   \
      XXH_errorcode xxError;                                                  \
                                                                              \
      napi_get_cb_info(env, info, NULL, NULL, &jsthis, NULL);                 \
      napi_unwrap(env, jsthis, (void **)&hasher);                             \
                                                                              \
      xxError =                                                               \
          hasher->secret_ == NULL                                             \
              ? INTERNAL_RESET##_withSeed(hasher->state_, hasher->seed_)      \
              : INTERNAL_RESET##_withSecret(hasher->state_, hasher->secret_,  \
                                            hasher->secretSize_);             \
                                                                              \
      if (xxError != XXH_OK) {                                                \
         napi_throw_error(env, NULL, "xxHash reset failed");                  \
      }                                                                       \
      return NULL;                                                            \
   }

#define RESET(WRAPPER_TYPE, INTERNAL_RESET)                                   \
   static napi_value reset(napi_env env, napi_callback_info info) {           \
      napi_value jsthis;                                                      \
      WRAPPER_TYPE *hasher;                                                   \
      XXH_errorcode xxError;                                                  \
                                                                              \
      napi_get_cb_info(env, info, NULL, NULL, &jsthis, NULL);                 \
      napi_unwrap(env, jsthis, (void **)&hasher);                             \
                                                                              \
      xxError = INTERNAL_RESET(hasher->state_, hasher->seed_);                \
                                                                              \
      if (xxError != XXH_OK) {                                                \
         napi_throw_error(env, NULL, "xxHash reset failed");                  \
      }                                                                       \
      return NULL;                                                            \
   }

#define DESTROY3(WRAPPER_TYPE, INTERNAL_FREESTATE)                            \
   static void destroy(napi_env _unused_env, void *obj, void *_unused_hint) { \
      WRAPPER_TYPE *hasher = (WRAPPER_TYPE *)obj;                             \
      (void)_unused_env;                                                      \
      (void)_unused_hint;                                                     \
      if (hasher->secret_ != NULL) {                                          \
         free(hasher->secret_);                                               \
         hasher->secret_ = NULL;                                              \
      }                                                                       \
      if (hasher->state_ != NULL) {                                           \
         INTERNAL_FREESTATE(hasher->state_);                                  \
         hasher->state_ = NULL;                                               \
      }                                                                       \
      napi_delete_reference(hasher->env_, hasher->wrapper_);                  \
      free(hasher);                                                           \
   }

#define DESTROY(WRAPPER_TYPE, INTERNAL_FREESTATE)                             \
   static void destroy(napi_env _unused_env, void *obj, void *_unused_hint) { \
      WRAPPER_TYPE *hasher = (WRAPPER_TYPE *)obj;                             \
      (void)_unused_env;                                                      \
      (void)_unused_hint;                                                     \
      if (hasher->state_ != NULL) {                                           \
         INTERNAL_FREESTATE(hasher->state_);                                  \
         hasher->state_ = NULL;                                               \
      }                                                                       \
      napi_delete_reference(hasher->env_, hasher->wrapper_);                  \
      free(hasher);                                                           \
   }

#define COMMON_SETUP(WRAPPER_TYPE)                                            \
   size_t argc = 1;                                                           \
   napi_value args[1];                                                        \
   napi_value jsthis;                                                         \
   size_t buf_len;                                                            \
   void *data;                                                                \
   WRAPPER_TYPE *obj;                                                         \
                                                                              \
   napi_get_cb_info(env, info, &argc, args, &jsthis, NULL);                   \
   if (type_check_data_buffer(env, args, argc) != ADDON_OK) {                 \
      return NULL;                                                            \
   }                                                                          \
   napi_get_buffer_info(env, args[0], &data, &buf_len);

#define SET_UP_HASHER3(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)    \
   obj = malloc(sizeof(WRAPPER_TYPE));                                        \
   obj->state_ = INTERNAL_CREATESTATE();                                      \
   obj->secret_ = NULL;                                                       \
   obj->env_ = env;                                                           \
   if (buf_len == 4) {                                                        \
      obj->seed_ = XXH32_hashFromCanonical((XXH32_canonical_t *)data);        \
      INTERNAL_RESET##_withSeed(obj->state_, obj->seed_);                     \
   } else if (buf_len == 8) {                                                 \
      obj->seed_ = XXH64_hashFromCanonical((XXH64_canonical_t *)data);        \
      INTERNAL_RESET##_withSeed(obj->state_, obj->seed_);                     \
   } else if (buf_len >= XXH3_SECRET_SIZE_MIN) {                              \
      obj->secret_ = malloc(buf_len);                                         \
      if (obj->secret_ == NULL) {                                             \
         free(obj);                                                           \
         obj = NULL;                                                          \
         napi_fatal_error(NULL, 0, "Out-of-mem", NAPI_AUTO_LENGTH);           \
         return NULL;                                                         \
      }                                                                       \
      obj->secret_ = memcpy(obj->secret_, data, buf_len);                     \
      obj->secretSize_ = buf_len;                                             \
      INTERNAL_RESET##_withSecret(obj->state_, obj->secret_, buf_len);        \
   } else {                                                                   \
      free(obj);                                                              \
      obj = NULL;                                                             \
      napi_throw_error(                                                       \
          env, NULL,                                                          \
          "Secret must be >= " QUOTE(XXH3_SECRET_SIZE_MIN) " bytes");         \
      return NULL;                                                            \
   }

#define SET_UP_HASHER64(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)   \
   obj = malloc(sizeof(WRAPPER_TYPE));                                        \
   obj->state_ = INTERNAL_CREATESTATE();                                      \
   obj->env_ = env;                                                           \
   if (buf_len == 4) {                                                        \
      obj->seed_ = XXH32_hashFromCanonical((XXH32_canonical_t *)data);        \
      INTERNAL_RESET(obj->state_, obj->seed_);                                \
   } else if (buf_len == 8) {                                                 \
      obj->seed_ = XXH64_hashFromCanonical((XXH64_canonical_t *)data);        \
      INTERNAL_RESET(obj->state_, obj->seed_);                                \
   } else {                                                                   \
      free(obj);                                                              \
      obj = NULL;                                                             \
      napi_throw_error(env, NULL, "Seed must be 4 or 8 bytes");               \
      return NULL;                                                            \
   }

#define SET_UP_HASHER32(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)   \
   obj = malloc(sizeof(WRAPPER_TYPE));                                        \
   obj->state_ = INTERNAL_CREATESTATE();                                      \
   obj->env_ = env;                                                           \
   if (buf_len != 4) {                                                        \
      free(obj);                                                              \
      obj = NULL;                                                             \
      napi_throw_error(env, NULL, "Seed must be 4 bytes");                    \
      return NULL;                                                            \
   }                                                                          \
   obj->seed_ = XXH32_hashFromCanonical((XXH32_canonical_t *)data);           \
   INTERNAL_RESET(obj->state_, obj->seed_);

#define COMMON_WRAP                                                           \
   napi_wrap(env, jsthis, (void *)obj, destroy, NULL, &obj->wrapper_);

#define CREATE3(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)           \
   static napi_value create_instance(napi_env env, napi_callback_info info) { \
      COMMON_SETUP(WRAPPER_TYPE)                                              \
      SET_UP_HASHER3(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)      \
      COMMON_WRAP                                                             \
                                                                              \
      return jsthis;                                                          \
   }

#define CREATE64(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)          \
   static napi_value create_instance(napi_env env, napi_callback_info info) { \
      COMMON_SETUP(WRAPPER_TYPE)                                              \
      SET_UP_HASHER64(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)     \
      COMMON_WRAP                                                             \
                                                                              \
      return jsthis;                                                          \
   }

#define CREATE32(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)          \
   static napi_value create_instance(napi_env env, napi_callback_info info) { \
      COMMON_SETUP(WRAPPER_TYPE)                                              \
      SET_UP_HASHER32(WRAPPER_TYPE, INTERNAL_CREATESTATE, INTERNAL_RESET)     \
      COMMON_WRAP                                                             \
                                                                              \
      return jsthis;                                                          \
   }

#define INIT(CLASSNAME)                                                       \
   napi_value init_##CLASSNAME(napi_env env, napi_value exports) {            \
      napi_property_descriptor properties[] = {                               \
          {"update", NULL, update, NULL, NULL, NULL, napi_default, NULL},     \
          {"digest", NULL, digest, NULL, NULL, NULL, napi_default, NULL},     \
          {"reset", NULL, reset, NULL, NULL, NULL, napi_default, NULL},       \
          {"hash", NULL, hash, NULL, NULL, NULL, napi_static, NULL}};         \
      napi_value cons;                                                        \
                                                                              \
      napi_define_class(env, #CLASSNAME, NAPI_AUTO_LENGTH, create_instance,   \
                        NULL, sizeof(properties) / sizeof(*properties),       \
                        properties, &cons);                                   \
      napi_set_named_property(env, exports, #CLASSNAME, cons);                \
      return exports;                                                         \
   }

#define DECLARE_INIT(CLASSNAME)                                               \
   napi_value init_##CLASSNAME(napi_env env, napi_value exports);

#define CALL_INIT(CLASSNAME) init_##CLASSNAME(env, exports);

DECLARE_INIT(XXHash128)
DECLARE_INIT(XXHash3)
DECLARE_INIT(XXHash64)
DECLARE_INIT(XXHash32)

typedef struct {
   napi_env env_;
   napi_ref wrapper_;
   XXH64_hash_t seed_;
   XXH3_state_t *state_;
   void *secret_;
   size_t secretSize_;
} XXHash3_Wrapper_t;

typedef struct {
   napi_env env_;
   napi_ref wrapper_;
   XXH64_hash_t seed_;
   XXH64_state_t *state_;
} XXHash64_Wrapper_t;

typedef struct {
   napi_env env_;
   napi_ref wrapper_;
   XXH32_hash_t seed_;
   XXH32_state_t *state_;
} XXHash32_Wrapper_t;

#endif /* XXHASH_ADDON_H_ */
