"""
MotoAI MLOps Pipeline — Folder Cleaner Utility (Phase 7.4)
Populates empty folders with .gitkeep files to ensure they are tracked.
"""
import os

FOLDERS = [
    "datasets/images",
    "datasets/annotations",
    "datasets/audio",
    "datasets/videos",
    "training",
    "exports",
    "models",
    "reports"
]

def populate_gitkeeps():
    print("clean_empty_folders: Scanning directories...")
    for folder in FOLDERS:
        os.makedirs(folder, exist_ok=True)
        keep_file = os.path.join(folder, ".gitkeep")
        if not os.path.exists(keep_file) and len(os.listdir(folder)) == 0:
            with open(keep_file, "w") as f:
                f.write("# Preserve empty directory in version control\n")
            print(f"Created .gitkeep in: {folder}")
        else:
            print(f"Directory active or already populated: {folder}")

if __name__ == "__main__":
    populate_gitkeeps()
    print("clean_empty_folders: Setup complete.")
