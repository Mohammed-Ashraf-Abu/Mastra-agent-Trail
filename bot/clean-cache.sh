#!/bin/bash

# React Native Cache Cleaning Script
# This script clears all caches related to React Native development

set -e

echo "🧹 Starting React Native cache cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Clear Watchman cache
echo ""
echo "1️⃣  Clearing Watchman cache..."
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null || print_warning "No watches to delete"
    print_status "Watchman cache cleared"
else
    print_warning "Watchman not installed (optional for React Native)"
fi

# 2. Clear Metro bundler cache
echo ""
echo "2️⃣  Clearing Metro bundler cache..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true
rm -rf "$TMPDIR/metro-*" 2>/dev/null || true
rm -rf "$TMPDIR/haste-*" 2>/dev/null || true
rm -rf .metro-health-check* 2>/dev/null || true
print_status "Metro cache cleared"

# 3. Clear React Native cache
echo ""
echo "3️⃣  Clearing React Native cache..."
rm -rf "$TMPDIR/react-*" 2>/dev/null || true
rm -rf "$TMPDIR/react-native-*" 2>/dev/null || true
print_status "React Native cache cleared"

# 4. Clear npm cache
echo ""
echo "4️⃣  Clearing npm cache..."
npm cache clean --force 2>/dev/null || print_warning "npm cache clean failed"
print_status "npm cache cleared"

# 5. Clear node_modules (optional - commented out by default)
# Uncomment the following lines if you want to remove node_modules
# echo ""
# echo "5️⃣  Removing node_modules..."
# rm -rf node_modules
# print_status "node_modules removed"

# 6. Clear iOS build cache (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "6️⃣  Clearing iOS build cache..."
    if [ -d "ios" ]; then
        rm -rf ios/build 2>/dev/null || true
        rm -rf ios/Pods 2>/dev/null || true
        rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
        print_status "iOS build cache cleared"
    else
        print_warning "iOS directory not found"
    fi
fi

# 7. Clear Android build cache
echo ""
echo "7️⃣  Clearing Android build cache..."
if [ -d "android" ]; then
    cd android
    ./gradlew clean 2>/dev/null || print_warning "Gradle clean failed (gradlew may not be executable)"
    rm -rf .gradle 2>/dev/null || true
    rm -rf app/build 2>/dev/null || true
    rm -rf build 2>/dev/null || true
    cd ..
    print_status "Android build cache cleared"
else
    print_warning "Android directory not found"
fi

# 8. Clear Babel cache
echo ""
echo "8️⃣  Clearing Babel cache..."
rm -rf "$TMPDIR/babel-*" 2>/dev/null || true
print_status "Babel cache cleared"

echo ""
echo -e "${GREEN}✅ Cache cleanup complete!${NC}"
echo ""
echo "Next steps:"
echo "  • Run 'npm install' if you removed node_modules"
echo "  • Run 'npm start -- --reset-cache' to start Metro with fresh cache"
echo "  • For iOS: Run 'bundle exec pod install' in the ios directory"
echo "  • For Android: Run './gradlew clean' in the android directory"

