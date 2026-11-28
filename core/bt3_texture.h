#ifndef BT3_TEXTURE_H
#define BT3_TEXTURE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Safe parser for the on-disk TexFile/TexEntry layout reconstructed from
 * BT3-Decompiled include/sys/tex_file.h and src/sys/tex_file.c.
 * Offsets in TexFile are measured in 32-bit words from the file base.
 */

typedef enum Bt3TexStatus {
    BT3_TEX_OK = 0,
    BT3_TEX_ERR_ARGUMENT = 1,
    BT3_TEX_ERR_TOO_SMALL = 2,
    BT3_TEX_ERR_ENTRY_COUNT = 3,
    BT3_TEX_ERR_ENTRY_TABLE = 4,
    BT3_TEX_ERR_ENTRY_INDEX = 5,
    BT3_TEX_ERR_FILE_TOO_LARGE = 6
} Bt3TexStatus;

typedef struct Bt3TexFileInfo {
    uint32_t entry_count;
    uint32_t entries_offset;
} Bt3TexFileInfo;

/*
 * bt3_texfile_validate writes two words when out_words is not NULL:
 * [0] entry_count, [1] entries_offset_bytes.
 *
 * bt3_texfile_entry_info writes sixteen words:
 * [0] pixel_offset_bytes, [1] CLUT_offset_bytes,
 * [2] pixel_size_bytes, [3] CLUT_size_bytes,
 * [4] tbp_step, [5] cbp_step, [6] pix_blt, [7] clut_blt,
 * [8] tbp_offset, [9] cbp_offset,
 * [10] TEX0 low DWORD, [11] TEX0 high DWORD,
 * [12] storage_width (2^TW), [13] storage_height (2^TH),
 * [14] PSM, [15] flags.
 *
 * flags: bit 0 pixel offset present, bit 1 pixel range valid,
 *        bit 2 CLUT offset present, bit 3 CLUT range valid.
 * A zero offset means that half of the texture is absent.
 */
Bt3TexStatus bt3_texfile_validate(
    const uint8_t *data, size_t size, uint32_t out_words[2]);
Bt3TexStatus bt3_texfile_entry_info(
    const uint8_t *data, size_t size, uint32_t index, uint32_t out_words[16]);
const char *bt3_tex_status_message(Bt3TexStatus status);

/*
 * VIF material stream helpers based on BT3-Decompiled src/battle/model_tex.c.
 * They operate on one bounded stream ending in 0x70000000, not on an
 * undocumented ObjMdlMesh list/container.
 *
 * scan writes [reference_count, minimum_TBP0, minimum_CBP].
 * rebase uses UINT32_MAX for min_tbp/min_cbp to request automatic minima.
 */
Bt3TexStatus bt3_model_vif_scan(
    const uint8_t *data, size_t size, uint32_t out_words[3]);
Bt3TexStatus bt3_model_vif_rebase(
    uint8_t *data, size_t size,
    uint32_t tbp, uint32_t cbp, uint32_t tbp2, uint32_t cbp2,
    uint32_t min_tbp, uint32_t min_cbp,
    uint32_t out_words[3]);

#ifdef __cplusplus
}
#endif

#endif
