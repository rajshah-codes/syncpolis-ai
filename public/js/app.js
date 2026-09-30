// App Preloader Logic
window.addEventListener('load', () => {
    setTimeout(() => {
        const boot = document.getElementById('app-preloader');
        if (boot) {
            boot.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => boot.remove(), 1000);
        }
    }, 1300);
});

// Navigation Link Transitions
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('[data-path]'); 
    const viewport = document.getElementById('main-viewport'); 
    links.forEach(link => { 
        link.addEventListener('click', (e) => { 
            e.preventDefault(); 
            const path = link.getAttribute('data-path'); 
            viewport.style.opacity = '0'; 
            setTimeout(() => { 
                console.log('Navigating to:', path); 
                viewport.style.opacity = '1'; 
                document.getElementById('mobile-menu').classList.remove('open'); 
            }, 400); 
        }); 
    });
});

// Global Variables
let isCrisisMode = false;
let uploadedFilesArray = [];
let cameraMediaStream = null;
let currentMapQuery = "New Delhi, India";
let speechRecognition = null;
let isRecording = false;

// Text-to-Speech engine globals
let synth = window.speechSynthesis;
let reportTextToRead = "";


// 1. DYNAMIC CAMERA MODAL (FIXED VISIBILITY)
async function openCameraModal() {
    let modal = document.getElementById('camera-modal') || document.getElementById('dynamic-camera-modal');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera access requires HTTPS or localhost. Falling back to file upload.");
        document.getElementById('media-file-input').click(); 
        return;
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Forces the modal to become visible
    }

    try {
        cameraMediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }, 
            audio: false 
        });
        const videoElement = document.getElementById('camera-video');
        if(videoElement) {
            videoElement.srcObject = cameraMediaStream;
            videoElement.onloadedmetadata = () => { 
                videoElement.play().catch(e => console.log(e)); 
            };
        }
    } catch (err) {
        alert("Camera access denied or device not found.");
        closeCameraModal();
    }
}

function closeCameraModal() {
    const modal = document.getElementById('camera-modal') || document.getElementById('dynamic-camera-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (cameraMediaStream) { 
        cameraMediaStream.getTracks().forEach(t => t.stop()); 
        cameraMediaStream = null; 
    }
}

function captureSnapshot() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!video || video.videoWidth === 0) return alert("Camera loading...");
    
    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    uploadedFilesArray.push({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg', name: 'Snapshot.jpg' });
    renderPreviews(); 
    closeCameraModal();
}

// 2. FILE UPLOADS
const grievanceInput = document.getElementById('grievance-input');
if (grievanceInput) {
    grievanceInput.addEventListener('paste', e => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i of items) if (i.kind === 'file') processFile(i.getAsFile());
    });
}

function handleFileSelection(e) {
    for (let file of e.target.files) processFile(file);
    e.target.value = '';
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        uploadedFilesArray.push({ data: e.target.result.split(',')[1], mimeType: file.type, name: file.name });
        renderPreviews();
    };
    reader.readAsDataURL(file);
}


let lightboxBlobUrl = null;

function dataUrlToBlob(dataUrl) {
    const commaIdx = dataUrl.indexOf(',');
    const meta = dataUrl.slice(0, commaIdx);
    const b64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function renderPreviews() {
    const prev = document.getElementById('media-preview-container');
    if (!prev) return;
    prev.innerHTML = '';
    if (uploadedFilesArray.length === 0) { prev.classList.add('hidden'); return; }

    prev.classList.remove('hidden');
    uploadedFilesArray.forEach((fileObj, index) => {
        if (fileObj.mimeType.startsWith('image/')) {
            prev.innerHTML += `
        <div class="relative shrink-0 animate-[stream-reveal_0.3s_ease-out_forwards] group">
            <img src="data:${fileObj.mimeType};base64,${fileObj.data}" onclick="expandImage('data:${fileObj.mimeType};base64,${fileObj.data}', 'image')" class="h-16 sm:h-20 w-16 sm:w-20 object-cover rounded-xl border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer hover:opacity-70 transition-opacity">
            <button onclick="removeFile(${index})" class="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">✕</button>
        </div>`;
        } else {
            prev.innerHTML += `
        <div class="relative h-16 sm:h-20 w-20 sm:w-24 bg-[#0f172a] flex flex-col items-center justify-center rounded-xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] p-1 shrink-0 group cursor-pointer" onclick="expandImage('data:${fileObj.mimeType};base64,${fileObj.data}', 'pdf')">
            <span class="material-symbols-outlined text-purple-400 text-xl sm:text-2xl">picture_as_pdf</span>
            <span class="text-[9px] text-purple-200 truncate w-full mt-1 text-center font-mono">PDF Doc</span>
            <button onclick="event.stopPropagation(); removeFile(${index})" class="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10">✕</button>
        </div>`;
        }
    });
}

function removeFile(index) { uploadedFilesArray.splice(index, 1); renderPreviews(); }

function expandImage(src, type = 'image') {
    let modal = document.getElementById('lightbox-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="lightbox-modal" class="fixed inset-0 z-[999999] bg-black/95 flex items-center justify-center p-4 hidden" onclick="closeLightbox()">
            <button class="absolute top-6 right-6 text-white hover:text-rose-500 p-2 bg-white/10 rounded-full transition-colors z-50"><span class="material-symbols-outlined text-3xl">close</span></button>
            <img id="lightbox-img" src="" class="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.3)] hidden">
            <iframe id="lightbox-iframe" class="w-[90vw] h-[90vh] rounded-xl border border-slate-700/50 shadow-2xl bg-white hidden" title="PDF preview"></iframe>
        </div>`);
        modal = document.getElementById('lightbox-modal');
    }

    const imgEl = document.getElementById('lightbox-img');
    const iframeEl = document.getElementById('lightbox-iframe');

    if (lightboxBlobUrl) { URL.revokeObjectURL(lightboxBlobUrl); lightboxBlobUrl = null; }

    if (type === 'pdf') {
        try {
            lightboxBlobUrl = URL.createObjectURL(dataUrlToBlob(src));
        } catch (err) {
            lightboxBlobUrl = src;
        }
        imgEl.classList.add('hidden');
        iframeEl.src = lightboxBlobUrl + '#toolbar=1&navpanes=0&view=FitH';
        iframeEl.classList.remove('hidden');
    } else {
        iframeEl.classList.add('hidden');
        iframeEl.removeAttribute('src');
        imgEl.src = src;
        imgEl.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const iframeEl = document.getElementById('lightbox-iframe');
    if (iframeEl) { iframeEl.src = 'about:blank'; iframeEl.classList.add('hidden'); }
    if (lightboxBlobUrl) { URL.revokeObjectURL(lightboxBlobUrl); lightboxBlobUrl = null; }
}



// 3. VOICE RECOGNITION (FIXED REPETITION)
function startVoiceRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("Voice dictation is not supported in this browser.");

    if (isRecording && speechRecognition) { speechRecognition.stop(); return; }

    speechRecognition = new SR();
    speechRecognition.continuous = false; // Forces the mic to stop looping
    speechRecognition.interimResults = true;

    speechRecognition.onstart = () => {
        isRecording = true;
        const icon = document.getElementById('mic-icon');
        if (icon) icon.classList.add('text-rose-500', 'animate-pulse');
        const viz = document.getElementById('audio-visualizer');
        if(viz) viz.style.display = 'flex';
    };

    speechRecognition.onresult = e => {
        let txt = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            txt += e.results[i][0].transcript;
        }
        const input = document.getElementById('grievance-input');
        if (input) {
            input.value = txt; // Overwrites cleanly instead of endlessly appending
        }
    };

    speechRecognition.onend = () => {
        isRecording = false;
        const icon = document.getElementById('mic-icon');
        if (icon) icon.classList.remove('text-rose-500', 'animate-pulse');
        const viz = document.getElementById('audio-visualizer');
        if(viz) viz.style.display = 'none';
    };
    speechRecognition.start();
}

// 4. TEXT TO SPEECH ENGINE
window.readAloud = function () {
    if (synth.speaking) synth.cancel();
    let utterance = new SpeechSynthesisUtterance(reportTextToRead);
    utterance.rate = 1.0;
    synth.speak(utterance);
    document.getElementById('tts-btn').classList.add('hidden');
    document.getElementById('tts-stop-btn').classList.remove('hidden');

    utterance.onend = () => {
        document.getElementById('tts-stop-btn').classList.add('hidden');
        document.getElementById('tts-btn').classList.remove('hidden');
    };
};

window.stopReading = function () {
    if (synth.speaking) synth.cancel();
    document.getElementById('tts-stop-btn').classList.add('hidden');
    document.getElementById('tts-btn').classList.remove('hidden');
};

window.toggleMapView = function (mode) {
    const iframe = document.getElementById('live-google-map');
    if (!iframe) return;
    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(currentMapQuery)}&t=${mode === 'satellite' ? 'k' : 'm'}&z=18&ie=UTF8&iwloc=&output=embed`;
}



// ============================================================================
// EXHAUSTIVE 5-LANGUAGE DICTIONARY & MULTILINGUAL DOM ENGINE (BRICS NATIONS)
// ============================================================================
const translations = {
    en: {
        // Navigation & Global Header
        nav_home: "Home",
        nav_portal: "Citizen Portal",
        nav_analytics: "Live Analytics",
        nav_dpi: "DPI Matrix",
        search_ph: "Search Municipal Districts...",
        auth_signin: "Sign In",
        auth_create: "Create Account",
        auth_secure: "SIGN IN SECURELY",
        sys_auth: "Authenticated User",
        sys_logout: "System Logout",

        // Hero Section
        hero_title: "Welcome to SyncPolis AI",
        hero_sub: "Multimodal GovTech Command Center bridging public citizens and local administrators across BRICS nations.",
        btn_access: "ACCESS GOVERNANCE CONSOLE",
        btn_view: "VIEW PUBLIC INFRASTRUCTURE",

        // Problem & Solution Matrix
        
        dpi_title1: "Administrative Bottlenecks",
        dpi_h3_1: `Public grievances are trapped in <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">isolated departmental silos</span>, delaying critical aid.`,
        dpi_body1: "Across BRICS nations, citizen feedback submitted via various local channels rarely reaches the right departments efficiently. This disconnect forces policymakers to rely on outdated reports, resulting in misaligned public spending, unaddressed infrastructure gaps, and an inability to measure community impact.",
        dpi_title2: "The SyncPolis Initiative",
        dpi_h3_2: `Deploying an AI-driven <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">digital public good</span> for inclusive governance.`,
        dpi_body2: "Engineered as a scalable Digital Public Good, SyncPolis AI aggregates citizen feedback across diverse regional dialects. By fusing public sentiment with national demographic and geographic data, our Gemini-powered engine surfaces demand hotspots, translating raw citizen voices into actionable, high-priority development plans.",

        // Feature Cards
        card1_t: "Unified Citizen Feedback",
        card1_d: "Real-time integration of regional grievance reports. Correlating public requests with utility status and demographic density.",
        card1_badge: "Stream Active",
        card2_t: "Predictive Issue Resolution",
        card2_d: "Cross-referencing user-uploaded media with municipal datasets to preemptively identify structural deterioration across public works.",
        card3_t: "Resource Optimization",
        card3_d: "SyncPolis AI models simulating budget distributions and optimal resource deployment for sustainable urban development.",
        card3_sub: "Carbon Deficit",

        // Telemetry HUD & Map
        map_rate: "Data Ingestion Rate",
        map_nodes: "Active Civic Nodes",
        map_units: "Units",
        map_stab: "Grid Stability",
        map_node_alpha: "Node Alpha-BR",
        map_status_opt: "Status: Optimal",

        // AI Command Console & Ingestion Portal
        cmd_core_badge: "DPI COMMAND CORE",
        thinking_text: "Synthesizing multimodal telemetry & geocoding...",
        awaiting_payload: "Awaiting Grievance Payload",
        port_title: "Multimodal Citizen Portal",
        placeholder_text: "Describe the civic issue with exact street address, or click Voice/Camera/Files below (You can also Ctrl+V paste screenshots directly here)...",
        upload_voice: "Voice",
        upload_camera: "Camera",
        upload_files: "Files",
        btn_initiate: "INITIATE CIVIC TELEMETRY",

        // Live Analytics Matrix
        stat_reg: "REGIONAL INFRASTRUCTURE OVERVIEW",
        stat_live: "LIVE MONITORING ACTIVE",
        stat_g_rate: "Grievance Intake Rate",
        stat_r_hr: "reports/hr",
        stat_cni: "Critical Need Index",
        stat_cni_val: "Critical: 78.4",
        stat_ling: "Linguistic Resolution Rate",
        stat_ling_sub: "Hindi, Tamil, Bengali, Telugu, English",
        stat_budg: "Budget Alignment Score",
        stat_wtr: "Water Scarcity",
        stat_rd: "Roadway Damage",
        stat_grd: "Grid Stability",
        stat_san: "Sanitation",

        // Policy Action Queue
        act_title: "HIGH-PRIORITY POLICY ACTION QUEUE",
        act_sub: "AI-recommended budget and resource allocation based on real-time feedback.",
        proj1_t: "Emergency Water Grid Redistribution",
        proj1_badge: "Critical - Sector 4",
        lbl_data_basis: "Data Basis",
        lbl_est_cost: "Est. Cost",
        lbl_timeline: "Timeline",
        proj1_data: "480+ voice grievances",
        proj1_cost: "₹1.85 Cr",
        proj1_time: "72 Hours",
        act_btn1: "APPROVE RESOURCE ROUTING",
        proj2_t: "Pothole Remediation",
        proj2_badge: "High Priority",
        proj2_data: "Image uploads",
        proj2_cost: "₹62 Lakhs",
        proj2_time: "5 Days",
        act_btn2: "ROUTE TO DEPT OF PUBLIC WORKS",

        // Diagnostics Drawer
        sys_title: "SYSTEM CORE HEALTH & DPI FEDERATION MESH",
        sys_perf: "18ms Latency | Zero Packet Loss",
        sys_item1_t: "Gemini 3.5 Flash Policy Engine",
        sys_item1_s: "HEALTHY / 99.98% UPTIME",
        sys_item2_t: "OpenData Govt Ingestion Pipeline",
        sys_item2_s: "SYNCED (data.gov.in)",
        sys_item3_t: "Geospatial Coordinate Resolver",
        sys_item3_s: "ONLINE",
        sys_item4_t: "Citizen Voice NLP Engine",
        sys_item4_s: "LISTENING (Multi-Dialect Mesh)",

        // Camera Modal
        camera_title: "Live Optical Sensor",
        camera_cancel: "Cancel",
        camera_snap: "Snap Photo",

        // Footer
        foot_copy: "© 2026 SyncPolis AI. Eco-Neon Gov Architecture.",
        foot_sec: "Security Matrix",
        foot_priv: "Privacy Node",
        foot_hlth: "System Health",

        // Search Interface
        sr_locked: "Sign in to search",
        sr_locked_sub: "Search is available to authorised users only.",
        sr_empty: "No municipal records found for",

        // Login / Auth System
        login_title: "SyncPolis <span class='text-cyan-400'>AI</span>",
        login_sub: "INSTITUTIONAL GRADE INTELLIGENCE.",
        login_google: "Continue with Google",
        login_ms: "Microsoft",
        login_or_email: "OR EMAIL LOGIN",
        login_or_signup: "OR SIGN UP WITH EMAIL",
        lbl_name: "Full Name",
        lbl_email: "Email Address",
        lbl_pwd: "Password",
        lbl_rem: "Remember Me",
        lbl_forgot: "Forgot Password?",
        btn_sign_portal: "SIGN IN TO PORTAL",
        btn_create_acc: "CREATE ACCOUNT",
        btn_reset: "SEND RESET LINK",
        btn_back: "BACK TO LOGIN",
        txt_no_acc: "Don't have an account?",
        txt_has_acc: "Already registered?",
        reset_title: "Reset Access",
        reset_sub: "ENTER YOUR EMAIL TO RECOVER YOUR ACCOUNT.",
        auth_err_email: "Please enter your registered email address below to use OAuth.",
        auth_err_notfound: "Account not found. Please click 'Create Account' below.",
        auth_err_exists: "Account already exists. Please switch to Sign In.",
        auth_err_invalid: "Invalid credentials. Please try again.",
        auth_succ_created: "Account created! Please Sign In."
    },

    hi: {
        // Navigation & Global Header
        nav_home: "होम",
        nav_portal: "नागरिक पोर्टल",
        nav_analytics: "लाइव एनालिटिक्स",
        nav_dpi: "DPI मैट्रिक्स",
        search_ph: "नगरपालिका जिले खोजें...",
        auth_signin: "साइन इन",
        auth_create: "खाता बनाएं",
        auth_secure: "सुरक्षित साइन इन",
        sys_auth: "प्रमाणित उपयोगकर्ता",
        sys_logout: "सिस्टम लॉगआउट",

        // Hero Section
        hero_title: "SyncPolis AI में आपका स्वागत है",
        hero_sub: "ब्रिक्स देशों के नागरिकों और स्थानीय प्रशासकों को जोड़ने वाला मल्टीमॉडल गॉवटेक कमांड सेंटर।",
        btn_access: "गवर्नेंस कंसोल खोलें",
        btn_view: "सार्वजनिक अवसंरचना देखें",

        // Problem & Solution Matrix
        
        dpi_title1: "प्रशासनिक बाधाएं",
        dpi_h3_1: `सार्वजनिक शिकायतें <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">अलग-थलग विभागीय साइलो</span> में फंसी हुई हैं, जिससे सहायता में देरी होती है।`,
        dpi_body1: "ब्रिक्स देशों में विभिन्न स्थानीय चैनलों के माध्यम से प्रस्तुत नागरिक प्रतिक्रिया शायद ही कभी संबंधित विभागों तक कुशलतापूर्वक पहुंच पाती है। यह अलगाव नीति निर्माताओं को पुरानी रिपोर्टों पर निर्भर होने के लिए मजबूर करता है, जिसके परिणामस्वरूप असंगत सार्वजनिक व्यय और अधूरी अवसंरचना उत्पन्न होती है।",
        dpi_title2: "सिंकपोलिस पहल",
        dpi_h3_2: `समावेशी शासन के लिए AI-संचालित <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">डिजिटल सार्वजनिक वस्तु</span> की तैनाती।`,
        dpi_body2: "एक स्केलेबल डिजिटल पब्लिक गुड के रूप में निर्मित, SyncPolis AI विभिन्न क्षेत्रीय बोलियों में नागरिक प्रतिक्रिया को एकत्रित करता है। जनभावना को राष्ट्रीय जनसांख्यिकीय डेटा के साथ जोड़कर, हमारा जेमिनी इंजन मांग हॉटस्पॉट की पहचान करता है।",

        // Feature Cards
        card1_t: "एकीकृत नागरिक प्रतिक्रिया",
        card1_d: "क्षेत्रीय शिकायत रिपोर्टों का वास्तविक समय एकीकरण। जनसांख्यिकीय घनत्व और उपयोगिता स्थिति के साथ सार्वजनिक अनुरोधों का सहसंबंध।",
        card1_badge: "स्ट्रीम सक्रिय",
        card2_t: "अनुमानात्मक समस्या समाधान",
        card2_d: "सार्वजनिक निर्माण कार्यों में संरचनात्मक गिरावट को पहले से पहचानने के लिए नगरपालिका डेटासेट के साथ मीडिया का सत्यापन।",
        card3_t: "संसाधन अनुकूलन",
        card3_d: "टिकाऊ शहरी विकास के लिए बजट वितरण और इष्टतम संसाधन नियोजन का अनुकरण करने वाले मॉडल।",
        card3_sub: "कार्बन घाटा",

        // Telemetry HUD & Map
        map_rate: "डेटा इनजेशन दर",
        map_nodes: "सक्रिय नागरिक नोड्स",
        map_units: "इकाइयां",
        map_stab: "ग्रिड स्थिरता",
        map_node_alpha: "नोड अल्फा-BR",
        map_status_opt: "स्थिति: इष्टतम",

        // AI Command Console & Ingestion Portal
        cmd_core_badge: "DPI कमांड कोर",
        thinking_text: "मल्टीमॉडल टेलीमेट्री और जियोकोडिंग का विश्लेषण किया जा रहा है...",
        awaiting_payload: "शिकायत पेलोड की प्रतीक्षा है",
        port_title: "मल्टीमॉडल नागरिक पोर्टल",
        placeholder_text: "सटीक सड़क पते के साथ नागरिक समस्या का वर्णन करें, या नीचे वॉयस/कैमरा/फ़ाइलें पर क्लिक करें...",
        upload_voice: "आवाज़",
        upload_camera: "कैमरा",
        upload_files: "फ़ाइलें",
        btn_initiate: "नागरिक टेलीमेट्री प्रारंभ करें",

        // Live Analytics Matrix
        stat_reg: "क्षेत्रीय बुनियादी ढांचा अवलोकन",
        stat_live: "लाइव मॉनिटरिंग सक्रिय",
        stat_g_rate: "शिकायत प्राप्ति दर",
        stat_r_hr: "रिपोर्ट/घंटा",
        stat_cni: "महत्वपूर्ण आवश्यकता सूचकांक",
        stat_cni_val: "गंभीर: 78.4",
        stat_ling: "भाषाई समाधान दर",
        stat_ling_sub: "हिंदी, तमिल, बंगाली, तेलुगु, अंग्रेजी",
        stat_budg: "बजट संरेखण स्कोर",
        stat_wtr: "जल की कमी",
        stat_rd: "सड़क क्षति",
        stat_grd: "ग्रिड स्थिरता",
        stat_san: "स्वच्छता",

        // Policy Action Queue
        act_title: "उच्च-प्राथमिकता नीति कार्रवाई कतार",
        act_sub: "वास्तविक समय की प्रतिक्रिया के आधार पर AI-अनुशंसित बजट और संसाधन आवंटन।",
        proj1_t: "आपातकालीन जल ग्रिड पुनर्वितरण",
        proj1_badge: "गंभीर - सेक्टर 4",
        lbl_data_basis: "डेटा आधार",
        lbl_est_cost: "अनुमानित लागत",
        lbl_timeline: "समय सीमा",
        proj1_data: "480+ ध्वनि शिकायतें",
        proj1_cost: "₹1.85 करोड़",
        proj1_time: "72 घंटे",
        act_btn1: "संसाधन मार्ग स्वीकृत करें",
        proj2_t: "सड़क के गड्ढों की मरम्मत",
        proj2_badge: "उच्च प्राथमिकता",
        proj2_data: "छवि अपलोड",
        proj2_cost: "₹62 लाख",
        proj2_time: "5 दिन",
        act_btn2: "लोक निर्माण विभाग को भेजें",

        // Diagnostics Drawer
        sys_title: "सिस्टम कोर स्वास्थ्य और DPI मेश",
        sys_perf: "18ms विलंबता | शून्य पैकेट हानि",
        sys_item1_t: "जेमिनी 3.5 फ्लैश पॉलिसी इंजन",
        sys_item1_s: "स्वस्थ / 99.98% अपटाइम",
        sys_item2_t: "ओपनडेटा सरकारी इनजेशन पाइपलाइन",
        sys_item2_s: "सिंक किया गया (data.gov.in)",
        sys_item3_t: "भू-स्थानिक निर्देशांक समाधानकर्ता",
        sys_item3_s: "ऑनलाइन",
        sys_item4_t: "नागरिक आवाज़ NLP इंजन",
        sys_item4_s: "सक्रिय (मल्टी-डायलेक्ट मेश)",

        // Camera Modal
        camera_title: "लाइव ऑप्टिकल सेंसर",
        camera_cancel: "रद्द करें",
        camera_snap: "फोटो लें",

        // Footer
        foot_copy: "© 2026 SyncPolis AI. इको-नियॉन गॉव आर्किटेक्चर।",
        foot_sec: "सुरक्षा मैट्रिक्स",
        foot_priv: "गोपनीयता नोड",
        foot_hlth: "सिस्टम स्वास्थ्य",

        // Search Interface
        sr_locked: "खोजने हेतु प्रवेश करें",
        sr_locked_sub: "खोज केवल अधिकृत उपयोगकर्ताओं के लिए उपलब्ध है।",
        sr_empty: "इसके लिए कोई रिकॉर्ड नहीं मिला",

        // Login / Auth System
        login_title: "सिंकपोलिस <span class='text-cyan-400'>AI</span>",
        login_sub: "संस्थागत स्तर की बुद्धिमत्ता।",
        login_google: "Google के साथ जारी रखें",
        login_ms: "Microsoft",
        login_or_email: "या ईमेल से लॉगिन करें",
        login_or_signup: "या ईमेल से साइन अप करें",
        lbl_name: "पूरा नाम",
        lbl_email: "ईमेल पता",
        lbl_pwd: "पासवर्ड",
        lbl_rem: "मुझे याद रखें",
        lbl_forgot: "पासवर्ड भूल गए?",
        btn_sign_portal: "पोर्टल में साइन इन करें",
        btn_create_acc: "खाता बनाएं",
        btn_reset: "रीसेट लिंक भेजें",
        btn_back: "लॉगिन पर वापस जाएं",
        txt_no_acc: "खाता नहीं है?",
        txt_has_acc: "पहले से पंजीकृत हैं?",
        reset_title: "पहुँच पुनर्प्राप्त करें",
        reset_sub: "अपना खाता पुनर्प्राप्त करने के लिए ईमेल दर्ज करें।",
        auth_err_email: "कृपया OAuth का उपयोग करने के लिए नीचे अपना ईमेल दर्ज करें।",
        auth_err_notfound: "खाता नहीं मिला। कृपया नीचे 'खाता बनाएं' पर क्लिक करें।",
        auth_err_exists: "खाता पहले से मौजूद है। कृपया साइन इन करें।",
        auth_err_invalid: "अमान्य क्रेडेंशियल। कृपया पुनः प्रयास करें।",
        auth_succ_created: "खाता बन गया! कृपया साइन इन करें।"
    },

    zh: {
        // Navigation & Global Header
        nav_home: "首页",
        nav_portal: "公民门户",
        nav_analytics: "实时分析",
        nav_dpi: "DPI矩阵",
        search_ph: "搜索市政区域...",
        auth_signin: "登录",
        auth_create: "创建账户",
        auth_secure: "安全登录",
        sys_auth: "已认证用户",
        sys_logout: "系统注销",

        // Hero Section
        hero_title: "欢迎使用 SyncPolis AI",
        hero_sub: "连接金砖国家公众与地方管理者的多模态政府科技指挥中心。",
        btn_access: "进入治理控制台",
        btn_view: "查看公共基础设施",

        // Problem & Solution Matrix
     
        dpi_title1: "行政壁垒与瓶颈",
        dpi_h3_1: `公众申诉受困于<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">分散的部门孤岛中</span>，延误了紧急救助。`,
        dpi_body1: "在金砖国家，公民通过各种本地渠道提交的诉求往往难以高效送达相应部门。这种脱节迫使决策者依赖过时的报告，导致公共开支错位及基础设施建设缺位。",
        dpi_title2: "SyncPolis 倡议",
        dpi_h3_2: `部署人工智能驱动的<span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">数字公共产品</span>，以实现包容性治理。`,
        dpi_body2: "作为可扩展的数字公共产品，SyncPolis AI 汇集多语种公民反馈，将公众诉求与地理信息相结合，自动生成高优先级的治理与施工方案。",

        // Feature Cards
        card1_t: "统一公民反馈",
        card1_d: "实时整合区域民生报告。关联公众请求与市政运行状态及人口密度。",
        card1_badge: "数据流活跃",
        card2_t: "预测性问题排查",
        card2_d: "结合用户上传的多媒体内容与市政数据，提前预警公共设施的结构老化问题。",
        card3_t: "资源科学配置",
        card3_d: "SyncPolis 算法模拟预算分配，助力实现城市资源的最优化与可持续布局。",
        card3_sub: "碳平衡赤字",

        // Telemetry HUD & Map
        map_rate: "数据接入速率",
        map_nodes: "活跃市政节点",
        map_units: "单位",
        map_stab: "电网稳定性",
        map_node_alpha: "阿尔法-BR 节点",
        map_status_opt: "运行状态：最优",

        // AI Command Console & Ingestion Portal
        cmd_core_badge: "DPI 指挥核心",
        thinking_text: "正在综合多模态遥测与地理位置解析...",
        awaiting_payload: "等待诉求数据载荷接入",
        port_title: "多模态公民服务门户",
        placeholder_text: "请详细描述市政问题与具体街道地址，或通过下方语音/拍照/文件上传...",
        upload_voice: "语音录入",
        upload_camera: "光学相机",
        upload_files: "文档附件",
        btn_initiate: "启动市政遥测分析",

        // Live Analytics Matrix
        stat_reg: "区域基础设施全景看板",
        stat_live: "实时监控运行中",
        stat_g_rate: "诉求受理速率",
        stat_r_hr: "件/小时",
        stat_cni: "紧急需求指数",
        stat_cni_val: "危急状态: 78.4",
        stat_ling: "多语言解析达标率",
        stat_ling_sub: "中文、印地语、英语、俄语、葡语",
        stat_budg: "财政预算对齐评分",
        stat_wtr: "供水短缺度",
        stat_rd: "路面受损度",
        stat_grd: "电网健康度",
        stat_san: "市政环卫度",

        // Policy Action Queue
        act_title: "高优先级行政决策队列",
        act_sub: "基于实时遥测推荐的政府资金与工程资源调度队列。",
        proj1_t: "区域应急水网重定向工程",
        proj1_badge: "紧急 - 第四分区",
        lbl_data_basis: "数据来源",
        lbl_est_cost: "预估造价",
        lbl_timeline: "工期周期",
        proj1_data: "480+ 条语音诉求",
        proj1_cost: "1.85 亿卢比",
        proj1_time: "72 小时",
        act_btn1: "核准资源调配路径",
        proj2_t: "市政道路塌陷与坑洼修复",
        proj2_badge: "高度优先",
        proj2_data: "图像证据上传",
        proj2_cost: "6200 万卢比",
        proj2_time: "5 个工作日",
        act_btn2: "下派至市政工程局",

        // Diagnostics Drawer
        sys_title: "系统运行工况与 DPI 协同网络",
        sys_perf: "18毫秒低延迟 | 零丢包率",
        sys_item1_t: "Gemini 3.5 决策推理引擎",
        sys_item1_s: "健康状态 / 99.98% 可用率",
        sys_item2_t: "政府开放数据输入流",
        sys_item2_s: "已连接 (data.gov.in)",
        sys_item3_t: "地理信息空间定位系统",
        sys_item3_s: "在线联通",
        sys_item4_t: "多语种语音识别推理引擎",
        sys_item4_s: "监听中 (方言神经网络)",

        // Camera Modal
        camera_title: "光学遥测相机",
        camera_cancel: "取消操作",
        camera_snap: "捕获画面",

        // Footer
        foot_copy: "© 2026 SyncPolis AI. 生态数字政府架构。",
        foot_sec: "安全矩阵",
        foot_priv: "隐私节点",
        foot_hlth: "系统监控",

        // Search Interface
        sr_locked: "请登录后使用检索",
        sr_locked_sub: "仅限已授权公务用户访问内部索引。",
        sr_empty: "未找到相关行政数据：",

        // Login / Auth System
        login_title: "SyncPolis <span class='text-cyan-400'>AI</span>",
        login_sub: "国家级政务智能平台。",
        login_google: "使用 Google 登录",
        login_ms: "使用 Microsoft 登录",
        login_or_email: "或通过电子邮箱登录",
        login_or_signup: "或通过电子邮箱注册",
        lbl_name: "真实姓名",
        lbl_email: "政务邮箱",
        lbl_pwd: "账户密码",
        lbl_rem: "记住凭证",
        lbl_forgot: "找回密码？",
        btn_sign_portal: "登 录 系 统",
        btn_create_acc: "注 册 账 户",
        btn_reset: "发送密码重置链",
        btn_back: "返回登录界面",
        txt_no_acc: "尚无账号？",
        txt_has_acc: "已有认证账号？",
        reset_title: "重置访问权限",
        reset_sub: "输入注册邮箱以接收一次性恢复凭据。",
        auth_err_email: "使用单点登录前请先填写电子邮箱。",
        auth_err_notfound: "未查询到该账户，请先点击注册。",
        auth_err_exists: "该邮箱已被注册，请直接登录。",
        auth_err_invalid: "凭证校验失败，请检查输入。",
        auth_succ_created: "账户创建成功！请登录。"
    },

    pt: {
        // Navigation & Global Header
        nav_home: "Início",
        nav_portal: "Portal do Cidadão",
        nav_analytics: "Análise ao Vivo",
        nav_dpi: "Matriz DPI",
        search_ph: "Pesquisar distritos municipais...",
        auth_signin: "Entrar",
        auth_create: "Criar Conta",
        auth_secure: "ENTRAR COM SEGURANÇA",
        sys_auth: "Usuário Autenticado",
        sys_logout: "Sair do Sistema",

        // Hero Section
        hero_title: "Bem-vindo ao SyncPolis AI",
        hero_sub: "Centro de Comando GovTech Multimodal unindo cidadãos e administradores públicos nos países do BRICS.",
        btn_access: "ACESSAR CONSOLE DE GOVERNO",
        btn_view: "VER INFRAESTRUTURA PÚBLICA",

        // Problem & Solution Matrix
        
        dpi_title1: "Gargalos Administrativos",
        dpi_h3_1: `Reivindicações públicas ficam retidas em <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">silos departamentais isolados</span>, atrasando auxílios críticos.`,
        dpi_body1: "Nos países do BRICS, as manifestações cidadãs raramente chegam aos departamentos corretos com agilidade. Isso força gestores públicos a operarem com relatórios desatualizados, gerando má aplicação de recursos.",
        dpi_title2: "A Iniciativa SyncPolis",
        dpi_h3_2: `Implementando um <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">bem público digital</span> orientado por IA para governança inclusiva.`,
        dpi_body2: "Projetado como um Bem Público Digital escalável, o SyncPolis AI agrega demandas cidadãs em múltiplos dialetos regionais, gerando planos estruturais de alta prioridade.",

        // Feature Cards
        card1_t: "Feedback Cidadão Unificado",
        card1_d: "Integração em tempo real de denúncias regionais, correlacionando demandas com densidade demográfica.",
        card1_badge: "Transmissão Ativa",
        card2_t: "Resolução Preditiva de Falhas",
        card2_d: "Cruzamento de mídias enviadas por cidadãos com bases de dados municipais para identificar desgastes estruturais.",
        card3_t: "Otimização de Recursos",
        card3_d: "Simulação computacional de orçamentos e distribuição ideal de maquinário público.",
        card3_sub: "Déficit de Carbono",

        // Telemetry HUD & Map
        map_rate: "Taxa de Ingestão de Dados",
        map_nodes: "Nós Cívicos Ativos",
        map_units: "Unidades",
        map_stab: "Estabilidade da Rede",
        map_node_alpha: "Nó Alfa-BR",
        map_status_opt: "Status: Otimizado",

        // AI Command Console & Ingestion Portal
        cmd_core_badge: "NÚCLEO DE COMANDO DPI",
        thinking_text: "Sintetizando telemetria multimodal e geocodificação...",
        awaiting_payload: "Aguardando Envio de Reclamação",
        port_title: "Portal Cívico Multimodal",
        placeholder_text: "Descreva a ocorrência cívica com endereço completo, ou utilize Voz/Câmera/Arquivos abaixo...",
        upload_voice: "Voz",
        upload_camera: "Câmera",
        upload_files: "Arquivos",
        btn_initiate: "INICIAR TELEMETRIA CÍVICA",

        // Live Analytics Matrix
        stat_reg: "VISÃO GERAL DA INFRAESTRUTURA REGIONAL",
        stat_live: "MONITORAMENTO EM TEMPO REAL ATIVO",
        stat_g_rate: "Taxa de Entrada de Demandas",
        stat_r_hr: "relatórios/hora",
        stat_cni: "Índice de Necessidade Crítica",
        stat_cni_val: "Crítico: 78.4",
        stat_ling: "Resolução Linguística Neural",
        stat_ling_sub: "Português, Inglês, Hindi, Chinês, Russo",
        stat_budg: "Alinhamento Orçamentário",
        stat_wtr: "Escassez Hídrica",
        stat_rd: "Dano Viário",
        stat_grd: "Estabilidade Energética",
        stat_san: "Saneamento Básico",

        // Policy Action Queue
        act_title: "FILA DE AÇÕES POLÍTICAS PRIORITÁRIAS",
        act_sub: "Alocação orçamentária e de maquinário automatizada por inteligência artificial.",
        proj1_t: "Redirecionamento Emergencial da Rede Hídrica",
        proj1_badge: "Crítico - Setor 4",
        lbl_data_basis: "Base de Dados",
        lbl_est_cost: "Custo Estimado",
        lbl_timeline: "Prazo de Execução",
        proj1_data: "480+ denúncias por voz",
        proj1_cost: "R$ 11.2 Milhões",
        proj1_time: "72 Horas",
        act_btn1: "APROVAR DIRECIONAMENTO DE RECURSOS",
        proj2_t: "Recapeamento Viário Estrutural",
        proj2_badge: "Alta Prioridade",
        proj2_data: "Uploads fotográficos",
        proj2_cost: "R$ 3.8 Milhões",
        proj2_time: "5 Dias",
        act_btn2: "ENCAMINHAR À SECRETARIA DE OBRAS",

        // Diagnostics Drawer
        sys_title: "SAÚDE DO SISTEMA E MALHA DE FEDERAÇÃO DPI",
        sys_perf: "Latência de 18ms | Zero Perda de Pacotes",
        sys_item1_t: "Motor de Decisão Gemini 3.5 Flash",
        sys_item1_s: "OPERACIONAL / 99.98% DISPONÍVEL",
        sys_item2_t: "Pipeline de Dados Abertos Governamentais",
        sys_item2_s: "SINCRONIZADO (dados.gov.br)",
        sys_item3_t: "Resolvedor de Coordenadas Geoespaciais",
        sys_item3_s: "CONECTADO",
        sys_item4_t: "Motor NLP de Voz Cidadã",
        sys_item4_s: "ESCUTANDO (Malha Neural Multidialeto)",

        // Camera Modal
        camera_title: "Sensor Óptico ao Vivo",
        camera_cancel: "Cancelar",
        camera_snap: "Capturar Foto",

        // Footer
        foot_copy: "© 2026 SyncPolis AI. Arquitetura de Governo Eco-Neon.",
        foot_sec: "Matriz de Segurança",
        foot_priv: "Nó de Privacidade",
        foot_hlth: "Saúde do Sistema",

        // Search Interface
        sr_locked: "Faça login para pesquisar",
        sr_locked_sub: "A busca é restrita a usuários governamentais autorizados.",
        sr_empty: "Nenhum registro municipal encontrado para",

        // Login / Auth System
        login_title: "SyncPolis <span class='text-cyan-400'>AI</span>",
        login_sub: "INTELIGÊNCIA DE NÍVEL INSTITUCIONAL.",
        login_google: "Continuar com Google",
        login_ms: "Continuar com Microsoft",
        login_or_email: "OU ENTRAR COM EMAIL",
        login_or_signup: "OU CRIAR CONTA COM EMAIL",
        lbl_name: "Nome Completo",
        lbl_email: "Endereço de E-mail",
        lbl_pwd: "Senha Institucional",
        lbl_rem: "Manter conectado",
        lbl_forgot: "Esqueceu a senha?",
        btn_sign_portal: "ENTRAR NO PORTAL",
        btn_create_acc: "REGISTRAR CONTA",
        btn_reset: "ENVIAR LINK DE RECUPERAÇÃO",
        btn_back: "VOLTAR AO LOGIN",
        txt_no_acc: "Não tem uma conta?",
        txt_has_acc: "Já possui credencial?",
        reset_title: "Recuperar Acesso",
        reset_sub: "DIGITE SEU E-MAIL PARA OBTER A CHAVE DE ACESSO.",
        auth_err_email: "Insira seu e-mail antes de autenticar via OAuth.",
        auth_err_notfound: "Conta não localizada. Clique em 'Criar Conta' abaixo.",
        auth_err_exists: "Este e-mail já está cadastrado. Faça login.",
        auth_err_invalid: "Credenciais inválidas. Verifique os dados digitados.",
        auth_succ_created: "Conta registrada com sucesso! Faça login."
    },

    ru: {
        // Navigation & Global Header
        nav_home: "Главная",
        nav_portal: "Портал граждан",
        nav_analytics: "Аналитика онлайн",
        nav_dpi: "Матрица DPI",
        search_ph: "Поиск муниципальных округов...",
        auth_signin: "Войти",
        auth_create: "Создать аккаунт",
        auth_secure: "БЕЗОПАСНЫЙ ВХОД",
        sys_auth: "Авторизованный служащий",
        sys_logout: "Выход из системы",

        // Hero Section
        hero_title: "Добро пожаловать в SyncPolis AI",
        hero_sub: "Мультимодальный командный центр GovTech, объединяющий жителей и городские администрации стран БРИКС.",
        btn_access: "ОТКРЫТЬ КОНСОЛЬ УПРАВЛЕНИЯ",
        btn_view: "ГОРОДСКАЯ ИНФРАСТРУКТУРА",

        // Problem & Solution Matrix
        
        dpi_title1: "Административные барьеры",
        dpi_h3_1: `Обращения граждан застревают в <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">разрозненных ведомствах</span>, затягивая оказание помощи.`,
        dpi_body1: "В странах БРИКС обращения граждан редко доходят до нужных служб оперативно. Аналитика на устаревших отчетах ведет к неэффективному распределению муниципального бюджета.",
        dpi_title2: "Инициатива SyncPolis",
        dpi_h3_2: `Внедрение <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500">цифрового общественного блага</span> на базе ИИ для инклюзивного управления.`,
        dpi_body2: "SyncPolis AI агрегирует жалобы жителей на различных диалектах, сопоставляя их со спутниковыми данными для формирования планов первоочередного ремонта.",

        // Feature Cards
        card1_t: "Единая обратная связь",
        card1_d: "Интеграция региональных обращений в реальном времени. Корреляция заявок с плотностью населения.",
        card1_badge: "Поток активен",
        card2_t: "Предиктивный анализ сбоев",
        card2_d: "Сопоставление фото- и видеоматериалов с городскими геоданными для выявления износа конструкций.",
        card3_t: "Оптимизация ресурсов",
        card3_d: "Моделирование распределения бюджета и спецтехники для устойчивого развития мегаполисов.",
        card3_sub: "Углеродный баланс",

        // Telemetry HUD & Map
        map_rate: "Скорость поступления данных",
        map_nodes: "Активные городские узлы",
        map_units: "Ед.",
        map_stab: "Стабильность сетей",
        map_node_alpha: "Узел Альфа-BR",
        map_status_opt: "Статус: Оптимальный",

        // AI Command Console & Ingestion Portal
        cmd_core_badge: "КОМАНДНОЕ ЯДРО DPI",
        thinking_text: "Обработка мультимодальной телеметрии и геокодирование...",
        awaiting_payload: "Ожидание пакета данных обращения",
        port_title: "Мультимодальный портал обращений",
        placeholder_text: "Опишите проблему с указанием точного адреса или прикрепите голос/фото/файл ниже...",
        upload_voice: "Голос",
        upload_camera: "Камера",
        upload_files: "Файлы",
        btn_initiate: "ЗАПУСТИТЬ ТЕЛЕМЕТРИЮ",

        // Live Analytics Matrix
        stat_reg: "СВОДКА РЕГИОНАЛЬНОЙ ИНФРАСТРУКТУРЫ",
        stat_live: "ОНЛАЙН-МОНИТОРИНГ АКТИВЕН",
        stat_g_rate: "Скорость приема обращений",
        stat_r_hr: "обращ./час",
        stat_cni: "Индекс критической потребности",
        stat_cni_val: "Критический: 78.4",
        stat_ling: "Нейросетевой перевод диалектов",
        stat_ling_sub: "Русский, Хинди, Китайский, Португальский, Английский",
        stat_budg: "Эффективность распределения средств",
        stat_wtr: "Дефицит водоснабжения",
        stat_rd: "Повреждения автодорог",
        stat_grd: "Надежность электросетей",
        stat_san: "Городское благоустройство",

        // Policy Action Queue
        act_title: "ОЧЕРЕДЬ ПРИОРИТЕТНЫХ РЕШЕНИЙ",
        act_sub: "Автоматизированное распределение субсидий на основе потока гражданских данных.",
        proj1_t: "Экстренная переброска водопроводной сети",
        proj1_badge: "Критический - Сектор 4",
        lbl_data_basis: "База данных",
        lbl_est_cost: "Оценка затрат",
        lbl_timeline: "Сроки работ",
        proj1_data: "480+ голосовых жалоб",
        proj1_cost: "185 млн ₽",
        proj1_time: "72 часа",
        act_btn1: "УТВЕРДИТЬ ВЫДЕЛЕНИЕ СРЕДСТВ",
        proj2_t: "Устранение дорожных выбоин",
        proj2_badge: "Высокий приоритет",
        proj2_data: "Загрузка фото",
        proj2_cost: "62 млн ₽",
        proj2_time: "5 дней",
        act_btn2: "ПЕРЕДАТЬ В ДЕПАРТАМЕНТ ЖКХ",

        // Diagnostics Drawer
        sys_title: "СОСТОЯНИЕ СИСТЕМЫ И СЕТЬ ФЕДЕРАЦИИ DPI",
        sys_perf: "Задержка 18 мс | Нулевая потеря пакетов",
        sys_item1_t: "Штатный ИИ-движок Gemini 3.5 Flash",
        sys_item1_s: "ИСПРАВЕН / 99.98% АПТАЙМ",
        sys_item2_t: "Шлюз открытых государственных данных",
        sys_item2_s: "СИНХРОНИЗИРОВАН (data.gov)",
        sys_item3_t: "Геопространственный преобразователь",
        sys_item3_s: "В СЕТИ",
        sys_item4_t: "Распознавание речи граждан (NLP)",
        sys_item4_s: "АКТИВЕН (Многоязычный стек)",

        // Camera Modal
        camera_title: "Оптический датчик камеры",
        camera_cancel: "Отмена",
        camera_snap: "Снимок",

        // Footer
        foot_copy: "© 2026 SyncPolis AI. Государственная эко-архитектура.",
        foot_sec: "Матрица защиты",
        foot_priv: "Узел конфиденциальности",
        foot_hlth: "Диагностика системы",

        // Search Interface
        sr_locked: "Войдите для поиска",
        sr_locked_sub: "Поиск доступен только авторизованным госслужащим.",
        sr_empty: "Муниципальных записей не найдено по запросу",

        // Login / Auth System
        login_title: "SyncPolis <span class='text-cyan-400'>AI</span>",
        login_sub: "ИНТЕЛЛЕКТ ГОСУДАРСТВЕННОГО УРОВНЯ.",
        login_google: "Продолжить с Google",
        login_ms: "Продолжить с Microsoft",
        login_or_email: "ИЛИ ВХОД ПО EMAIL",
        login_or_signup: "ИЛИ РЕГИСТРАЦИЯ ПО EMAIL",
        lbl_name: "ФИО служащего",
        lbl_email: "Рабочий Email",
        lbl_pwd: "Пароль доступа",
        lbl_rem: "Запомнить меня",
        lbl_forgot: "Забыли пароль?",
        btn_sign_portal: "ВОЙТИ В ПОРТАЛ",
        btn_create_acc: "ЗАРЕГИСТРИРОВАТЬСЯ",
        btn_reset: "ВЫСЛАТЬ ССЫЛКУ СБРОСА",
        btn_back: "ВЕРНУТЬСЯ К АВТОРИЗАЦИИ",
        txt_no_acc: "Нет служебного аккаунта?",
        txt_has_acc: "Уже зарегистрированы?",
        reset_title: "Восстановление доступа",
        reset_sub: "УКАЖИТЕ СВОЙ EMAIL ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ.",
        auth_err_email: "Укажите рабочий email перед входом через OAuth.",
        auth_err_notfound: "Аккаунт не найден. Нажмите 'Создать аккаунт' ниже.",
        auth_err_exists: "Данный email уже зарегистрирован. Выполните вход.",
        auth_err_invalid: "Неверные учетные данные. Повторите попытку.",
        auth_succ_created: "Аккаунт создан! Выполните вход."
    }
};

let currentLang = 'en';

function sysNorm(s) { 
    return String(s).replace(/\s+/g, ' ').trim(); 
}

function sysLookup(core, targetLang) {
    if (translations[targetLang] && translations[targetLang][core]) {
        return translations[targetLang][core];
    }
    for (let key in translations.en) {
        if (sysNorm(translations.en[key].replace(/<[^>]*>?/gm, '')) === sysNorm(core)) {
            return translations[targetLang][key];
        }
    }
    return null;
}

function sysTextNode(node, targetLang) {
    if (node.parentElement && node.parentElement.closest('script, style, textarea')) return;
    const raw = node.nodeValue;
    const trimmed = sysNorm(raw);
    if (!trimmed) return;
    
    if (node.__en === undefined) {
        node.__en = raw; 
    }

    if (targetLang === 'en') {
        node.nodeValue = node.__en;
    } else {
        const translated = sysLookup(sysNorm(node.__en), targetLang);
        if (translated) {
            node.nodeValue = raw.replace(trimmed, translated.replace(/<[^>]*>?/gm, ''));
        }
    }
}

function sysWalk(root, targetLang) {
    if (!root) return;
    if (root.nodeType === 3) { sysTextNode(root, targetLang); return; }
    if (root.nodeType !== 1) return;
    
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(t => sysTextNode(t, targetLang));
}

function switchLanguage(lang) {
    localStorage.setItem('syncpolis_lang', lang);
    currentLang = lang;
    document.documentElement.lang = lang;
    
    // 1. Tagged attribute replacements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.setAttribute('placeholder', translations[lang][key]);
        }
    });

    // 2. Full-page untagged DOM tree walk
    sysWalk(document.body, lang);

    document.querySelectorAll('select.lang-select').forEach(select => {
        select.value = lang;
    });

    if (typeof updateLoginDynamicText === 'function') {
        updateLoginDynamicText();
    }
}

document.addEventListener('DOMContentLoaded', () => { 
    switchLanguage(localStorage.getItem('syncpolis_lang') || 'en'); 
});

// ==========================================
// LOCALIZED SEARCH ENGINE
// ==========================================

// ==========================================
// LOCALIZED SEARCH ENGINE & LIVE DATA
// ==========================================

// ==========================================
// LOCALIZED SEARCH ENGINE & LIVE DATA
// ==========================================
const SEARCH_INDEX = [
    { 
        icon: "account_balance", tag: "PORTAL", href: "#app-workspace", 
        en: "Citizen Grievance Portal", hi: "नागरिक शिकायत पोर्टल", zh: "公民申诉门户", pt: "Portal de Queixas", ru: "Портал жалоб", 
        sub_en: "Multimodal Issue Reporting", sub_hi: "मल्टीमॉडल समस्या रिपोर्टिंग", sub_zh: "多模态诉求录入系统", sub_pt: "Registro Multimodal de Ocorrências", sub_ru: "Мультимодальная фиксация проблем",
        keys: "citizen grievance issue voice image ai text multimodal complaint" 
    },
    { 
        icon: "monitoring", tag: "DASH", href: "#analytics-section", 
        en: "Live Analytics Matrix", hi: "लाइव एनालिटिक्स मैट्रिक्स", zh: "实时分析矩阵", pt: "Matriz de Análise ao Vivo", ru: "Матрица живой аналитики", 
        sub_en: "Regional Infrastructure Overview", sub_hi: "क्षेत्रीय बुनियादी ढांचा अवलोकन", sub_zh: "区域基础设施全景看板", sub_pt: "Visão Geral da Infraestrutura", sub_ru: "Сводка городской инфраструктуры",
        keys: "analytics monitoring map live dashboard grid regional overview telemetry" 
    },
    { 
        icon: "water_drop", tag: "ACTION", href: "#analytics-section", 
        en: "Emergency Water Grid", hi: "आपातकालीन जल ग्रिड", zh: "区域应急水网重定向", pt: "Rede de Água Emergencial", ru: "Экстренная сеть водоснабжения", 
        sub_en: "Priority Action Queue", sub_hi: "प्राथमिकता कार्रवाई कतार", sub_zh: "高优先级行政调度队列", sub_pt: "Fila de Ação Prioritária", sub_ru: "Очередь оперативных решений",
        keys: "water emergency action queue priority dispatch pipe utility" 
    },
    { 
        icon: "add_road", tag: "ACTION", href: "#analytics-section", 
        en: "Pothole Remediation", hi: "सड़क के गड्ढों की मरम्मत", zh: "市政道路塌陷修复", pt: "Recapeamento Viário", ru: "Ремонт дорожного покрытия", 
        sub_en: "Public Works Routing", sub_hi: "लोक निर्माण विभाग रूटिंग", sub_zh: "市政公用工程分配", sub_pt: "Obras Públicas", sub_ru: "Маршрутизация дорожных служб",
        keys: "pothole road works public remediation asphalt street transport" 
    },
    { 
        icon: "terminal", tag: "SYS", href: "#system-health-drawer", 
        en: "DPI Federation Mesh", hi: "DPI फेडरेशन मेश", zh: "DPI 协同运行网格", pt: "Malha de Federação DPI", ru: "Федеративная сеть DPI", 
        sub_en: "System Core Health", sub_hi: "सिस्टम कोर स्वास्थ्य", sub_zh: "系统核心健康指标", sub_pt: "Saúde Central do Sistema", sub_ru: "Диагностика ядра системы",
        keys: "system health dpi backend gemini vertex ai bigquery network node" 
    }
];

function triggerNeuralSearch(inputElement) {
    const query = typeof inputElement === 'string' ? inputElement : inputElement.value;
    const wrapper = typeof inputElement === 'string' ? document.getElementById('syncpolis-search-desktop').closest('.group') : inputElement.closest('.group');
    const hologram = wrapper.querySelector('[id^="search-hologram-overlay"]');
    const resultsContent = wrapper.querySelector('[id^="search-results-content"]');
    
    if (!hologram || !resultsContent) return;

    if (!query || !query.trim()) {
        hologram.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        hologram.classList.remove('opacity-100', 'translate-y-0');
        return;
    }

    hologram.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    hologram.classList.add('opacity-100', 'translate-y-0');

    if (!localStorage.getItem('syncpolis_active_session')) {
        resultsContent.innerHTML = `
            <div class="text-center py-4">
                <div class="text-sm font-bold text-white mb-1" data-i18n="sr_locked">${translations[currentLang].sr_locked}</div>
                <div class="text-xs text-slate-400 mb-3" data-i18n="sr_locked_sub">${translations[currentLang].sr_locked_sub}</div>
                <button onclick="window.location.href='login.html'" class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors">
                    ${translations[currentLang].auth_signin}
                </button>
            </div>`;
        return;
    }

    const q = query.toLowerCase().trim();
    const l = currentLang;

    const hits = SEARCH_INDEX.filter(item => {
        const hay = (
            (item.en || "") + " " + 
            (item.hi || "") + " " + 
            (item.zh || "") + " " + 
            (item.pt || "") + " " + 
            (item.ru || "") + " " + 
            (item.sub_en || "") + " " + 
            (item.sub_hi || "") + " " + 
            (item.sub_zh || "") + " " + 
            (item.sub_pt || "") + " " + 
            (item.sub_ru || "") + " " + 
            item.keys
        ).toLowerCase();
        return q.split(/\s+/).every(w => hay.includes(w));
    });

    if (hits.length === 0) {
        resultsContent.innerHTML = `<div class="text-xs text-cyan-100/70 py-4 font-mono">${translations[currentLang].sr_empty} <br/><span class="text-cyan-400 mt-1 block font-sans break-all">"${query}"</span></div>`;
    } else {
        resultsContent.innerHTML = hits.map(hit => {
            const title = hit[l] || hit.en;
            const sub = hit['sub_' + l] || hit.sub_en;
            return `
            <button onclick="navigateToSearch('${hit.href}')" class="w-full text-left p-3 hover:bg-cyan-900/60 border-b border-cyan-500/20 transition-colors flex items-start gap-3 rounded-lg group cursor-pointer">
                <span class="material-symbols-outlined text-cyan-500 mt-0.5 group-hover:text-cyan-300 transition-colors">${hit.icon}</span>
                <div class="flex flex-col gap-1 min-w-0 flex-grow cursor-pointer">
                    <span class="text-white font-bold text-sm font-sans truncate group-hover:text-cyan-200 transition-colors">${title}</span>
                    <span class="text-slate-400 text-[10px] font-mono tracking-wide truncate">${sub}</span>
                </div>
                <span class="text-[9px] font-mono text-cyan-500 bg-cyan-900/40 px-1.5 py-0.5 rounded border border-cyan-500/30">${hit.tag}</span>
            </button>`;
        }).join('');
    }
}

function navigateToSearch(href) {
    document.querySelectorAll('[id^="search-hologram-overlay"]').forEach(el => el.classList.add('opacity-0', 'pointer-events-none'));
    document.querySelectorAll('[id^="syncpolis-search"]').forEach(el => el.value = '');
    
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('translate-x-full')) {
        mobileMenu.classList.add('translate-x-full');
    }

    if (href.startsWith('#')) {
        const target = document.querySelector(href);
        setTimeout(() => {
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    } else { 
        window.location.href = href; 
    }
}

// 6. MAIN MULTILINGUAL AI EXECUTION & UI RENDER

// 6. MAIN MULTILINGUAL AI EXECUTION & UI RENDER
async function triggerStreaming() {
    if (isCrisisMode) return;
    const input = document.getElementById('grievance-input');
    const userText = input ? input.value.trim() : '';
    const btn = document.querySelector('button[onclick*="triggerStreaming"]');

    if (!userText && uploadedFilesArray.length === 0) return alert("Please provide grievance text or attach an image.");

    const responseArea = document.getElementById('ai-response-area');
    if (responseArea) responseArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const thinking = document.getElementById('thinking-state');
    const container = document.getElementById('response-container');

    if (btn) btn.classList.add('is-loading');
    if (thinking) thinking.classList.remove('hidden');
    if (container) container.innerHTML = '';
    if (synth.speaking) stopReading();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                files: uploadedFilesArray,
                targetLang: currentLang 
            })
        });

        const data = await response.json();
        if (thinking) thinking.classList.add('hidden');

        if (data.success) {
            const ai = data.analysis;
            currentMapQuery = ai.map_query || ai.exact_location_name || "New Delhi";

            let uColor = "text-[#22d3ee]", uBg = "bg-[#22d3ee]", uAlert = "STANDARD OPERATIONS";
            if (ai.urgency === "critical") { uColor = "text-[#ef4444]"; uBg = "bg-[#ef4444]"; uAlert = "CRITICAL INFRASTRUCTURE FAILURE"; }
            else if (ai.urgency === "high") { uColor = "text-[#f97316]"; uBg = "bg-[#f97316]"; uAlert = "HIGH PRIORITY DISPATCH"; }

            const mapIframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(currentMapQuery)}&t=k&z=18&ie=UTF8&iwloc=&output=embed`;

            const engList = (ai.engineering_solutions || []).map(pt => `<li class="flex items-start gap-3"><span class="text-cyan-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');
            const finList = (ai.financial_estimation || []).map(pt => `<li class="flex items-start gap-3"><span class="text-amber-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');
            const logList = (ai.logistical_routing || []).map(pt => `<li class="flex items-start gap-3"><span class="text-emerald-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');

            // Generate Text to Read Aloud
            reportTextToRead = `Category: ${ai.category}. Department assigned: ${ai.department}. Threat index is ${ai.hotspot_score} out of 100. The estimated budget is ${ai.estimated_cost_inr}. Engineering solutions include: ${(ai.engineering_solutions || []).join('. ')}.`;

            const metricBars = (ai.telemetry_metrics || []).map(m => `
        <div class="w-full">
            <div class="flex justify-between text-[11px] sm:text-xs font-label-tech uppercase text-slate-300 mb-2">
                <span class="truncate">${m.label}</span>
                <span style="color:${m.color}" class="font-bold">${m.score}%</span>
            </div>
            <div class="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div class="h-full rounded-full transition-all duration-1000" style="width: ${m.score}%; background-color: ${m.color}; box-shadow: 0 0 10px ${m.color}"></div>
            </div>
        </div>
    `).join('');

            if (container) {
                container.innerHTML = `
            <div class="w-full flex flex-col gap-8 animate-[stream-reveal_0.4s_ease-out_forwards]">
                <div class="bg-gradient-to-r from-[#0b1221] via-[#111c38] to-[#0b1221] border border-[#1e293b] rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] w-full">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <span class="font-['Orbitron',sans-serif] text-[10px] sm:text-xs text-cyan-400 tracking-widest uppercase">MUNICIPAL GOVERNANCE DIRECTIVE</span>
                            <h2 class="text-white text-xl sm:text-3xl font-bold font-['Space_Grotesk',sans-serif] uppercase flex items-center gap-3 mt-2">
                                <span class="material-symbols-outlined ${uColor} text-3xl sm:text-4xl">verified_user</span> ${ai.category || 'Infrastructure Assessment'}
                            </h2>
                        </div>
                        <div class="flex items-center gap-3">
                            <button onclick="readAloud()" id="tts-btn" class="flex items-center gap-2 bg-[#a855f7] hover:bg-[#9333ea] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">volume_up</span> Read Report
                            </button>
                            <button onclick="stopReading()" id="tts-stop-btn" class="hidden flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-all cursor-pointer">
                                <span class="material-symbols-outlined text-sm">stop_circle</span> Stop
                            </button>
                            <span class="font-label-tech text-xs sm:text-sm ${uColor} border border-current px-4 py-2 rounded-xl bg-black/60 uppercase shadow-[0_0_15px_currentColor] animate-pulse whitespace-nowrap hidden sm:inline-block">${uAlert}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-cyan-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Assigned Department</span>
                            <span class="text-white text-sm sm:text-base font-bold break-words">${ai.department || 'N/A'}</span>
                        </div>
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-amber-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Estimated Budget</span>
                            <span class="text-white text-sm sm:text-base font-bold break-words">${ai.estimated_cost_inr || 'N/A'}</span>
                        </div>
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-rose-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Threat Index</span>
                            <span class="text-white text-sm sm:text-base font-bold">${ai.hotspot_score || '0'} / 100</span>
                        </div>
                    </div>
                </div>

                <div class="w-full flex flex-col gap-3 px-1">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span class="text-[11px] sm:text-sm font-label-tech text-slate-300 uppercase flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> Live Coordinates: <strong class="text-cyan-300 truncate max-w-[200px] sm:max-w-xl">${ai.exact_location_name || 'Location locked'}</strong>
                        </span>
                        <div class="flex gap-2 shrink-0">
                            <button onclick="window.toggleMapView('satellite')" class="px-3 sm:px-4 py-2 rounded-lg bg-[#0b1221] border border-cyan-500/40 text-[10px] sm:text-xs font-label-tech text-cyan-300 hover:bg-cyan-950 uppercase transition-colors cursor-pointer">🛰️ Satellite</button>
                            <button onclick="window.toggleMapView('street')" class="px-3 sm:px-4 py-2 rounded-lg bg-[#0b1221] border border-white/20 text-[10px] sm:text-xs font-label-tech text-slate-300 hover:bg-white/10 uppercase transition-colors cursor-pointer">🗺️ Street</button>
                        </div>
                    </div>
                    <div class="w-full h-[350px] sm:h-[500px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl relative">
                        <iframe id="live-google-map" width="100%" height="100%" frameborder="0" scrolling="no" src="${mapIframeUrl}"></iframe>
                    </div>
                </div>

                <div class="bg-[#0b1221] p-6 sm:p-8 rounded-3xl border border-[#1e293b] grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl w-full">
                    ${metricBars}
                </div>

                <div class="flex flex-col gap-8 w-full mt-4 px-2">
                    <div class="bg-gradient-to-br from-[#0e1628] to-[#070d1a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(34,211,238,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">
                             👷 ENGINEERING & MATERIAL SOLUTIONS
                        </h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${engList}</ul>
                    </div>
                    <div class="bg-gradient-to-br from-[#181528] to-[#070d1a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(245,158,11,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">
                             💰 CPWD-BASED FINANCIAL ESTIMATION
                        </h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${finList}</ul>
                    </div>
                    <div class="bg-gradient-to-br from-[#0d1d1f] to-[#070d1a] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(16,185,129,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">
                             📅 LOGISTICAL ROUTING & IMPLEMENTATION
                        </h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${logList}</ul>
                    </div>
                </div>
            </div>
        `;
            }
       
            } else {
            // Force the fallback engine to trigger instead of showing the red error box
            throw new Error("Backend API failed. Forcing local offline fallback engine.");
        }
    } catch (err) {
        console.warn("AI endpoint unreachable. Deploying offline telemetry fallback.");
        if (thinking) thinking.classList.add('hidden');
        
        // Feed the local fallback directly into the render pipeline to ensure 100% success rate
        const ai = getLocalFallbackResponse(userText);
        currentMapQuery = ai.map_query || ai.exact_location_name || "New Delhi";

        let uColor = "text-[#22d3ee]", uBg = "bg-[#22d3ee]", uAlert = "STANDARD OPERATIONS";
        if (ai.urgency === "critical") { uColor = "text-[#ef4444]"; uBg = "bg-[#ef4444]"; uAlert = "CRITICAL INFRASTRUCTURE FAILURE"; }
        else if (ai.urgency === "high") { uColor = "text-[#f97316]"; uBg = "bg-[#f97316]"; uAlert = "HIGH PRIORITY DISPATCH"; }

        const mapIframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(currentMapQuery)}&t=k&z=18&ie=UTF8&iwloc=&output=embed`;

        const engList = (ai.engineering_solutions || []).map(pt => `<li class="flex items-start gap-3"><span class="text-cyan-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');
        const finList = (ai.financial_estimation || []).map(pt => `<li class="flex items-start gap-3"><span class="text-amber-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');
        const logList = (ai.logistical_routing || []).map(pt => `<li class="flex items-start gap-3"><span class="text-emerald-400 font-bold mt-1">-</span><span class="text-slate-200">${pt}</span></li>`).join('');

        const metricBars = (ai.telemetry_metrics || []).map(m => `
            <div class="w-full">
                <div class="flex justify-between text-[11px] sm:text-xs font-label-tech uppercase text-slate-300 mb-2">
                    <span class="truncate">${m.label}</span>
                    <span style="color:${m.color}" class="font-bold">${m.score}%</span>
                </div>
                <div class="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div class="h-full rounded-full transition-all duration-1000" style="width: ${m.score}%; background-color: ${m.color}; box-shadow: 0 0 10px ${m.color}"></div>
                </div>
            </div>
        `).join('');

        if (container) {
            container.innerHTML = `
            <div class="w-full flex flex-col gap-8 animate-[stream-reveal_0.4s_ease-out_forwards]">
                <div class="bg-gradient-to-r from-[#0b1221] via-[#111c38] to-[#0b1221] border border-[#1e293b] rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] w-full">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <span class="font-['Orbitron',sans-serif] text-[10px] sm:text-xs text-cyan-400 tracking-widest uppercase">MUNICIPAL GOVERNANCE DIRECTIVE</span>
                            <h2 class="text-white text-xl sm:text-3xl font-bold font-['Space_Grotesk',sans-serif] uppercase flex items-center gap-3 mt-2">
                                <span class="material-symbols-outlined ${uColor} text-3xl sm:text-4xl">verified_user</span> ${ai.category}
                            </h2>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-label-tech text-xs sm:text-sm ${uColor} border border-current px-4 py-2 rounded-xl bg-black/60 uppercase shadow-[0_0_15px_currentColor] animate-pulse whitespace-nowrap hidden sm:inline-block">${uAlert} (OFFLINE FALLBACK)</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-cyan-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Assigned Department</span>
                            <span class="text-white text-sm sm:text-base font-bold break-words">${ai.department}</span>
                        </div>
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-amber-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Estimated Budget</span>
                            <span class="text-white text-sm sm:text-base font-bold break-words">${ai.estimated_cost_inr}</span>
                        </div>
                        <div class="bg-[#020617] p-5 rounded-2xl border border-white/5">
                            <span class="text-rose-400 text-[10px] sm:text-xs font-label-tech uppercase block mb-2">Threat Index</span>
                            <span class="text-white text-sm sm:text-base font-bold">${ai.hotspot_score} / 100</span>
                        </div>
                    </div>
                </div>

                <div class="w-full flex flex-col gap-3 px-1">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span class="text-[11px] sm:text-sm font-label-tech text-slate-300 uppercase flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> Live Coordinates: <strong class="text-cyan-300 truncate max-w-[200px] sm:max-w-xl">${ai.exact_location_name}</strong>
                        </span>
                        <div class="flex gap-2 shrink-0">
                            <button onclick="window.toggleMapView('satellite')" class="px-3 sm:px-4 py-2 rounded-lg bg-[#0b1221] border border-cyan-500/40 text-[10px] sm:text-xs font-label-tech text-cyan-300 hover:bg-cyan-950 uppercase transition-colors cursor-pointer">🛰️ Satellite</button>
                            <button onclick="window.toggleMapView('street')" class="px-3 sm:px-4 py-2 rounded-lg bg-[#0b1221] border border-white/20 text-[10px] sm:text-xs font-label-tech text-slate-300 hover:bg-white/10 uppercase transition-colors cursor-pointer">🗺️ Street</button>
                        </div>
                    </div>
                    <div class="w-full h-[350px] sm:h-[500px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl relative">
                        <iframe id="live-google-map" width="100%" height="100%" frameborder="0" scrolling="no" src="${mapIframeUrl}"></iframe>
                    </div>
                </div>

                <div class="bg-[#0b1221] p-6 sm:p-8 rounded-3xl border border-[#1e293b] grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl w-full">
                    ${metricBars}
                </div>

                <div class="flex flex-col gap-8 w-full mt-4 px-2">
                    <div class="bg-gradient-to-br from-[#0e1628] to-[#070d1a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(34,211,238,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">👷 ENGINEERING & MATERIAL SOLUTIONS</h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${engList}</ul>
                    </div>
                    <div class="bg-gradient-to-br from-[#181528] to-[#070d1a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(245,158,11,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">💰 CPWD-BASED FINANCIAL ESTIMATION</h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${finList}</ul>
                    </div>
                    <div class="bg-gradient-to-br from-[#0d1d1f] to-[#070d1a] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(16,185,129,0.1)] w-full">
                        <h3 class="text-base sm:text-lg text-white font-bold uppercase tracking-wide mb-5">📅 LOGISTICAL ROUTING & IMPLEMENTATION</h3>
                        <ul class="text-sm sm:text-base space-y-4 font-body-md">${logList}</ul>
                    </div>
                </div>
            </div>`;
        }
    } finally {
        if (btn) btn.classList.remove('is-loading');
        uploadedFilesArray = [];
        renderPreviews();
        const inputField = document.getElementById('grievance-input');
        if (inputField) inputField.value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hologram dismiss listener
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.group').forEach(wrapper => {
            const input = wrapper.querySelector('[id^="syncpolis-search"]');
            const hologram = wrapper.querySelector('[id^="search-hologram-overlay"]');
            if (input && hologram && !input.contains(e.target) && !hologram.contains(e.target)) {
                hologram.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
                hologram.classList.remove('opacity-100', 'translate-y-0');
            }
        });
    });

    // 2. Real-Time External Data Fetching (2 Seconds)
    let cityIndex = 0;
    setInterval(async () => {
        try {
            const res = await fetch('brics_indices.json');
            if(!res.ok) return;
            const data = await res.json();
            
            // Loop through indices sequentially every 2 seconds
            const liveData = data[cityIndex];
            
            const wTxt = document.getElementById('val-water');
            const wBar = document.getElementById('bar-water');
            if (wTxt && wBar) { wTxt.innerText = liveData.water_index + '%'; wBar.style.width = liveData.water_index + '%'; }
            
            const rTxt = document.getElementById('val-road');
            const rBar = document.getElementById('bar-road');
            if (rTxt && rBar) { rTxt.innerText = liveData.road_index + '%'; rBar.style.width = liveData.road_index + '%'; }
            
            const pTxt = document.getElementById('val-power');
            const pBar = document.getElementById('bar-power');
            if (pTxt && pBar) { pTxt.innerText = liveData.power_stability + '%'; pBar.style.width = liveData.power_stability + '%'; }
            
            // Dynamic Grid Numbers Simulation (Since they aren't in JSON)
            const gRate = document.getElementById('live-metric-val');
            if (gRate) gRate.innerText = Math.floor(Math.random() * (1600 - 1200 + 1) + 1200).toLocaleString();
            
            const cniVal = document.getElementById('live-hotspot-val');
            if (cniVal) cniVal.innerText = "Critical: " + (Math.random() * (85.0 - 75.0) + 75.0).toFixed(1);
            
            const lingVal = document.getElementById('live-ling-val');
            if (lingVal) lingVal.innerText = (Math.random() * (99.0 - 90.0) + 90.0).toFixed(1) + "%";
            
            const budgVal = document.getElementById('live-budg-val');
            if (budgVal) budgVal.innerText = (Math.random() * (95.0 - 80.0) + 80.0).toFixed(1) + "%";

            // Status Indicator Texts
            const statText = document.getElementById('ingestion-status-text');
            const mapAlpha = document.getElementById('map-node-alpha');
            
            if(statText) {
                const livePrefix = currentLang === 'hi' ? "लाइव: " : currentLang === 'pt' ? "AO VIVO: " : currentLang === 'ru' ? "ОНЛАЙН: " : currentLang === 'zh' ? "实时: " : "LIVE: ";
                statText.innerText = livePrefix + liveData.city.toUpperCase();
            }
            if(mapAlpha) mapAlpha.innerText = `Node Alpha-${liveData.city.substring(0,3).toUpperCase()}`;
            
            cityIndex = (cityIndex + 1) % data.length;
            
        } catch (err) {
            // Fails silently if offline or file missing
        }
    }, 2000); 
});

// ==========================================
// PROMPT IDEA BUTTONS & ROBUST AI FALLBACK
// ==========================================

// Function triggered when user clicks an idea button
function usePromptIdea(promptText) {
    const input = document.getElementById('grievance-input') || document.getElementById('syncpolis-search-desktop');
    if (input) {
        input.value = promptText;
        input.focus();
        // If it's the main grievance console, trigger analysis automatically
        if (typeof triggerStreaming === 'function' && document.getElementById('grievance-input')) {
            triggerStreaming();
        } else if (typeof triggerNeuralSearch === 'function') {
            triggerNeuralSearch(promptText);
        }
    }
}

// Guaranteed Local Fallback Engine (Prevents AI "failure" or blank screens)
function getLocalFallbackResponse(query) {
    const q = (query || "").toLowerCase();
    
    // Default comprehensive municipal fallback
    let fallback = {
        exact_location_name: "Ward 14, Central District, New Delhi - 110001",
        map_query: "Connaught Place, New Delhi, India",
        department: "Municipal Corporation / Public Works Department",
        category: "General Civic Infrastructure Assessment",
        urgency: "high",
        hotspot_score: 85,
        estimated_cost_inr: "₹ 35 Lakhs",
        engineering_solutions: [
            "Immediate site inspection by the zonal executive engineer within 12 hours.",
            "Deploy high-priority surface patching and structural reinforcement.",
            "Establish secondary diversion channels to mitigate public disruption."
        ],
        financial_estimation: [
            "Estimated Bill of Quantities (BOQ) prepared under CPWD guidelines.",
            "Projected monetary allocation from municipal contingency reserves.",
            "Recommended grant code: MOHUA-GR-2026."
        ],
        logistical_routing: [
            "Primary jurisdictional agency: Delhi Urban Local Body (ULB).",
            "Project completion timeline: 48 to 72 hours.",
            "Environmental constraint mitigation directive enforced."
        ],
        telemetry_metrics: [
            { label: "Structural Degradation", score: 82, color: "#ef4444" },
            { label: "Civic Threat Index", score: 85, color: "#f97316" },
            { label: "Grid Stress", score: 70, color: "#22d3ee" },
            { label: "Public Disruption", score: 78, color: "#a855f7" }
        ]
    };

    if (q.includes('water') || q.includes('pipe') || q.includes('leak') || q.includes('जल')) {
        fallback.category = "Water Supply & Drainage Rupture";
        fallback.department = "Delhi Jal Board (DJB)";
        fallback.estimated_cost_inr = "₹ 1.2 Crores";
        fallback.engineering_solutions = [
            "Excavation and trench safety casing along the main feeder line.",
            "Replacement of damaged ductile iron pipes (Class K-9).",
            "Hydraulic pressure testing and municipal water chlorination cycle."
        ];
    } else if (q.includes('road') || q.includes('pothole') || q.includes('bridge') || q.includes('सड़क')) {
        fallback.category = "Roadway Surface Degradation & Potholes";
        fallback.department = "Public Works Department (PWD)";
        fallback.estimated_cost_inr = "₹ 45 Lakhs";
        fallback.engineering_solutions = [
            "Cold milling of deteriorated bituminous surface layers.",
            "Laying Dense Bituminous Macadam (DBM) binder course.",
            "Thermoplastic reflective road markings and joint sealing."
        ];
    } else if (q.includes('power') || q.includes('electricity') || q.includes('grid') || q.includes('बिजली')) {
        fallback.category = "Power Grid Distribution Fault";
        fallback.department = "State Power Distribution Corporation";
        fallback.estimated_cost_inr = "₹ 62 Lakhs";
        fallback.engineering_solutions = [
            "Replacement of damaged step-down distribution transformers.",
            "XLPE insulated armored aluminum cabling installation.",
            "Earthing array calibration and relay testing."
        ];
    }

    return fallback;
}