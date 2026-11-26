#include "bt3_core.h"

#include <string.h>

#define BT3_MAX_TABLE_ENTRIES 1000000u
#define BT3_PAK_ALIGNMENT 16u

static uint32_t read_u32_le(const uint8_t *p) {
    return (uint32_t)p[0]
        | ((uint32_t)p[1] << 8)
        | ((uint32_t)p[2] << 16)
        | ((uint32_t)p[3] << 24);
}

static int has_magic(const uint8_t *data, size_t size, const char magic[4]) {
    return data != NULL && size >= 4u && memcmp(data, magic, 4u) == 0;
}

static Bt3Status validate_size_and_count(size_t size, uint32_t count, size_t header_size,
                                         size_t item_size, size_t *table_end) {
    size_t entries_size;
    if (size > UINT32_MAX) return BT3_ERR_FILE_TOO_LARGE;
    if (count > BT3_MAX_TABLE_ENTRIES) return BT3_ERR_ENTRY_COUNT;
    if ((size_t)count > (SIZE_MAX - header_size) / item_size) return BT3_ERR_TABLE_TRUNCATED;
    entries_size = (size_t)count * item_size;
    *table_end = header_size + entries_size;
    if (*table_end > size) return BT3_ERR_TABLE_TRUNCATED;
    return BT3_OK;
}

Bt3Status bt3_pak_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info) {
    uint32_t count;
    size_t table_end;
    uint32_t previous = 0u;
    if (data == NULL) return BT3_ERR_ARGUMENT;
    if (size < 8u) return BT3_ERR_TOO_SMALL;
    if (size > UINT32_MAX) return BT3_ERR_FILE_TOO_LARGE;

    count = read_u32_le(data);
    if (count == 0u) return BT3_ERR_ENTRY_COUNT;
    if (count > BT3_MAX_TABLE_ENTRIES) return BT3_ERR_ENTRY_COUNT;
    table_end = 4u + ((size_t)count + 1u) * 4u;
    if (table_end > size) return BT3_ERR_TABLE_TRUNCATED;

    for (uint32_t i = 0u; i <= count; ++i) {
        const uint32_t offset = read_u32_le(data + 4u + (size_t)i * 4u);
        if ((size_t)offset > size) return BT3_ERR_OFFSET_RANGE;
        if (i == 0u) {
            if ((size_t)offset < table_end) return BT3_ERR_OFFSET_RANGE;
            if ((offset % BT3_PAK_ALIGNMENT) != 0u) return BT3_ERR_FIRST_OFFSET_ALIGNMENT;
        } else if (offset < previous) {
            return BT3_ERR_OFFSET_ORDER;
        }
        previous = offset;
    }

    /* Match the checked-in JS parser: trailing bytes after the terminal offset
       are tolerated; every offset still has to be inside the file. */
    if (info != NULL) {
        info->entry_count = count;
        info->table_end = (uint32_t)table_end;
    }
    return BT3_OK;
}

Bt3Status bt3_pak_entry_info(const uint8_t *data, size_t size, uint32_t index, Bt3EntryInfo *entry) {
    Bt3ArchiveInfo info;
    Bt3Status status;
    uint32_t start;
    uint32_t end;
    if (entry == NULL) return BT3_ERR_ARGUMENT;
    status = bt3_pak_validate(data, size, &info);
    if (status != BT3_OK) return status;
    if (index >= info.entry_count) return BT3_ERR_ENTRY_INDEX;
    start = read_u32_le(data + 4u + (size_t)index * 4u);
    end = read_u32_le(data + 4u + ((size_t)index + 1u) * 4u);
    entry->offset = start;
    entry->size = end - start;
    entry->valid = 1u;
    return BT3_OK;
}

Bt3Status bt3_afs_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info) {
    uint32_t count;
    size_t table_end;
    Bt3Status status;
    if (data == NULL) return BT3_ERR_ARGUMENT;
    if (size < 8u) return BT3_ERR_TOO_SMALL;
    if (!has_magic(data, size, "AFS\0")) return BT3_ERR_BAD_MAGIC;
    count = read_u32_le(data + 4u);
    status = validate_size_and_count(size, count, 8u, 8u, &table_end);
    if (status != BT3_OK) return status;
    if (info != NULL) {
        info->entry_count = count;
        info->table_end = (uint32_t)table_end;
    }
    return BT3_OK;
}

Bt3Status bt3_afs_entry_info(const uint8_t *data, size_t size, uint32_t index, Bt3EntryInfo *entry) {
    Bt3ArchiveInfo info;
    Bt3Status status;
    uint32_t offset;
    uint32_t length;
    if (entry == NULL) return BT3_ERR_ARGUMENT;
    status = bt3_afs_validate(data, size, &info);
    if (status != BT3_OK) return status;
    if (index >= info.entry_count) return BT3_ERR_ENTRY_INDEX;
    offset = read_u32_le(data + 8u + (size_t)index * 8u);
    length = read_u32_le(data + 12u + (size_t)index * 8u);
    entry->offset = offset;
    entry->size = length;
    entry->valid = (uint8_t)((offset <= size && (size_t)length <= size - (size_t)offset) ? 1u : 0u);
    /* The original web parser opens the AFS table even when an individual
       entry range is bad; keep that behavior and report validity per entry. */
    return BT3_OK;
}

Bt3Status bt3_afl_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info) {
    uint32_t count;
    size_t table_end;
    Bt3Status status;
    if (data == NULL) return BT3_ERR_ARGUMENT;
    if (size < 16u) return BT3_ERR_TOO_SMALL;
    if (!has_magic(data, size, "AFL\0")) return BT3_ERR_BAD_MAGIC;
    count = read_u32_le(data + 12u);
    status = validate_size_and_count(size, count, 16u, 32u, &table_end);
    if (status != BT3_OK) return status;
    if (info != NULL) {
        info->entry_count = count;
        info->table_end = (uint32_t)table_end;
    }
    return BT3_OK;
}

Bt3Status bt3_afl_entry_name(const uint8_t *data, size_t size, uint32_t index,
                             char *out_name, size_t out_capacity) {
    Bt3ArchiveInfo info;
    Bt3Status status;
    const uint8_t *raw;
    size_t begin = 0u;
    size_t length = 0u;
    if (out_name == NULL || out_capacity == 0u) return BT3_ERR_ARGUMENT;
    out_name[0] = '\0';
    status = bt3_afl_validate(data, size, &info);
    if (status != BT3_OK) return status;
    if (index >= info.entry_count) return BT3_ERR_ENTRY_INDEX;
    raw = data + 16u + (size_t)index * 32u;
    while (length < 32u && raw[length] != 0u) ++length;
    while (begin < length && (raw[begin] == ' ' || raw[begin] == '\t' || raw[begin] == '\r' || raw[begin] == '\n')) ++begin;
    while (length > begin && (raw[length - 1u] == ' ' || raw[length - 1u] == '\t' || raw[length - 1u] == '\r' || raw[length - 1u] == '\n')) --length;
    if (length - begin + 1u > out_capacity) return BT3_ERR_NAME_BUFFER;
    memcpy(out_name, raw + begin, length - begin);
    out_name[length - begin] = '\0';
    return BT3_OK;
}

Bt3ContainerKind bt3_container_kind(const uint8_t *data, size_t size) {
    if (data == NULL) return BT3_CONTAINER_UNKNOWN;
    if (bt3_afs_validate(data, size, NULL) == BT3_OK) return BT3_CONTAINER_AFS;
    if (bt3_pak_validate(data, size, NULL) == BT3_OK) return BT3_CONTAINER_PAK;
    if (bt3_afl_validate(data, size, NULL) == BT3_OK) return BT3_CONTAINER_AFL;
    return BT3_CONTAINER_UNKNOWN;
}

const char *bt3_status_message(Bt3Status status) {
    switch (status) {
        case BT3_OK: return "OK";
        case BT3_ERR_ARGUMENT: return "Invalid argument";
        case BT3_ERR_TOO_SMALL: return "File is too small";
        case BT3_ERR_FILE_TOO_LARGE: return "File exceeds the 32-bit offset format";
        case BT3_ERR_ENTRY_COUNT: return "Invalid or excessive entry count";
        case BT3_ERR_TABLE_TRUNCATED: return "Entry table is truncated";
        case BT3_ERR_OFFSET_RANGE: return "Entry offset is outside the file or overlaps the header";
        case BT3_ERR_OFFSET_ORDER: return "PAK offsets are not monotonic";
        case BT3_ERR_FIRST_OFFSET_ALIGNMENT: return "First PAK data offset is not 16-byte aligned";
        case BT3_ERR_ENTRY_INDEX: return "Entry index is out of range";
        case BT3_ERR_BAD_MAGIC: return "Unrecognized file signature";
        case BT3_ERR_NAME_BUFFER: return "Output name buffer is too small";
        default: return "Unknown BT3 Core status";
    }
}
