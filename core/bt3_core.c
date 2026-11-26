#include "bt3_core.h"

#define BT3_MAX_PAK_ENTRIES 65535u
#define BT3_PAK_ALIGNMENT 16u

static uint32_t read_u32_le(const uint8_t *p) {
    return (uint32_t)p[0]
        | ((uint32_t)p[1] << 8)
        | ((uint32_t)p[2] << 16)
        | ((uint32_t)p[3] << 24);
}

Bt3Status bt3_pak_validate(const uint8_t *data, size_t size, Bt3PakInfo *info) {
    uint32_t count;
    size_t table_end;
    uint32_t previous = 0u;

    if (data == NULL) {
        return BT3_ERR_ARGUMENT;
    }
    if (size < 8u) {
        return BT3_ERR_TOO_SMALL;
    }
    if (size > UINT32_MAX) {
        return BT3_ERR_FILE_TOO_LARGE;
    }

    count = read_u32_le(data);
    if (count == 0u || count > BT3_MAX_PAK_ENTRIES) {
        return BT3_ERR_ENTRY_COUNT;
    }

    table_end = 4u + ((size_t)count + 1u) * 4u;
    if (table_end > size) {
        return BT3_ERR_TABLE_TRUNCATED;
    }

    for (uint32_t i = 0u; i <= count; ++i) {
        const uint32_t offset = read_u32_le(data + 4u + (size_t)i * 4u);

        if ((size_t)offset > size) {
            return BT3_ERR_OFFSET_RANGE;
        }
        if (i == 0u) {
            if ((size_t)offset < table_end) {
                return BT3_ERR_OFFSET_RANGE;
            }
            if ((offset % BT3_PAK_ALIGNMENT) != 0u) {
                return BT3_ERR_FIRST_OFFSET_ALIGNMENT;
            }
        } else if (offset < previous) {
            return BT3_ERR_OFFSET_ORDER;
        }

        previous = offset;
    }

    if (previous != (uint32_t)size) {
        return BT3_ERR_TERMINAL_OFFSET;
    }

    if (info != NULL) {
        info->entry_count = count;
        info->table_end = (uint32_t)table_end;
    }

    return BT3_OK;
}

Bt3Status bt3_pak_entry_range(
    const uint8_t *data,
    size_t size,
    uint32_t entry_index,
    uint32_t *entry_start,
    uint32_t *entry_end
) {
    Bt3PakInfo info;
    Bt3Status status = bt3_pak_validate(data, size, &info);
    if (status != BT3_OK) {
        return status;
    }
    if (entry_start == NULL || entry_end == NULL) {
        return BT3_ERR_ARGUMENT;
    }
    if (entry_index >= info.entry_count) {
        return BT3_ERR_ENTRY_INDEX;
    }

    *entry_start = read_u32_le(data + 4u + (size_t)entry_index * 4u);
    *entry_end = read_u32_le(data + 4u + ((size_t)entry_index + 1u) * 4u);
    return BT3_OK;
}

const char *bt3_status_message(Bt3Status status) {
    switch (status) {
        case BT3_OK: return "OK";
        case BT3_ERR_ARGUMENT: return "Invalid argument";
        case BT3_ERR_TOO_SMALL: return "PAK file is too small";
        case BT3_ERR_FILE_TOO_LARGE: return "PAK file exceeds the 32-bit offset format";
        case BT3_ERR_ENTRY_COUNT: return "Invalid PAK entry count";
        case BT3_ERR_TABLE_TRUNCATED: return "PAK offset table is truncated";
        case BT3_ERR_OFFSET_RANGE: return "PAK offset is outside the file or overlaps the header";
        case BT3_ERR_OFFSET_ORDER: return "PAK offsets are not monotonic";
        case BT3_ERR_FIRST_OFFSET_ALIGNMENT: return "First PAK data offset is not 16-byte aligned";
        case BT3_ERR_TERMINAL_OFFSET: return "Terminal PAK offset does not match file size";
        case BT3_ERR_ENTRY_INDEX: return "PAK entry index is out of range";
        default: return "Unknown BT3 Core status";
    }
}
