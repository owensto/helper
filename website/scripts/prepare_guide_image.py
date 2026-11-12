"""Convert an original guide illustration to the three public WebP sizes."""
import argparse
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('name')
    parser.add_argument('--remove-raw', action='store_true')
    args = parser.parse_args()
    if not args.name.replace('-', '').isalnum():
        raise ValueError('Use a plain image name')
    folder = ROOT / 'public/media/guides'
    folder.mkdir(parents=True, exist_ok=True)
    with Image.open(args.source) as raw:
        image = ImageOps.exif_transpose(raw).convert('RGB')
        for width in (640, 1200, 1600):
            size = (width, round(image.height * width / image.width))
            image.resize(size, Image.Resampling.LANCZOS).save(folder / f'{args.name}-{width}.webp', quality=82, method=6)
    if args.remove_raw:
        args.source.unlink()
    print(args.name)
