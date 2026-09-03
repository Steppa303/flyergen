#!/usr/bin/env python3
"""
Merge vector PDFs for double-sided badges.

Usage: python3 merge_vector_double.py <bg.pdf> <text_overlay.pdf> <back.pdf> <back_is_vector:true|false> <output.pdf> <num_participants>

For each participant:
  Page 1: background + text overlay (front)
  Page 2: back side (if provided)
"""
import sys
import copy
from PyPDF2 import PdfReader, PdfWriter

def main():
    if len(sys.argv) != 7:
        print("Usage: merge_vector_double.py <bg.pdf> <text_overlay.pdf> <back.pdf> <back_is_vector> <output.pdf> <num_participants>", file=sys.stderr)
        sys.exit(1)

    bg_pdf_path = sys.argv[1]
    text_pdf_path = sys.argv[2]
    back_pdf_path = sys.argv[3]
    back_is_vector = sys.argv[4].lower() == 'true'
    output_pdf_path = sys.argv[5]
    num_participants = int(sys.argv[6])

    bg_reader = PdfReader(bg_pdf_path)
    text_reader = PdfReader(text_pdf_path)
    back_reader = PdfReader(back_pdf_path) if back_pdf_path and back_pdf_path != 'null' else None
    writer = PdfWriter()

    bg_page = bg_reader.pages[0]
    back_page = back_reader.pages[0] if back_reader else None

    for i in range(num_participants):
        # Front side: clone background + merge text overlay on top
        front = copy.deepcopy(bg_page)
        if i < len(text_reader.pages):
            front.merge_page(text_reader.pages[i])
        writer.add_page(front)

        # Back side (if provided)
        if back_page:
            back_clone = copy.deepcopy(back_page)
            writer.add_page(back_clone)

    with open(output_pdf_path, 'wb') as f:
        writer.write(f)

    total_pages = num_participants * (2 if back_page else 1)
    print(f"OK: {total_pages} pages written to {output_pdf_path}")

if __name__ == '__main__':
    main()
