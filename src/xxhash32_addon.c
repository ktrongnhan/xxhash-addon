#include "xxhash_addon.h"

UPDATE(XXHash32_Wrapper_t, XXH32_update)
DIGEST(XXHash32_Wrapper_t, XXH32_digest, XXH32_)
RESET(XXHash32_Wrapper_t, XXH32_reset)
HASH(XXH32_, XXH32)
DESTROY(XXHash32_Wrapper_t, XXH32_freeState)
CREATE32(XXHash32_Wrapper_t, XXH32_createState, XXH32_reset)
INIT(XXHash32)
