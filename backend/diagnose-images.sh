#!/bin/bash
# Quick diagnostic script for image serving issues
# Run this on your staging server: bash diagnose-images.sh

echo "🔍 Saffron Image Serving Diagnostics"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find backend directory
BACKEND_DIR=$(pwd)
if [ ! -f "package.json" ]; then
    echo "⚠️  Not in backend directory. Please cd to backend/ first"
    exit 1
fi

echo "📂 Working directory: $BACKEND_DIR"
echo ""

# Check uploads directory
echo "1️⃣  Checking uploads directory..."
UPLOADS_DIR="$BACKEND_DIR/public/assets/uploads/products"

if [ -d "$UPLOADS_DIR" ]; then
    echo -e "${GREEN}✅ Directory exists${NC}"
    
    # Check permissions
    PERMS=$(stat -c "%a" "$UPLOADS_DIR" 2>/dev/null || stat -f "%OLp" "$UPLOADS_DIR" 2>/dev/null)
    echo "   Permissions: $PERMS"
    
    # Count files
    FILE_COUNT=$(ls -1 "$UPLOADS_DIR" 2>/dev/null | wc -l)
    echo "   Files: $FILE_COUNT"
    
    if [ $FILE_COUNT -gt 0 ]; then
        echo "   Latest files:"
        ls -lht "$UPLOADS_DIR" | head -6 | tail -5
    fi
else
    echo -e "${RED}❌ Directory does NOT exist${NC}"
    echo "   Create it: mkdir -p $UPLOADS_DIR"
fi

echo ""

# Check if server is running
echo "2️⃣  Checking if backend server is running..."

if command -v pm2 &> /dev/null; then
    echo "   PM2 processes:"
    pm2 list | grep -E "name|online|stopped"
fi

if command -v curl &> /dev/null; then
    # Test backend
    echo "   Testing backend on localhost:8000..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo -e "   ${GREEN}✅ Backend is responding (HTTP $STATUS)${NC}"
    else
        echo -e "   ${RED}❌ Backend not responding (HTTP $STATUS)${NC}"
    fi
    
    # Test static file serving from backend
    LATEST_FILE=$(ls -t "$UPLOADS_DIR" 2>/dev/null | head -1)
    if [ ! -z "$LATEST_FILE" ]; then
        echo "   Testing static file serving..."
        echo "   File: $LATEST_FILE"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/assets/uploads/products/$LATEST_FILE" 2>/dev/null)
        if [ "$STATUS" = "200" ]; then
            echo -e "   ${GREEN}✅ Backend serves files correctly (HTTP $STATUS)${NC}"
        else
            echo -e "   ${RED}❌ Backend NOT serving files (HTTP $STATUS)${NC}"
        fi
        
        # Test from external URL
        echo "   Testing from external URL..."
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://saffron-staging.ekarigar.com/assets/uploads/products/$LATEST_FILE" 2>/dev/null)
        if [ "$STATUS" = "200" ]; then
            echo -e "   ${GREEN}✅ External URL works (HTTP $STATUS)${NC}"
        else
            echo -e "   ${RED}❌ External URL fails (HTTP $STATUS)${NC}"
            echo -e "   ${YELLOW}   This is the problem! Check nginx configuration.${NC}"
        fi
    fi
fi

echo ""

# Check nginx
echo "3️⃣  Checking Nginx configuration..."

if command -v nginx &> /dev/null; then
    echo "   Nginx version:"
    nginx -v 2>&1 | sed 's/^/   /'
    
    echo "   Testing nginx config:"
    nginx -t 2>&1 | sed 's/^/   /'
    
    echo "   Nginx is running:"
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "   ${GREEN}✅ Yes${NC}"
    else
        echo -e "   ${RED}❌ No${NC}"
    fi
else
    echo "   ⚠️  Nginx not found (might be using different setup)"
fi

echo ""

# Check environment
echo "4️⃣  Checking environment..."

if [ -f ".env" ]; then
    echo -e "   ${GREEN}✅ .env file exists${NC}"
    if grep -q "NODE_ENV=production" .env; then
        echo "   Environment: production"
    elif grep -q "NODE_ENV=staging" .env; then
        echo "   Environment: staging"
    else
        echo "   Environment: $(grep NODE_ENV .env | cut -d'=' -f2)"
    fi
else
    echo -e "   ${YELLOW}⚠️  .env file not found${NC}"
fi

echo ""
echo "===================================="
echo ""
echo "📋 Summary & Recommendations:"
echo ""

# Provide recommendations based on findings
if [ ! -d "$UPLOADS_DIR" ]; then
    echo "❗ Create uploads directory:"
    echo "   mkdir -p $UPLOADS_DIR"
    echo "   chmod 755 $UPLOADS_DIR"
    echo ""
fi

echo "🔧 Quick fixes to try:"
echo ""
echo "1. Fix permissions:"
echo "   chmod -R 755 public/assets/uploads/"
echo "   find public/assets/uploads/products/ -type f -exec chmod 644 {} \\;"
echo ""
echo "2. Restart backend:"
echo "   pm2 restart all"
echo "   # or if using systemd:"
echo "   # sudo systemctl restart your-backend-service"
echo ""
echo "3. Check nginx config has this location block:"
echo "   location /assets/ {"
echo "       proxy_pass http://localhost:8000/assets/;"
echo "       # ... other settings"
echo "   }"
echo ""
echo "4. Reload nginx:"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "5. Test a file URL directly:"
if [ ! -z "$LATEST_FILE" ]; then
    echo "   curl -I https://saffron-staging.ekarigar.com/assets/uploads/products/$LATEST_FILE"
else
    echo "   curl -I https://saffron-staging.ekarigar.com/assets/uploads/products/your-file.webp"
fi
echo ""
echo "6. Check logs:"
echo "   # Backend logs"
echo "   pm2 logs"
echo "   # Nginx logs"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
