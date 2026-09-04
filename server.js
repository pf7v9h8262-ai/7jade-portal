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

fs.ensureDirSync('./data');
fs.ensureDirSync('./uploads');
fs.ensureDirSync('./data/trash');

// ==========================================
// 📚 7-JADE ROSTER (with special characters)
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
// 🔤 NORMALIZATION FUNCTION
// ==========================================
function normalizeName(name) {
    return name
        .trim()
        .toUpperCase()
        .replace(/Ñ/g, 'Ñ')
        .replace(/ñ/g, 'Ñ')
        .replace(/É/g, 'É')
        .replace(/é/g, 'É')
        .replace(/Á/g, 'Á')
        .replace(/á/g, 'Á')
        .replace(/Í/g, 'Í')
        .replace(/í/g, 'Í')
        .replace(/Ó/g, 'Ó')
        .replace(/ó/g, 'Ó')
        .replace(/Ú/g, 'Ú')
        .replace(/ú/g, 'Ú');
}

function isStudentInRoster(name) {
    const normalizedInput = normalizeName(name);
    return JADE_ROSTER.some(student => normalizeName(student) === normalizedInput);
}

// ==========================================
// 🛡️ STORAGE SETUP
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

function readJSON(file) { return fs.readJsonSync(file, { throws: false }) || []; }
function writeJSON(file, data) { fs.writeJsonSync(file, data); }

const ADMIN_PASSWORD = 'bambam1221';

// ==========================================
// 🌐 PUBLIC API
// ==========================================
app.get('/api/data', (req, res) => {
    const responses = readJSON('./data/responses.json');
    const photos = readJSON('./data/photos.json');
    const assignments = readJSON('./data/assignments.json');
    const others = readJSON('./data/others.json');
    const today = readJSON('./data/today.json');
    const points = readJSON('./data/points.json');
    
    res.json({ 
        responses: responses.map(r => ({ id: r.id, displayName: r.displayName, section: r.section, message: r.message, date: r.date })),
        photos: photos.map(p => ({ id: p.id, url: p.url, uploaderAlias: p.uploaderAlias, section: p.section, date: p.date })),
        assignments: assignments.map(a => ({ id: a.id, title: a.title, date: a.date, content: a.content, image: a.image })),
        others: others.map(o => ({ id: o.id, text: o.text, date: o.date })),
        today: today.map(t => ({ id: t.id, text: t.text, date: t.date })),
        points: points
    });
});

// ==========================================
// 🔐 POINT SYSTEM (PRIVATE PER STUDENT)
// ==========================================
app.post('/api/points/my', (req, res) => {
    const { studentName } = req.body;
    if (!studentName) return res.status(400).json({ error: "Name required" });
    
    const points = readJSON('./data/points.json');
    const myPoints = points.filter(p => normalizeName(p.studentName) === normalizeName(studentName));
    res.json({ points: myPoints });
});

app.get('/api/admin/points', (req, res) => {
    const points = readJSON('./data/points.json');
    res.json({ points });
});

app.post('/api/admin/add-point', upload.single('file'), (req, res) => {
    try {
        const { password, studentName, text } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        if (!studentName || !text) return res.status(400).json({ error: "Student name and text required" });
        
        if (!isStudentInRoster(studentName)) {
            return res.status(400).json({ error: "Student not found in roster" });
        }
        
        const points = readJSON('./data/points.json');
        points.push({ 
            id: Date.now(),
            studentName: normalizeName(studentName),
            text,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            date: new Date().toLocaleString()
        });
        writeJSON('./data/points.json', points);
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding point:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/delete-point/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let points = readJSON('./data/points.json');
    const index = points.findIndex(p => p.id === id);
    if (index !== -1) {
        const trash = readJSON('./data/trash/points.json');
        trash.push(points[index]);
        writeJSON('./data/trash/points.json', trash);
        points.splice(index, 1);
        writeJSON('./data/points.json', points);
        res.json({ success: true });
    } else res.status(404).json({ error: "Not found" });
});

// ==========================================
// 🛡️ VERIFY & EXISTING ROUTES
// ==========================================
app.post('/api/verify', (req, res) => {
    const { section, name } = req.body;
    if (section !== "7-Jade") return res.json({ success: false, message: "Only 7-Jade" });
    const found = isStudentInRoster(name);
    if (found) return res.json({ success: true, message: "Verified!" });
    return res.json({ success: false, message: "Name not found. Please check spelling (special characters like Ñ matter)." });
});

app.post('/api/ask-question', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    const data = readJSON('./data/responses.json');
    data.push({ id: Date.now(), realName: "Guest", displayName: "Guest", section: "7-Jade", message: message, date: new Date().toLocaleString() });
    writeJSON('./data/responses.json', data);
    res.json({ success: true });
});

app.post('/api/submit', (req, res) => {
    const { realName, displayName, section, message } = req.body;
    const found = isStudentInRoster(realName);
    if (!found) return res.status(403).json({ error: "Unauthorized" });
    const data = readJSON('./data/responses.json');
    data.push({ id: Date.now(), realName, displayName, section, message, date: new Date().toLocaleString() });
    writeJSON('./data/responses.json', data);
    res.json({ success: true });
});

app.post('/api/admin/add-assignment', upload.single('image'), (req, res) => {
    try {
        const password = req.body.password;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        const { title, date, content } = req.body;
        if (!title || !date) return res.status(400).json({ error: "Title & Date required" });
        const data = readJSON('./data/assignments.json');
        data.push({ id: Date.now(), title, date, content: content || "No details", image: req.file ? `/uploads/${req.file.filename}` : null, createdAt: new Date().toLocaleString() });
        writeJSON('./data/assignments.json', data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/add-other', (req, res) => {
    const { password, text } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
    if (!text) return res.status(400).json({ error: "Text required" });
    const data = readJSON('./data/others.json');
    data.push({ id: Date.now(), text, date: new Date().toLocaleString() });
    writeJSON('./data/others.json', data);
    res.json({ success: true });
});

app.post('/api/admin/add-today', (req, res) => {
    const { password, text } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
    if (!text) return res.status(400).json({ error: "Text required" });
    const data = readJSON('./data/today.json');
    data.push({ id: Date.now(), text, date: new Date().toLocaleString() });
    writeJSON('./data/today.json', data);
    res.json({ success: true });
});

// Delete routes
app.delete('/api/admin/delete-msg/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/responses.json');
    const index = data.findIndex(r => r.id === id);
    if(index !== -1) { const trash = readJSON('./data/trash/responses.json'); trash.push(data[index]); writeJSON('./data/trash/responses.json', trash); data.splice(index, 1); writeJSON('./data/responses.json', data); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-assignment/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/assignments.json');
    const index = data.findIndex(a => a.id === id);
    if(index !== -1) { const trash = readJSON('./data/trash/assignments.json'); trash.push(data[index]); writeJSON('./data/trash/assignments.json', trash); data.splice(index, 1); writeJSON('./data/assignments.json', data); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-other/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/others.json');
    const index = data.findIndex(o => o.id === id);
    if(index !== -1) { const trash = readJSON('./data/trash/others.json'); trash.push(data[index]); writeJSON('./data/trash/others.json', trash); data.splice(index, 1); writeJSON('./data/others.json', data); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

app.delete('/api/admin/delete-today/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = readJSON('./data/today.json');
    const index = data.findIndex(t => t.id === id);
    if(index !== -1) { const trash = readJSON('./data/trash/today.json'); trash.push(data[index]); writeJSON('./data/trash/today.json', trash); data.splice(index, 1); writeJSON('./data/today.json', data); res.json({ success: true }); }
    else res.status(404).json({ error: "Not found" });
});

// ==========================================
// 🚀 START
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ 7-Jade Server running on port ${PORT}`);
});