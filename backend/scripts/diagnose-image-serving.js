#!/usr/bin/env node
/**
 * Diagnostic script to check image serving configuration
 * Run this on your server to diagnose why images aren't loading
 *
 * Usage: node scripts/diagnose-image-serving.js
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

console.log("🔍 Image Serving Diagnostics\n");
console.log("=".repeat(60));

// 1. Check directory existence and permissions
const uploadsDir = path.join(
  process.cwd(),
  "public",
  "assets",
  "uploads",
  "products",
);
console.log("\n📁 Directory Check:");
console.log(`   Path: ${uploadsDir}`);

if (fs.existsSync(uploadsDir)) {
  console.log("   ✅ Directory exists");

  try {
    const stats = fs.statSync(uploadsDir);
    const mode = (stats.mode & parseInt("777", 8)).toString(8);
    console.log(`   Permissions: ${mode}`);

    // Check if directory is readable
    try {
      fs.accessSync(uploadsDir, fs.constants.R_OK);
      console.log("   ✅ Directory is readable");
    } catch (err) {
      console.log("   ❌ Directory is NOT readable");
      console.log(`   Error: ${err.message}`);
    }

    // List files
    const files = fs.readdirSync(uploadsDir);
    console.log(`   Files found: ${files.length}`);

    if (files.length > 0) {
      console.log("   Latest files:");
      files
        .map((f) => ({
          name: f,
          path: path.join(uploadsDir, f),
          stats: fs.statSync(path.join(uploadsDir, f)),
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime)
        .slice(0, 5)
        .forEach((file) => {
          const mode = (file.stats.mode & parseInt("777", 8)).toString(8);
          const size = (file.stats.size / 1024).toFixed(2);
          console.log(`     - ${file.name} (${size}KB, mode: ${mode})`);
        });
    }
  } catch (err) {
    console.log(`   ❌ Error checking directory: ${err.message}`);
  }
} else {
  console.log("   ❌ Directory does NOT exist");
  console.log("   Create it with: mkdir -p public/assets/uploads/products");
}

// 2. Check if Express static middleware is configured
console.log("\n⚙️  Server Configuration:");
const serverFile = path.join(process.cwd(), "src", "server.ts");
if (fs.existsSync(serverFile)) {
  const serverContent = fs.readFileSync(serverFile, "utf8");
  if (serverContent.includes("express.static('public/assets')")) {
    console.log("   ✅ Express static middleware configured for /assets");
  } else {
    console.log("   ❌ Express static middleware NOT found");
    console.log("   Add this line to server.ts:");
    console.log("   app.use('/assets', express.static('public/assets'));");
  }
} else {
  console.log("   ⚠️  Could not find server.ts file");
}

// 3. Test if server is running and serving files
console.log("\n🌐 Server Test:");
const testPorts = [8000, 3000, 5000];

function testServer(port) {
  return new Promise((resolve) => {
    const req = http.get(
      `http://localhost:${port}/assets/uploads/products/`,
      (res) => {
        resolve({ port, status: res.statusCode, running: true });
        req.destroy();
      },
    );
    req.on("error", () => {
      resolve({ port, running: false });
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve({ port, running: false });
    });
  });
}

Promise.all(testPorts.map(testServer)).then((results) => {
  results.forEach((result) => {
    if (result.running) {
      console.log(
        `   ✅ Server running on port ${result.port} (HTTP ${result.status})`,
      );
    } else {
      console.log(`   ❌ No server on port ${result.port}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 Summary:");
  console.log(
    "   1. Check if directory exists and has proper permissions (755)",
  );
  console.log("   2. Ensure files have read permissions (644)");
  console.log("   3. Verify Express static middleware is configured");
  console.log(
    "   4. If using Nginx, ensure /assets location is proxied or served",
  );
  console.log(
    "   5. Check firewall/security groups allow access to image URLs",
  );
  console.log("   6. Test image URL directly in browser");
  console.log("\n💡 Quick fixes:");
  console.log("   chmod -R 755 public/assets/uploads/");
  console.log("   chmod -R 644 public/assets/uploads/products/*");
  console.log("\n");
});
