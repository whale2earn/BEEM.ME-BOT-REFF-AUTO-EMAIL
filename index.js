const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs').promises;
const FormData = require('form-data');
const chalk = require('chalk');
const readline = require('readline');

// =================================================================
// --- KONFIGURASI PENTING ---
// =================================================================
const IMAP_CONFIGS = [
    { user: 'cintakamuom', password: 'password_asal' },
    { user: 'kndaun.idma@gmail.com', password: 'password_asal' },
    { user: 'kitty2009@gmail.com', password: 'password_asal' },
	{ user: 'managementb2b@gmail.com', password: 'password_asal' },
	{ user: 'fadilkhoirul4@gmail.com', password: 'password_asal' },
	{ user: 'skylark123@gmail.com', password: 'password_asal' },
	{ user: 'kylark1717@gmail.com', password: 'password_asal' },
	{ user: 'putra49@gmail.com', password: 'password_asal' },
	{ user: 'paijo2b@gmail.com', password: 'password_asal' },
	{ user: 'akurk1717@gmail.com', password: 'password_asal' }
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
    warn: (msg) => console.log(chalk.yellow(`[⚠] ${msg}`)),
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

// --- FUNGSI PEMBUAT DATA UNIK (Handle tanpa angka) ---
function generateUniqueData(baseEmail) {
    const [, domain] = baseEmail.split('@'); 
    const namaIndonesia = [
        'iqball','panda','slamet','dewi','eko','fitri','gita','sabar','indah','sarinem',
        'gibran','jumiran','maya','nita','ono','solekan','rini','sari','tono','ucup','wulan',
        'saga', 'raja', 'king', 'crypto', 'whales', 'jagoan', 'kuat', 'super', 'keren',
        'angin', 'awan', 'bulan', 'bintang', 'cahaya', 'damai', 'elang', 'fajar', 'garuda',
        'harimau', 'senja', 'timur', 'utara', 'barat', 'selatan', 'putih', 'merah', 'biru',
        'alam', 'bakti', 'citra', 'data', 'energi', 'fokus', 'garda', 'harta', 'inti'
    ];
    const nama1 = namaIndonesia[Math.floor(Math.random() * namaIndonesia.length)];
    const nama2 = namaIndonesia[Math.floor(Math.random() * namaIndonesia.length)];
    const handle = `${nama1}${nama2}`;
    const nomorAcak = Math.floor(Math.random() * 90000) + 10000;
    const email = `${handle}${nomorAcak}@${domain}`;
    const password = `Pass${Math.random().toString(36).substring(2, 10)}!@`;
    log.info(`Data baru: Email=${email}, Handle=${handle}`);
    return { email, handle, password };
}

// --- HELPER UNTUK FETCH SABAR ---
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const isFormData = options.body && typeof options.body.getBoundary === 'function';
            if (!options.headers) options.headers = {};
            options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';
            if (isFormData) {
                Object.assign(options.headers, options.body.getHeaders());
            } else if (!options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }
            
            const res = await fetch(url, options);
            if (res.status === 429) { throw new Error('Too many requests'); }
            
            // Cek untuk balasan non-JSON dari Dicebear (jika error)
            const contentType = res.headers.get('content-type');
            if (contentType && (contentType.includes('image/png') || contentType.includes('image/svg'))) {
                // Jika balasan adalah gambar, ini untuk fetch gambar, bukan API call
                return { res, data: null, isImage: true }; 
            }

            const data = await res.json();
            if (data && data.message && data.message.includes("Too many requests")) { throw new Error('Too many requests'); }
            if (data.errors) {
                throw new Error(`GraphQL Error: ${data.errors[0].message}`);
            }
            if (!res.ok) { throw new Error(data.message || `HTTP error! status: ${res.status}`); }
            
            return { res, data };

        } catch (error) {
            if (error.type === 'invalid-json' && error.message.includes('Unexpected token')) {
                log.error(`Proxy error, balasan invalid JSON (mungkin kehabisan bandwidth).`);
                throw new Error('Proxy/Network Error: Invalid JSON response.');
            }
            if (error.message && error.message.includes("Too many requests")) {
                if (i < maxRetries - 1) { 
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
    const payload = {
        operationName: "signup",
        query: "mutation signup($input: SignupInput!) {\n  signup(input: $input) {\n    code\n    __typename\n  }\n}",
        variables: { input: { email, handle, password, invite_key: refCode } }
    };
    const options = { method: 'POST', body: JSON.stringify(payload), agent };
    const { data } = await fetchWithRetry(BASE_URL, options);
    if (!data.data || !data.data.signup || data.data.signup.code !== 'A1001') {
        throw new Error(`Registrasi Gagal: ${JSON.stringify(data)}`);
    }
    log.success(`Registrasi berhasil! Langsung mencoba login...`);
}

async function loginToAccount(email, password, agent) {
    log.info(`Mencoba login sebagai ${email}...`);
    const payload = {
        operationName: "login",
        query: "mutation login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    code\n    token\n    refreshToken\n    __typename\n  }\n}",
        variables: { email, password }
    };
    const options = { method: 'POST', body: JSON.stringify(payload), agent };
    const { data } = await fetchWithRetry(BASE_URL, options); 
    if (data.data && data.data.login && data.data.login.code === 'A1000' && data.data.login.token) {
        log.success('Login berhasil!');
        return data.data.login.token;
    } else {
        throw new Error(`Login Gagal. Response: ${JSON.stringify(data)}`);
    }
}

function generateRandomBio() {
    const sapaan = ["GM ☕", "Hello world", "WAGMI", "Probably Nothing", "LFG", "Just exploring", "Crypto enthusiast"];
    const aktivitas = ["hunting airdrops", "looking for gems", "building in Web3", "exploring new tech", "here for the community", "connecting dots"];
    const asal = ["from Indonesia", "from ID", "based in IDN", "WNI", "just a simple user"];
    return `${sapaan[Math.floor(Math.random() * sapaan.length)]}. ${aktivitas[Math.floor(Math.random() * aktivitas.length)]} ${asal[Math.floor(Math.random() * asal.length)]}.`;
}

async function updateProfile(token, name, location, bio, agent) {
    log.info(`Mencoba update profil: Name=${name}, Lokasi=${location}, Bio=${bio.substring(0, 30)}...`);
    const payload = {
        operationName: "updateUser",
        query: "mutation updateUser($input: UpdateUserInput!) {\n  updateUser(input: $input) {\n    name\n    bio\n    location\n    website\n    photo_url\n    twitter_handle\n    __typename\n  }\n}",
        variables: { input: { name, bio, location, website: "" } }
    };
    const options = { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        headers: { 'Authorization': `Bearer ${token}` }, 
        agent 
    };
    const { data } = await fetchWithRetry(BASE_URL, options);
    if (data.data && data.data.updateUser && data.data.updateUser.name === name) {
        log.success('Update profil berhasil!');
    } else {
        throw new Error(`Update profil Gagal: ${JSON.stringify(data)}`);
    }
}

// --- MODIFIKASI: UPLOAD FOTO PROFIL (AVATAR GENERATOR) ---
async function uploadAvatar(token, handle, agent) {
    log.info(`Mencoba upload avatar pixel art untuk ${handle}...`);
    
    // 1. Ambil gambar avatar acak dari DiceBear (gaya pixel-art, berdasarkan handle)
    let imageBuffer;
    try {
        // Kita gunakan handle sebagai "seed" agar setiap avatar unik
        const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/png?seed=${handle}`;
        const imgRes = await fetch(avatarUrl, { 
            agent, // Gunakan proxy agent yang sama
            redirect: 'follow' 
        });
        if (!imgRes.ok) throw new Error(`Gagal download gambar: ${imgRes.statusText}`);
        imageBuffer = await imgRes.buffer(); // node-fetch@2
    } catch (e) {
        throw new Error(`Gagal mengambil gambar dari Dicebear: ${e.message}`);
    }

    // 2. Siapkan payload GraphQL Multipart
    const form = new FormData();
    const operations = {
        query: "mutation updateAvatar($file: Upload!) {\n  updateAvatar(file: $file)\n}",
        variables: { file: null },
        operationName: "updateAvatar"
    };
    
    form.append('operations', JSON.stringify(operations));
    form.append('map', JSON.stringify({ '1': ['variables.file'] }));
    
    // 3. Tambahkan buffer gambar ke form-data
    form.append('1', imageBuffer, { 
        filename: `${handle}.png`, // Nama file unik
        contentType: 'image/png' // Tipe filenya PNG
    });

    // 4. Kirim request ke beem.me
    const options = {
        method: 'POST',
        body: form,
        headers: { 'Authorization': `Bearer ${token}` },
        agent
    };

    const { data } = await fetchWithRetry(BASE_URL, options);

    if (data.data && data.data.updateAvatar) {
        log.success(`Upload foto profil berhasil: ${data.data.updateAvatar}`);
    } else {
        throw new Error(`Upload foto profil Gagal: ${JSON.stringify(data)}`);
    }
}


// --- KOMEN ACAK "MANUSIAWI" ---
function getRandomComment() {
    const comments = [
        "LFG sir, follback..",
        "Nice post! GM",
        "Based. WAGMI.",
        "Interesting project, looking forward for more.",
        "This is cool!",
        "Mantap, gas terus!",
        "Setuju, keren infonya."
    ];
    return comments[Math.floor(Math.random() * comments.length)];
}

// --- REPOST POSTINGAN ---
async function repostPost(token, postId, agent) {
    log.info(`Mencoba repost postingan ID: ${postId}...`);
    const payload = {
        operationName: "createRepost",
        query: "mutation createRepost($tweetId: Int!) {\n  createRepost(tweetId: $tweetId) {\n    ...tweetFragment\n    reposting {\n      ...tweetFragment\n      __typename\n    }\n    replies {\n      ...tweetFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment tweetFragment on Tweet {\n  id\n  reply_to_id\n  content\n  photos {\n    image\n    alt\n    __typename\n  }\n  is_reposted\n  is_liked\n  is_reported\n  replies_count\n  reposts_count\n  favorites_count\n  reports_count\n  created_at\n  is_edited\n  deleted_at\n  is_content_hidden\n  is_image_hidden\n  languages\n  open_graph_metadata {\n    title\n    description\n    url\n    __typename\n  }\n  block_reason\n  quoting {\n    id\n    content\n    photos {\n      image\n      alt\n      __typename\n    }\n    created_at\n    deleted_at\n    is_content_hidden\n    is_image_hidden\n    block_reason\n    parent {\n      user {\n        handle\n        block_reason\n        __typename\n      }\n      __typename\n    }\n    user {\n      id\n      handle\n      name\n      photo_url\n      is_verified\n      is_twitter_legacy\n      block_reason\n      is_muted\n      __typename\n    }\n    __typename\n  }\n  user {\n    id\n    handle\n    name\n    photo_url\n    is_verified\n    is_twitter_legacy\n    block_reason\n    is_muted\n    __typename\n  }\n  __typename\n}",
        variables: { tweetId: postId }
    };
    const options = { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        headers: { 'Authorization': `Bearer ${token}` }, 
        agent 
    };
    const { data } = await fetchWithRetry(BASE_URL, options);
    if (data.data && data.data.createRepost) {
        log.success('Repost berhasil!');
    } else {
        throw new Error(`Repost Gagal: ${JSON.stringify(data)}`);
    }
}

// --- KOMEN POSTINGAN ---
async function commentOnPost(token, postId, postUserId, agent) {
    const commentText = getRandomComment();
    log.info(`Mencoba komen di postingan ID: ${postId} (${commentText})...`);
    
    const payload = {
        operationName: "createTweet",
        query: "mutation createTweet($input: CreateTweetInput!) {\n  createTweet(input: $input) {\n    ...tweetFragment\n    reply_to_id\n    reposting {\n      ...tweetFragment\n      __typename\n    }\n    open_graph_metadata {\n      title\n      description\n      url\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment tweetFragment on Tweet {\n  id\n  reply_to_id\n  content\n  photos {\n    image\n    alt\n    __typename\n  }\n  is_reposted\n  is_liked\n  is_reported\n  replies_count\n  reposts_count\n  favorites_count\n  reports_count\n  created_at\n  is_edited\n  deleted_at\n  is_content_hidden\n  is_image_hidden\n  languages\n  open_graph_metadata {\n    title\n    description\n    url\n    __typename\n  }\n  block_reason\n  quoting {\n    id\n    content\n    photos {\n      image\n      alt\n      __typename\n    }\n    created_at\n    deleted_at\n    is_content_hidden\n    is_image_hidden\n    block_reason\n    parent {\n      user {\n        handle\n        block_reason\n        __typename\n      }\n      __typename\n    }\n    user {\n      id\n      handle\n      name\n      photo_url\n      is_verified\n      is_twitter_legacy\n      block_reason\n      is_muted\n      __typename\n    }\n    __typename\n  }\n  user {\n    id\n    handle\n    name\n    photo_url\n    is_verified\n    is_twitter_legacy\n    block_reason\n    is_muted\n    __typename\n  }\n  __typename\n}",
        variables: {
            input: {
                content: commentText,
                photos: [],
                reply_to_id: postId,
                reply_to_user_id: postUserId
            }
        }
    };
    const options = { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        headers: { 'Authorization': `Bearer ${token}` }, 
        agent 
    };
    const { data } = await fetchWithRetry(BASE_URL, options);
    if (data.data && data.data.createTweet) {
        log.success('Komen berhasil!');
    } else {
        throw new Error(`Komen Gagal: ${JSON.stringify(data)}`);
    }
}

// --- LIKE POSTINGAN ---
async function likePost(token, postId, agent) {
    log.info(`Mencoba like postingan ID: ${postId}...`);
    
    const payload = {
        operationName: "createLike",
        query: "mutation createLike($tweetId: Int!) {\n  createLike(tweetId: $tweetId) {\n    tweet {\n      is_liked\n      favorites_count\n      __typename\n    }\n    __typename\n  }\n}",
        variables: { tweetId: postId }
    };
    const options = { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        headers: { 'Authorization': `Bearer ${token}` }, 
        agent 
    };
    const { data } = await fetchWithRetry(BASE_URL, options);
    if (data.data && data.data.createLike && data.data.createLike.tweet.is_liked) {
        log.success('Like berhasil!');
    } else {
        throw new Error(`Like Gagal: ${JSON.stringify(data)}`);
    }
}


// --- MAIN ---
async function main() {
    console.log(chalk.magenta.bold('==========================================================================='));
    console.log(chalk.magenta.bold('       BEEM.ME BOT v8 (All Features) | By @Whale2earn.eth'));
	console.log(chalk.magenta.bold('  Telegram Channel : https://t.me/AirdropWhalesAcademy'));
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

    const TARGET_POST_ID = 5817; 
    const TARGET_USER_ID = 5633;

    for (let i = 0; i < parseInt(totalAccounts); i++) {
        log.step(`Proses akun ke-${i+1}/${totalAccounts}`);
        const selectedConfig = IMAP_CONFIGS[Math.floor(Math.random() * IMAP_CONFIGS.length)];
        log.info(`Domain email sumber: ${selectedConfig.user.split('@')[1]}`);
        
        const { email, handle, password } = generateUniqueData(selectedConfig.user);
        let authToken = '';

        try {
            const agent = getProxyAgent(proxyMode);
            
            // --- ALUR LENGKAP v8 ---
            
            // 1. Registrasi
            await submitRegistration(email, handle, password, refCode, agent);
            
            // 2. Login
            log.info('Menunggu 5 detik setelah registrasi sebelum login...');
            await delay(5000); 
            authToken = await loginToAccount(email, password, agent);
            
            // 3. Update Profile (Nama, Bio, Lokasi)
            const bio = generateRandomBio();
            await updateProfile(authToken, handle, "indonesia", bio, agent); 
            
            // 4. Upload Foto Profil (Otomatis dari DiceBear)
            await uploadAvatar(authToken, handle, agent); // <-- 'handle' ditambahkan di sini

            // 5. Repost Postingan Target
            await repostPost(authToken, TARGET_POST_ID, agent);
            await delay(2000);

            // 6. Komen Postingan Target
            await commentOnPost(authToken, TARGET_POST_ID, TARGET_USER_ID, agent);
            await delay(2000);

            // 7. Like Postingan Target
            await likePost(authToken, TARGET_POST_ID, agent);

            log.success(`Akun ${email} (Handle: ${handle}) berhasil dibuat & berinteraksi penuh!`);
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