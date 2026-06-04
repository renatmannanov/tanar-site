#!/bin/sh
set -e

# The product-images named volume is mounted root-owned on first `up`, ON TOP of
# the image directory — so any chown baked into the image does not reach the
# volume contents. Fix ownership here at container start (we're root), then drop
# to the unprivileged `node` user to run the server. sharp writes uploaded photos
# into this dir, so it must be writable by node.
chown -R node:node /app/public/images/products 2>/dev/null || true

exec gosu node node server.js
