#include "xxhash_addon.h"

UPDATE(XXHash3_Wrapper_t, XXH3_128bits_update)
DIGEST(XXHash3_Wrapper_t, XXH3_128bits_digest, XXH128)
RESET3(XXHash3_Wrapper_t, XXH3_128bits_reset)
DESTROY3(XXHash3_Wrapper_t, XXH3_freeState)
CREATE3(XXHash3_Wrapper_t, XXH3_createState, XXH3_128bits_reset)
INIT(XXHash128)
