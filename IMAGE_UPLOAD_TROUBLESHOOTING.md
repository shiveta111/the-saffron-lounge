# Image Upload Troubleshooting Guide

## Issue: Images not showing after upload in production/staging

If images upload successfully but don't display, check these common issues:

### 1. **File Permissions**
The uploaded files directory must be readable by the web server:
```bash
# On your server, check permissions
ls -la backend/public/assets/uploads/products/

# Fix permissions if needed
chmod -R 755 backend/public/assets/uploads/
```

### 2. **Directory Persistence**
If using Docker or deployment systems, ensure the uploads directory is persisted:
- Not in .gitignore (uploads should be gitignored but directory structure should persist)
- Properly mounted in Docker volumes
- Not cleared on deployments

### 3. **Nginx/Reverse Proxy Configuration**
If using nginx in front of Node.js, ensure it's configured to serve the uploads:

```nginx
# Example nginx config
location /assets/ {
    alias /path/to/backend/public/assets/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 4. **Check Backend is Serving Static Files**
Verify the Express static middleware is configured (should be in `backend/src/server.ts`):
```typescript
app.use('/assets', express.static('public/assets'));
```

### 5. **CORS Headers**
Images must have proper CORS headers to load cross-origin. Check the console for CORS errors.

### 6. **Test Image URL Directly**
Open the image URL directly in browser:
```
https://your-domain.com/assets/uploads/products/filename.webp
```

If it doesn't load:
- Backend might not be running
- Static file middleware not configured
- File doesn't exist at that path
- Web server doesn't have read permissions

### 7. **Check Console Logs**
Updated image upload component now logs:
- Upload response details
- Image URL conversions
- Load errors with timestamps

Open DevTools Console to see these logs.

### 8. **Server-Side Logs**
Check backend logs for:
- Upload success messages (includes file path and size)
- File system errors
- Path resolution issues

### 9. **Environment Variables**
Verify `NEXT_PUBLIC_API_URL` in frontend `.env` matches your actual backend URL:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
```

### 10. **Cache Issues**
The component now includes cache-busting with timestamp parameters. If still seeing old images:
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Check CDN cache if using one

## Recent Code Changes

### Frontend (image-upload.tsx)
- ✅ Added cache-busting with timestamp parameters
- ✅ Added loading spinner for images
- ✅ Improved error handling with detailed console logs
- ✅ Shows "Failed to load" message instead of hiding broken images
- ✅ Logs image URLs at every step for debugging

### Backend (productService.ts)
- ✅ Fixed `arrayBuffer is not a function` error
- ✅ Removed incorrect File API usage (was using browser APIs in Node.js)
- ✅ Images are uploaded via `/api/upload/product-image` (multer)
- ✅ Product update now correctly handles imageUrl as a string path

## Quick Health Check

Run these commands on your server to diagnose:

```bash
# 1. Check if uploads directory exists and is writable
cd backend
ls -la public/assets/uploads/products/

# 2. Test file upload manually
curl -X POST -F "image=@test-image.jpg" \
  http://localhost:8000/api/v1/upload/product-image \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test if static files are served
curl -I http://localhost:8000/assets/uploads/products/some-existing-file.webp

# 4. Check backend logs
tail -f backend/logs/*.log
```

## Expected Behavior

1. User selects image → shows temporary preview (base64)
2. Image uploads → toast "Please wait, uploading image..."
3. Upload succeeds → toast "Image uploaded successfully!"
4. Form field updates with path like `/assets/uploads/products/filename.webp`
5. Preview switches from base64 to server URL with cache-buster: `https://backend.com/assets/uploads/products/filename.webp?t=1234567890`
6. Image loads and displays
7. On save, path is stored in database
8. When editing again, image loads from server with new cache-buster timestamp

## If Still Not Working

Check browser console for these diagnostic logs:
- `Image preview URL:` - Shows URL transformation
- `Image upload successful:` - Shows upload response
- `Image loaded successfully:` - Confirms image loaded
- `Image load error:` - Shows what URL failed

The error object will tell you if it's a:
- Network error (image not found - 404)
- CORS error (cross-origin blocked)
- Permission error (403 forbidden)
