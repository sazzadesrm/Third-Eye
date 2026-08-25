# Third Eye - PHP & MySQL Deployment Guide

This folder contains the complete, native PHP + MySQL conversion of the Third Eye Web Application, customized specifically for deployment on Starthost (cPanel / Apache) environments.

## 1. Database Setup on Starthost
1. Log into your **Starthost cPanel**.
2. Navigate to **MySQL Databases**.
3. Create a new database (e.g., `yourdomain_thirdeye`).
4. Create a new database user and assign a password.
5. Add the user to the database with **ALL PRIVILEGES**.
6. Open **phpMyAdmin** from cPanel, select your new database, and click **Import**.
7. Upload the `database.sql` file provided in this folder to create all tables and insert the default Admin user.

## 2. Configure Database Connection
1. Open the `db.php` file in this folder using a text editor.
2. Update the credentials with the ones you created in step 1:
   ```php
   $host = 'localhost'; // Usually localhost on Starthost
   $dbname = 'yourdomain_thirdeye'; 
   $username = 'yourdomain_dbuser';
   $password = 'YourSecurePassword123';
   ```

## 3. Upload Files
1. Go to **File Manager** in your Starthost cPanel.
2. Navigate to `public_html` (or the folder of your addon domain).
3. Upload all the `.php` files from this folder (`index.php`, `login.php`, `logout.php`, `db.php`, `create.php`) directly into `public_html`.

## 4. Access the Application
1. Visit your custom domain (e.g., `https://yourdomain.com`).
2. You will be redirected to the login page.
3. Log in with the default credentials:
   - **Email:** `admin@whiplc.com`
   - **Password:** `password`

## Architecture Note
This is a modern, vanilla PHP 8.2+ application using PDO for secure SQL interactions and Tailwind CSS (via CDN) for the UI. It runs seamlessly on standard Starthost/cPanel shared hosting without requiring Node.js, Vite, or Composer dependency management.
