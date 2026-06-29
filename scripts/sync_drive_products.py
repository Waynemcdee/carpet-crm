#!/usr/bin/env python3
"""
CarpetCRM Google Drive Product Sync
====================================
Scans a Google Drive folder structure and bulk-imports products into CarpetCRM.

Expected Drive structure:
    McLaren Flooring/
        Carpets/
            Abingdon Stainfree/
                Beige.jpg
                Grey.jpg
                Silver.jpg
            Cormar Primo Ultra/
                Cream.png
                Mocha.jpeg

For each image file:
    - Carpet name  = parent folder name (e.g. "Abingdon Stainfree")
    - Colour       = filename without extension (e.g. "Beige")
    - Product name = "{Carpet name} - {Colour}"
    - Category     = "Carpet" (derived from "Carpets" folder)
    - Image        = downloaded from Drive, uploaded to CarpetCRM /api/upload

Usage:
    1. Place your Google service-account JSON key at:
       ~/carpet-crm/scripts/service-account.json

    2. Share the "McLaren Flooring" folder (view access) with the service-account email.
       The email looks like: carpetcrm-sync@your-project.iam.gserviceaccount.com

    3. Run:
       python3 ~/carpet-crm/scripts/sync_drive_products.py

Setup (one-time):
    A. Go to https://console.cloud.google.com/
    B. Create a project (or pick existing)
    C. Enable "Google Drive API"
    D. IAM & Admin → Service Accounts → Create
    E. Keys → Add Key → JSON → download
    F. Rename downloaded file to service-account.json and place in scripts/ folder
    G. Open the JSON, copy the "client_email" value
    H. In Google Drive, right-click "McLaren Flooring" → Share → paste that email → Viewer
"""

import os
import sys
import json
import re
import tempfile
import requests

# Google API
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# ── Config ──────────────────────────────────────────────────────────
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service-account.json")
DRIVE_ROOT_NAME = "McLaren Flooring"
CARPETCRM_BASE_URL = "https://carpetcrm.co.uk"   # change to http://localhost:8000 for local dev
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# Default values for imported products
DEFAULT_PRICE_PER_SQM = 0.0
DEFAULT_COST_PER_SQM = 0.0
DEFAULT_STOCK = 0
DEFAULT_DESCRIPTION = "Imported from Google Drive"

# ── Helpers ─────────────────────────────────────────────────────────

def get_drive_service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"❌ Service account key not found: {SERVICE_ACCOUNT_FILE}")
        print("   Follow the setup steps in the script header.")
        sys.exit(1)
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def find_folder(service, name, parent_id=None):
    """Find a folder by name (optionally inside a parent)."""
    q = f"mimeType='application/vnd.google-apps.folder' and name='{name}' and trashed=false"
    if parent_id:
        q += f" and '{parent_id}' in parents"
    results = service.files().list(q=q, spaces="drive", pageSize=10, fields="files(id, name)").execute()
    items = results.get("files", [])
    return items[0] if items else None


def list_files_in_folder(service, folder_id):
    """List non-folder children of a folder."""
    q = f"'{folder_id}' in parents and trashed=false"
    page_token = None
    items = []
    while True:
        resp = service.files().list(
            q=q, spaces="drive", pageSize=100,
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token
        ).execute()
        items.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def download_drive_file(service, file_id, dest_path):
    """Download a Drive file to a local path."""
    request = service.files().get_media(fileId=file_id)
    with open(dest_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
    return dest_path


def upload_image_to_crm(image_path):
    """Upload a local image to CarpetCRM and return the public URL."""
    url = f"{CARPETCRM_BASE_URL}/api/upload"
    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f)}
        resp = requests.post(url, files=files, timeout=30)
    resp.raise_for_status()
    return resp.json().get("url")


def create_product(payload):
    """Create a product via CarpetCRM API."""
    url = f"{CARPETCRM_BASE_URL}/api/products"
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_existing_products():
    """Fetch current active products to avoid duplicates."""
    url = f"{CARPETCRM_BASE_URL}/api/products"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


# ── Main ────────────────────────────────────────────────────────────

def main():
    print("🔌 Connecting to Google Drive...")
    service = get_drive_service()

    # 1. Find "McLaren Flooring" root
    root = find_folder(service, DRIVE_ROOT_NAME)
    if not root:
        print(f"❌ Folder '{DRIVE_ROOT_NAME}' not found in Drive.")
        print("   Make sure the service account has been shared on that folder.")
        sys.exit(1)
    print(f"📁 Found root: {root['name']} ({root['id']})")

    # 2. Find "Carpets" subfolder
    carpets_folder = find_folder(service, "Carpets", parent_id=root["id"])
    if not carpets_folder:
        print("❌ 'Carpets' subfolder not found inside McLaren Flooring.")
        sys.exit(1)
    print(f"📁 Found category: {carpets_folder['name']} ({carpets_folder['id']})")

    # 3. Fetch existing CRM products to skip duplicates
    print("📦 Fetching existing products from CarpetCRM...")
    existing = get_existing_products()
    existing_names = {p["name"].lower().strip() for p in existing}
    print(f"   {len(existing)} products already in CRM.")

    # 4. Iterate carpet-name folders
    carpet_folders = list_files_in_folder(service, carpets_folder["id"])
    # Filter to sub-folders only
    carpet_folders = [f for f in carpet_folders if f["mimeType"] == "application/vnd.google-apps.folder"]
    print(f"🧵 Found {len(carpet_folders)} carpet ranges to process.\n")

    created = 0
    skipped = 0
    failed = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        for carpet_folder in carpet_folders:
            carpet_name = carpet_folder["name"]
            print(f"➡️  {carpet_name}")

            # List images inside this carpet folder
            images = list_files_in_folder(service, carpet_folder["id"])
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
                    # Download from Drive
                    local_path = os.path.join(tmpdir, img["name"])
                    download_drive_file(service, img["id"], local_path)

                    # Upload to CRM
                    crm_image_url = upload_image_to_crm(local_path)

                    # Create product
                    payload = {
                        "name": product_name,
                        "category": "Carpet",
                        "price_per_sqm": DEFAULT_PRICE_PER_SQM,
                        "cost_per_sqm": DEFAULT_COST_PER_SQM,
                        "stock": DEFAULT_STOCK,
                        "description": DEFAULT_DESCRIPTION,
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
