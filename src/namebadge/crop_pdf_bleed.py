#!/usr/bin/env python3
"""
Crop bleed from a PDF by setting the CropBox (no rasterization).

Usage: python3 crop_pdf_bleed.py <input.pdf> <output.pdf> <bleed_mm> <page_width_mm> <page_height_mm>
"""
import sys
from PyPDF2 import PdfReader, PdfWriter

def main():
    if len(sys.argv) != 6:
        print("Usage: crop_pdf_bleed.py <input.pdf> <output.pdf> <bleed_mm> <page_width_mm> <page_height_mm>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    bleed_mm = float(sys.argv[3])
    page_width_mm = float(sys.argv[4])
    page_height_mm = float(sys.argv[5])

    # mm → points (1 mm ≈ 2.835 pt)
    mm_to_pt = 2.835
    bleed_pt = bleed_mm * mm_to_pt
    full_w = page_width_mm * mm_to_pt
    full_h = page_height_mm * mm_to_pt

    left = bleed_pt
    bottom = bleed_pt
    right = full_w - bleed_pt
    top = full_h - bleed_pt

    reader = PdfReader(input_path)
    writer = PdfWriter()

    for page in reader.pages:
        page.cropbox.lower_left = (left, bottom)
        page.cropbox.upper_right = (right, top)
        writer.add_page(page)

    with open(output_path, 'wb') as f:
        writer.write(f)

    print(f"OK: Cropped to {page_width_mm - bleed_mm * 2:.1f}x{page_height_mm - bleed_mm * 2:.1f}mm")

if __name__ == '__main__':
    main()
