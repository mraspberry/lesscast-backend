#!/bin/bash

set -o errexit
set -o pipefail

fail() {
    echo $* >&2
    exit 1
}

curl -O "$URL" || fail "failed to download url '${URL}'"
ffmpeg -i "${ORIGIN}" -vn -q:a 0 -map a "${DESTINATION}" || fail "Failed to transcode ${ORIGIN} to ${DESTINATION}"
aws s3 cp "${DESTINATION}" s3://${BUCKET}/audio/
