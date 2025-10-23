# Beem.me Auto-Registration Bot

Bot untuk otomatisasi pendaftaran akun Beem.me, lengkap dengan login dan update profil (lokasi & bio acak) secara otomatis. Dibuat untuk berjalan di Node.js.

> **PENTING: LISENSI & PENGGUNAAN**
> 
> Kode ini didistribusikan di bawah lisensi [MIT LICENSE](LICENSE). Penulis tidak bertanggung jawab atas pemblokiran akun atau penyalahgunaan apa pun. Gunakan dengan risiko Anda sendiri.

---

## Requirements

* **Node.js** (Direkomendasikan v14 atau lebih tinggi)
* **npm** (Node Package Manager, biasanya sudah terinstal bersama Node.js)

---

## Installation

1.  Clone repositori ini ke komputer Anda:
    ```bash
    git clone https://github.com/whale2learn/BEEM.ME-BOT-REFF-AUTO-EMAIL.git
    ```

2.  Masuk ke direktori proyek:
    ```bash
    cd BEEM.ME-BOT-REFF-AUTO-EMAIL
    ```

3.  Install semua *dependency* (modul) yang diperlukan:
    ```bash
    npm install node-fetch@2 https-proxy-agent socks-proxy-agent chalk@4
    ```
    *(Kita menggunakan versi spesifik seperti `node-fetch@2` dan `chalk@4` untuk memastikan kompatibilitas skrip)*

---

## Configuration

Sebelum menjalankan bot, ada 2 file yang perlu Anda siapkan:

### 1. `index.js` (Wajib)

Buka file `index.js` dan cari bagian `IMAP_CONFIGS`. Ganti dengan daftar email Anda sendiri.

**PENTING:** Skrip ini **TIDAK** membaca atau login ke email Anda. Skrip ini hanya menggunakan daftar email Anda untuk **mengambil nama domain** (seperti `@gmail.com` atau `@yahoo.com`) yang akan dipakai untuk membuat email baru secara acak (misal: `saga12345@gmail.com`).

Ganti bagian ini:

```javascript
const IMAP_CONFIGS = [
    { user: 'akucintakamu@gmail.com', password: 'password_asal' },
    { user: 'javajabascript@gmail.com', password: 'password_asal' },
    { user: 'kitty2009@gmail.com', password: 'password_asal' },
];

2. proxies.txt (Optional)
Jika Anda ingin menggunakan proxy, buat file proxies.txt di folder yang sama dengan index.js.

Skrip ini mendukung mode Acak (memilih proxy acak setiap mendaftar) dan Berurutan.

Masukkan satu proxy per baris.

Format yang didukung: http, socks4, socks5, dengan atau tanpa user:password.

Contoh isi proxies.txt:

http://username:password@123.45.67.89:8080
socks5://123.45.67.90:1080
http://123.45.67.91:999
Running the Bot
Setelah konfigurasi selesai, jalankan bot dengan perintah berikut:

Bash

node index.js
Bot akan mengajukan beberapa pertanyaan di terminal:

[?] Masukkan Invite Key Beem Anda: (Masukkan kode referral Anda)

[?] Berapa akun yang ingin dibuat? (Masukkan jumlah, misal: 10)

[?] Pilih mode proxy: (Pilih 1, 2, atau 3 jika tidak pakai proxy)

[?] Masukkan jeda waktu antar akun (detik): (Masukkan jeda, misal: 30 untuk 30 detik)

Bot akan mulai bekerja dan menyimpan semua data akun (email, password, token, status) di file log_hasil.csv.
