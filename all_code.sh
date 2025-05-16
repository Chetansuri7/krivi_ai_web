#!/bin/bash  
find app -path 'app/components/ui' -prune -o -type f \( -name '*.tsx' -o -name '*.ts' \) -exec echo "--- {} ---" \; -exec cat {} \; > all_code.txt  