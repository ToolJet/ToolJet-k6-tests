#!/bin/bash

# ===================================================================
# Run Authentication Test Suite
# Usage: ./runners/run_authentication_suite.sh [VU_MULTIPLIER]
# Example: ./runners/run_authentication_suite.sh 0.5
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/authentication"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Authentication Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/authentication_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

# Set VU multiplier as environment variable for k6
export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

# Run tests
echo -e "\n${GREEN}1/3: Login/Logout Journey${NC}"
k6 run --out json="${SUITE_DIR}/login_logout.json" \
    --summary-export="${SUITE_DIR}/login_logout_summary.json" \
    "${TESTS_DIR}/login_logout_journey_500vus.js"

echo -e "\n${GREEN}2/3: User Invite & Onboarding${NC}"
k6 run --out json="${SUITE_DIR}/user_invite.json" \
    --summary-export="${SUITE_DIR}/user_invite_summary.json" \
    "${TESTS_DIR}/user_invite_onboarding_500vus.js"

echo -e "\n${GREEN}3/3: Password Reset Journey${NC}"
k6 run --out json="${SUITE_DIR}/password_reset.json" \
    --summary-export="${SUITE_DIR}/password_reset_summary.json" \
    "${TESTS_DIR}/password_reset_journey_500vus.js"

echo -e "\n${GREEN}✓ Authentication suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
