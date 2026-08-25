-- Third Eye System - SQL Schema

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Preparer', 'Verifier', 'Approver', 'Receiver', 'Super Admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concernpersons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE expenselists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE paymentlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

CREATE TABLE mraforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    expense_type_id INT,
    payment_type_id INT,
    concern_person_id INT,
    purpose TEXT,
    amount DECIMAL(15,2),
    amount_in_words TEXT,
    prepared_by INT,
    verified_by INT,
    approved_by INT,
    received_by INT,
    status ENUM('Draft', 'Submitted', 'Verified', 'Approved', 'Received', 'Returned', 'Rejected') DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_type_id) REFERENCES expenselists(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_type_id) REFERENCES paymentlists(id) ON DELETE SET NULL,
    FOREIGN KEY (concern_person_id) REFERENCES concernpersons(id) ON DELETE SET NULL,
    FOREIGN KEY (prepared_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mra_id INT,
    user_id INT,
    action VARCHAR(50),
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mra_id) REFERENCES mraforms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed Data (Password is 'password')
INSERT INTO users (name, email, password, role) VALUES 
('Super Admin', 'admin@whiplc.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin');
