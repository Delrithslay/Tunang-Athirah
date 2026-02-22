// Extracted scripts from invitation HTML
document.addEventListener('DOMContentLoaded', function(){
    // Environment detection (kept) but force phone view per request
    function isWebView() {
        const ua = navigator.userAgent || '';
        const isAndroid = /Android/.test(ua);
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        if (isAndroid && /\bwv\b/.test(ua)) return true;
        if (isIOS && /AppleWebKit/.test(ua) && !/Safari/.test(ua)) return true;
        if (/(FBAN|FBAV|Instagram|Line|Twitter|WeChat)/i.test(ua)) return true;
        return false;
    }

    function detectView() {
        const ua = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua);
        if (isWebView()) return 'webview';
        if (isMobile) return 'phone';
        return 'desktop';
    }

    // Force phone view regardless of environment
    const view = 'phone';
    document.documentElement.setAttribute('data-view', view);
    document.body.classList.add('phone-view');
    // Load YouTube IFrame API
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Player variable must be global for YouTube API callback
    window.player = null;
    window.onYouTubeIframeAPIReady = function() {
        window.player = new YT.Player('player', {
            height: '0',
            width: '0',
            videoId: 'yIzyS9yrgag',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'loop': 1,
                'playlist': 'yIzyS9yrgag'
            },
            events: {
                'onReady': function() {}
            }
        });
    };

    // Start experience: hide overlay and play background audio if available
    window.startExperience = function() {
        const overlay = document.getElementById('music-overlay');
        if(!overlay) return;
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 1000);
        // For phone view we avoid autoplay; if running in other contexts this remains phone
    };

    // Background audio: try local MP3, otherwise synth fallback
    let ambientAudio = null;
    let audioCtx = null;
    let isMuted = false;

    async function tryPlayLocalAudio(){
        const candidates = [
            'music.mp3',
            'Barbie - 12 Dancing Princesses (Theme) [Audio]  Barbie in the 12 Dancing Princesses.mp3'
        ];
        // check both assets/music and assets/images directories (user may have placed MP3 in images)
        const dirs = ['assets/music/', 'assets/images/'];
        for(const name of candidates.concat(['Barbie.mp3'])){
            for(const dir of dirs){
                try{
                    const path = dir + encodeURIComponent(name);
                    const resp = await fetch(path, {method:'HEAD'});
                    if(resp.ok){
                        ambientAudio = new Audio(path);
                        ambientAudio.loop = true;
                        console.log('Found local audio:', path);
                        if(!isMuted) await ambientAudio.play().catch(()=>{});
                        return true;
                    }
                }catch(e){ /* continue to next candidate */ }
            }
        }

        // If not found locally (or hosting changed paths), try raw.githubusercontent.com as a fallback
        try{
            const rawBase = 'https://raw.githubusercontent.com/Delrithslay/Tunang-Athirah/main/';
            const rawDirs = ['assets/music/', 'assets/images/'];
            for(const name of candidates.concat(['Barbie.mp3'])){
                for(const dir of rawDirs){
                    try{
                        const path = rawBase + dir + encodeURIComponent(name);
                        const resp = await fetch(path, {method:'HEAD'});
                        if(resp.ok){
                            ambientAudio = new Audio(path);
                            ambientAudio.loop = true;
                            console.log('Found remote audio via raw.githubusercontent:', path);
                            if(!isMuted) await ambientAudio.play().catch(()=>{});
                            return true;
                        }
                    }catch(e){ /* continue */ }
                }
            }
        }catch(e){ /* ignore */ }
        return false;
    }

    function synthPlayAmbient(){
        if(audioCtx) return; // already playing
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        // two detuned oscillators for gentle pad
        const o1 = audioCtx.createOscillator();
        const o2 = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const lp = audioCtx.createBiquadFilter();
        o1.type = 'sine'; o2.type = 'sine';
        o1.frequency.value = 220; o2.frequency.value = 221.6; // slight detune
        g.gain.value = 0.0001;
        lp.type = 'lowpass'; lp.frequency.value = 800;
        o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(audioCtx.destination);
        o1.start(now); o2.start(now);
        // only ramp up if not muted
        if(!isMuted) g.gain.exponentialRampToValueAtTime(0.07, now + 1.2);
        else g.gain.setValueAtTime(0.0001, now);
        // slow pulsing
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = 0.12;
        lfoGain.gain.value = 0.03;
        lfo.connect(lfoGain); lfoGain.connect(g.gain);
        lfo.start(now);
        // store references so we can stop later
        audioCtx._nodes = {o1,o2,lfo,g,lp};
    }

    function muteAudio(){
        isMuted = true;
        try{ if(ambientAudio){ ambientAudio.pause(); } }catch(e){}
        try{ if(audioCtx && audioCtx._nodes && audioCtx._nodes.g){ audioCtx._nodes.g.gain.setValueAtTime(0, audioCtx.currentTime); } }catch(e){}
        updateMuteButton();
    }

    function unmuteAudio(){
        isMuted = false;
        try{
            if(ambientAudio){ ambientAudio.play().catch(()=>{}); updateMuteButton(); return; }
            if(!audioCtx) synthPlayAmbient();
            else if(audioCtx && audioCtx._nodes && audioCtx._nodes.g){ audioCtx._nodes.g.gain.setValueAtTime(0.07, audioCtx.currentTime); }
        }catch(e){}
        updateMuteButton();
    }

    function updateMuteButton(){
        const btn = document.getElementById('muteBtn');
        if(!btn) return;
        const unmuteSVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="#ffffff"/><path d="M16.5 7.5c.9.9 1.5 2.1 1.5 3.5s-.6 2.6-1.5 3.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const muteSVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="#ffffff"/><path d="M18 6L6 18" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6l12 12" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.innerHTML = isMuted ? muteSVG : unmuteSVG;
        btn.setAttribute('aria-pressed', String(isMuted));
    }

    function showMuteButton(){
        const btn = document.getElementById('muteBtn');
        if(!btn) return;
        btn.classList.remove('hidden');
        // ensure update reflects correct state and animate in
        setTimeout(()=>{ btn.classList.add('show'); updateMuteButton(); }, 40);
    }

    function stopAmbient(){
        try{
            if(ambientAudio){ ambientAudio.pause(); ambientAudio.currentTime = 0; ambientAudio = null; }
            if(audioCtx && audioCtx._nodes){
                const {o1,o2,lfo,g,lp} = audioCtx._nodes;
                try{o1.stop();}catch(e){}
                try{o2.stop();}catch(e){}
                try{lfo.stop();}catch(e){}
                try{audioCtx.close();}catch(e){}
                audioCtx = null;
            }
        }catch(e){}
    }

    // Update startExperience to also start ambient audio (local file preferred)
    const originalStart = window.startExperience;
    window.startExperience = async function(){
        originalStart();
        // hide the opening sun/logo when opening the card
        try{
            const sun = document.querySelector('.opening-sun');
            if(sun){ sun.classList.add('fade-out'); setTimeout(()=>{ try{ sun.style.display='none' }catch(e){} }, 700); }
        }catch(e){}
        // try local mp3 first (only play if not muted)
        if(!isMuted){
            const ok = await tryPlayLocalAudio();
            if(!ok) synthPlayAmbient();
        }

        // After the opening card hides, spawn hero decorations and show mute control
        setTimeout(()=>{
            try{ createButterflies('hero-butterfly-container', 6); }catch(e){}
            try{ createPixieDust('hero-pixie-container', 60); }catch(e){}
            try{
                // add some continuous sparkles for a pleasant effect
                for(let i=0;i<40;i++) createContinuousSparkle();
            }catch(e){}
            // show the mute control shortly after overlay dismissal
            setTimeout(()=>{ try{ showMuteButton(); }catch(e){} }, 220);
        }, 700);
    };

    // Pixie dust: create floating particles inside the opening card
    function createPixieDust(containerId, count){
        const container = document.getElementById(containerId);
        if(!container) return;
        const colors = ['pink','gold','white'];
        for(let i=0;i<count;i++){
            const p = document.createElement('div');
            p.className = 'pixie-particle ' + colors[Math.floor(Math.random()*colors.length)];
            const size = Math.random()*5 + 2; // 2-7px
            p.style.width = p.style.height = size + 'px';
            const left = Math.random()*100;
            const startY = Math.random()*80 + 10; // start lower in card
            p.style.left = left + '%';
            p.style.top = startY + '%';
            const duration = (Math.random()*6 + 6).toFixed(2) + 's';
            const delay = (Math.random()*-8).toFixed(2) + 's';
            p.style.animation = `pixie-float ${duration} linear ${delay} infinite, pixie-twinkle ${ (Math.random()*3+2).toFixed(2) }s ease-in-out ${Math.random()*-2}s infinite`;
            if(Math.random() > 0.8) p.classList.add('sparkle');
            container.appendChild(p);
            // remove after long time to avoid DOM bloat (let loop maintain visuals)
            (function(el){ setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 60000); })(p);
        }
    }

    // Initialize pixie dust inside opening card (reduced density)
    createPixieDust('pixie-container', 30);

    // Try to locate a Barbie background image in assets/images and apply it
    async function setBarbieBackground(){
        const overlay = document.querySelector('.castle-overlay');
        if(!overlay) return;
        const candidates = [
            'magical.jpeg',
            'barbie.jpg',
            'barbie.png',
            'Barbie - 12 Dancing Princesses (Theme) [Audio]  Barbie in the 12 Dancing Princesses.jpg',
            'Barbie - 12 Dancing Princesses (Theme) [Audio]  Barbie in the 12 Dancing Princesses.png',
            'barbie-place.jpg',
            'barbie-place.png',
            'scenery.jpg',
            'scenery.png'
        ];
        for(const name of candidates){
            try{
                const path = 'assets/images/' + encodeURIComponent(name);
                const resp = await fetch(path, {method:'HEAD'});
                if(resp.ok){
                    overlay.style.backgroundImage = `url("${path}")`;
                    overlay.style.backgroundSize = 'cover';
                    overlay.style.backgroundPosition = 'center';
                    return;
                }
            }catch(e){ /* ignore and continue */ }
        }
        // no match found; leave current background
    }
    setBarbieBackground();

    // Wire the open button
    const openBtn = document.getElementById('openBtn');
    if(openBtn){ openBtn.addEventListener('click', startExperience); }

    // Wire mute button
    const muteBtn = document.getElementById('muteBtn');
    if(muteBtn){
        muteBtn.addEventListener('click', function(){ if(isMuted) unmuteAudio(); else muteAudio(); });
        updateMuteButton();
    }

    // Sparkle Logic
    const container = document.getElementById('magic-container');
    const sparkleCount = 80; // reduced density for performance

    function initSparkles(){
        for(let i=0;i<sparkleCount;i++) createContinuousSparkle();
    }

    // Butterflies: animated decorative elements inside opening card
    function createButterflies(containerId, count){
        const container = document.getElementById(containerId);
        if(!container) return;
        for(let i=0;i<count;i++){
            const b = document.createElement('div');
            b.className = 'butterfly flap';
            b.style.backgroundImage = 'url("assets/images/butterfly.svg")';
            const left = Math.random()*70 + 10; // percent inside card
            const top = Math.random()*60 + 20;
            b.style.left = left + '%';
            b.style.top = top + '%';
            const duration = (Math.random()*6 + 6).toFixed(2) + 's';
            const delay = (Math.random()*-6).toFixed(2) + 's';
            b.style.animation = `fly-up ${duration} linear ${delay} infinite`;
            container.appendChild(b);
            // cleanup after long time to avoid infinite DOM growth
            (function(el){ setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 120000); })(b);
        }
    }

    function createContinuousSparkle(){
        if(!container) return;
        const sparkle = document.createElement('div');
        sparkle.className = 'continuous-sparkle';
        const size = Math.random()*4 + 1;
        const left = Math.random()*100;
        const speed = Math.random()*10 + 10;
        const drift = (Math.random() - 0.5) * 200;
        const delay = Math.random()*20;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${left}%`;
        sparkle.style.setProperty('--speed', `${speed}s`);
        sparkle.style.setProperty('--drift', `${drift}px`);
        sparkle.style.animationDelay = `-${delay}s`;
        const colors = ['#ffffff', '#fffbe6', '#fff0f6', '#f3e5ab'];
        sparkle.style.background = colors[Math.floor(Math.random()*colors.length)];
        container.appendChild(sparkle);
    }

    initSparkles();
    // spawn butterflies and more pixie dust inside the opening card (moderate)
    createButterflies('butterfly-container', 6);
    // add extra pixie particles
    createPixieDust('pixie-container', 30);

    // Initialize lucide icons
    if(typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
});
