# Replit Setup & Deployment Guide

This repository is configured for one-click setup, running, and deployment on **Replit**.

---

## 🚀 Quick Start on Replit (Node.js & React Full-Stack App)

### 1. Import to Replit
1. Open [Replit.com](https://replit.com) and click **+ Create Repl**.
2. Select **Import from GitHub** and paste your exported repository URL (or create a new Node.js Repl and upload the project ZIP).
3. Replit will automatically detect the `.replit` and `package.json` configuration.

### 2. Configure Secrets (Environment Variables)
In Replit, go to the **Tools** -> **Secrets (Environment Variables)** sidebar and add:
- `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key if you want AI smart OCR receipt scanning and audio expense parsing enabled.
- `NODE_ENV`: Set to `development` for local editing, or `production` for deployed builds.

### 3. Run the App
- Simply click the big green **Run** button at the top of Replit.
- Replit will execute `npm run dev` and open the live web view on port 3000.

---

## 🌐 Deploying on Replit (Production & Custom Domain)

### Step 1: Deploy with Replit Deployments
1. In the top right corner of your Repl, click the **Deploy** or **Release** button.
2. Choose **Autoscale** or **Reserved VM** (Autoscale is recommended for standard web apps).
3. The build command (`npm run build`) and start command (`npm run start`) are pre-configured in `.replit`.
4. Click **Deploy**. Replit will build the optimized production assets and deploy your server.

### Step 2: Link Your Custom Domain
1. In the **Deployments** dashboard of your Repl, go to the **Custom Domains** section.
2. Enter your custom domain (e.g. `expenses.yourcompany.com` or `yourdomain.com`).
3. Replit will generate the necessary DNS records (`CNAME` or `A` record).
4. Add those DNS records to your domain registrar (e.g., Cloudflare, Namecheap, GoDaddy).
5. Once DNS propagates, Replit will automatically provision a free SSL certificate.

---

## 🐘 Note for PHP / Starthost Hosting
If you prefer deploying the pure PHP & MySQL version to Starthost or cPanel shared hosting:
- All required PHP files and SQL schemas are located inside the `ThirdEye_PHP_Project/` directory.
- Follow the instructions in `ThirdEye_PHP_Project/DEPLOYMENT_GUIDE.md` for cPanel / phpMyAdmin deployment.
