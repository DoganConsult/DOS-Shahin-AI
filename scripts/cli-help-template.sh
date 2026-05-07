#!/usr/bin/env bash
# Standard CLI help template for DOS Platform scripts
# Source this in your script: source scripts/cli-help-template.sh

show_help() {
  local script_name=$(basename "$0")
  cat <<EOF
Usage: ${script_name} [OPTIONS]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be done without executing
  --force        Skip confirmation prompts (for automation)

Examples:
  # Normal operation
  ${script_name} --arg value

  # Dry run to preview
  ${script_name} --dry-run

  # Force without prompts
  ${script_name} --force

For more information, see: https://docs.dogan-ai.com/cli
EOF
  exit 0
}
