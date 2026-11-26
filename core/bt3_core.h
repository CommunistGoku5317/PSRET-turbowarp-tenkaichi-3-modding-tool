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
    BT3_ERR_ENTRY_INDEX = 9,
    BT3_ERR_BAD_MAGIC = 10,
    BT3_ERR_NAME_BUFFER = 11
} Bt3Status;

typedef enum Bt3ContainerKind {
    BT3_CONTAINER_UNKNOWN = 0,
    BT3_CONTAINER_AFS = 1,
    BT3_CONTAINER_PAK = 2,
    BT3_CONTAINER_AFL = 3
} Bt3ContainerKind;

typedef struct Bt3ArchiveInfo {
    uint32_t entry_count;
    uint32_t table_end;
} Bt3ArchiveInfo;

typedef struct Bt3EntryInfo {
    uint32_t offset;
    uint32_t size;
    uint8_t valid;
} Bt3EntryInfo;

/* Spike PAK: count + (count + 1) little-endian offsets. */
Bt3Status bt3_pak_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info);
Bt3Status bt3_pak_entry_info(const uint8_t *data, size_t size, uint32_t index, Bt3EntryInfo *entry);

/* AFS: "AFS\0", count, then count (offset,size) pairs. */
Bt3Status bt3_afs_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info);
Bt3Status bt3_afs_entry_info(const uint8_t *data, size_t size, uint32_t index, Bt3EntryInfo *entry);

/* AFL name table: "AFL\0", count at byte 12, then 32-byte names. */
Bt3Status bt3_afl_validate(const uint8_t *data, size_t size, Bt3ArchiveInfo *info);
Bt3Status bt3_afl_entry_name(
    const uint8_t *data,
    size_t size,
    uint32_t index,
    char *out_name,
    size_t out_capacity
);

/* Identify a well-formed top-level BT3 container. Returns UNKNOWN otherwise. */
Bt3ContainerKind bt3_container_kind(const uint8_t *data, size_t size);
const char *bt3_status_message(Bt3Status status);

#ifdef __cplusplus
}
#endif

#endif