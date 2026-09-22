const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // ✅ Allows large files (Base64)
app.use(express.static(__dirname));

// ⚠️ Move this into an environment variable on Render (Settings → Environment).
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rxalvarez1221_db_user:YRVaSYmFo3PkOPSV@cluster0.evzldfy.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const JADE_ROSTER = [
    "ALVAREZ, RED XANDER LOZANO", "BALBIN, JULIUS JOAQUIN BUBAN",
    "BEA, JAY GIL B.", "BELARDO, SEAN EMMANUEL BALASTA",
    "BELER, MATT JOSHUA ESCUETA", "BERSABE, JOHN NESTOR OCTA",
    "CARINAN, KEN BRYAN NOBLEZA", "CERENO, KEN JERVIN BERCASIO",
    "DE LA PEÑA, MKRALJ BJORN OLAN", "ERMAC, ETHAN JOHN LUZANDE",
    "FORMALEJO, EARLJOHN CLARK MARTINEZ", "GARCES, SIMEON CEAZARNIE MAGISTRADO",
    "GRAGEDA, DAREL JR. DAZAL", "ILAO, ELISEO JOHAN IBANA",
    "MORGA, CHARISSA ENCISO",
    "NACARIO, KROHN EROS REMOLADOR", "PURQUED, DANILO ALFON",
    "RODRIGUEZ, RIONNAH ARANETA", "SALCEDA, EMMAN BALLON",
    "TOLOSA, CRIS ALCHED FERRERAS", "VARGAS, GIOLUIS ALISTAIR MANLANGIT",
    "VILLARIN, KELLAN KRISTOF ASETRE", "YU, SHERWIN JOHN",
    "ACUÑA, JASMINE ABUNDO", "ALPE, SOPHIA ELLEN ROSALES",
    "CLAVECILLA, PRINCESS JESSICA ATANACIO", "CORDOVA, KYLA RHEA FE PARIS",
    "ESPIRITU, ZIA EMMANUELLE BARCILLANO", "MIRASOL, ATHENA THERESE CUERDO",
    "TAPEL, MIKHAELA ALENA TANON"
];

function normalizeName(name) {
    return String(name || '').trim().toUpperCase()
        .replace(/Ñ/g, 'Ñ').replace(/ñ/g, 'Ñ')
        .replace(/É/g, 'É').replace(/é/g, 'É')
        .replace(/Á/g, 'Á').replace(/á/g, 'Á')
        .replace(/Í/g, 'Í').replace(/í/g, 'Í')
        .replace(/Ó/g, 'Ó').replace(/ó/g, 'Ó')
        .replace(/Ú/g, 'Ú').replace(/ú/g, 'Ú');
}

// A looser fold used to grade free-text answers: trims, lowercases, and
// collapses inner whitespace so "  Manila " matches "manila".
function normalizeAnswer(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Escapes regex metacharacters so names with dots/parentheses still match.
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const AssignmentSchema = new mongoose.Schema({
    title: String,
    date: String,
    content: String,
    fileData: String,
    fileName: String,
    fileType: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const OtherSchema = new mongoose.Schema({
    text: String,
    fileData: String,
    fileName: String,
    fileType: String,
    createdBy: String,
    date: { type: Date, default: Date.now }
});

const TodaySchema = new mongoose.Schema({
    text: String,
    fileData: String,
    fileName: String,
    fileType: String,
    createdBy: String,
    date: { type: Date, default: Date.now }
});

const PointSchema = new mongoose.Schema({
    studentName: String,
    points: { type: Number, default: 15 },
    history: [{
        change: Number,
        message: String,
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

const OffenseSchema = new mongoose.Schema({
    name: String,
    createdAt: { type: Date, default: Date.now }
});

// Points Walk Of Fame (two boards: highest / lowest)
const WalkOfFameSchema = new mongoose.Schema({
    studentName: String,
    points: Number,
    category: { type: String, enum: ['highest', 'lowest'], default: 'highest' },
    note: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

// Site Content — lets the full admin replace the logo, hero banner,
// officer group photo, and each officer's photo/name/role without touching code.
// Any field left null falls back to the static file already in the repo
// (logo.png, PP.png, 31.png, 32.png...45.png).
const DEFAULT_OFFICERS = [
    { name: 'Athena Mirasol', role: 'President' },
    { name: 'Red Alvarez', role: 'Vice-President' },
    { name: 'Joaquin Balbin', role: 'Secretary' },
    { name: 'Jay Bea', role: 'Treasurer' },
    { name: 'Darel Grageda', role: 'Auditor' },
    { name: 'Kylie Cordova', role: 'P.I.O.' },
    { name: 'Princess Clavecilla', role: 'Business Manager' },
    { name: 'Ethan Ermac', role: 'Business Manager' },
    { name: 'Sophia Alpe', role: 'Peace Officer' },
    { name: 'Ken Carinan', role: 'Peace Officer' },
    { name: 'Mkralj De La Peña', role: 'Escort' },
    { name: 'Jasmine Acuña', role: 'Muse' },
    { name: 'Sophia Alpe', role: 'Class Beadle' },
    { name: 'Ken Cereno', role: 'Assistant Class Beadle' }
];

const SiteContentSchema = new mongoose.Schema({
    singleton: { type: String, default: 'main', unique: true },
    logo: { type: String, default: null },
    hero: { type: String, default: null },
    officerHero: { type: String, default: null },
    officers: {
        type: [{
            name: String,
            role: String,
            photo: { type: String, default: null }
        }],
        default: DEFAULT_OFFICERS.map(o => ({ name: o.name, role: o.role, photo: null }))
    }
});

// ✅ NEW: Jade Gallery — students post a picture + optional caption.
// Only the full admin sees who posted it and when, and can delete it.
const GalleryPostSchema = new mongoose.Schema({
    imageData: String,
    imageName: String,
    imageType: String,
    caption: String,
    postedBy: String,
    createdAt: { type: Date, default: Date.now }
});

// ✅ NEW: Meet 7-Jade — adviser + classmates, managed entirely by the full admin.
const MeetMemberSchema = new mongoose.Schema({
    name: String,
    photo: { type: String, default: null },
    role: { type: String, enum: ['adviser', 'boy', 'girl'], default: 'boy' },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// ✅ NEW: Daily Questions — the full admin posts a question with a correct
// answer; students submit one answer each; the admin reviews responses.
const DailyQuestionSchema = new mongoose.Schema({
    question: String,
    correctAnswer: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const DailyResponseSchema = new mongoose.Schema({
    questionId: String,
    studentName: String,
    answer: String,
    isCorrect: Boolean,
    timestamp: { type: Date, default: Date.now }
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Other = mongoose.model('Other', OtherSchema);
const Today = mongoose.model('Today', TodaySchema);
const Point = mongoose.model('Point', PointSchema);
const Offense = mongoose.model('Offense', OffenseSchema);
const WalkOfFame = mongoose.model('WalkOfFame', WalkOfFameSchema);
const SiteContent = mongoose.model('SiteContent', SiteContentSchema);
const GalleryPost = mongoose.model('GalleryPost', GalleryPostSchema);
const MeetMember = mongoose.model('MeetMember', MeetMemberSchema);
const DailyQuestion = mongoose.model('DailyQuestion', DailyQuestionSchema);
const DailyResponse = mongoose.model('DailyResponse', DailyResponseSchema);

// Fetches the one SiteContent doc, creating it with defaults the first time.
async function getSiteContent() {
    let doc = await SiteContent.findOne({ singleton: 'main' });
    if (!doc) {
        doc = new SiteContent({ singleton: 'main' });
        await doc.save();
    }
    if (doc.officers.length < DEFAULT_OFFICERS.length) {
        for (let i = doc.officers.length; i < DEFAULT_OFFICERS.length; i++) {
            doc.officers.push({ name: DEFAULT_OFFICERS[i].name, role: DEFAULT_OFFICERS[i].role, photo: null });
        }
        await doc.save();
    }
    return doc;
}

let adminSession = { role: null };

app.get('/api/data', async (req, res) => {
    try {
        const [assignments, others, today, points, offenses, walkoffame, gallery, meetMembers, dailyQuestions, dailyResponses] = await Promise.all([
            Assignment.find().lean(),
            Other.find().lean(),
            Today.find().lean(),
            Point.find().lean(),
            Offense.find().lean(),
            WalkOfFame.find().lean(),
            GalleryPost.find().lean(),
            MeetMember.find().lean(),
            DailyQuestion.find().lean(),
            DailyResponse.find().lean()
        ]);
        res.json({ assignments, others, today, points, offenses, walkoffame, gallery, meetMembers, dailyQuestions, dailyResponses });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/verify', (req, res) => {
    const { section, name } = req.body;
    if (section !== "7-Jade") return res.json({ success: false, message: "Only 7-Jade" });
    const found = JADE_ROSTER.some(s => normalizeName(s) === normalizeName(name));
    if (found) {
        if (normalizeName(name) === "MORGA, CHARISSA ENCISO") {
            adminSession.role = 'full';
        } else {
            adminSession.role = null;
        }
        return res.json({ success: true, message: "Verified!" });
    }
    return res.json({ success: false, message: "Name not found. Check spelling (Ñ, ñ, special chars)." });
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === '1221') {
        adminSession.role = 'content';
        return res.json({ success: true, role: 'content' });
    } else if (password === 'Redamber_1221') {
        adminSession.role = 'full';
        return res.json({ success: true, role: 'full' });
    } else {
        return res.status(401).json({ error: "Invalid password" });
    }
});

// ✅ ADD ASSIGNMENT (Base64 file)
app.post('/api/admin/add-assignment', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { title, date, content, fileData, fileName, fileType, createdBy } = req.body;
        if (!title || !date) return res.status(400).json({ error: "Title & Date required" });
        const newAssignment = new Assignment({
            title,
            date,
            content: content || "No details",
            fileData: fileData || null,
            fileName: fileName || null,
            fileType: fileType || null,
            createdBy: createdBy || "Admin",
            createdAt: new Date()
        });
        await newAssignment.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// ✅ ADD OTHER (Base64 file)
app.post('/api/admin/add-other', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { text, fileData, fileName, fileType, createdBy } = req.body;
        if (!text) return res.status(400).json({ error: "Text required" });
        const newOther = new Other({
            text,
            fileData: fileData || null,
            fileName: fileName || null,
            fileType: fileType || null,
            createdBy: createdBy || "Admin",
            date: new Date()
        });
        await newOther.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ ADD TODAY ANNOUNCEMENT (Base64 file)
app.post('/api/admin/add-today', async (req, res) => {
    try {
        if (!adminSession.role) return res.status(401).json({ error: "Not logged in" });
        const { text, fileData, fileName, fileType, createdBy } = req.body;
        if (!text) return res.status(400).json({ error: "Text required" });
        const newToday = new Today({
            text,
            fileData: fileData || null,
            fileName: fileName || null,
            fileType: fileType || null,
            createdBy: createdBy || "Admin",
            date: new Date()
        });
        await newToday.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Shared helper so single and bulk updates behave identically.
async function applyPointChange(studentName, decimalChange, message, reason) {
    let pointDoc = await Point.findOne({
        studentName: { $regex: new RegExp('^' + escapeRegex(normalizeName(studentName)) + '$', 'i') }
    });
    if (!pointDoc) {
        pointDoc = new Point({
            studentName: JADE_ROSTER.find(s => normalizeName(s) === normalizeName(studentName)) || studentName,
            points: 15,
            history: []
        });
    }
    pointDoc.points = Math.round((pointDoc.points + decimalChange) * 10) / 10;
    if (pointDoc.points > 100) pointDoc.points = 100;
    pointDoc.history.push({
        change: decimalChange,
        message: message || "No message",
        reason: reason || "No reason",
        timestamp: new Date()
    });
    await pointDoc.save();
    return pointDoc;
}

app.post('/api/admin/update-points', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can update points." });
        const { studentName, change, message, reason } = req.body;
        if (!studentName || !change) return res.status(400).json({ error: "Student name and change amount required" });
        const decimalChange = parseFloat(change);
        if (isNaN(decimalChange)) return res.status(400).json({ error: "Invalid change amount" });
        const pointDoc = await applyPointChange(studentName, decimalChange, message, reason);
        res.json({ success: true, points: pointDoc.points });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Give the same offense / point change to many students at once
app.post('/api/admin/update-points-bulk', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can update points." });
        const { studentNames, change, message, reason } = req.body;
        if (!Array.isArray(studentNames) || studentNames.length === 0) {
            return res.status(400).json({ error: "Pick at least one student" });
        }
        const decimalChange = parseFloat(change);
        if (isNaN(decimalChange) || decimalChange === 0) return res.status(400).json({ error: "Invalid change amount" });

        const updated = [];
        const failed = [];
        for (const studentName of studentNames) {
            try {
                const doc = await applyPointChange(studentName, decimalChange, message, reason);
                updated.push({ studentName: doc.studentName, points: doc.points });
            } catch (err) {
                failed.push(studentName);
            }
        }
        res.json({ success: true, updatedCount: updated.length, updated, failed });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/add-offense', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can add offenses." });
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Offense name required" });
        const newOffense = new Offense({ name });
        await newOffense.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/reset-all-points', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can reset points." });
        const { newPoints } = req.body;
        const resetValue = parseInt(newPoints) || 15;
        await Point.updateMany({}, { points: resetValue, history: [] });
        for (const studentName of JADE_ROSTER) {
            const existing = await Point.findOne({
                studentName: { $regex: new RegExp('^' + escapeRegex(normalizeName(studentName)) + '$', 'i') }
            });
            if (!existing) {
                const newPoint = new Point({ studentName, points: resetValue, history: [] });
                await newPoint.save();
            }
        }
        res.json({ success: true, message: `All scores reset to ${resetValue}` });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Walk Of Fame entries (full admin only)
app.post('/api/admin/add-walkoffame', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit the Walk Of Fame." });
        const { studentName, points, category, note, createdBy } = req.body;
        if (!studentName) return res.status(400).json({ error: "Student name required" });
        if (category !== 'highest' && category !== 'lowest') return res.status(400).json({ error: "Category must be highest or lowest" });
        const parsedPoints = parseFloat(points);
        if (isNaN(parsedPoints)) return res.status(400).json({ error: "Points required" });
        const entry = new WalkOfFame({
            studentName,
            points: parsedPoints,
            category,
            note: note || "",
            createdBy: createdBy || "Admin",
            createdAt: new Date()
        });
        await entry.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/delete-walkoffame/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit the Walk Of Fame." });
    await WalkOfFame.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post('/api/admin/clear-walkoffame', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit the Walk Of Fame." });
        const { category } = req.body;
        if (category === 'highest' || category === 'lowest') {
            await WalkOfFame.deleteMany({ category });
        } else {
            await WalkOfFame.deleteMany({});
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Site Content — read (everyone) and replace (full admin only)
app.get('/api/site-content', async (req, res) => {
    try {
        const doc = await getSiteContent();
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

const ASSET_KEYS = ['logo', 'hero', 'officerHero'];

app.post('/api/admin/site-content/asset', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can replace site images." });
        const { key, dataUrl } = req.body;
        if (!ASSET_KEYS.includes(key)) return res.status(400).json({ error: "Unknown asset key" });
        if (!dataUrl) return res.status(400).json({ error: "No file received" });
        const doc = await getSiteContent();
        doc[key] = dataUrl;
        await doc.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/site-content/asset-reset', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can replace site images." });
        const { key } = req.body;
        if (!ASSET_KEYS.includes(key)) return res.status(400).json({ error: "Unknown asset key" });
        const doc = await getSiteContent();
        doc[key] = null;
        await doc.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/site-content/officer', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can replace officers." });
        const { index, name, role, dataUrl } = req.body;
        const i = parseInt(index);
        const doc = await getSiteContent();
        if (isNaN(i) || i < 0 || i >= doc.officers.length) return res.status(400).json({ error: "Invalid officer index" });
        if (name != null) doc.officers[i].name = name;
        if (role != null) doc.officers[i].role = role;
        if (dataUrl) doc.officers[i].photo = dataUrl;
        doc.markModified('officers');
        await doc.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/site-content/officer-photo-reset', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can replace officers." });
        const { index } = req.body;
        const i = parseInt(index);
        const doc = await getSiteContent();
        if (isNaN(i) || i < 0 || i >= doc.officers.length) return res.status(400).json({ error: "Invalid officer index" });
        doc.officers[i].photo = null;
        doc.markModified('officers');
        await doc.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ NEW: Jade Gallery — any verified student can post; only the full admin
// sees who posted / when, and can delete.
app.post('/api/gallery/add', async (req, res) => {
    try {
        const { imageData, imageName, imageType, caption, postedBy } = req.body;
        if (!imageData) return res.status(400).json({ error: "Pick a picture first" });
        const post = new GalleryPost({
            imageData,
            imageName: imageName || null,
            imageType: imageType || null,
            caption: caption || "",
            postedBy: postedBy || "Guest",
            createdAt: new Date()
        });
        await post.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/delete-gallery/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can delete gallery posts." });
    await GalleryPost.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ✅ NEW: Meet 7-Jade — full admin manages the adviser + boys/girls roster.
app.post('/api/admin/meet/add', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit Meet 7-Jade." });
        const { name, photo, role } = req.body;
        if (!name) return res.status(400).json({ error: "Name required" });
        if (!['adviser', 'boy', 'girl'].includes(role)) return res.status(400).json({ error: "Invalid role" });
        const count = await MeetMember.countDocuments({ role });
        const member = new MeetMember({ name, photo: photo || null, role, order: count, createdAt: new Date() });
        await member.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/meet/update', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit Meet 7-Jade." });
        const { id, name, role, photo } = req.body;
        if (!id) return res.status(400).json({ error: "Missing id" });
        const update = {};
        if (name != null && name !== '') update.name = name;
        if (role != null && ['adviser', 'boy', 'girl'].includes(role)) update.role = role;
        if (photo) update.photo = photo;
        await MeetMember.findByIdAndUpdate(id, update);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/meet/delete/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can edit Meet 7-Jade." });
    await MeetMember.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ✅ NEW: Daily Questions — full admin posts questions with a correct answer;
// students submit one answer each; full admin reviews & deletes responses.
app.post('/api/admin/daily/add-question', async (req, res) => {
    try {
        if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can add questions." });
        const { question, correctAnswer, createdBy } = req.body;
        if (!question) return res.status(400).json({ error: "Question required" });
        if (!correctAnswer) return res.status(400).json({ error: "Correct answer required" });
        const q = new DailyQuestion({ question, correctAnswer, createdBy: createdBy || "Admin", createdAt: new Date() });
        await q.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/daily/delete-question/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can delete questions." });
    await DailyQuestion.findByIdAndDelete(req.params.id);
    await DailyResponse.deleteMany({ questionId: req.params.id });
    res.json({ success: true });
});

app.post('/api/daily/answer', async (req, res) => {
    try {
        const { questionId, studentName, answer } = req.body;
        if (!questionId || !studentName || !answer) return res.status(400).json({ error: "Missing fields" });
        const q = await DailyQuestion.findById(questionId);
        if (!q) return res.status(404).json({ error: "Question not found" });
        const isCorrect = normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer);
        let resp = await DailyResponse.findOne({
            questionId,
            studentName: { $regex: new RegExp('^' + escapeRegex(normalizeName(studentName)) + '$', 'i') }
        });
        if (resp) {
            resp.answer = answer;
            resp.isCorrect = isCorrect;
            resp.timestamp = new Date();
            await resp.save();
        } else {
            resp = new DailyResponse({ questionId, studentName, answer, isCorrect, timestamp: new Date() });
            await resp.save();
        }
        res.json({ success: true, isCorrect });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/admin/daily/delete-response/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can delete responses." });
    await DailyResponse.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post('/api/points/my', async (req, res) => {
    const { studentName } = req.body;
    const myPoints = await Point.findOne({
        studentName: { $regex: new RegExp('^' + escapeRegex(normalizeName(studentName)) + '$', 'i') }
    }).lean();
    res.json({ points: myPoints || { points: 15, history: [] } });
});

app.delete('/api/admin/delete-assignment/:id', async (req, res) => {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/delete-other/:id', async (req, res) => {
    await Other.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/delete-today/:id', async (req, res) => {
    await Today.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/delete-point/:id', async (req, res) => {
    await Point.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/delete-offense/:id', async (req, res) => {
    if (adminSession.role !== 'full') return res.status(401).json({ error: "Unauthorized. Only full admin can delete offenses." });
    await Offense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`✅ 7-Jade Server running on port ${PORT}`);
    console.log(`✅ MongoDB Connected! Data is now permanent.`);
});