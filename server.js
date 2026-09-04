const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

// ✅ CONNECT TO MONGODB ATLAS
const MONGODB_URI = 'mongodb+srv://rxalvarez1221_db_user:YRVaSYmFo3PkOPSV@cluster0.evzldfy.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// 📚 7-JADE ROSTER (29 students)
// ==========================================
const JADE_ROSTER = [
    "ALVAREZ, RED XANDER LOZANO",
    "BALBIN, JULIUS JOAQUIN BUBAN",
    "BEA, JAY GIL B.",
    "BELARDO, SEAN EMMANUEL BALASTA",
    "BELER, MATT JOSHUA ESCUETA",
    "CARINAN, KEN BRYAN NOBLEZA",
    "CERENO, KEN JERVIN BERCASIO",
    "DE LA PEÑA, MKRALJ BJORN OLAN",
    "ERMAC, ETHAN JOHN LUZANDE",
    "FORMALEJO, EARLJOHN CLARK MARTINEZ",
    "GARCES, SIMEON CEAZARNIE MAGISTRADO",
    "GRAGEDA, DAREL JR. DAZAL",
    "ILAO, ELISEO JOHAN IBANA",
    "NACARIO, KROHN EROS REMOLADOR",
    "PURQUED, DANILO ALFON",
    "RODRIGUEZ, RIONNAH ARANETA",
    "SALCEDA, EMMAN BALLON",
    "TOLOSA, CRIS ALCHED FERRERAS",
    "VARGAS, GIOLUIS ALISTAIR MANLANGIT",
    "VILLARIN, KELLAN KRISTOF ASETRE",
    "YU, SHERWIN JOHN",
    "ACUÑA, JASMINE ABUNDO",
    "ALPE, SOPHIA ELLEN ROSALES",
    "CLAVECILLA, PRINCESS JESSICA ATANACIO",
    "CORDOVA, KYLA RHEA FE PARIS",
    "ESPIRITU, ZIA EMMANUELLE BARCILLANO",
    "MIRASOL, ATHENA THERESE CUERDO",
    "RODRIGUEZ, RIONNAH ARANETA",
    "TAPEL, MIKHAELA ALENA TANON"
];

function normalizeName(name) {
    return name.trim().toUpperCase()
        .replace(/Ñ/g, 'Ñ').replace(/ñ/g, 'Ñ')
        .replace(/É/g, 'É').replace(/é/g, 'É')
        .replace(/Á/g, 'Á').replace(/á/g, 'Á')
        .replace(/Í/g, 'Í').replace(/í/g, 'Í')
        .replace(/Ó/g, 'Ó').replace(/ó/g, 'Ó')
        .replace(/Ú/g, 'Ú').replace(/ú/g, 'Ú');
}

// ==========================================
// 🛡️ STORAGE SETUP
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// ==========================================
// 📚 MONGODB SCHEMAS
// ==========================================
const AssignmentSchema = new mongoose.Schema({
    title: String,
    date: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now }
});

const OtherSchema = new mongoose.Schema({
    text: String,
    date: { type: Date, default: Date.now }
});

const TodaySchema = new mongoose.Schema({
    text: String,
    date: { type: Date, default: Date.now }
});

const ResponseSchema = new mongoose.Schema({
    realName: String,
    displayName: String,
    section: String,
    message: String,
    date: { type: Date, default: Date.now }
});

const PointSchema = new mongoose.Schema({
    studentName: String,
    points: { type: Number, default: 15 },
    history: [{
        change: Number,
        message: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Other = mongoose.model('Other', OtherSchema);
const Today = mongoose.model('Today', TodaySchema);
const Response = mongoose.model('Response', ResponseSchema);
const Point = mongoose.model('Point', PointSchema);

// ==========================================
// 🌐 ROUTES
// ==========================================

// --- PUBLIC API ---
app.get('/api/data', async (req, res) => {
    try {
        const [assignments, others, today, responses, points] = await Promise.all([
            Assignment.find().lean(),
            Other.find().lean(),
            Today.find().lean(),
            Response.find().lean(),
            Point.find().lean()
        ]);
        
        res.json({ 
            assignments,
            others,
            today,
            responses,
            points
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// --- VERIFY STUDENT ---
app.post('/api/verify', (req, res) => {
    const { section, name } = req.body;
    if (section !== "7-Jade") return res.json({ success: false, message: "Only 7-Jade" });
    const found = JADE_ROSTER.some(s => normalizeName(s) === normalizeName(name));
    if (found) return res.json({ success: true, message: "Verified!" });
    return res.json({ success: false, message: "Name not found. Check spelling (Ñ, ñ, special chars)." });
});

// ✅ ADMIN SESSION (No password needed after login)
let adminSession = { role: null, password: null };

// --- ADMIN LOGIN ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === '1221') {
        adminSession.role = 'content';
        adminSession.password = password;
        return res.json({ success: true, role: 'content' });
    } else if (password === '123') {
        adminSession.role = 'full';
        adminSession.password = password;
        return res.json({ success: true, role: 'full' });
    } else {
        return res.status(401).json({ error: "Invalid password" });
    }
});

// --- ADD ASSIGNMENT (No password needed if session active) ---
app.post('/api/admin/add-assignment', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { title, date, content } = req.body;
        if (!title || !date) return res.status(400).json({ error: "Title & Date required" });
        
        const newAssignment = new Assignment({ title, date, content: content || "No details" });
        await newAssignment.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- ADD OTHER ---
app.post('/api/admin/add-other', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Text required" });
        
        const newOther = new Other({ text });
        await newOther.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- ADD TODAY ANNOUNCEMENT ---
app.post('/api/admin/add-today', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Text required" });
        
        const newToday = new Today({ text });
        await newToday.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- ADD / DEDUCT POINTS (FULL ADMIN ONLY) ---
app.post('/api/admin/update-points', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can update points." });
        
        const { studentName, change, message } = req.body;
        if (!studentName || !change) return res.status(400).json({ error: "Student name and change amount required" });
        
        let pointDoc = await Point.findOne({ studentName: { $regex: new RegExp(normalizeName(studentName), 'i') } });
        
        if (!pointDoc) {
            pointDoc = new Point({
                studentName: JADE_ROSTER.find(s => normalizeName(s) === normalizeName(studentName)) || studentName,
                points: 15,
                history: []
            });
        }
        
        pointDoc.points += change;
        if (pointDoc.points < 0) pointDoc.points = 0;
        if (pointDoc.points > 100) pointDoc.points = 100;
        
        pointDoc.history.push({
            change,
            message: message || "No message",
            timestamp: new Date()
        });
        
        await pointDoc.save();
        res.json({ success: true, points: pointDoc.points });
    } catch (error) {
        console.error("Error updating points:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// --- GET ALL POINTS (ADMIN MONITOR) ---
app.get('/api/admin/points-monitor', async (req, res) => {
    try {
        const points = await Point.find().lean();
        res.json({ points });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- GET MY POINTS (STUDENT) ---
app.post('/api/points/my', async (req, res) => {
    const { studentName } = req.body;
    const myPoints = await Point.findOne({ studentName: { $regex: new RegExp(normalizeName(studentName), 'i') } }).lean();
    res.json({ points: myPoints || { points: 15, history: [] } });
});

// --- DELETE ASSIGNMENT ---
app.delete('/api/admin/delete-assignment/:id', async (req, res) => {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- DELETE OTHER ---
app.delete('/api/admin/delete-other/:id', async (req, res) => {
    await Other.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- DELETE TODAY ---
app.delete('/api/admin/delete-today/:id', async (req, res) => {
    await Today.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- DELETE POINT ---
app.delete('/api/admin/delete-point/:id', async (req, res) => {
    await Point.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- ASK QUESTION ---
app.post('/api/ask-question', async (req, res) => {
    const { message } = req.body;
    const newResponse = new Response({ realName: "Guest", displayName: "Guest", section: "7-Jade", message });
    await newResponse.save();
    res.json({ success: true });
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ 7-Jade Server running on port ${PORT}`);
    console.log(`✅ MongoDB Connected! Data is now permanent.`);
});