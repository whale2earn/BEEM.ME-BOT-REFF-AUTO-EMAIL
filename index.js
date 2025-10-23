const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs').promises;
const chalk = require('chalk');
const readline = require('readline');

// =================================================================
// --- KONFIGURASI PENTING ---
// =================================================================
const IMAP_CONFIGS = [
    { user: 'akucintakamu@gmail.com', password: 'password_asal' },
    { user: 'javajabascript@gmail.com', password: 'password_asal' },
    { user: 'kitty2009@gmail.com', password: 'password_asal' },
];
const BASE_URL = 'https://beem.me/gql/query'; 
const LOG_FILE = 'log_hasil.csv';

// --- KONFIGURASI METODE SABAR (RETRY) ---
const MAX_RETRIES = 7;
const INITIAL_RETRY_DELAY = 10000;

// --- Helper untuk Log & Delay ---
const log = {
    info: (msg) => console.log(chalk.blue(`[ℹ] ${msg}`)),
    success: (msg) => console.log(chalk.green(`[✔] ${msg}`)),
    error: (msg) => console.log(chalk.red(`[✘] ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`[⚠] ${msg}`)), // Tetap ada, tapi tidak dipakai di alur main
    step: (msg) => console.log(chalk.cyan.bold(`\n--- ${msg} ---`)),
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Fungsi Logging (Menyimpan token) ---
async function logResult(email, password, token, status, errorMessage = '') {
    const timestamp = new Date().toISOString();
    const cleanedErrorMessage = (errorMessage || '').replace(/,/g, ';');
    const csvLine = `${timestamp},${email},${password},${token},${status},"${cleanedErrorMessage}"\n`;
    try {
        await fs.access(LOG_FILE);
    } catch (error) {
        const header = 'Timestamp,Email,Password,Token,Status,Pesan Error\n';
        await fs.writeFile(LOG_FILE, header);
    }
    await fs.appendFile(LOG_FILE, csvLine);
}

// --- MANAJEMEN PROXY ---
let proxies = [];
let proxyIndex = 0;
const getProxyAgent = (mode) => {
    if (mode === '3' || proxies.length === 0) return null;
    let selectedProxy;
    if (mode === '1') {
        selectedProxy = proxies[Math.floor(Math.random() * proxies.length)];
        log.info(`Menggunakan proxy acak: ${selectedProxy.split('@')[1] || selectedProxy}`);
    } else if (mode === '2') {
        selectedProxy = proxies[proxyIndex];
        log.info(`Menggunakan proxy berurutan #${proxyIndex + 1}: ${selectedProxy.split('@')[1] || selectedProxy}`);
        proxyIndex = (proxyIndex + 1) % proxies.length;
    } else {
        return null;
    }
    if (selectedProxy.startsWith('socks')) {
        return new SocksProxyAgent(selectedProxy);
    } else {
        return new HttpsProxyAgent(selectedProxy);
    }
};

// --- FUNGSI PEMBUAT DATA UNIK (Tanpa '+') ---
function generateUniqueData(baseEmail) {
    const [, domain] = baseEmail.split('@'); 
    
    const namaIndonesia = [
        'iqball','panda','slamet','dewi','eko','fitri','gita','sabar','indah','sarinem',
        'gibran','jumiran','maya','nita','ono','solekan','rini','sari','tono','ucup','wulan',
        'saga', 'raja', 'king', 'crypto', 'whales', 'jagoan', 'kuat', 'super', 'keren'
    ];
    
    const namaAcak = namaIndonesia[Math.floor(Math.random() * namaIndonesia.length)];
    const nomorAcak = Math.floor(Math.random() * 90000) + 10000;
    
    const userPart = `${namaAcak}${nomorAcak}`;
    
    const email = `${userPart}@${domain}`;
    const handle = userPart;
    const password = `Pass${Math.random().toString(36).substring(2, 10)}!@`;
    
    log.info(`Data baru (tanpa +): Email=${email}, Handle=${handle}`);
    return { email, handle, password };
}

// --- HELPER UNTUK FETCH SABAR ---
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (!options.headers) options.headers = {};
            options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';

            const res = await fetch(url, options);
            if (res.status === 429) { throw new Error('Too many requests'); }
            
            const data = await res.json();
            if (data && data.message && data.message.includes("Too many requests")) { throw new Error('Too many requests'); }
            if (data.errors) {
                throw new Error(`GraphQL Error: ${data.errors[0].message}`);
            }
            if (!res.ok) { throw new Error(data.message || `HTTP error! status: ${res.status}`); }
            
            return { res, data };

        } catch (error) {
            if (error.message && error.message.includes("Too many requests")) {
                if (i < maxRetrie - 1) {
                    const nextDelay = INITIAL_RETRY_DELAY * (i + 1);
                    log.warn(`Rate limit terdeteksi. Mencoba lagi dalam ${nextDelay / 1000} detik... (Percobaan ${i + 2}/${maxRetries})`);
                    await delay(nextDelay);
                } else { throw new Error(`Gagal setelah ${maxRetries} percobaan: Too many requests.`); }
            } else { 
                throw error; 
            }
        }
    }
}

// =================================================================
// --- API FUNCTIONS (BEEM) ---
// =================================================================

async function submitRegistration(email, handle, password, refCode, agent) {
    log.info(`Mencoba registrasi untuk ${email} dengan handle ${handle}...`);
    const REG_URL = BASE_URL;

    const payload = {
        operationName: "signup",
        query: "mutation signup($input: SignupInput!) {\n  signup(input: $input) {\n    code\n    __typename\n  }\n}",
        variables: {
            input: {
                email: email,
                handle: handle,
                password: password,
                invite_key: refCode
            }
        }
    };
    
    const options = { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
        body: JSON.stringify(payload), 
        agent 
    };
    
    const { data } = await fetchWithRetry(REG_URL, options);
    
    if (!data.data || !data.data.signup || data.data.signup.code !== 'A1001') {
        throw new Error(`Registrasi Gagal: ${JSON.stringify(data)}`);
    }
    
    log.success(`Registrasi berhasil! Langsung mencoba login...`);
}

// --- FUNGSI LOGIN ---
async function loginToAccount(email, password, agent) {
    log.info(`Mencoba login sebagai ${email}...`);
    const LOGIN_URL = BASE_URL;
    
    const payload = {
        operationName: "login",
        query: "mutation login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    code\n    token\n    refreshToken\n    __typename\n  }\n}",
        variables: {
            email: email,
            password: password
        }
    };

    const options = { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
        body: JSON.stringify(payload), 
        agent 
    };

    const { data } = await fetchWithRetry(LOGIN_URL, options);

    if (data.data && data.data.login && data.data.login.code === 'A1000' && data.data.login.token) {
        log.success('Login berhasil!');
        return data.data.login.token;
    } else {
        throw new Error(`Login Gagal. Kemungkinan perlu verifikasi email. Response: ${JSON.stringify(data)}`);
    }
}

// --- MODIFIKASI: FUNGSI BIO ACAK (Lebih Bervariasi) ---
function generateRandomBio() {
    const sapaan = ["GM ☕", "Hello world", "WAGMI", "Probably Nothing", "LFG", "Just exploring", "Crypto enthusiast"];
    const aktivitas = ["hunting airdrops", "looking for gems", "building in Web3", "exploring new tech", "here for the community", "connecting dots"];
    const asal = ["from Indonesia", "from ID", "based in IDN", "WNI", "just a simple user"];

    // Menggabungkan 3 bagian acak
    return `${sapaan[Math.floor(Math.random() * sapaan.length)]}. ${aktivitas[Math.floor(Math.random() * aktivitas.length)]} ${asal[Math.floor(Math.random() * asal.length)]}.`;
}

// --- FUNGSI UPDATE PROFIL (FINAL) ---
async function updateProfile(token, name, location, bio, agent) {
    log.info(`Mencoba update profil: Name=${name}, Lokasi=${location}, Bio=${bio.substring(0, 30)}...`);

    const PAYLOAD_UPDATE_PROFIL = {
        operationName: "updateUser",
        query: "mutation updateUser($input: UpdateUserInput!) {\n  updateUser(input: $input) {\n    name\n    bio\n    location\n    website\n    photo_url\n    twitter_handle\n    __typename\n  }\n}",
        variables: {
            input: {
                name: name,
                bio: bio,
                location: location,
                website: ""
            }
        }
    };

    const options = { 
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }, 
        body: JSON.stringify(PAYLOAD_UPDATE_PROFIL), 
        agent 
    };

    const { data } = await fetchWithRetry(BASE_URL, options);

    if (data.data && data.data.updateUser && data.data.updateUser.name === name) {
        log.success('Update profil berhasil!');
    } else {
        throw new Error(`Update profil Gagal: ${JSON.stringify(data)}`);
    }
}


// --- MAIN ---
async function main() {
    console.log(chalk.magenta.bold('==========================================================================='));
    console.log(chalk.magenta.bold('             BEEM.ME BOT REFF EMAIL (Direct Login & Update Profile)'));
	console.log(chalk.magenta.bold('  Telegram Channel : https://t.me/AirdropWhalesAcademy | By @Whale2earn.eth '));
    console.log(chalk.magenta.bold('===========================================================================\n'));
    if (IMAP_CONFIGS.length === 0) { log.error('ISI IMAP_CONFIGS dulu!'); return; }

    try {
        const proxyData = await fs.readFile('proxies.txt', 'utf8');
        proxies = proxyData.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
        if (proxies.length > 0) log.info(`${proxies.length} proxy berhasil dimuat.`);
    } catch {
        log.warn('File proxies.txt tidak ditemukan, berjalan tanpa proxy.');
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const refCode = await new Promise(resolve => rl.question(chalk.yellow('[?] Masukkan Invite Key Beem Anda: '), resolve));
    const totalAccounts = await new Promise(resolve => rl.question(chalk.yellow('[?] Berapa akun yang ingin dibuat? '), resolve));
    let proxyMode = '3';
    if (proxies.length > 0) {
        console.log(chalk.yellow('[?] Pilih mode proxy: 1. Acak, 2. Berurutan, 3. Tanpa Proxy'));
        proxyMode = await new Promise(resolve => rl.question(chalk.yellow('Pilihan (1/2/3): '), resolve));
    }
    const delayBetweenAccounts = await new Promise(resolve => rl.question(chalk.yellow('[?] Masukkan jeda waktu antar akun (detik): '), resolve));
    rl.close();

    for (let i = 0; i < parseInt(totalAccounts); i++) {
        log.step(`Proses akun ke-${i+1}/${totalAccounts}`);
        const selectedConfig = IMAP_CONFIGS[Math.floor(Math.random() * IMAP_CONFIGS.length)];
        log.info(`Domain email sumber: ${selectedConfig.user.split('@')[1]}`);
        
        const { email, handle, password } = generateUniqueData(selectedConfig.user);
        let authToken = '';

        try {
            const agent = getProxyAgent(proxyMode);
            
            // --- ALUR LENGKAP (Tanpa Verifikasi) ---
            
            // 1. Registrasi
            await submitRegistration(email, handle, password, refCode, agent);
            
            // 2. Verifikasi Link (DIHAPUS)
            // --- log.warn() Dihapus ---

            // 3. Login
            log.info('Menunggu 5 detik setelah registrasi sebelum login...');
            await delay(5000); 
            authToken = await loginToAccount(email, password, agent);
            
            // 4. Update Profile
            const bio = generateRandomBio(); // Pakai bio baru
            await updateProfile(authToken, handle, "indonesia", bio, agent); 
            
            log.success(`Akun ${email} (Handle: ${handle}) berhasil dibuat & diupdate!`);
            await logResult(email, password, authToken, 'BERHASIL');

        } catch (error) {
            log.error(`Gagal pada akun ${i+1} (${email}): ${error.message}`);
            await logResult(email, password, authToken, 'GAGAL', error.message);
        }

        if (i < parseInt(totalAccounts) - 1) {
            log.info(`Menunggu ${delayBetweenAccounts} detik sebelum lanjut...`);
            await delay(parseInt(delayBetweenAccounts) * 1000);
        }
    }
    log.success('SEMUA PROSES SELESAI.');
}

main().catch(e => log.error(`FATAL ERROR: ${e.stack}`));