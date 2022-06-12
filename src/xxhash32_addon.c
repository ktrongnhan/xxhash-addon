#include "xxhash_addon.h"

UPDATE(XXHash32_Wrapper_t, XXH32_update)
DIGEST(XXHash32_Wrapper_t, XXH32_digest, XXH32)
RESET(XXHash32_Wrapper_t, XXH32_reset)
DESTROY(XXHash32_Wrapper_t, XXH32_freeState)
CREATE32(XXHash32_Wrapper_t, XXH32_createState, XXH32_reset)
INIT(XXHash32)
