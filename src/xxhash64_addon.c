#include "xxhash_addon.h"

UPDATE(XXHash64_Wrapper_t, XXH64_update)
DIGEST(XXHash64_Wrapper_t, XXH64_digest, XXH64_)
RESET(XXHash64_Wrapper_t, XXH64_reset)
HASH(XXH64_, XXH64)
DESTROY(XXHash64_Wrapper_t, XXH64_freeState)
CREATE64(XXHash64_Wrapper_t, XXH64_createState, XXH64_reset)
INIT(XXHash64)
