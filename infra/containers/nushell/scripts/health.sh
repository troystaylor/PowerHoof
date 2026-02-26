#!/bin/bash
# Health check script for Nushell container

# Check if nu is responsive
if nu -c "1 + 1" > /dev/null 2>&1; then
    echo "OK"
    exit 0
else
    echo "FAIL"
    exit 1
fi
