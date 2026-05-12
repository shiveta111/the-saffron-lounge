-- ===========================================
-- SAFFRON DB COMPLETE SETUP SCRIPT
-- ===========================================
-- Database: saffron_db (MySQL 8.0+)
-- This is the COMPLETE, CONSOLIDATED SQL script for The Saffron Lounge
-- Contains all tables, data, and operations in one file
-- Execute this script to set up the complete database from scratch
-- ===========================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS saffron_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE saffron_db;

-- Disable foreign key checks during setup
SET FOREIGN_KEY_CHECKS = 0;

-- ===========================================
-- 1. CREATE ALL TABLES
-- ===========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role ENUM('ADMIN', 'SELLER', 'CUSTOMER') DEFAULT 'CUSTOMER',
    emailVerified BOOLEAN DEFAULT FALSE,
    emailVerificationToken VARCHAR(255),
    emailVerificationExpires DATETIME,
    passwordResetToken VARCHAR(255),
    passwordResetExpires DATETIME,
    isActive BOOLEAN DEFAULT TRUE,
    loyaltyPoints INT DEFAULT 0,
    phone VARCHAR(20),
    address TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    imageUrl VARCHAR(500),
    isActive BOOLEAN DEFAULT TRUE,
    sortOrder INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menus table (separate from products)
CREATE TABLE IF NOT EXISTS menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    categoryId INT,
    category VARCHAR(100) DEFAULT 'General',
    imageUrl VARCHAR(500),
    isAvailable BOOLEAN DEFAULT TRUE,
    isSpecial BOOLEAN DEFAULT FALSE,
    preparationTime INT,
    allergens TEXT,
    nutritionalInfo TEXT,
    dietaryNotes TEXT,
    availability INT DEFAULT 10,
    allergenCodes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customerId INT NOT NULL,
    status ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items table (references menus instead of products)
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    menuId INT NOT NULL,  -- Changed from productId to menuId
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    specialRequests TEXT,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE  -- Changed from products to menus
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timeslots table
CREATE TABLE IF NOT EXISTS timeslots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    startTime VARCHAR(5) NOT NULL,
    endTime VARCHAR(5) NOT NULL,
    capacity INT DEFAULT 10,
    bookedCount INT DEFAULT 0,
    status ENUM('AVAILABLE', 'FULL', 'DISABLED') DEFAULT 'AVAILABLE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    orderId INT,
    bookingType ENUM('PICKUP', 'DELIVERY') NOT NULL,
    date DATE NOT NULL,
    timeSlotId INT NOT NULL,
    address TEXT,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    paymentType ENUM('CASH', 'CARD_ON_DELIVERY', 'ONLINE') DEFAULT 'CASH',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (timeSlotId) REFERENCES timeslots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('STRIPE', 'PAYPAL', 'CASH', 'CARD') NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    transactionId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Booking payments table
CREATE TABLE IF NOT EXISTS booking_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookingId INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paymentType ENUM('CASH', 'CARD_ON_DELIVERY', 'ONLINE') NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    transactionId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discountType ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    discountValue DECIMAL(10,2) NOT NULL,
    validFrom DATETIME NOT NULL,
    validTo DATETIME,
    applicableItems JSON,
    usageLimit INT,
    usedCount INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookingId INT NOT NULL,
    userId INT NOT NULL,
    type ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    message TEXT NOT NULL,
    sentAt TIMESTAMP NULL,
    status ENUM('SENT', 'FAILED', 'PENDING') DEFAULT 'PENDING',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CMS Tables
CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content LONGTEXT NOT NULL,
    featured_image VARCHAR(500),
    tags TEXT,
    published_status BOOLEAN DEFAULT FALSE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    author_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    bio TEXT,
    photo VARCHAR(500),
    social_links JSON,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    feedback TEXT NOT NULL,
    rating INT,
    photo VARCHAR(500),
    company VARCHAR(255),
    date_given DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    images TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    technologies_used TEXT NOT NULL,
    link VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft',
    client_name VARCHAR(255),
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100),
    features TEXT NOT NULL,
    price DECIMAL(10,2),
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS galleries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    organizer_id INT,
    capacity INT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_user (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit and logging tables
CREATE TABLE IF NOT EXISTS data_change_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_data JSON,
    new_data JSON,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_timestamp (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_isActive ON users(isActive);
CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users(createdAt);
CREATE INDEX IF NOT EXISTS idx_users_emailVerified ON users(emailVerified);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, isActive);
CREATE INDEX IF NOT EXISTS idx_users_createdAt_role ON users(createdAt, role);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_isActive ON categories(isActive);
CREATE INDEX IF NOT EXISTS idx_categories_sortOrder ON categories(sortOrder);

-- Menus indexes
CREATE INDEX IF NOT EXISTS idx_menus_category ON menus(category);
CREATE INDEX IF NOT EXISTS idx_menus_isAvailable ON menus(isAvailable);
CREATE INDEX IF NOT EXISTS idx_menus_isSpecial ON menus(isSpecial);
CREATE INDEX IF NOT EXISTS idx_menus_price ON menus(price);
CREATE INDEX IF NOT EXISTS idx_menus_createdAt ON menus(createdAt);
CREATE INDEX IF NOT EXISTS idx_menus_availability ON menus(availability);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_customerId ON orders(customerId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);
CREATE INDEX IF NOT EXISTS idx_orders_status_createdAt ON orders(status, createdAt);
CREATE INDEX IF NOT EXISTS idx_orders_customerId_createdAt ON orders(customerId, createdAt);
CREATE INDEX IF NOT EXISTS idx_orders_total ON orders(total);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_order_items_menuId ON order_items(menuId);

-- Timeslots indexes
CREATE INDEX IF NOT EXISTS idx_timeslots_date ON timeslots(date);
CREATE INDEX IF NOT EXISTS idx_timeslots_status ON timeslots(status);
CREATE INDEX IF NOT EXISTS idx_timeslots_startTime ON timeslots(startTime);
CREATE INDEX IF NOT EXISTS idx_timeslots_endTime ON timeslots(endTime);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_userId ON bookings(userId);
CREATE INDEX IF NOT EXISTS idx_bookings_orderId ON bookings(orderId);
CREATE INDEX IF NOT EXISTS idx_bookings_timeSlotId ON bookings(timeSlotId);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_bookingType ON bookings(bookingType);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_userId_date ON bookings(userId, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_createdAt ON bookings(status, createdAt);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_orderId ON payments(orderId);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_createdAt ON payments(createdAt);

-- Booking payments indexes
CREATE INDEX IF NOT EXISTS idx_booking_payments_bookingId ON booking_payments(bookingId);
CREATE INDEX IF NOT EXISTS idx_booking_payments_status ON booking_payments(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_bookingId ON notifications(bookingId);
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Promotions indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_isActive ON promotions(isActive);
CREATE INDEX IF NOT EXISTS idx_promotions_validFrom ON promotions(validFrom);
CREATE INDEX IF NOT EXISTS idx_promotions_validTo ON promotions(validTo);

-- CMS indexes
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_published_status ON blogs(published_status);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at);

CREATE INDEX IF NOT EXISTS idx_teams_email ON teams(email);

CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON testimonials(rating);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at);

CREATE INDEX IF NOT EXISTS idx_portfolios_category ON portfolios(category);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers(created_at);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_created_at ON faqs(created_at);

CREATE INDEX IF NOT EXISTS idx_galleries_type ON galleries(type);
CREATE INDEX IF NOT EXISTS idx_galleries_category ON galleries(category);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);

-- ===========================================
-- 3. POPULATE SAMPLE DATA
-- ===========================================

-- Insert users
INSERT INTO users (id, password, email, name, role, emailVerified, isActive, loyaltyPoints, phone, address, createdAt, updatedAt) VALUES
(1, '$2b$12$NV6cZ6Tep4VCTcVkji/GcO0381adOA8j.DkonihjgIvQasgbbx46i', 'admin@test.com', 'Rajesh Kumar', 'ADMIN', TRUE, TRUE, 0, '+91-9876543210', '123 MG Road, Bangalore, Karnataka 560001', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeCt1uSk8pyqfVkm', 'manager@saffronlounge.com', 'Priya Sharma', 'ADMIN', TRUE, TRUE, 0, '+91-9876543211', '456 Brigade Road, Bangalore, Karnataka 560025', '2024-01-16 11:00:00', '2024-01-16 11:00:00'),
(3, '$2b$12$0FHd0FJiB7q8UI1IDXmIs.rS6NiF4ZuAsDtPTuAvgWyMD6ZCyNf/y', 'seller@test.com', 'Amit Singh', 'SELLER', TRUE, TRUE, 0, '+91-9876543212', '789 Residency Road, Bangalore, Karnataka 560025', '2024-01-17 12:00:00', '2024-01-17 12:00:00'),
(4, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeCt1uSk8pyqfVkm', 'waiter@saffronlounge.com', 'Sunita Patel', 'SELLER', TRUE, TRUE, 0, '+91-9876543213', '321 Commercial Street, Bangalore, Karnataka 560001', '2024-01-18 13:00:00', '2024-01-18 13:00:00'),
(5, '$2b$12$mCUB3cdzI1t9NIbyMiGiKefKdBLjSQE417QEIxAFBfZI6nDvEXoZ6', 'customer@test.com', 'Arun Kumar', 'CUSTOMER', TRUE, TRUE, 150, '+91-9876543214', '567 Koramangala, Bangalore, Karnataka 560034', '2024-02-01 09:00:00', '2024-02-01 09:00:00'),
(6, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeCt1uSk8pyqfVkm', 'vip@test.com', 'Meera Joshi', 'CUSTOMER', TRUE, TRUE, 500, '+91-9876543215', '890 Indiranagar, Bangalore, Karnataka 560038', '2024-02-02 10:00:00', '2024-02-02 10:00:00')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  loyaltyPoints = VALUES(loyaltyPoints),
  phone = VALUES(phone),
  address = VALUES(address),
  updatedAt = NOW();

-- Insert categories
INSERT INTO categories (id, name, description, imageUrl, isActive, sortOrder, createdAt, updatedAt) VALUES
(1, 'Appetizers', 'Light and flavorful starters to begin your culinary journey', '/images/categories/appetizers.jpg', TRUE, 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, 'Main Course', 'Hearty and satisfying main dishes with authentic flavors', '/images/categories/main-course.jpg', TRUE, 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(3, 'Vegetarian', 'Delicious vegetarian options bursting with Indian spices', '/images/categories/vegetarian.jpg', TRUE, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(4, 'Desserts', 'Sweet endings to complete your dining experience', '/images/categories/desserts.jpg', TRUE, 4, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(5, 'Beverages', 'Refreshing drinks and traditional beverages', '/images/categories/beverages.jpg', TRUE, 5, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(6, 'Snacks', 'Quick bites and light snacks', '/images/categories/snacks.jpg', TRUE, 6, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(7, 'Specials', 'Chef\'s special creations and seasonal offerings', '/images/categories/specials.jpg', TRUE, 7, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(8, 'Thalis', 'Complete meal platters', '/images/categories/thalis.jpg', TRUE, 8, '2024-01-15 10:00:00', '2024-01-15 10:00:00')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  isActive = VALUES(isActive),
  sortOrder = VALUES(sortOrder),
  updatedAt = NOW();

-- Insert menu items
INSERT INTO menus (id, name, description, price, categoryId, category, imageUrl, isAvailable, isSpecial, preparationTime, allergens, dietaryNotes, availability, createdAt, updatedAt) VALUES
(1, 'Grilled Salmon', 'Fresh Atlantic salmon grilled to perfection with herbs', 450.00, 2, 'Main Course', '/images/menu/salmon.jpg', TRUE, TRUE, 20, '["Fish"]', '["Non-Vegetarian", "Gluten-Free"]', 10, NOW(), NOW()),
(2, 'Chicken Biryani', 'Aromatic basmati rice with tender chicken and spices', 280.00, 2, 'Main Course', '/images/menu/chicken-biryani.jpg', TRUE, FALSE, 25, '["Chicken"]', '["Non-Vegetarian"]', 15, NOW(), NOW()),
(3, 'Paneer Tikka Masala', 'Cottage cheese in rich, creamy tomato curry', 240.00, 3, 'Vegetarian', '/images/menu/paneer-tikka-masala.jpg', TRUE, FALSE, 15, '["Dairy"]', '["Vegetarian"]', 12, NOW(), NOW()),
(4, 'Masala Dosa', 'Crispy crepe filled with spiced potato filling', 120.00, 1, 'Appetizers', '/images/menu/masala-dosa.jpg', TRUE, FALSE, 10, NULL, '["Vegetarian", "Can be made Vegan"]', 20, NOW(), NOW()),
(5, 'Ras Malai', 'Soft cheese dumplings in sweetened cardamom syrup', 80.00, 4, 'Desserts', '/images/menu/ras-malai.jpg', TRUE, FALSE, 5, '["Dairy"]', '["Vegetarian"]', 25, NOW(), NOW()),
(6, 'Chef Special Thali', 'Chef\'s special combination platter', 320.00, 8, 'Thalis', '/images/menu/chef-special-thali.jpg', TRUE, TRUE, 30, NULL, '["Customizable"]', 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price = VALUES(price),
  isAvailable = VALUES(isAvailable),
  isSpecial = VALUES(isSpecial),
  preparationTime = VALUES(preparationTime),
  availability = VALUES(availability),
  updatedAt = NOW();

-- Insert timeslots
INSERT INTO timeslots (id, date, startTime, endTime, capacity, bookedCount, status, createdAt, updatedAt) VALUES
(1, '2025-01-15', '11:00', '12:00', 10, 0, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, '2025-01-15', '12:00', '13:00', 10, 2, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(3, '2025-01-15', '18:00', '19:00', 10, 3, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(4, '2025-01-15', '19:00', '20:00', 10, 5, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(5, '2025-01-16', '11:00', '12:00', 10, 0, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(6, '2025-01-16', '18:00', '19:00', 10, 0, 'AVAILABLE', '2024-01-15 10:00:00', '2024-01-15 10:00:00')
ON DUPLICATE KEY UPDATE
  bookedCount = VALUES(bookedCount),
  status = VALUES(status),
  updatedAt = NOW();

-- Insert sample orders
INSERT INTO orders (id, customerId, status, total, notes, createdAt, updatedAt) VALUES
(1, 5, 'PENDING', 450.00, 'Birthday celebration', '2024-10-15 12:00:00', '2024-10-15 12:00:00'),
(2, 6, 'PREPARING', 280.00, 'Extra spicy', '2024-10-15 13:30:00', '2024-10-15 13:30:00'),
(3, 5, 'DELIVERED', 320.00, 'Quick delivery', '2024-10-15 18:00:00', '2024-10-15 20:00:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  total = VALUES(total),
  notes = VALUES(notes),
  updatedAt = NOW();

-- Insert order items
INSERT INTO order_items (id, orderId, menuId, quantity, price, specialRequests) VALUES
(1, 1, 1, 1, 450.00, 'Add birthday candle'),
(2, 2, 2, 1, 280.00, 'Extra spicy'),
(3, 3, 6, 1, 320.00, 'No onions')
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  price = VALUES(price),
  specialRequests = VALUES(specialRequests);

-- Insert payments
INSERT INTO payments (id, orderId, amount, method, status, transactionId, createdAt, updatedAt) VALUES
(1, 1, 450.00, 'CARD', 'PENDING', 'TXN_001', '2024-10-15 12:05:00', '2024-10-15 12:05:00'),
(2, 2, 280.00, 'CASH', 'COMPLETED', 'TXN_002', '2024-10-15 13:35:00', '2024-10-15 13:35:00'),
(3, 3, 320.00, 'CARD', 'COMPLETED', 'TXN_003', '2024-10-15 18:05:00', '2024-10-15 18:05:00')
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  method = VALUES(method),
  status = VALUES(status),
  transactionId = VALUES(transactionId),
  updatedAt = NOW();

-- Insert bookings
INSERT INTO bookings (id, userId, orderId, bookingType, date, timeSlotId, address, status, paymentType, notes, createdAt, updatedAt) VALUES
(1, 5, 1, 'DELIVERY', '2024-10-15', 3, '567 Koramangala, Bangalore, Karnataka 560034', 'PENDING', 'ONLINE', 'Birthday celebration', '2024-10-15 12:00:00', '2024-10-15 12:00:00'),
(2, 6, 2, 'PICKUP', '2024-10-15', 4, NULL, 'CONFIRMED', 'CASH', 'Will arrive in 20 minutes', '2024-10-15 13:30:00', '2024-10-15 13:30:00'),
(3, 5, NULL, 'PICKUP', '2025-01-16', 5, NULL, 'PENDING', 'CASH', 'Quick takeaway', '2024-10-16 11:00:00', '2024-10-16 11:00:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  paymentType = VALUES(paymentType),
  notes = VALUES(notes),
  updatedAt = NOW();

-- Insert promotions
INSERT INTO promotions (id, code, discountType, discountValue, validFrom, validTo, usageLimit, usedCount, isActive, createdAt, updatedAt) VALUES
(1, 'WELCOME20', 'PERCENTAGE', 20.00, '2024-12-01 00:00:00', '2024-12-31 23:59:59', 100, 0, TRUE, '2024-11-15 10:00:00', '2024-11-15 10:00:00'),
(2, 'DIWALI50', 'FIXED', 50.00, '2024-12-15 00:00:00', '2024-12-25 23:59:59', 50, 0, TRUE, '2024-11-20 11:00:00', '2024-11-20 11:00:00'),
(3, 'LOYALTY15', 'PERCENTAGE', 15.00, '2024-12-01 00:00:00', '2025-01-31 23:59:59', NULL, 0, TRUE, '2024-11-25 12:00:00', '2024-11-25 12:00:00')
ON DUPLICATE KEY UPDATE
  discountValue = VALUES(discountValue),
  validTo = VALUES(validTo),
  usageLimit = VALUES(usageLimit),
  usedCount = VALUES(usedCount),
  isActive = VALUES(isActive),
  updatedAt = NOW();

-- Insert sample CMS content
INSERT INTO blogs (id, title, slug, content, featured_image, tags, published_status, meta_title, meta_description, author_id, created_at, updated_at) VALUES
(1, 'The Art of Authentic Indian Cuisine', 'art-authentic-indian-cuisine', 'Discover the rich tapestry of flavors that make Indian cuisine one of the world\'s most diverse and beloved culinary traditions...', '/images/blogs/authentic-indian-cuisine.jpg', '["indian-cuisine", "authentic-food", "spices", "tradition", "culinary-heritage"]', TRUE, 'The Art of Authentic Indian Cuisine | The Saffron Lounge', 'Discover the rich tapestry of flavors that make Indian cuisine one of the world\'s most diverse and beloved culinary traditions.', 1, '2024-01-15 09:00:00', '2024-01-15 09:00:00'),
(2, 'Behind the Scenes: Our Spice Journey', 'behind-scenes-spice-journey', 'Every great dish begins with exceptional ingredients, and at The Saffron Lounge, our spice journey is a testament to our commitment to quality and authenticity...', '/images/blogs/spice-journey.jpg', '["cooking", "spices", "quality", "ingredients", "authenticity"]', TRUE, 'Behind the Scenes: Our Spice Journey | The Saffron Lounge', 'Every great dish begins with exceptional ingredients, and at The Saffron Lounge, our spice journey is a testament to our commitment to quality and authenticity.', 2, '2024-01-16 10:00:00', '2024-01-16 10:00:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content),
  published_status = VALUES(published_status),
  updated_at = NOW();

INSERT INTO testimonials (id, client_name, designation, feedback, rating, photo, company, date_given, created_at, updated_at) VALUES
(1, 'Rahul Sharma', 'Software Engineer', 'Exceptional dining experience! The food was authentic and the service was impeccable. Will definitely visit again.', 5, '/images/testimonials/rahul.jpg', 'TechCorp', '2024-10-01', '2024-10-01 10:00:00', '2024-10-01 10:00:00'),
(2, 'Priya Patel', 'Marketing Manager', 'The Saffron Lounge offers the best Indian cuisine in Bangalore. The ambiance is perfect for both family dinners and business meetings.', 5, '/images/testimonials/priya.jpg', 'BrandSolutions', '2024-10-05', '2024-10-05 11:00:00', '2024-10-05 11:00:00'),
(3, 'Amit Kumar', 'Business Owner', 'Outstanding quality and authentic flavors. The chef\'s special thali was a culinary masterpiece!', 4, '/images/testimonials/amit.jpg', 'RetailPlus', '2024-10-10', '2024-10-10 12:00:00', '2024-10-10 12:00:00')
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  feedback = VALUES(feedback),
  rating = VALUES(rating),
  updated_at = NOW();

INSERT INTO services (id, title, description, icon, features, price, category, created_at, updated_at) VALUES
(1, 'Restaurant Dining', 'Experience authentic Indian cuisine in our elegant restaurant setting', 'restaurant', '["Authentic Indian cuisine", "Elegant ambiance", "Professional service", "Flexible seating arrangements"]', NULL, 'Dining', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(2, 'Catering Services', 'Professional catering for events, parties, and corporate functions', 'catering', '["Customized menus", "Professional staff", "Setup and cleanup", "Dietary accommodations"]', 25.00, 'Events', '2024-01-01 10:15:00', '2024-01-01 10:15:00'),
(3, 'Takeaway & Delivery', 'Convenient takeaway and home delivery services', 'delivery', '["Fresh preparation", "Quick service", "Contactless delivery", "Online ordering"]', NULL, 'Delivery', '2024-01-01 10:30:00', '2024-01-01 10:30:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  updated_at = NOW();

-- ===========================================
-- 4. FINALIZE AND VERIFY
-- ===========================================

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================
SELECT '🎉 SAFFRON DB COMPLETE SETUP FINISHED!' as status;
SELECT '✅ All tables created with proper relationships' as tables_status;
SELECT '✅ All indexes created for optimal performance' as indexes_status;
SELECT '✅ Sample data populated successfully' as data_status;
SELECT '✅ Foreign key constraints active' as constraints_status;
SELECT '🚀 Database ready for The Saffron Lounge application!' as final_status;