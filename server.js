const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

// Ensure folders exist
fs.ensureDirSync('./data');
fs.ensureDirSync('./uploads');
fs.ensureDirSync('./data/trash');

// ==========================================
// 📚 7-JADE ROSTER
// ==========================================
const JADE_ROSTER = [
    "ACUÑA, JASMINE ABUNDO", "ALPE, SOPHIA ELLEN ROSALES", "ALVAREZ, RED XANDER LOZANO",
    "BALBIN, JULIUS JOAQUIN BUBAN", "BEA, JAY GIL B.", "BELARDO, SEAN EMMANUEL BALASTA",
    "BELER, MATT JOSHUA ESCUETA", "CARINAN, KEN BRYAN NOBLEZA", "CERENO, KEN JERVIN BERCASIO",
    "CLAVECILLA, PRINCESS JESSICA ATANACIO", "CORDOVA, KYLA RHEA FE PARIS",
    "DE LA PEÑA, MKRALJ BJORN OLAN", "ERMAC, ETHAN JOHN LUZANDE",
    "ESPIRITU, ZIA EMMANUELLE BARCILLANO", "FORMALEJO, EARLJOHN CLARK MARTINEZ",
    "GARCES, SIMEON CEAZARNIE MAGISTRADO", "GRAGEDA, DAREL JR. DAZAL",
    "ILAO, ELISEO JOHAN IBANA", "MIRASOL, ATHENA THERESE CUERDO",
    "NACARIO, KROHN EROS REMOLADOR", "PURQUED, DANILO ALFON",
    "RODRIGUEZ, RIONNAH ARANETA", "SALCEDA, EMMAN BALLON", "TAPEL, MIKHAELA ALENA TANON",
    "TOLOSA, CRIS ALCHED FERRERAS", "VARGAS, GIOLUIS ALISTAIR MANLANGIT",
    "VILLARIN, KELLAN KRISTOF ASETRE", "YU, SHERWIN JOHN"
];

// ==========================================
// 🛡️ STORAGE SETUP
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Helpers
function readJSON(file) { return fs.readJsonSync(file, { throws: false }) || []; }
function writeJSON(file, data) { fs.writeJsonSync(file, data); }

// ==========================================
// 🌐 ROUTES
// ==========================================

// --- PUBLIC API ---
app.get('/api/data', (req, res) => {
    const responses = readJSON('./data/responses.json');
    const photos = readJSON('./data/photos.json');
    const assignments = readJSON('./data/assignments.json');
    const others = readJSON('./data/others.json');
    const today = readJSON('./data/today.json');
    
    res.json({ 
        responses: responses.map(r => ({ id: r.id, displayName: r.displayName, section: r.section, message: r.message, date: r.date })),
        photos: photos.map(p => ({ id: p.id, url: p.url, uploaderAlias: p.uploaderAlias, section: p.section, date: p.date })),
        assignments: assignments.map(a => ({ id: a.id, title: a.title, date: a.date, content: a.content, image: a.image })),
        others: others,
        today: today
    });
});

// --- ADMIN API ---
app.get('/api/admin/data', (req, res) => {
    res.json({ 
        responses: readJSON('./data/responses.json'),
        photos: readJSON('./data/photos.json'),
        assignments: readJSON('./data/assignments.json'),
        others: readJSON('./data/others.json'),
        today: readJSON('./data/today.json')
    });
});

// ==========================================
// 🗑️ DELETE ROUTES
// ==========================================
function moveToTrash(filePath, data, index, trashFileName) {
    const trash = readJSON(`./data/trash/${trashFileName}`);
    trash.push(data[index]);
    writeJSON(`./data/trash/${trashFileName}`, trash);
    data.splice(index, 1);
    writeJSON(filePath, data);
}

app.delete('/api/admin/delete-msg/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/responses.json');
    const index = data.findIndex(r => r.id === id);
    if(index !== -1) { moveToTrash('./data/responses.json', data, index, 'responses.json'); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-photo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/photos.json');
    const index = data.findIndex(p => p.id === id);
    if(index !== -1) { moveToTrash('./data/photos.json', data, index, 'photos.json'); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-assignment/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/assignments.json');
    const index = data.findIndex(a => a.id === id);
    if(index !== -1) { moveToTrash('./data/assignments.json', data, index, 'assignments.json'); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-other/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/others.json');
    const index = data.findIndex(o => o.id === id);
    if(index !== -1) { moveToTrash('./data/others.json', data, index, 'others.json'); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-today/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/today.json');
    const index = data.findIndex(t => t.id === id);
    if(index !== -1) { moveToTrash('./data/today.json', data, index, 'today.json'); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

// ==========================================
// 🛡️ VERIFY & CREATE
// ==========================================

app.post('/api/verify', (req, res) => {
    const { section, name } = req.body;
    if (section !== "7-Jade") return res.json({ success: false, message: "Only 7-Jade" });
    const found = JADE_ROSTER.some(s => s.toUpperCase() === name.toUpperCase());
    if (found) return res.json({ success: true });
    return res.json({ success: false, message: "Name not found." });
});

app.post('/api/submit', (req, res) => {
    const { realName, displayName, section, message } = req.body;
    const found = JADE_ROSTER.some(s => s.toUpperCase() === realName.toUpperCase());
    if (!found) return res.status(403).json({ error: "Unauthorized" });
    const data = readJSON('./data/responses.json');
    data.push({ id: Date.now(), realName, displayName, section, message, date: new Date().toLocaleString() });
    writeJSON('./data/responses.json', data);
    res.json({ success: true });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const data = readJSON('./data/photos.json');
    data.push({ id: Date.now(), url: `/uploads/${req.file.filename}`, uploaderAlias: req.body.uploaderAlias || "Anonymous", section: req.body.section || "7-Jade", realName: req.body.realName || "Unknown", date: new Date().toLocaleString() });
    writeJSON('./data/photos.json', data);
    res.json({ success: true });
});

const ADMIN_PASSWORD = 'bambam1221';
function checkAdmin(req, res, next) {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
    next();
}

app.post('/api/admin/add-assignment', checkAdmin, upload.single('image'), (req, res) => {
    const { title, date, content } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Title & Date required" });
    const data = readJSON('./data/assignments.json');
    data.push({ 
        id: Date.now(), 
        title, 
        date, 
        content: content || "No details", 
        image: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toLocaleString() 
    });
    writeJSON('./data/assignments.json', data);
    res.json({ success: true });
});

app.post('/api/admin/add-other', checkAdmin, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    const data = readJSON('./data/others.json');
    data.push({ id: Date.now(), text, date: new Date().toLocaleString() });
    writeJSON('./data/others.json', data);
    res.json({ success: true });
});

app.post('/api/admin/add-today', checkAdmin, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    const data = readJSON('./data/today.json');
    data.push({ id: Date.now(), text, date: new Date().toLocaleString() });
    writeJSON('./data/today.json', data);
    res.json({ success: true });
});

// ==========================================
// 🚀 START
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ 7-Jade Server running on port ${PORT}`);
});