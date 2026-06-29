#!/usr/bin/env python3
"""
CarpetCRM Google Drive Product Sync — "Paste a Link" Edition
=============================================================
No OAuth. No service accounts. Just a shared folder link + an API key.

HOW IT WORKS:
    1. Share your "McLaren Flooring" folder in Google Drive:
       Right-click folder → Share → "Anyone with the link" → Viewer → Copy link

    2. Get a free Google API key (one-time, 2 minutes):
       A. Go to https://console.cloud.google.com/
       B. Create a project (or use existing)
       C. APIs & Services → Library → Search "Google Drive API" → Enable
       D. APIs & Services → Credentials → Create Credentials → API Key
       E. Copy the key and save it to: ~/carpet-crm/scripts/drive_api_key.txt
          (just the key string, nothing else)

    3. Run this script with your folder link:
       python3 ~/carpet-crm/scripts/sync_drive_link.py "https://drive.google.com/drive/folders/1ABC..."

WHAT IT DOES:
    - Extracts the folder ID from your link
    - Lists all images inside using the Drive API (with your key)
    - For each image: reads parent folder as carpet name, filename as colour
    - Downloads image → uploads to CarpetCRM → creates product
    - Skips duplicates automatically

EXPECTED FOLDER STRUCTURE:
    McLaren Flooring (shared folder link)
        └── Carpets/
            ├── Abingdon Stainfree/
            │   ├── Beige.jpg
            │   ├── Grey.jpg
            │   └── Silver.jpg
            ├── Cormar Primo Ultra/
            │   ├── Cream.png
            │   └── Mocha.jpg
            └── ...

The script walks every subfolder under "Carpets" and imports each image
as a product named "{Folder Name} - {Filename}".
"""

import os
import sys
import re
import json
import tempfile
import requests

# ── Config ──────────────────────────────────────────────────────────
API_KEY_FILE = os.path.join(os.path.dirname(__file__), "drive_api_key.txt")
CARPETCRM_BASE_URL = "https://carpetcrm.co.uk"

DEFAULTS = {
    "price_per_sqm": 0.0,
    "cost_per_sqm": 0.0,
    "stock": 0,
    "description": "Imported from Google Drive",
    "category": "Carpet"
}

# ── Helpers ─────────────────────────────────────────────────────────

def get_api_key():
    if not os.path.exists(API_KEY_FILE):
        print("❌ API key file not found.")
        print(f"   Create: {API_KEY_FILE}")
        print("   Put your Google API key inside (just the key string).")
        print("   Get one free at: https://console.cloud.google.com/ → APIs & Services → Credentials → API Key")
        sys.exit(1)
    with open(API_KEY_FILE) as f:
        return f.read().strip()


def extract_folder_id(url_or_id):
    """Extract folder ID from various Google Drive URL formats."""
    url_or_id = url_or_id.strip()
    # Direct ID
    if re.match(r"^[A-Za-z0-9_-]{20,}$", url_or_id):
        return url_or_id
    # URL formats
    patterns = [
        r"/folders/([A-Za-z0-9_-]+)",
        r"id=([A-Za-z0-9_-]+)",
        r"open\?id=([A-Za-z0-9_-]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url_or_id)
        if m:
            return m.group(1)
    return None


def drive_api_request(endpoint, params=None):
    """Make an authenticated request to Google Drive API v3."""
    key = get_api_key()
    url = f"https://www.googleapis.com/drive/v3{endpoint}"
    p = params or {}
    p["key"] = key
    resp = requests.get(url, params=p, timeout=30)
    if resp.status_code == 403:
        print("❌ API key rejected. Make sure:")
        print("   1. Google Drive API is enabled in your Cloud project")
        print("   2. The key is correct and not restricted")
        sys.exit(1)
    resp.raise_for_status()
    return resp.json()


def list_files_in_folder(folder_id, mime_type=None):
    """List files inside a Drive folder."""
    q = f"'{folder_id}' in parents and trashed=false"
    if mime_type:
        q += f" and mimeType='{mime_type}'"
    else:
        q += " and mimeType!='application/vnd.google-apps.folder'"
    items = []
    page_token = None
    while True:
        data = drive_api_request("/files", {
            "q": q,
            "spaces": "drive",
            "pageSize": 100,
            "fields": "nextPageToken, files(id, name, mimeType, webContentLink, webViewLink)",
            "pageToken": page_token or ""
        })
        items.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return items


def list_subfolders(folder_id):
    """List subfolders inside a Drive folder."""
    q = f"'{folder_id}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'"
    items = []
    page_token = None
    while True:
        data = drive_api_request("/files", {
            "q": q,
            "spaces": "drive",
            "pageSize": 100,
            "fields": "nextPageToken, files(id, name)",
            "pageToken": page_token or ""
        })
        items.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return items


def download_drive_image(file_id, dest_path):
    """Download a Drive file using the API key."""
    key = get_api_key()
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&key={key}"
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    with open(dest_path, "wb") as f:
        f.write(resp.content)
    return dest_path


def upload_image_to_crm(image_path):
    url = f"{CARPETCRM_BASE_URL}/api/upload"
    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f)}
        resp = requests.post(url, files=files, timeout=30)
    resp.raise_for_status()
    return resp.json().get("url")


def create_product(payload):
    url = f"{CARPETCRM_BASE_URL}/api/products"
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_existing_products():
    url = f"{CARPETCRM_BASE_URL}/api/products"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


# ── Main ────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 sync_drive_link.py \"<google-drive-folder-url>\"")
        print("")
        print("Example:")
        print('  python3 sync_drive_link.py "https://drive.google.com/drive/folders/1ABC123xyz"')
        sys.exit(1)

    folder_url = sys.argv[1]
    folder_id = extract_folder_id(folder_url)
    if not folder_id:
        print("❌ Could not extract folder ID from the URL.")
        print("   Make sure it's a Google Drive folder link like:")
        print('   https://drive.google.com/drive/folders/1ABC123xyz')
        sys.exit(1)

    print(f"📁 Folder ID: {folder_id}")
    print("🔌 Testing API key...")

    # Quick test: get folder metadata
    meta = drive_api_request(f"/files/{folder_id}", {"fields": "id, name, mimeType"})
    if meta.get("mimeType") != "application/vnd.google-apps.folder":
        print(f"❌ This is not a folder (it's a {meta.get('mimeType')}).")
        sys.exit(1)
    print(f"✅ Connected. Folder: {meta['name']}")

    # Find "Carpets" subfolder (or use root if not found)
    print("🔍 Looking for 'Carpets' subfolder...")
    subfolders = list_subfolders(folder_id)
    carpets_folder = next((f for f in subfolders if f["name"].lower() == "carpets"), None)

    if carpets_folder:
        print(f"📁 Found: Carpets ({carpets_folder['id']})")
        scan_id = carpets_folder["id"]
    else:
        print("⚠️  No 'Carpets' subfolder found. Scanning root folder instead.")
        scan_id = folder_id

    # Fetch existing CRM products
    print("📦 Fetching existing products from CarpetCRM...")
    existing = get_existing_products()
    existing_names = {p["name"].lower().strip() for p in existing}
    print(f"   {len(existing)} products already in CRM.")

    # Find carpet-name subfolders
    carpet_folders = list_subfolders(scan_id)
    print(f"🧵 Found {len(carpet_folders)} carpet ranges to process.\n")

    created = 0
    skipped = 0
    failed = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        for carpet_folder in carpet_folders:
            carpet_name = carpet_folder["name"]
            print(f"➡️  {carpet_name}")

            images = list_files_in_folder(carpet_folder["id"])
            images = [f for f in images if f["mimeType"].startswith("image/")]

            if not images:
                print(f"   ⚠️  No images found.")
                continue

            for img in images:
                colour = os.path.splitext(img["name"])[0]
                product_name = f"{carpet_name} - {colour}"

                if product_name.lower().strip() in existing_names:
                    print(f"   ⏭️  Skipping duplicate: {product_name}")
                    skipped += 1
                    continue

                try:
                    local_path = os.path.join(tmpdir, img["name"])
                    download_drive_image(img["id"], local_path)
                    crm_image_url = upload_image_to_crm(local_path)

                    payload = {
                        "name": product_name,
                        "category": DEFAULTS["category"],
                        "price_per_sqm": DEFAULTS["price_per_sqm"],
                        "cost_per_sqm": DEFAULTS["cost_per_sqm"],
                        "stock": DEFAULTS["stock"],
                        "description": DEFAULTS["description"],
                        "image": crm_image_url,
                        "texture_image": ""
                    }
                    create_product(payload)
                    print(f"   ✅ Created: {product_name}")
                    created += 1

                except Exception as e:
                    print(f"   ❌ Failed: {product_name} — {e}")
                    failed += 1

    print(f"\n{'='*50}")
    print(f"Done!  Created: {created}  Skipped: {skipped}  Failed: {failed}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
