#!/bin/bash
# Script to create and apply media table migration

echo "📦 Creating migration for Media table..."
cd "$(dirname "$0")/.."

# Create migration
npx prisma migrate dev --name add_media_table --create-only

# Apply migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

echo "✅ Migration completed successfully!"
echo "📝 Media table has been created in the database."
