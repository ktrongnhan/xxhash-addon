#include "xxhash_addon.h"

UPDATE(XXHash3_Wrapper_t, XXH3_64bits_update)
DIGEST(XXHash3_Wrapper_t, XXH3_64bits_digest, XXH64)
RESET3(XXHash3_Wrapper_t, XXH3_64bits_reset)
DESTROY3(XXHash3_Wrapper_t, XXH3_freeState)
CREATE3(XXHash3_Wrapper_t, XXH3_createState, XXH3_64bits_reset)
INIT(XXHash3)
