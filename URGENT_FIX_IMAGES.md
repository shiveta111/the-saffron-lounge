# URGENT FIX: Image Not Loading on Staging

## Problem
Images upload successfully but show "Failed to load" in the UI.
From your console: `https://saffron-staging.ekarigar.com/assets/uploads/products/chicken-biryani-1773730599414-364176556.webp`

## Root Cause
Your **nginx reverse proxy** is not configured to serve `/assets/` paths.

## Quick Fix (Most Likely Solution)

### 1. SSH into your staging server

### 2. Edit your nginx site configuration
```bash
sudo nano /etc/nginx/sites-available/saffron-staging
```

### 3. Add this location block BEFORE the main API proxy:
```nginx
# Serve static assets (images, etc.)
location /assets/ {
    proxy_pass http://localhost:8000/assets/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Enable CORS for images
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    
    # Cache images
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 4. Test nginx configuration
```bash
sudo nginx -t
```

### 5. Reload nginx
```bash
sudo systemctl reload nginx
```

### 6. Test the image URL
```bash
curl -I https://saffron-staging.ekarigar.com/assets/uploads/products/chicken-biryani-1773730599414-364176556.webp
```

You should see: `HTTP/2 200` (not 404 or 502)

### 7. Refresh your browser
Hard refresh (Ctrl+Shift+R) and upload a new image to test.

---

## Alternative: Serve Files Directly (Faster)

If nginx has direct filesystem access to your backend files:

```nginx
location /assets/ {
    alias /home/your-user/the_saffron_lounge/backend/public/assets/;
    
    # Enable CORS
    add_header Access-Control-Allow-Origin $http_origin always;
    
    # Cache
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Security
    try_files $uri =404;
}
```

---

## If Still Not Working

Run the diagnostic script:
```bash
cd backend
bash diagnose-images.sh
```

This will check:
- ✅ If files exist
- ✅ File permissions
- ✅ Backend server status
- ✅ If backend serves files on localhost
- ✅ If nginx serves files externally
- ✅ Nginx configuration issues

---

## Common Issues

### Issue 1: File Permissions
```bash
# Fix directory permissions
chmod 755 backend/public/assets/uploads/products/

# Fix file permissions
chmod 644 backend/public/assets/uploads/products/*
```

### Issue 2: Backend Not Running
```bash
# Check if running
pm2 list

# Restart
pm2 restart all
```

### Issue 3: Wrong Nginx Config File
```bash
# Find your active nginx config
sudo nginx -T | grep "saffron"

# Or check which file is being used
ls -la /etc/nginx/sites-enabled/
```

### Issue 4: CORS Headers Missing
Add to nginx config:
```nginx
add_header Access-Control-Allow-Origin $http_origin always;
```

### Issue 5: Files Not Persisted (Docker)
If using Docker, ensure uploads are mounted:
```yaml
volumes:
  - ./public/assets/uploads:/app/public/assets/uploads
```

---

## Test Commands

```bash
# 1. Test backend directly
curl -I http://localhost:8000/assets/uploads/products/some-file.webp

# 2. Test through nginx
curl -I https://saffron-staging.ekarigar.com/assets/uploads/products/some-file.webp

# 3. Check file exists
ls -lh backend/public/assets/uploads/products/ | tail -5

# 4. Check nginx logs
sudo tail -f /var/log/nginx/error.log

# 5. Check backend logs
pm2 logs --lines 50
```

---

## Expected Result

After fixing:
1. ✅ Upload image → Shows "Image uploaded successfully!"
2. ✅ Image preview loads immediately
3. ✅ Console shows: `✅ Image loaded successfully: https://...webp`
4. ✅ Direct URL in browser works

---

## Need More Help?

Run diagnostics and send output:
```bash
cd backend
bash diagnose-images.sh > diagnostic-output.txt
cat diagnostic-output.txt
```

Also check:
- Backend logs: `pm2 logs`
- Nginx error logs: `sudo tail -100 /var/log/nginx/error.log`
- Browser console Network tab (shows exact HTTP status code)
