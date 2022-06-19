#include "xxhash_addon.h"

UPDATE(XXHash3_Wrapper_t, XXH3_128bits_update)
DIGEST(XXHash3_Wrapper_t, XXH3_128bits_digest, XXH128_)
RESET3(XXHash3_Wrapper_t, XXH3_128bits_reset)
HASH(XXH128_, XXH3_128bits_withSeed)
DESTROY3(XXHash3_Wrapper_t, XXH3_freeState)
CREATE3(XXHash3_Wrapper_t, XXH3_createState, XXH3_128bits_reset)
INIT(XXHash128)
