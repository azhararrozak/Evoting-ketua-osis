const db = require('./db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Konfigurasi penyimpanan multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../../public/img/calon");
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'upload_' + uniqueSuffix + path.extname(file.originalname)); // Menambahkan ekstensi asli file
    }
});

const upload = multer({ storage: storage });

const send = (app) => {
    // upload data & gambar calon
    app.post('/up_calon/:calon/:visi', upload.single('foto'), (req, res) => {
        // decode base64 nama calon
        const text = decd_64(req.params.calon);
        // decode base64 visi-misi
        const val = decd_64(req.params.visi);

        if (req.file) {
            // Simpan nama file
            const fileName = req.file.filename;

            // region data query 
            db.query(`INSERT INTO table_calon (nama_calon, visi_misi, foto) VALUES (?, ?, ?)`, [text.toString(), val.toString(), fileName], (err, results) => {
                if (err) {
                    req.flash('info', { type: false, text: "Data calon gagal ditambahkan" });
                    return res.redirect('/add_calon');
                }

                if (results.affectedRows > 0) {
                    req.flash('info', { type: true, text: "Data calon berhasil ditambahkan" });
                    res.redirect('/admin');
                } else {
                    req.flash('info', { type: false, text: "Data calon gagal ditambahkan" });
                    res.redirect('/add_calon');
                }
            });
        } else {
            req.flash('info', { type: false, text: "Tidak ada file yang diupload" });
            res.redirect('/add_calon');
        }
    });

    // upload edit data calon
    app.post('/edit/:calon/:visi/:id/:old_img', upload.single('foto'), (req, res) => {
        // initialization request parameter 
        const cal = decd_64(req.params.calon).toString();
        const vs = decd_64(req.params.visi).toString();
        const id = req.params.id;
        const old_img = req.params.old_img;

        // Jika tidak ada foto baru
        if (!req.file) {
            db.query(`UPDATE table_calon SET nama_calon = ?, visi_misi = ?, foto = ? WHERE id = ?`, [cal, vs, old_img, id], (err, results) => {
                if (err) {
                    req.flash('info', { type: false, text: "Data calon gagal diubah" });
                    return res.redirect('/admin');
                }
                req.flash('info', { type: true, text: "Data calon berhasil diubah" });
                res.redirect('/admin');
            });
        } else {
            // Hapus foto lama
            fs.unlink(path.join(__dirname, "../../public/img/calon/", old_img), (err) => {
                if (err) console.log(err); // Hanya log jika ada error

                const newFileName = req.file.filename;
                db.query(`UPDATE table_calon SET nama_calon = ?, visi_misi = ?, foto = ? WHERE id = ?`, [cal, vs, newFileName, id], (err, results) => {
                    if (err) {
                        req.flash('info', { type: false, text: "Data calon gagal diubah" });
                        return res.redirect('/admin');
                    }
                    req.flash('info', { type: true, text: "Data calon berhasil diubah" });
                    res.redirect('/admin');
                });
            });
        }
    });

    // upload coblosan ke db
    app.get('/pilih/:calon/', (req, res) => {
        if (req.session.loggedin) {
            const username = req.session.username;
            const id_calon = req.params.calon;
            db.query(`INSERT INTO result (pemilih, calon) VALUES (?, ?)`, [username, id_calon], (err, results) => {
                if (err) {
                    throw err;
                } else {
                    req.session.destroy();
                    res.redirect('/thanks');
                }
            });
        } else {
            req.flash('warning', { type: 'danger', text: 'Anda harus login terlebih dahulu!' });
            res.redirect('/');
        }
    });

    // hapus data calon
    app.get('/hapus/:id/:img', (req, res) => {
        if (req.session.loggedin && req.session.admin) {
            const id = req.params.id;
            const img = req.params.img;

            db.query(`DELETE FROM table_calon WHERE id = ?`, [id], (err, result) => {
                if (err) {
                    req.flash('info', { type: false, text: "Data calon gagal dihapus" });
                    return res.redirect('/admin');
                }

                // Hapus file calon
                fs.unlink(del_pth(img), (err) => {
                    if (err) console.log(err); // Hanya log jika ada error

                    req.flash('info', { type: true, text: "Data calon berhasil dihapus" });
                    res.redirect('/admin');
                });
            });
        } else {
            req.flash('warning', { type: 'danger', text: 'Anda harus login terlebih dahulu!' });
            res.redirect('/');
        }
    });
};

// function for decode base64
const decd_64 = (data) => {
    const bfr = Buffer.from(data, 'base64');
    return bfr.toString('ascii');
}

// function for delete path
const del_pth = (data) => {
    return path.join(__dirname, "../../public/img/calon/", data);
}

module.exports = send;
