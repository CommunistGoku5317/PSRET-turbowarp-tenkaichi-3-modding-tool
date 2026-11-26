#include <archive.h>
#include <archive_entry.h>

#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <direct.h>
#define bt3_mkdir(path) _mkdir(path)
#define PATH_SEP '\\'
#else
#include <sys/stat.h>
#include <sys/types.h>
#define bt3_mkdir(path) mkdir(path, 0755)
#define PATH_SEP '/'
#endif

#define COPY_BUFFER_SIZE 65536u

static int make_directories(const char *path) {
    char buffer[4096];
    size_t len = strlen(path);
    if (len == 0u || len >= sizeof(buffer)) return 0;
    memcpy(buffer, path, len + 1u);
    for (size_t i = 1u; i < len; ++i) {
        if (buffer[i] == '/' || buffer[i] == '\\') {
            char saved = buffer[i];
            buffer[i] = '\0';
            if (buffer[0] != '\0' && bt3_mkdir(buffer) != 0 && errno != EEXIST) return 0;
            buffer[i] = saved;
        }
    }
    if (bt3_mkdir(buffer) != 0 && errno != EEXIST) return 0;
    return 1;
}

/* Reject absolute paths, drive paths, and parent traversal from archive names. */
static int safe_output_path(const char *root, const char *archive_path,
                            char *out, size_t out_capacity) {
    char normalized[3072];
    size_t n;
    size_t root_len;
    size_t write_pos = 0u;
    if (root == NULL || archive_path == NULL) return 0;
    if (archive_path[0] == '/' || archive_path[0] == '\\') return 0;
    if (archive_path[0] != '\0' && archive_path[1] == ':') return 0;
    n = strlen(archive_path);
    if (n == 0u || n >= sizeof(normalized)) return 0;
    for (size_t i = 0u; i < n; ++i)
        normalized[i] = archive_path[i] == '\\' ? '/' : archive_path[i];
    normalized[n] = '\0';

    for (size_t start = 0u; start < n;) {
        size_t end = start;
        while (end < n && normalized[end] != '/') ++end;
        if (end - start == 2u && normalized[start] == '.' && normalized[start + 1u] == '.') return 0;
        if (end > start && !(end - start == 1u && normalized[start] == '.')) {
            if (write_pos != 0u) out[write_pos++] = '/';
            if (write_pos + (end - start) + 1u >= out_capacity) return 0;
            memcpy(out + write_pos, normalized + start, end - start);
            write_pos += end - start;
        }
        start = end + 1u;
    }
    if (write_pos == 0u) return 0;
    out[write_pos] = '\0';

    root_len = strlen(root);
    if (root_len + 1u + write_pos + 1u > out_capacity) return 0;
    memmove(out + root_len + 1u, out, write_pos + 1u);
    memcpy(out, root, root_len);
    out[root_len] = PATH_SEP;
    return 1;
}

static int write_entry(struct archive *archive, const char *path) {
    FILE *out = fopen(path, "wbx");
    uint8_t buffer[COPY_BUFFER_SIZE];
    if (out == NULL) {
        fprintf(stderr, "Cannot create %s: %s\n", path, strerror(errno));
        return 0;
    }
    for (;;) {
        la_ssize_t got = archive_read_data(archive, buffer, sizeof(buffer));
        if (got == 0) break;
        if (got < 0 || fwrite(buffer, 1u, (size_t)got, out) != (size_t)got) {
            fprintf(stderr, "Read/write error while extracting %s\n", path);
            fclose(out);
            return 0;
        }
    }
    if (fclose(out) != 0) return 0;
    return 1;
}

int main(int argc, char **argv) {
    const char *archive_path;
    const char *output_dir = NULL;
    long extract_index = -1;
    struct archive *reader;
    struct archive_entry *entry;
    int result;
    long index = 0;
    int extracted = 0;

    if (argc >= 2 && strcmp(argv[1], "--extract") == 0) {
        char *end = NULL;
        if (argc != 5) {
            fprintf(stderr, "Usage: %s --extract INDEX ARCHIVE OUTPUT_DIR\n", argv[0]);
            return 2;
        }
        extract_index = strtol(argv[2], &end, 10);
        if (end == argv[2] || *end != '\0' || extract_index < 0) {
            fprintf(stderr, "Invalid entry index.\n");
            return 2;
        }
        archive_path = argv[3];
        output_dir = argv[4];
    } else {
        if (argc != 2) {
            fprintf(stderr, "Usage: %s ARCHIVE.7z|ARCHIVE.rar|DISC.iso\n", argv[0]);
            fprintf(stderr, "       %s --extract INDEX ARCHIVE OUTPUT_DIR\n", argv[0]);
            return 2;
        }
        archive_path = argv[1];
    }

    reader = archive_read_new();
    if (reader == NULL) {
        fprintf(stderr, "Cannot allocate archive reader.\n");
        return 1;
    }
    archive_read_support_filter_all(reader);
    archive_read_support_format_all(reader);
    result = archive_read_open_filename(reader, archive_path, 10240);
    if (result != ARCHIVE_OK) {
        fprintf(stderr, "Cannot open archive: %s\n", archive_error_string(reader));
        archive_read_free(reader);
        return 1;
    }

    while ((result = archive_read_next_header(reader, &entry)) == ARCHIVE_OK) {
        const char *name = archive_entry_pathname(entry);
        la_int64_t size = archive_entry_size(entry);
        if (name == NULL) name = "(unnamed)";
        printf("%ld\t%lld\t%s\n", index, (long long)size, name);

        if (extract_index == index) {
            char output_path[4096];
            if (output_dir == NULL || archive_entry_filetype(entry) != AE_IFREG) {
                fprintf(stderr, "Selected entry is not a regular file.\n");
                archive_read_free(reader);
                return 1;
            }
            /* Require a fresh extraction root so pre-existing symlinks inside it
               cannot redirect writes outside the chosen directory. */
            if (bt3_mkdir(output_dir) != 0) {
                fprintf(stderr, "Output directory must not already exist: %s (%s)\n",
                        output_dir, strerror(errno));
                archive_read_free(reader);
                return 1;
            }
            if (!safe_output_path(output_dir, name, output_path, sizeof(output_path))) {
                fprintf(stderr, "Unsafe or invalid archive path; extraction refused.\n");
                archive_read_free(reader);
                return 1;
            }
            {
                char parent[4096];
                size_t len = strlen(output_path);
                if (len >= sizeof(parent)) {
                    archive_read_free(reader);
                    return 1;
                }
                memcpy(parent, output_path, len + 1u);
                for (size_t i = len; i > 0u; --i) {
                    if (parent[i - 1u] == '/' || parent[i - 1u] == '\\') {
                        parent[i - 1u] = '\0';
                        break;
                    }
                }
                if (!make_directories(parent)) {
                    fprintf(stderr, "Cannot create extraction directory.\n");
                    archive_read_free(reader);
                    return 1;
                }
            }
            if (!write_entry(reader, output_path)) {
                archive_read_free(reader);
                return 1;
            }
            extracted = 1;
            break;
        }
        ++index;
        archive_read_data_skip(reader);
    }

    if (result != ARCHIVE_EOF && result != ARCHIVE_OK) {
        fprintf(stderr, "Archive read error: %s\n", archive_error_string(reader));
        archive_read_free(reader);
        return 1;
    }
    archive_read_free(reader);
    if (extract_index >= 0 && !extracted) {
        fprintf(stderr, "Entry index %ld not found.\n", extract_index);
        return 1;
    }
    return 0;
}
