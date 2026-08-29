# Simple Hisaab (सरल हिसाब)

A complete, modern, mobile-first web app for managing money given or received, calculating simple interest, tracking recovery status, and exporting professional PDF & CSV receipts. Designed for village and local daily use.

---

## Key Features

1. **Dashboard Overview**:
   - Total Persons count
   - Total Principal Amount
   - Total Amount (Principal + Interest)
   - Total Paid Amount
   - Total Pending Amount
   - Pending Persons counter
   - Quick Search and Pending Payments reminder section

2. **Add & Edit Hisaab**:
   - Person Name (Required)
   - Mobile Number (Validated for 10-digit Indian numbers)
   - Rate (%) with quick selection presets (2%, 3%, 5%, 10%, 12%)
   - Dena Date (Required, defaults to today)
   - Principal Amount (Required, with quick chips)
   - **Instant Automatic Calculation**:
     - $\text{Interest} = \text{Principal} \times \frac{\text{Rate}}{100}$
     - $\text{Total Amount} = \text{Principal} + \text{Interest}$
   - Payment Status (Pending / Paid)
   - Optional Notes / remarks

3. **Person List & Management**:
   - Instant live search by Person Name or Mobile number
   - Status filters: All, Paid, Pending
   - Date range filters: Today, This Month, Custom Date Range
   - Responsive design: Touch-friendly cards on Mobile, structured data table on Desktop
   - Single-click payment status toggle
   - Direct Call and WhatsApp reminder pre-filled templates

4. **PDF & CSV Export**:
   - **Full CSV**: `hisaab_full_data.csv` with UTF-8 BOM encoding for Microsoft Excel & Google Sheets
   - **Person-wise CSV**: `<Name>_hisaab.csv`
   - **Full PDF Report**: Summary metrics and comprehensive table layout via jsPDF & AutoTable
   - **Person PDF Voucher**: Official voucher receipt format with signature lines

5. **Local Data Safety & Offline Capabilities**:
   - 100% Client-Side LocalStorage persistence
   - Backup Export (`hisaab_backup.json`)
   - Backup Restore (JSON upload)
   - Clear All Data with double-confirmation modal

6. **Theme & Language**:
   - Dark Mode / Light Mode toggle
   - English & हिन्दी (Hindi) bilingual support

---

## Running in VS Code

### Option A: Standard Vite Dev Server (Recommended)
1. Open the project folder in VS Code.
2. Open the integrated terminal (`Ctrl + ~` or `Cmd + ~`).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` (or the port shown in terminal) in your browser.

---

### Option B: Using VS Code Live Server (Static Build)
1. Run build in terminal:
   ```bash
   npm run build
   ```
2. In VS Code, install the **Live Server** extension by *Ritwick Dey*.
3. Right-click on `dist/index.html` (or root `index.html`) in the File Explorer.
4. Select **"Open with Live Server"**.
5. The app will launch in your default browser.
