"""
MotoAI MLOps Pipeline — Dataset Preprocessing (Phase 7.2)
Resizes and splits datasets into train/validation/test folders.
"""
import os
import shutil

IMAGES_DIR = "datasets/images"
OUTPUT_DIR = "datasets/motorcycle_parts"

def prepare_splits():
    splits = ["train", "val", "test"]
    for split in splits:
        os.makedirs(os.path.join(OUTPUT_DIR, split, "images"), exist_ok=True)
        os.makedirs(os.path.join(OUTPUT_DIR, split, "labels"), exist_ok=True)
        
    print("prepare_dataset: Creating dataset split structures...")
    
    # Locate downloaded images
    images = [f for f in os.listdir(IMAGES_DIR) if f.endswith(".jpg")]
    
    for idx, img in enumerate(images):
        # Deterministic split: 70% train, 20% val, 10% test
        split = "train"
        if idx % 10 == 9:
            split = "test"
        elif idx % 10 >= 7:
            split = "val"
            
        src = os.path.join(IMAGES_DIR, img)
        dst = os.path.join(OUTPUT_DIR, split, "images", img)
        shutil.copy(src, dst)
        print(f"Copied {img} to {split} images split.")

if __name__ == "__main__":
    if os.path.exists(IMAGES_DIR) and os.listdir(IMAGES_DIR):
        prepare_splits()
    else:
        print("prepare_dataset: No images found to prepare. Run download_dataset.py first.")
