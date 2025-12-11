const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
const ADMIN_CREDENTIALS = { user: "admin", pass: "password123" };
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'submissions.json');

// --- SETUP FOLDERS ---
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve HTML/CSS/Images

// --- STORAGE ENGINE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- AUTHENTICATION HELPER ---
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required');
    }
    const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    if (user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        res.status(401).send('Access Denied');
    }
};

// --- ROUTES ---

// 1. Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Admin Panel (Protected)
app.get('/admin', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. API: Get Entries (Protected)
app.get('/api/entries', basicAuth, (req, res) => {
    const data = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : [];
    res.json(data);
});

// 4. API: Delete Entry (Protected)
app.delete('/api/entries/:id', basicAuth, (req, res) => {
    let data = JSON.parse(fs.readFileSync(DB_FILE));
    const entry = data.find(e => e.id == req.params.id);
    
    if (entry) {
        // Delete associated file if it exists
        if (entry.filename) {
            const filePath = path.join(UPLOAD_DIR, entry.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        // Save new list
        data = data.filter(e => e.id != req.params.id);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 5. Handle Form Submission
app.post('/submit-entry', upload.single('attachment_file'), (req, res) => {
    try {
        const currentData = JSON.parse(fs.readFileSync(DB_FILE));
        const newEntry = {
            id: Date.now(),
            comment: req.body.user_comment || "No Comment",
            filename: req.file ? req.file.filename : null,
            date: new Date().toLocaleString()
        };
        
        currentData.push(newEntry);
        fs.writeFileSync(DB_FILE, JSON.stringify(currentData, null, 2));
        
        // Redirect back to home with success message
        res.redirect('/?status=success');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel at http://localhost:${PORT}/admin`);
});

