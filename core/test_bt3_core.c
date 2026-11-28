#include "bt3_core.h"
#include "bt3_texture.h"

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
    write_u32_le(pak + 12u, 31u);
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
    assert(entry.valid == 0u);
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

static void test_texfile(void) {
    uint8_t file[160] = {0};
    uint32_t info[2], entry[16];
    const uint32_t tw = 5u, th = 4u;
    const uint32_t tex0_lo = (0x13u << 20) | (tw << 26) | ((th & 3u) << 30);
    const uint32_t tex0_hi = th >> 2;

    write_u32_le(file, 1u);       /* TexFile.count */
    write_u32_le(file + 4u, 4u);  /* entOfs = 4 words -> byte 16 */
    write_u32_le(file + 16u, 20u); /* pixOfs -> byte 80 */
    write_u32_le(file + 20u, 24u); /* clutOfs -> byte 96 */
    write_u32_le(file + 24u, 16u); /* pixSize */
    write_u32_le(file + 28u, 64u); /* clutSize */
    write_u32_le(file + 32u, 3u);  /* tbpStep */
    write_u32_le(file + 36u, 1u);  /* cbpStep */
    write_u32_le(file + 40u, 0x1234u);
    write_u32_le(file + 44u, 0x5678u);
    write_u32_le(file + 48u, 7u);
    write_u32_le(file + 52u, 9u);
    write_u32_le(file + 64u, tex0_lo);
    write_u32_le(file + 68u, tex0_hi);

    assert(bt3_texfile_validate(file, sizeof(file), info) == BT3_TEX_OK);
    assert(info[0] == 1u && info[1] == 16u);
    assert(bt3_texfile_entry_info(file, sizeof(file), 0u, entry) == BT3_TEX_OK);
    assert(entry[0] == 80u && entry[1] == 96u);
    assert(entry[2] == 16u && entry[3] == 64u);
    assert(entry[12] == 32u && entry[13] == 16u);
    assert(entry[14] == 0x13u);
    assert(entry[15] == 0x0Fu);
    assert(bt3_texfile_entry_info(file, sizeof(file), 1u, entry) == BT3_TEX_ERR_ENTRY_INDEX);

    write_u32_le(file + 20u, 0xFFFFFFFFu);
    assert(bt3_texfile_entry_info(file, sizeof(file), 0u, entry) == BT3_TEX_OK);
    assert((entry[15] & 0x04u) != 0u && (entry[15] & 0x08u) == 0u);
}

static void test_model_vif(void) {
    uint8_t stream[13u * 4u] = {0};
    uint32_t stats[3];
    uint32_t word;

    write_u32_le(stream + 0u, 0x6C058000u);
    write_u32_le(stream + 5u * 4u, 0xA0000005u | 5u);
    write_u32_le(stream + 6u * 4u, 0x000000C0u | (6u << 5));
    write_u32_le(stream + 9u * 4u, 0xB0000007u | 7u);
    write_u32_le(stream + 10u * 4u, 0x00000100u | (8u << 5));
    write_u32_le(stream + 12u * 4u, 0x70000000u);

    assert(bt3_model_vif_scan(stream, sizeof(stream), stats) == BT3_TEX_OK);
    assert(stats[0] == 1u && stats[1] == 5u && stats[2] == 6u);
    assert(bt3_model_vif_rebase(stream, sizeof(stream), 100u, 200u, 300u, 400u,
                                UINT32_MAX, UINT32_MAX, stats) == BT3_TEX_OK);
    assert(stats[0] == 1u && stats[1] == 5u && stats[2] == 6u);
    word = (uint32_t)stream[20] | ((uint32_t)stream[21] << 8);
    assert((word & 0x3FFFu) == 100u);
    word = (uint32_t)stream[24] | ((uint32_t)stream[25] << 8);
    assert(((word >> 5) & 0x3FFFu) == 200u);
    word = (uint32_t)stream[36] | ((uint32_t)stream[37] << 8);
    assert((word & 0x3FFFu) == 300u);
    word = (uint32_t)stream[40] | ((uint32_t)stream[41] << 8);
    assert(((word >> 5) & 0x3FFFu) == 408u);
}

int main(void) {
    test_pak();
    test_afs();
    test_afl();
    test_texfile();
    test_model_vif();
    puts("BT3 Core tests: OK");
    return 0;
}
