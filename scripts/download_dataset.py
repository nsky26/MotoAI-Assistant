"""
MotoAI MLOps Pipeline — Dataset Downloader (Phase 7.2)
Downloads publicly licensed motorcycle datasets and images.
"""
import os
import urllib.request
import hashlib

DATASET_DIR = "datasets/images"
METADATA_FILE = "datasets/metadata.csv"

def get_image_hash(data):
    return hashlib.md5(data).hexdigest()

def download_sample_images():
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    # Representative URLs of CC licensed motorcycle parts (Wikimedia Commons / Open Images)
    urls = {
        "battery_01.jpg": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Motorcycle_battery.jpg",
        "chain_01.jpg": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Motorcycle_drive_chain.jpg",
        "spark_plug_01.jpg": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Sparkplug.jpg"
    }
    
    print("download_dataset: Starting collection pipeline...")
    for filename, url in urls.items():
        filepath = os.path.join(DATASET_DIR, filename)
        if not os.path.exists(filepath):
            try:
                print(f"Downloading {filename} from {url}...")
                urllib.request.urlretrieve(url, filepath)
                print(f"Saved: {filepath}")
            except Exception as e:
                print(f"Failed to download {filename}: {e}")
        else:
            print(f"File already exists: {filepath}")

if __name__ == "__main__":
    download_sample_images()
    print("download_dataset: Finished.")
