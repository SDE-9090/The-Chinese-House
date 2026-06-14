🍜 The Chinese House - Restaurant Management & Ordering System
========================================================

A complete **Restaurant Ordering & Management System** built for **The Chinese House**, designed to simplify table management, streamline kitchen operations, and give the owner full control through a modern, responsive admin dashboard.

This system empowers customers to place orders directly from their tables via QR codes, provides counter staff with a seamless POS interface, and offers real-time order tracking through a Kitchen Display System (KDS) and a customer-facing Token Display.

✨ Project Highlights
--------------------

*   **PWA Ready:** Installable directly to Android tablets as a standalone native app
*   **Table & QR Ordering:** Customers can scan QR codes to start a session and order directly to their table
*   **Kitchen Display System (KDS):** Real-time tablet view for chefs to manage incoming tickets
*   **Dynamic CMS:** Admin can update the landing page hero, gallery, menu items, and promotions on the fly
*   **Multi-Role Authentication:** Secure login for Admins, Counter Staff, and Kitchen Staff
*   **Gift Vouchers & Coupons:** Built-in discount engine and digital gift voucher validation
*   **Comprehensive Analytics:** Real-time dashboard with customizable date-range sales reporting

🎯 Purpose of the Project
-------------------------

This project was developed to digitize and optimize **The Chinese House** restaurant operations where:

*   Wait times need to be reduced via direct-to-kitchen digital ordering
*   Counter staff need a rapid POS system for walk-in customers
*   The kitchen requires an organized, paperless ticket display
*   Management needs strict control over menu pricing, availability, and daily revenue tracking

👨‍🍳 Customer Features
-----------------------

* ✅ Browse categorized menu items with beautiful imagery
* ✅ Order directly from the table (QR Code) or at the counter
* ✅ Receive an instant **token number** for counter pickups
* ✅ Track order status on the Token Display screen
* ✅ Apply promotional discount coupons
* ✅ View total table bills directly on their mobile device
* ✅ Submit star ratings and text reviews for specific dishes

📺 Kitchen & Display Screens
-----------------------

**Kitchen Display System (KDS)**
* ✅ Auto-refreshing grid of incoming orders
* ✅ One-tap status updates (New -> Preparing -> Ready)
* ✅ Clearly labeled table numbers vs counter orders

**Token Display Screen**
* ✅ Live token list for today’s counter orders
* ✅ Visual and audio alerts when an order is "Ready"

🔐 Admin Dashboard Features
---------------------------

The admin/owner can completely manage the restaurant:

* ✅ **Menu Manager:** Add, edit, and toggle out-of-stock items; upload images via Cloudinary
* ✅ **Landing Page CMS:** Update the hero text, testimonials, gallery images, and promotions
* ✅ **Staff Management:** Create accounts for cashiers and chefs
* ✅ **Table Management:** Generate QR codes, view active table sessions, and print bills
* ✅ **Review Moderation:** View customer feedback and delete inappropriate reviews
* ✅ **Coupons:** Generate promotional codes with flat or percentage discounts

📊 Sales & Analytics Reporting
----------------------

The admin dashboard provides detailed, filterable sales reports including:

* ✅ Today's live revenue tracking
* ✅ Custom Date Range Filtering (Daily, Weekly, Monthly)
* ✅ Total orders, total revenue, paid vs due
* ✅ Insights into dine-in vs takeaway vs delivery performance

🛠️ Technology Stack
-------------------

### Frontend
*   **Framework:** React 18 + Vite + TypeScript
*   **Styling:** Tailwind CSS + Framer Motion (for fluid animations)
*   **Icons:** Lucide React
*   **PWA:** `vite-plugin-pwa` for native tablet installation

### Backend
*   **Framework:** Node.js + Express.js
*   **Database:** PostgreSQL (Neon DB)
*   **Storage:** Cloudinary (for menu and gallery images)
*   **Authentication:** JWT (JSON Web Tokens) + bcrypt

🚀 Deployment Guide
-------------------

**1. Environment Variables**
Configure the provided `.env.example` templates in both `frontend/` and `backend/` directories.

**2. Backend (Render / Heroku / VPS)**
- Set the root directory to `backend/`
- Build Command: `npm install`
- Start Command: `npm start`
- Ensure Postgres `DATABASE_URL` is provided.

**3. Frontend (Vercel / Netlify)**
- Set the root directory to `frontend/`
- Build Command: `npm run build`
- Output Directory: `dist`
- Set `VITE_API_URL` to point to the live backend server.

👨‍💻 Developed By
------------------

**Harshvardhan**
Software Developer 🚀

Built specifically for **The Chinese House**.

🎉 Conclusion
-------------

This system completely modernizes the traditional restaurant workflow. From the moment a customer scans a QR code to the moment the chef marks the ticket as ready, every step is tracked, optimized, and beautifully presented.
