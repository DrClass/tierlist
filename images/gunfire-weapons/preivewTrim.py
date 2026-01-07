from PIL import Image
import os

SUFFIX = " - Preview.png"

def trim_transparency(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        image = image.convert("RGBA")

    # Get bounding box of non-transparent pixels
    bbox = image.getbbox()
    if bbox:
        return image.crop(bbox)
    return image  # fully transparent image, unlikely but safe

def main():
    for filename in os.listdir("."):
        if filename.endswith(SUFFIX):
            try:
                with Image.open(filename) as img:
                    trimmed = trim_transparency(img)
                    trimmed.save(filename)
                    print(f"Trimmed: {filename}")
            except Exception as e:
                print(f"Failed: {filename} ({e})")

if __name__ == "__main__":
    main()