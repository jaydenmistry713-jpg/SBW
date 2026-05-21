"""Fix UTF-8 BOM and mojibake across HTML files."""
import glob

files = glob.glob('**/*.html', recursive=True)

for f in files:
    with open(f, 'r', encoding='utf-8-sig') as fh:  # utf-8-sig strips BOM on read
        content = fh.read()
    try:
        fixed = content.encode('cp1252').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        # No mojibake (or non-cp1252 chars) — just write back without BOM
        fixed = content

    # Write without BOM using plain utf-8
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(fixed)

    if fixed != content:
        print('Fixed encoding: ' + f)
    else:
        print('Removed BOM only: ' + f)
