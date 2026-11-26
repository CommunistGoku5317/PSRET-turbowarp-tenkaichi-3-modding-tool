#include "bt3_core.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

static void write_u32_le(uint8_t *p, uint32_t value) {
    p[0] = (uint8_t)(value & 0xffu);
    p[1] = (uint8_t)((value >> 8) & 0xffu);
    p[2] = (uint8_t)((value >> 16) & 0xffu);
    p[3] = (uint8_t)((value >> 24) & 0xffu);
}

static void make_valid_pak(uint8_t pak[32]) {
    memset(pak, 0, 32);
    write_u32_le(pak, 1u);
    write_u32_le(pak + 4, 16u);
    write_u32_le(pak + 8, 32u);
}

int main(void) {
    uint8_t pak[32];
    Bt3PakInfo info;
    uint32_t start = 0u;
    uint32_t end = 0u;

    make_valid_pak(pak);
    assert(bt3_pak_validate(pak, sizeof(pak), &info) == BT3_OK);
    assert(info.entry_count == 1u);
    assert(info.table_end == 12u);

    assert(bt3_pak_entry_range(pak, sizeof(pak), 0u, &start, &end) == BT3_OK);
    assert(start == 16u && end == 32u);
    assert(bt3_pak_entry_range(pak, sizeof(pak), 1u, &start, &end) == BT3_ERR_ENTRY_INDEX);

    assert(bt3_pak_validate(pak, 7u, NULL) == BT3_ERR_TOO_SMALL);

    write_u32_le(pak, 0u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_ENTRY_COUNT);

    make_valid_pak(pak);
    write_u32_le(pak + 4, 17u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_FIRST_OFFSET_ALIGNMENT);

    make_valid_pak(pak);
    write_u32_le(pak + 8, 15u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_OFFSET_ORDER);

    make_valid_pak(pak);
    write_u32_le(pak + 8, 31u);
    assert(bt3_pak_validate(pak, sizeof(pak), NULL) == BT3_ERR_TERMINAL_OFFSET);

    puts("BT3 Core PAK tests: OK");
    return 0;
}
