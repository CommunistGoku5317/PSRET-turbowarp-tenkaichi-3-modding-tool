#include "bt3_core.h"

#ifdef NDEBUG
#undef NDEBUG
#endif
#include <assert.h>
#include <stdio.h>
#include <string.h>

static void write_u32_le(uint8_t *p, uint32_t value) {
    p[0] = (uint8_t)(value & 0xffu);
    p[1] = (uint8_t)((value >> 8) & 0xffu);
    p[2] = (uint8_t)((value >> 16) & 0xffu);
    p[3] = (uint8_t)((value >> 24) & 0xffu);
}

static void test_pak(void) {
    uint8_t pak[36] = {0};
    Bt3ArchiveInfo info;
    Bt3EntryInfo entry;
    write_u32_le(pak, 2u);
    write_u32_le(pak + 4u, 16u);
    write_u32_le(pak + 8u, 24u);
    write_u32_le(pak + 12u, 31u); /* Existing JS parser permits trailing bytes. */
    assert(bt3_pak_validate(pak, sizeof(pak), &info) == BT3_OK);
    assert(info.entry_count == 2u && info.table_end == 16u);
    assert(bt3_pak_entry_info(pak, sizeof(pak), 1u, &entry) == BT3_OK);
    assert(entry.offset == 24u && entry.size == 7u && entry.valid == 1u);
    assert(bt3_pak_entry_info(pak, sizeof(pak), 2u, &entry) == BT3_ERR_ENTRY_INDEX);
    assert(bt3_container_kind(pak, sizeof(pak)) == BT3_CONTAINER_PAK);

    write_u32_le(pak, 0u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_ENTRY_COUNT);

    write_u32_le(pak, 2u);
    write_u32_le(pak + 4u, 17u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_FIRST_OFFSET_ALIGNMENT);
    write_u32_le(pak + 4u, 16u);
    write_u32_le(pak + 8u, 15u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_OFFSET_ORDER);
    assert(bt3_pak_validate(pak, 7u, NULL) == BT3_ERR_TOO_SMALL);
}

static void test_afs(void) {
    uint8_t afs[40] = {0};
    Bt3ArchiveInfo info;
    Bt3EntryInfo entry;
    memcpy(afs, "AFS\0", 4u);
    write_u32_le(afs + 4u, 2u);
    write_u32_le(afs + 8u, 32u);
    write_u32_le(afs + 12u, 8u);
    write_u32_le(afs + 16u, UINT32_MAX);
    write_u32_le(afs + 20u, 8u);
    assert(bt3_afs_validate(afs, sizeof(afs), &info) == BT3_OK);
    assert(info.entry_count == 2u && info.table_end == 24u);
    assert(bt3_afs_entry_info(afs, sizeof(afs), 0u, &entry) == BT3_OK);
    assert(entry.offset == 32u && entry.size == 8u && entry.valid == 1u);
    assert(bt3_afs_entry_info(afs, sizeof(afs), 1u, &entry) == BT3_OK);
    assert(entry.valid == 0u); /* Bad individual row must not hide the AFS table. */
    assert(bt3_container_kind(afs, sizeof(afs)) == BT3_CONTAINER_AFS);
    assert(bt3_afs_validate(afs, 12u, NULL) == BT3_ERR_TABLE_TRUNCATED);
}

static void test_afl(void) {
    uint8_t afl[80] = {0};
    Bt3ArchiveInfo info;
    char name[33];
    memcpy(afl, "AFL\0", 4u);
    write_u32_le(afl + 12u, 2u);
    memcpy(afl + 16u, "resident_effect.pak", 19u);
    memcpy(afl + 48u, "stage_01.pak   ", 15u);
    assert(bt3_afl_validate(afl, sizeof(afl), &info) == BT3_OK);
    assert(info.entry_count == 2u && info.table_end == 80u);
    assert(bt3_afl_entry_name(afl, sizeof(afl), 0u, name, sizeof(name)) == BT3_OK);
    assert(strcmp(name, "resident_effect.pak") == 0);
    assert(bt3_afl_entry_name(afl, sizeof(afl), 1u, name, sizeof(name)) == BT3_OK);
    assert(strcmp(name, "stage_01.pak") == 0);
    assert(bt3_afl_entry_name(afl, sizeof(afl), 2u, name, sizeof(name)) == BT3_ERR_ENTRY_INDEX);
    assert(bt3_container_kind(afl, sizeof(afl)) == BT3_CONTAINER_AFL);
}

int main(void) {
    test_pak();
    test_afs();
    test_afl();
    puts("BT3 Core tests: OK");
    return 0;
}
