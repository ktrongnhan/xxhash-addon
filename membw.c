/*
 * membw.c — Single-core sequential-read memory bandwidth measurement
 *
 * Measures the maximum rate at which one core can read from memory,
 * sweeping buffer sizes from 64 KB (in-cache) to 1 GB (DRAM).
 * This establishes the per-core DRAM bandwidth ceiling to compare
 * against single-threaded xxHash streaming throughput.
 *
 * Target: Linux x64, clang -O3.
 *
 * Compile:  clang -O3 -o membw membw.c
 * Run:      taskset -c 0 ./membw
 *           (pin to one core to avoid cross-core migration noise)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>
#include <sys/mman.h>

#define WARMUP_RUNS    2
#define MEASURED_RUNS  5
#define TARGET_DATA_GB 5.0

/* Must match the xxHash diagnostic sweep sizes */
static const size_t BUFFER_SIZES[] = {
    64ULL * 1024,
    256ULL * 1024,
    1ULL * 1024 * 1024,
    4ULL * 1024 * 1024,
    16ULL * 1024 * 1024,
    64ULL * 1024 * 1024,
    256ULL * 1024 * 1024,
    1024ULL * 1024 * 1024,
};
#define NUM_SIZES (sizeof(BUFFER_SIZES) / sizeof(BUFFER_SIZES[0]))

static volatile uint64_t g_sink;

static double now_seconds(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec * 1e-9;
}

static int cmp_double(const void *a, const void *b) {
    double da = *(const double *)a;
    double db = *(const double *)b;
    return (da > db) - (da < db);
}

static double median_of(double *arr, int n) {
    qsort(arr, (size_t)n, sizeof(double), cmp_double);
    if (n % 2 != 0) return arr[n / 2];
    return (arr[n / 2 - 1] + arr[n / 2]) / 2.0;
}

/*
 * Sequential read: sum all 64-bit words in the buffer, repeated `iters` times.
 *
 * The compiler barrier at the top of each iteration prevents the optimizer
 * from hoisting loads across iterations (e.g. computing the sum once and
 * multiplying by iters).  Within each iteration the compiler is free to
 * auto-vectorize.
 *
 * Four accumulators break the serial add-dependency chain so throughput
 * is limited by memory read bandwidth, not ALU latency.
 */
static double measure_read(const uint64_t *buf, size_t count, size_t iters) {
    uint64_t s0 = 0, s1 = 0, s2 = 0, s3 = 0;

    double start = now_seconds();
    for (size_t iter = 0; iter < iters; iter++) {
        __asm__ __volatile__("" ::: "memory");
        size_t i = 0;
        for (; i + 4 <= count; i += 4) {
            s0 += buf[i];
            s1 += buf[i + 1];
            s2 += buf[i + 2];
            s3 += buf[i + 3];
        }
        for (; i < count; i++) {
            s0 += buf[i];
        }
    }
    double elapsed = now_seconds() - start;

    g_sink = s0 + s1 + s2 + s3;
    return elapsed;
}

int main(void) {
    printf("=== Single-Core Sequential Read Bandwidth ===\n\n");
    printf("What this measures: the maximum rate at which ONE core can\n");
    printf("stream-read data from memory. This is the per-core bandwidth\n");
    printf("ceiling, the relevant limit for single-threaded xxHash.\n\n");
    printf("Target data per run: %.0f GB\n", TARGET_DATA_GB);
    printf("Warmup: %d, Measured: %d runs\n\n", WARMUP_RUNS, MEASURED_RUNS);

    printf("%-12s %8s %12s %10s  %-6s %s\n",
           "Buffer Size", "Iters", "Median(ms)", "Read GB/s", "THP", "Note");
    printf("-------------------------------------------------------------\n");

    double read_gbps_arr[NUM_SIZES];
    char   labels[NUM_SIZES][32];
    int    thp_status[NUM_SIZES];
    for (size_t si = 0; si < NUM_SIZES; si++) {
        size_t buf_size = BUFFER_SIZES[si];
        size_t iters = (size_t)(TARGET_DATA_GB * 1024.0 * 1024.0 * 1024.0
                                / (double)buf_size);
        if (iters < 1) iters = 1;
        double total_gb = (double)(buf_size * iters)
                          / (1024.0 * 1024.0 * 1024.0);
        size_t word_count = buf_size / sizeof(uint64_t);

        /*
         * Allocate with 2 MB alignment so that madvise(MADV_HUGEPAGE)
         * can actually succeed.  Plain malloc returns 16-byte aligned
         * memory, which causes madvise to fail with EINVAL.
         */
        void *buf = NULL;
        int ret = posix_memalign(&buf, 2 * 1024 * 1024, buf_size);
        if (ret != 0 || !buf) {
            fprintf(stderr, "posix_memalign failed for %zu bytes, skipping\n",
                    buf_size);
            read_gbps_arr[si] = 0;
            thp_status[si] = -1;
            continue;
        }

        int thp = -1;
#ifdef MADV_HUGEPAGE
        thp = madvise(buf, buf_size, MADV_HUGEPAGE);
#endif
        thp_status[si] = thp;

        /* Fault in all pages */
        memset(buf, 0xAB, buf_size);

        /* Warmup */
        for (int w = 0; w < WARMUP_RUNS; w++)
            measure_read((const uint64_t *)buf, word_count, iters);

        /* Measured runs */
        double durs[MEASURED_RUNS];
        for (int r = 0; r < MEASURED_RUNS; r++)
            durs[r] = measure_read((const uint64_t *)buf, word_count, iters)
                      * 1000.0;

        double med_ms = median_of(durs, MEASURED_RUNS);
        double gbps = total_gb / (med_ms / 1000.0);

        const char *note;
        if (buf_size <= 256ULL * 1024) note = "cache";
        else if (buf_size <= 16ULL * 1024 * 1024) note = "cache/L3";
        else note = "DRAM";

        if (buf_size >= 1024 * 1024 * 1024)
            snprintf(labels[si], sizeof(labels[si]), "%zu GB",
                     buf_size / (1024 * 1024 * 1024));
        else if (buf_size >= 1024 * 1024)
            snprintf(labels[si], sizeof(labels[si]), "%zu MB",
                     buf_size / (1024 * 1024));
        else
            snprintf(labels[si], sizeof(labels[si]), "%zu KB",
                     buf_size / 1024);

        read_gbps_arr[si] = gbps;

        printf("%-12s %8zu %12.1f %10.3f  %-6s %s\n",
               labels[si], iters, med_ms, gbps,
               thp == 0 ? "yes" : "no", note);

        free(buf);
    }

    /* JSON output for CI consumption */
    printf("\n--- JSON_START ---\n");
    printf("{\n");
    printf("  \"diagnostic\": \"single-core-read-bandwidth\",\n");
    printf("  \"config\": { \"targetDataGB\": %.0f, "
           "\"warmupRuns\": %d, \"measuredRuns\": %d },\n",
           TARGET_DATA_GB, WARMUP_RUNS, MEASURED_RUNS);
    printf("  \"results\": [\n");
    int first = 1;
    for (size_t i = 0; i < NUM_SIZES; i++) {
        if (read_gbps_arr[i] == 0) continue;
        if (!first) printf(",\n");
        first = 0;
        printf("    { \"bufferSize\": %zu, \"label\": \"%s\", "
               "\"read_gbps\": %.3f, \"thp\": %s }",
               BUFFER_SIZES[i], labels[i], read_gbps_arr[i],
               thp_status[i] == 0 ? "true" : "false");
    }
    printf("\n  ]\n}\n");
    printf("--- JSON_END ---\n");

    return 0;
}
