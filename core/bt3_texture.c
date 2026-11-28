#include "bt3_texture.h"

#include <limits.h>

#define BT3_TEX_HEADER_SIZE 16u
#define BT3_TEX_ENTRY_SIZE 64u
#define BT3_TEX_MAX_ENTRIES 65535u
#define BT3_VIF_TEX 0x6C058000u
#define BT3_VIF_END 0x70000000u

static uint32_t read_u32_le(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8)
        | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static void write_u32_le(uint8_t *p, uint32_t value) {
    p[0] = (uint8_t)value;
    p[1] = (uint8_t)(value >> 8);
    p[2] = (uint8_t)(value >> 16);
    p[3] = (uint8_t)(value >> 24);
}

static int range_valid(size_t size, uint32_t word_offset, uint32_t byte_size,
                       size_t table_end, uint32_t *byte_offset) {
    uint64_t offset = (uint64_t)word_offset * 4u;
    if (word_offset == 0u || offset > UINT32_MAX || offset < BT3_TEX_HEADER_SIZE) return 0;
    if (offset > size || (uint64_t)byte_size > (uint64_t)size - offset) return 0;
    (void)table_end; /* The decomp relocates offsets from file base; payload ordering is not prescribed. */
    if (byte_offset != NULL) *byte_offset = (uint32_t)offset;
    return 1;
}

Bt3TexStatus bt3_texfile_validate(const uint8_t *data, size_t size,
                                  uint32_t out_words[2]) {
    uint32_t count, entry_word_offset;
    uint64_t entry_offset, table_end;

    if (data == NULL) return BT3_TEX_ERR_ARGUMENT;
    if (size < BT3_TEX_HEADER_SIZE) return BT3_TEX_ERR_TOO_SMALL;
    if (size > UINT32_MAX) return BT3_TEX_ERR_FILE_TOO_LARGE;

    count = read_u32_le(data);
    entry_word_offset = read_u32_le(data + 4u);
    if (count > BT3_TEX_MAX_ENTRIES) return BT3_TEX_ERR_ENTRY_COUNT;
    entry_offset = (uint64_t)entry_word_offset * 4u;
    if (entry_word_offset == 0u || entry_offset < BT3_TEX_HEADER_SIZE
        || entry_offset > UINT32_MAX || (entry_offset & 3u) != 0u) {
        return BT3_TEX_ERR_ENTRY_TABLE;
    }
    table_end = entry_offset + (uint64_t)count * BT3_TEX_ENTRY_SIZE;
    if (table_end > size || table_end > UINT32_MAX) return BT3_TEX_ERR_ENTRY_TABLE;

    if (out_words != NULL) {
        out_words[0] = count;
        out_words[1] = (uint32_t)entry_offset;
    }
    return BT3_TEX_OK;
}

Bt3TexStatus bt3_texfile_entry_info(const uint8_t *data, size_t size,
                                    uint32_t index, uint32_t out_words[16]) {
    uint32_t header[2];
    Bt3TexStatus status;
    const uint8_t *entry;
    uint32_t pix_word, clut_word, pix_size, clut_size;
    uint32_t tex0_lo, tex0_hi, tw, th, psm;
    uint32_t flags = 0u;

    if (out_words == NULL) return BT3_TEX_ERR_ARGUMENT;
    status = bt3_texfile_validate(data, size, header);
    if (status != BT3_TEX_OK) return status;
    if (index >= header[0]) return BT3_TEX_ERR_ENTRY_INDEX;

    entry = data + header[1] + (size_t)index * BT3_TEX_ENTRY_SIZE;
    pix_word = read_u32_le(entry + 0x00u);
    clut_word = read_u32_le(entry + 0x04u);
    pix_size = read_u32_le(entry + 0x08u);
    clut_size = read_u32_le(entry + 0x0Cu);
    tex0_lo = read_u32_le(entry + 0x30u);
    tex0_hi = read_u32_le(entry + 0x34u);

    for (size_t i = 0; i < 16u; ++i) out_words[i] = 0u;

    if (pix_word != 0u) {
        uint32_t offset = 0u;
        flags |= 1u;
        /* pixSize/clutSize are signed s32 fields in the original struct. */
        if ((int32_t)pix_size >= 0
            && range_valid(size, pix_word, pix_size, (size_t)header[1]
                + (size_t)header[0] * BT3_TEX_ENTRY_SIZE, &offset)) {
            flags |= 2u;
            out_words[0] = offset;
        }
    }
    if (clut_word != 0u) {
        uint32_t offset = 0u;
        flags |= 4u;
        if ((int32_t)clut_size >= 0
            && range_valid(size, clut_word, clut_size, (size_t)header[1]
                + (size_t)header[0] * BT3_TEX_ENTRY_SIZE, &offset)) {
            flags |= 8u;
            out_words[1] = offset;
        }
    }

    tw = (tex0_lo >> 26) & 0x0Fu;
    th = ((tex0_lo >> 30) & 0x03u) | ((tex0_hi & 0x03u) << 2);
    psm = (tex0_lo >> 20) & 0x3Fu;

    out_words[2] = pix_size;
    out_words[3] = clut_size;
    out_words[4] = read_u32_le(entry + 0x10u);
    out_words[5] = read_u32_le(entry + 0x14u);
    out_words[6] = read_u32_le(entry + 0x18u);
    out_words[7] = read_u32_le(entry + 0x1Cu);
    out_words[8] = read_u32_le(entry + 0x20u);
    out_words[9] = read_u32_le(entry + 0x24u);
    out_words[10] = tex0_lo;
    out_words[11] = tex0_hi;
    out_words[12] = 1u << tw;
    out_words[13] = 1u << th;
    out_words[14] = psm;
    out_words[15] = flags;
    return BT3_TEX_OK;
}

static Bt3TexStatus scan_vif(const uint8_t *data, size_t size,
                             uint32_t *count_out, uint32_t *min_tbp_out,
                             uint32_t *min_cbp_out) {
    size_t words, i;
    uint32_t count = 0u, min_tbp = 0x3FFFu, min_cbp = 0x3FFFu;
    int ended = 0;

    if (data == NULL) return BT3_TEX_ERR_ARGUMENT;
    if (size < 4u || (size & 3u) != 0u) return BT3_TEX_ERR_TOO_SMALL;
    words = size / 4u;

    for (i = 0u; i < words; ++i) {
        uint32_t value = read_u32_le(data + i * 4u);
        if (value == BT3_VIF_END) {
            ended = 1;
            break;
        }
        if (value == BT3_VIF_TEX) {
            uint32_t lo, hi, tbp, cbp;
            if (i + 10u >= words) return BT3_TEX_ERR_ENTRY_TABLE;
            for (size_t j = i + 1u; j <= i + 10u; ++j) {
                if (read_u32_le(data + j * 4u) == BT3_VIF_END)
                    return BT3_TEX_ERR_ENTRY_TABLE;
            }
            lo = read_u32_le(data + (i + 5u) * 4u);
            hi = read_u32_le(data + (i + 6u) * 4u);
            tbp = lo & 0x3FFFu;
            cbp = (hi >> 5) & 0x3FFFu;
            if (tbp < min_tbp) min_tbp = tbp;
            if (cbp < min_cbp) min_cbp = cbp;
            ++count;
        }
    }
    if (!ended) return BT3_TEX_ERR_ENTRY_TABLE;
    if (count_out != NULL) *count_out = count;
    if (min_tbp_out != NULL) *min_tbp_out = count ? min_tbp : 0u;
    if (min_cbp_out != NULL) *min_cbp_out = count ? min_cbp : 0u;
    return BT3_TEX_OK;
}

Bt3TexStatus bt3_model_vif_scan(const uint8_t *data, size_t size,
                                uint32_t out_words[3]) {
    uint32_t count, min_tbp, min_cbp;
    Bt3TexStatus status;
    if (out_words == NULL) return BT3_TEX_ERR_ARGUMENT;
    status = scan_vif(data, size, &count, &min_tbp, &min_cbp);
    if (status != BT3_TEX_OK) return status;
    out_words[0] = count;
    out_words[1] = min_tbp;
    out_words[2] = min_cbp;
    return BT3_TEX_OK;
}

Bt3TexStatus bt3_model_vif_rebase(uint8_t *data, size_t size,
                                  uint32_t tbp, uint32_t cbp,
                                  uint32_t tbp2, uint32_t cbp2,
                                  uint32_t min_tbp, uint32_t min_cbp,
                                  uint32_t out_words[3]) {
    uint32_t count, actual_min_tbp, actual_min_cbp;
    Bt3TexStatus status;
    size_t words, i;
    if (data == NULL || out_words == NULL) return BT3_TEX_ERR_ARGUMENT;
    status = scan_vif(data, size, &count, &actual_min_tbp, &actual_min_cbp);
    if (status != BT3_TEX_OK) return status;
    if (min_tbp == UINT32_MAX) min_tbp = actual_min_tbp;
    if (min_cbp == UINT32_MAX) min_cbp = actual_min_cbp;
    if (tbp > 0x3FFFu || cbp > 0x3FFFu || tbp2 > 0x3FFFu || cbp2 > 0x3FFFu
        || min_tbp > 0x3FFFu || min_cbp > 0x3FFFu) return BT3_TEX_ERR_ARGUMENT;

    words = size / 4u;
    for (i = 0u; i < words; ++i) {
        uint32_t marker = read_u32_le(data + i * 4u);
        if (marker == BT3_VIF_END) break;
        if (marker == BT3_VIF_TEX) {
            uint8_t *p = data + i * 4u;
            uint32_t a_lo = read_u32_le(p + 5u * 4u);
            uint32_t a_hi = read_u32_le(p + 6u * 4u);
            uint32_t b_lo = read_u32_le(p + 9u * 4u);
            uint32_t b_hi = read_u32_le(p + 10u * 4u);
            uint32_t a_tbp = ((a_lo & 0x3FFFu) - min_tbp + tbp) & 0x3FFFu;
            uint32_t a_cbp = (((a_hi >> 5) & 0x3FFFu) - min_cbp + cbp) & 0x3FFFu;
            uint32_t b_cbp = (((b_hi >> 5) & 0x3FFFu) + cbp2) & 0x3FFFu;
            a_lo = (a_lo & ~0x3FFFu) | a_tbp;
            a_hi = (a_hi & 0xFFF8001Fu) | (a_cbp << 5);
            b_lo = (b_lo & ~0x3FFFu) | tbp2;
            b_hi = (b_hi & 0xFFF8001Fu) | (b_cbp << 5);
            write_u32_le(p + 5u * 4u, a_lo);
            write_u32_le(p + 6u * 4u, a_hi);
            write_u32_le(p + 9u * 4u, b_lo);
            write_u32_le(p + 10u * 4u, b_hi);
        }
    }
    out_words[0] = count;
    out_words[1] = min_tbp;
    out_words[2] = min_cbp;
    return BT3_TEX_OK;
}

const char *bt3_tex_status_message(Bt3TexStatus status) {
    switch (status) {
        case BT3_TEX_OK: return "OK";
        case BT3_TEX_ERR_ARGUMENT: return "Invalid argument";
        case BT3_TEX_ERR_TOO_SMALL: return "Buffer is too small or not word-aligned";
        case BT3_TEX_ERR_ENTRY_COUNT: return "TexFile entry count is not plausible";
        case BT3_TEX_ERR_ENTRY_TABLE: return "TexFile entry table or VIF stream is truncated/invalid";
        case BT3_TEX_ERR_ENTRY_INDEX: return "TexFile entry index is out of range";
        case BT3_TEX_ERR_FILE_TOO_LARGE: return "TexFile exceeds 32-bit offsets";
        default: return "Unknown texture status";
    }
}
