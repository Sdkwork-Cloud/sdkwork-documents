import io
import re

def read(p):
    return io.open(p, 'r', encoding='utf-8').read().replace('\r\n', '\n')

def write(p, c):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(c)

def brace_block_end(lines, i):
    j = i
    brace = 0
    found = False
    while j < len(lines):
        if not found:
            if '{' in lines[j]:
                found = True
                brace = lines[j].count('{') - lines[j].count('}')
            j += 1
            continue
        brace += lines[j].count('{') - lines[j].count('}')
        if brace <= 0:
            return j
        j += 1
    return len(lines) - 1

base = 'crates/sdkwork-content-documents-repository-sqlx/src/'

# 1. db/bootstrap.rs: drop install_sqlite_schema + connect_sqlite_and_install_schema
p = base + 'db/bootstrap.rs'
c = read(p)
lines = c.split('\n')
out = []
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if stripped.startswith('pub async fn install_sqlite_schema(') or stripped.startswith('pub async fn connect_sqlite_and_install_schema('):
        end = brace_block_end(lines, i)
        i = end + 1
        continue
    out.append(lines[i])
    i += 1
write(p, '\n'.join(out))
print('bootstrap stripped')

# 2. migrations.rs: drop SQLITE constants + list
p = base + 'migrations.rs'
c = read(p)
lines = c.split('\n')
out = []
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if re.match(r'pub const SQLITE_[A-Z0-9_]+:', stripped) or re.match(r'pub const SQLITE_MIGRATIONS:', stripped):
        j = i
        while j < len(lines) and not lines[j].rstrip().endswith('];') and not lines[j].rstrip().endswith(';'):
            j += 1
        i = j + 1
        continue
    out.append(lines[i])
    i += 1
write(p, '\n'.join(out))
print('migrations stripped')

# 3. repository.rs: postgres-only dispatch
p = base + 'repository.rs'
c = read(p)
# drop `let sqlite = ...; ...SqliteDocumentRow...` tails after postgres return
lines = c.split('\n')
out = []
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if stripped.startswith('let sqlite = self'):
        # consume until `Ok(` / `return` tail end (function tail) — find next `    }` at method level
        j = i
        while j < len(lines) and not (lines[j].strip() == '}' and j > i):
            j += 1
        i = j
        continue
    out.append(lines[i])
    i += 1
c = '\n'.join(out)
# drop SqliteDocumentRow struct + impl
lines = c.split('\n')
out = []
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if stripped.startswith('struct SqliteDocumentRow') or stripped.startswith('impl SqliteDocumentRow'):
        end = brace_block_end(lines, i)
        i = end + 1
        continue
    out.append(lines[i])
    i += 1
write(base + 'repository.rs', '\n'.join(out))
print('repository stripped')

# 4. lib.rs: exports
p = base + 'lib.rs'
c = read(p)
c = re.sub(r'^(\s*)connect_sqlite_and_install_schema,\n', '', c)
c = re.sub(r'^(\s*)install_sqlite_schema,\n', '', c)
write(p, c)
print('lib cleaned')
