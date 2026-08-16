 const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

fs.ensureDirSync('./data');
fs.ensureDirSync('./uploads');
fs.ensureDirSync('./data/trash');

// ==========================================
// 📚 7-JADE ONLY (29 students)
// ==========================================
const JADE_ROSTER = [
    "ACUÑA, JASMINE ABUNDO",
    "ALPE, SOPHIA ELLEN ROSALES",
    "ALVAREZ, RED XANDER LOZANO",
    "BALBIN, JULIUS JOAQUIN BUBAN",
    "BEA, JAY GIL B.",
    "BELARDO, SEAN EMMANUEL BALASTA",
    "BELER, MATT JOSHUA ESCUETA",
    "CARINAN, KEN BRYAN NOBLEZA",
    "CERENO, KEN JERVIN BERCASIO",
    "CLAVECILLA, PRINCESS JESSICA ATANACIO",
    "CORDOVA, KYLA RHEA FE PARIS",
    "DE LA PEÑA, MKRALJ BJORN OLAN",
    "ERMAC, ETHAN JOHN LUZANDE",
    "ESPIRITU, ZIA EMMANUELLE BARCILLANO",
    "FORMALEJO, EARLJOHN CLARK MARTINEZ",
    "GARCES, SIMEON CEAZARNIE MAGISTRADO",
    "GRAGEDA, DAREL JR. DAZAL",
    "ILAO, ELISEO JOHAN IBANA",
    "MIRASOL, ATHENA THERESE CUERDO",
    "NACARIO, KROHN EROS REMOLADOR",
    "PURQUED, DANILO ALFON",
    "RODRIGUEZ, RIONNAH ARANETA",
    "SALCEDA, EMMAN BALLON",
    "TAPEL, MIKHAELA ALENA TANON",
    "TOLOSA, CRIS ALCHED FERRERAS",
    "VARGAS, GIOLUIS ALISTAIR MANLANGIT",
    "VILLARIN, KELLAN KRISTOF ASETRE",
    "YU, SHERWIN JOHN"
];

// ==========================================
// 🛡️ SETUP FILE STORAGE
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// ==========================================
// 🌐 ROUTES
// ==========================================

// --- PUBLIC API (Aliases ONLY) ---
app.get('/api/data', (req, res) => {
    const responses = fs.readJsonSync('./data/responses.json', { throws: false }) || [];
    const photos = fs.readJsonSync('./data/photos.json', { throws: false }) || [];
    const assignments = fs.readJsonSync('./data/assignments.json', { throws: false }) || [];
    const safeResponses = responses.map(r => ({
        id: r.id,
        displayName: r.displayName,
        section: r.section,
        message: r.message,
        date: r.date
    }));
    const safePhotos = photos.map(p => ({
        id: p.id,
        url: p.url,
        uploaderAlias: p.uploaderAlias,
        section: p.section,
        date: p.date
    }));
    const safeAssignments = assignments.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date,
        content: a.content
    }));
    res.json({ responses: safeResponses, photos: safePhotos, assignments: safeAssignments });
});

// --- PRIVATE ADMIN API (Real Names) ---
app.get('/api/admin/data', (req, res) => {
    const responses = fs.readJsonSync('./data/responses.json', { throws: false }) || [];
    const photos = fs.readJsonSync('./data/photos.json', { throws: false }) || [];
    const assignments = fs.readJsonSync('./data/assignments.json', { throws: false }) || [];
    res.json({ responses, photos, assignments });
});

// --- DELETE MESSAGE (ADMIN) ---
app.delete('/api/admin/delete-msg/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let responses = fs.readJsonSync('./data/responses.json', { throws: false }) || [];
    const trash = fs.readJsonSync('./data/trash/responses.json', { throws: false }) || [];
    const index = responses.findIndex(r => r.id === id);
    if(index !== -1) {
        trash.push(responses[index]);
        responses.splice(index, 1);
        fs.writeJsonSync('./data/responses.json', responses);
        fs.writeJsonSync('./data/trash/responses.json', trash);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Message not found" });
    }
});

// --- DELETE PHOTO (ADMIN) ---
app.delete('/api/admin/delete-photo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let photos = fs.readJsonSync('./data/photos.json', { throws: false }) || [];
    const trash = fs.readJsonSync('./data/trash/photos.json', { throws: false }) || [];
    const index = photos.findIndex(p => p.id === id);
    if(index !== -1) {
        trash.push(photos[index]);
        photos.splice(index, 1);
        fs.writeJsonSync('./data/photos.json', photos);
        fs.writeJsonSync('./data/trash/photos.json', trash);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Photo not found" });
    }
});

// --- DELETE ASSIGNMENT (ADMIN) ---
app.delete('/api/admin/delete-assignment/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let assignments = fs.readJsonSync('./data/assignments.json', { throws: false }) || [];
    const trash = fs.readJsonSync('./data/trash/assignments.json', { throws: false }) || [];
    const index = assignments.findIndex(a => a.id === id);
    if(index !== -1) {
        trash.push(assignments[index]);
        assignments.splice(index, 1);
        fs.writeJsonSync('./data/assignments.json', assignments);
        fs.writeJsonSync('./data/trash/assignments.json', trash);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Assignment not found" });
    }
});

// --- VERIFY STUDENT (ONLY 7-JADE) ---
app.post('/api/verify', (req, res) => {
    const { section, name } = req.body;
    if (section !== "7-Jade") {
        return res.json({ success: false, message: "Only 7-Jade section is available." });
    }
    const found = JADE_ROSTER.some(student => student.toUpperCase() === name.toUpperCase());
    if (found) {
        return res.json({ success: true, message: "Verified!" });
    }
    return res.json({ success: false, message: "Name not found in 7-Jade roster. Check spelling." });
});

// --- PUBLIC POST MESSAGE ---
app.post('/api/submit', (req, res) => {
    const { realName, displayName, section, message } = req.body;
    const found = JADE_ROSTER.some(student => student.toUpperCase() === realName.toUpperCase());
    if (!found) return res.status(403).json({ error: "Unauthorized" });
    const responses = fs.readJsonSync('./data/responses.json', { throws: false }) || [];
    const newEntry = { id: Date.now(), realName, displayName, section, message, date: new Date().toLocaleString() };
    responses.push(newEntry);
    fs.writeJsonSync('./data/responses.json', responses);
    res.json({ success: true });
});

// --- PUBLIC UPLOAD PHOTO ---
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const photos = fs.readJsonSync('./data/photos.json', { throws: false }) || [];
    const newPhoto = { 
        id: Date.now(), 
        url: `/uploads/${req.file.filename}`, 
        uploaderAlias: req.body.uploaderAlias || "Anonymous", 
        section: req.body.section || "7-Jade",
        realName: req.body.realName || "Unknown",
        date: new Date().toLocaleString() 
    };
    photos.push(newPhoto);
    fs.writeJsonSync('./data/photos.json', photos);
    res.json({ success: true });
});

// --- ADMIN ADD ASSIGNMENT ---
app.post('/api/admin/add-assignment', (req, res) => {
    const { title, date, content } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Title and date required" });
    const assignments = fs.readJsonSync('./data/assignments.json', { throws: false }) || [];
    const newAssignment = { 
        id: Date.now(), 
        title, 
        date, 
        content: content || "No additional details",
        createdAt: new Date().toLocaleString()
    };
    assignments.push(newAssignment);
    fs.writeJsonSync('./data/assignments.json', assignments);
    res.json({ success: true });
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ 7-Jade Server is running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📡 To expose with ngrok: npm run ngrok`);
});