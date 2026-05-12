@echo off
echo ========================================
echo    SAFFRON LOUNGE DATABASE SETUP
echo ========================================
echo.

echo Step 1: Creating database...
echo Please run this SQL in phpMyAdmin or MySQL Workbench:
echo CREATE DATABASE IF NOT EXISTS saffron_db;
echo.

echo Step 2: Import tables...
echo Open phpMyAdmin -^> Select saffron_db -^> Import -^> Choose create-tables.sql
echo.

echo Step 3: Insert test data...
echo Run the following SQL queries in phpMyAdmin:
echo.

echo INSERT IGNORE INTO users (email, name, password, role, emailVerified, isActive, createdAt, updatedAt) VALUES
echo ('admin@test.com', 'Admin User', '$2b$12$6AD25XLQD6/F8q.zyT8CCeUD/LcmSOaKuVlZzhgMylEn.oKDkycoy', 'ADMIN', true, true, NOW(), NOW()),
echo ('seller@test.com', 'Seller User', '$2b$12$6AD25XLQD6/F8q.zyT8CCeUD/LcmSOaKuVlZzhgMylEn.oKDkycoy', 'SELLER', true, true, NOW(), NOW()),
echo ('customer@test.com', 'Customer User', '$2b$12$6AD25XLQD6/F8q.zyT8CCeUD/LcmSOaKuVlZzhgMylEn.oKDkycoy', 'CUSTOMER', true, true, NOW(), NOW());
echo.

echo INSERT IGNORE INTO categories (name, description, isActive, sortOrder) VALUES
echo ('Spices', 'Premium quality spices and seasonings', true, 1),
echo ('Herbs', 'Fresh and dried herbs for cooking', true, 2),
echo ('Blends', 'Special spice blends and mixes', true, 3),
echo ('Oils', 'Essential oils and cooking oils', true, 4);
echo.

echo INSERT IGNORE INTO products (name, description, price, category, isAvailable) VALUES
echo ('Saffron Threads', 'Premium Kashmiri saffron threads, highest quality', 299.99, 'Spices', true),
echo ('Turmeric Powder', 'Organic turmeric powder, rich in curcumin', 12.99, 'Spices', true),
echo ('Cumin Seeds', 'Whole cumin seeds, perfect for Indian cuisine', 8.99, 'Spices', true),
echo ('Cardamom Pods', 'Green cardamom pods, aromatic and flavorful', 24.99, 'Spices', true),
echo ('Black Pepper', 'Whole black peppercorns, freshly ground', 15.99, 'Spices', true),
echo ('Cinnamon Sticks', 'Ceylon cinnamon sticks, sweet and aromatic', 18.99, 'Spices', true),
echo ('Garam Masala', 'Traditional Indian spice blend', 16.99, 'Blends', true),
echo ('Curry Powder', 'Mild curry powder blend', 14.99, 'Blends', true);
echo.

echo Step 4: Test the setup...
echo Run: npm test -- --testNamePattern="auth.*test"
echo.

echo ========================================
echo    MANUAL DATABASE SETUP COMPLETE
echo ========================================
echo.
echo Test Credentials:
echo Admin: admin@test.com / admin123
echo Seller: seller@test.com / seller123
echo Customer: customer@test.com / customer123
echo.

pause