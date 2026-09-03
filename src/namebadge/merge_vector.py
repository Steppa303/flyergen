#!/usr/bin/env python3
"""
Merge vector PDF background with text overlay PDF (single-sided).

Usage: python3 merge_vector.py <bg.pdf> <text_overlay.pdf> <output.pdf> <num_participants>

For each participant:
  1. Copy background page (page 0) → blank page with bg merged
  2. Overlay the corresponding text page on top
  Result: N pages, each with vector background + vector text.
"""
import sys
from PyPDF2 import PdfReader, PdfWriter

def main():
    if len(sys.argv) != 5:
        print("Usage: merge_vector.py <bg.pdf> <text_overlay.pdf> <output.pdf> <num_participants>", file=sys.stderr)
        sys.exit(1)

    bg_pdf_path = sys.argv[1]
    text_pdf_path = sys.argv[2]
    output_pdf_path = sys.argv[3]
    num_participants = int(sys.argv[4])

    bg_reader = PdfReader(bg_pdf_path)
    text_reader = PdfReader(text_pdf_path)
    writer = PdfWriter()

    bg_page = bg_reader.pages[0]  # Template: first (and usually only) page

    for i in range(num_participants):
        # Clone background page and overlay text on top
        import copy
        bg_clone = copy.deepcopy(bg_page)
        if i < len(text_reader.pages):
            text_page = text_reader.pages[i]
            bg_clone.merge_page(text_page)
        writer.add_page(bg_clone)

    with open(output_pdf_path, 'wb') as f:
        writer.write(f)

    print(f"OK: {num_participants} pages written to {output_pdf_path}")

if __name__ == '__main__':
    main()
