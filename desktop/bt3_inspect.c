#include "bt3_core.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static uint8_t *read_file(const char *path, size_t *out_size) {
    FILE *file = fopen(path, "rb");
    long length;
    uint8_t *data;
    if (file == NULL) return NULL;
    if (fseek(file, 0, SEEK_END) != 0 || (length = ftell(file)) < 0 ||
        fseek(file, 0, SEEK_SET) != 0) {
        fclose(file);
        return NULL;
    }
    data = (uint8_t *)malloc((size_t)length == 0u ? 1u : (size_t)length);
    if (data == NULL || fread(data, 1u, (size_t)length, file) != (size_t)length) {
        free(data);
        fclose(file);
        return NULL;
    }
    fclose(file);
    *out_size = (size_t)length;
    return data;
}

int main(int argc, char **argv) {
    uint8_t *data;
    size_t size = 0u;
    Bt3ArchiveInfo info;
    Bt3ContainerKind kind;
    Bt3Status status;

    if (argc != 2) {
        fprintf(stderr, "Usage: %s FILE.afs|FILE.pak|FILE.afl\n", argv[0]);
        return 2;
    }
    data = read_file(argv[1], &size);
    if (data == NULL) {
        fprintf(stderr, "Cannot read file: %s\n", argv[1]);
        return 1;
    }

    kind = bt3_container_kind(data, size);
    if (kind == BT3_CONTAINER_AFS) status = bt3_afs_validate(data, size, &info);
    else if (kind == BT3_CONTAINER_PAK) status = bt3_pak_validate(data, size, &info);
    else if (kind == BT3_CONTAINER_AFL) status = bt3_afl_validate(data, size, &info);
    else {
        fprintf(stderr, "Unknown or invalid BT3 container.\n");
        free(data);
        return 1;
    }
    if (status != BT3_OK) {
        fprintf(stderr, "Parse error: %s\n", bt3_status_message(status));
        free(data);
        return 1;
    }

    printf("Type: %s\nEntries: %u\nTable end: %u\n",
        kind == BT3_CONTAINER_AFS ? "AFS" :
        kind == BT3_CONTAINER_PAK ? "PAK" : "AFL",
        info.entry_count, info.table_end);

    for (uint32_t i = 0u; i < info.entry_count; ++i) {
        if (kind == BT3_CONTAINER_AFS || kind == BT3_CONTAINER_PAK) {
            Bt3EntryInfo entry;
            status = kind == BT3_CONTAINER_AFS
                ? bt3_afs_entry_info(data, size, i, &entry)
                : bt3_pak_entry_info(data, size, i, &entry);
            if (status != BT3_OK) {
                printf("%u\t<error: %s>\n", i, bt3_status_message(status));
            } else {
                printf("%u\t%u\t%u\t%s\n", i, entry.offset, entry.size,
                    entry.valid ? "valid" : "invalid range");
            }
        } else {
            char name[33];
            status = bt3_afl_entry_name(data, size, i, name, sizeof(name));
            if (status != BT3_OK) printf("%u\t<error: %s>\n", i, bt3_status_message(status));
            else printf("%u\t%s\n", i, name[0] ? name : "(empty name)");
        }
    }
    free(data);
    return 0;
}
