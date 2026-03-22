#!/bin/bash
# Pretty coverage summary for all packages

PACKAGES=(
  "packages/shared:shared"
  "packages/core:core"
  "packages/clients/react:react"
  "packages/clients/vue:vue"
  "packages/hosts/react-native:react-native"
  "packages/devtools:devtools"
)

# Build first (suppress output)
pnpm turbo run build --output-logs=errors-only 2>/dev/null

echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │                 Test Coverage Summary                   │"
echo "  ├───────────────┬────────┬────────┬────────┬──────────────┤"
echo "  │ Package       │ Stmts  │ Branch │ Funcs  │ Lines        │"
echo "  ├───────────────┼────────┼────────┼────────┼──────────────┤"

for entry in "${PACKAGES[@]}"; do
  IFS=":" read -r dir name <<< "$entry"

  # Run coverage, extract "All files" line
  result=$(cd "$dir" && npx vitest run --coverage 2>&1 | grep "All files")

  if [ -n "$result" ]; then
    stmts=$(echo "$result" | awk -F'|' '{gsub(/^ +| +$/, "", $2); print $2}')
    branch=$(echo "$result" | awk -F'|' '{gsub(/^ +| +$/, "", $3); print $3}')
    funcs=$(echo "$result" | awk -F'|' '{gsub(/^ +| +$/, "", $4); print $4}')
    lines=$(echo "$result" | awk -F'|' '{gsub(/^ +| +$/, "", $5); print $5}')

    # Color based on stmts percentage
    pct=$(echo "$stmts" | tr -d ' %')
    if (( $(echo "$pct >= 90" | bc -l) )); then
      color="\033[32m" # green
    elif (( $(echo "$pct >= 70" | bc -l) )); then
      color="\033[33m" # yellow
    else
      color="\033[31m" # red
    fi
    reset="\033[0m"

    printf "  │ %-13s │${color}%7s${reset} │%7s │%7s │%7s       │\n" "$name" "$stmts%" "$branch%" "$funcs%" "$lines%"
  else
    printf "  │ %-13s │   -    │   -    │   -    │   -          │\n" "$name"
  fi
done

echo "  └───────────────┴────────┴────────┴────────┴──────────────┘"
echo ""
