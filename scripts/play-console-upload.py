#!/usr/bin/env python3
"""
Google Play Console API - App Upload Script

Usage:
    python3 play-console-upload.py --apk /path/to/app.apk

Environment variables required:
    PLAY_SERVICE_ACCOUNT_JSON: Base64-encoded service account JSON key

Install dependencies:
    pip install google-api-python-client google-auth

See Also:
    docs/PLAY_SETUP.md for setup instructions
"""
import os
import sys
import argparse
import base64
import json

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from googleapiclient.errors import HttpError
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install google-api-python-client google-auth")
    sys.exit(1)

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
DEFAULT_PACKAGE = 'com.jobblebaby.app'


def get_play_service():
    """Build the Play Developer API service."""
    json_key = os.environ.get('PLAY_SERVICE_ACCOUNT_JSON')
    if not json_key:
        print("Error: PLAY_SERVICE_ACCOUNT_JSON environment variable not set.")
        print("See docs/PLAY_SETUP.md for setup instructions.")
        sys.exit(1)

    try:
        key_data = base64.b64decode(json_key).decode('utf-8')
        credentials = service_account.Credentials.from_service_account_info(
            json.loads(key_data), scopes=SCOPES
        )
    except Exception as e:
        print(f"Error parsing service account JSON: {e}")
        sys.exit(1)

    return build('androidpublisher', 'v3', credentials=credentials)


def upload_apk(service, package_name, apk_path):
    """Upload an APK to Play Console."""
    if not os.path.exists(apk_path):
        print(f"Error: APK file not found: {apk_path}")
        sys.exit(1)

    try:
        # Create a new edit
        edit_request = service.edits().insert(body={}, packageName=package_name)
        result = edit_request.execute()
        edit_id = result['id']
        print(f"Edit created: {edit_id}")

        # Upload the APK
        media = MediaFileUpload(apk_path, mimetype='application/vnd.android.package')
        apk_response = service.edits().edits().uploadApk(
            packageName=package_name,
            editId=edit_id,
            media_body=media
        ).execute()

        version_code = apk_response.get('versionCode', 'unknown')
        print(f"APK uploaded successfully. Version code: {version_code}")
        return edit_id

    except HttpError as e:
        print(f"HTTP error uploading APK: {e}")
        sys.exit(1)


def assign_track(service, package_name, edit_id, track='internal'):
    """Assign the APK to a track (internal, alpha, beta, production)."""
    try:
        service.edits().tracks().update(
            editId=edit_id,
            packageName=package_name,
            body={'track': track}
        ).execute()
        print(f"APK assigned to '{track}' track")
    except HttpError as e:
        print(f"HTTP error assigning track: {e}")
        sys.exit(1)


def commit_edit(service, package_name, edit_id):
    """Commit the edit to make changes live."""
    try:
        service.edits().commit(
            editId=edit_id,
            packageName=package_name
        ).execute()
        print("Edit committed successfully!")
    except HttpError as e:
        print(f"HTTP error committing edit: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Upload APK to Google Play Console',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--apk', required=True,
        help='Path to the APK file to upload'
    )
    parser.add_argument(
        '--package', default=DEFAULT_PACKAGE,
        help=f'Package name (default: {DEFAULT_PACKAGE})'
    )
    parser.add_argument(
        '--track', default='internal',
        choices=['internal', 'alpha', 'beta', 'production'],
        help='Play Console track (default: internal)'
    )
    parser.add_argument(
        '--submit', action='store_true',
        help='Submit for review after upload'
    )

    args = parser.parse_args()

    print(f"=== Play Console Upload ===")
    print(f"Package: {args.package}")
    print(f"APK: {args.apk}")
    print(f"Track: {args.track}")
    print()

    service = get_play_service()
    edit_id = upload_apk(service, args.package, args.apk)
    assign_track(service, args.package, edit_id, args.track)

    if args.submit:
        commit_edit(service, args.package, edit_id)
    else:
        print()
        print("Upload complete. To submit for review, run:")
        print(f"  python3 {sys.argv[0]} --apk {args.apk} --package {args.package} --submit")
        print()
        print("Note: 'internal' track is for internal testing only.")
        print("Use --track alpha/beta/production for external testing.")

    print()
    print("Done!")


if __name__ == '__main__':
    main()