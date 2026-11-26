#ifndef BT3_CORE_H
#define BT3_CORE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum Bt3Status {
    BT3_OK = 0,
    BT3_ERR_ARGUMENT = 1,
    BT3_ERR_TOO_SMALL = 2,
    BT3_ERR_FILE_TOO_LARGE = 3,
    BT3_ERR_ENTRY_COUNT = 4,
    BT3_ERR_TABLE_TRUNCATED = 5,
    BT3_ERR_OFFSET_RANGE = 6,
    BT3_ERR_OFFSET_ORDER = 7,
    BT3_ERR_FIRST_OFFSET_ALIGNMENT = 8,
    BT3_ERR_TERMINAL_OFFSET = 9,
    BT3_ERR_ENTRY_INDEX = 10
} Bt3Status;

typedef struct Bt3PakInfo {
    uint32_t entry_count;
    uint32_t table_end;
} Bt3PakInfo;

/* Validate the Spike PAK header and offset table. Does not inspect QRS data. */
Bt3Status bt3_pak_validate(const uint8_t *data, size_t size, Bt3PakInfo *info);

/* Return the byte range of one PAK entry after validating the whole table. */
Bt3Status bt3_pak_entry_range(
    const uint8_t *data,
    size_t size,
    uint32_t entry_index,
    uint32_t *entry_start,
    uint32_t *entry_end
);

/* Stable text for UI diagnostics. */
const char *bt3_status_message(Bt3Status status);

#ifdef __cplusplus
}
#endif

#endif
