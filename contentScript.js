window.currentTabAnalysis = {
    localScore: 0,
    apiScore: 0,
    imageScore: null,
    foundWords: 0,
    isFlat: false,
    textContent: ""
};

function runFinalAnalysis() {
    const text = document.body.innerText;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const aiPatterns = ["as an ai", "it is important to note", "furthermore", "moreover", "in conclusion"];
    let matches = 0;
    aiPatterns.forEach(p => { if (text.toLowerCase().includes(p)) matches++; });

    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (lengths.length || 1);
    
    const isFlat = variance < 40;
    const score = Math.min(10 + (matches * 30) + (isFlat ? 40 : 0), 100);

    window.currentTabAnalysis.localScore = score;
    window.currentTabAnalysis.foundWords = matches;
    window.currentTabAnalysis.isFlat = isFlat;
    window.currentTabAnalysis.textContent = text.substring(0, 1500);

    updateUnifiedBanner();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_TAB_DATA") {
        sendResponse(window.currentTabAnalysis);
    } 
    else if (request.type === "IMAGE_LOADING") {
        showBanner("⌛ Analysoidaan kuvaa... Odota hetki.", "#333");
    }
    else if (request.type === "IMAGE_RESULT") {
        window.currentTabAnalysis.imageScore = request.score;
        updateUnifiedBanner();
    }
    else if (request.type === "DEEP_SCAN_RESULT") {
        window.currentTabAnalysis.apiScore = request.score;
        updateUnifiedBanner();
    }
});

function updateUnifiedBanner() {
    const data = window.currentTabAnalysis;
    let msgs = [];

    if (data.localScore >= 40 || data.imageScore !== null) msgs.push(`Teksti: ${data.localScore}%`);
    if (data.imageScore !== null) msgs.push(`Kuva: ${data.imageScore}%`);

    if (msgs.length === 0) return;

    // Värilogiikka: Vihreä jos kuva on 0% ja teksti on matala
    let isAi = (data.imageScore !== null && parseInt(data.imageScore) > 20) || data.localScore >= 40;
    let color = isAi ? "#d9534f" : "#5cb85c";
    let prefix = isAi ? "⚠️ AI-Tunnistus" : "✅ Analyysi valmis";

    showBanner(`${prefix} | ${msgs.join(" | ")}`, color);
}

function showBanner(msg, bgColor) {
    let b = document.getElementById("ai-banner");
    if (!b) {
        b = document.createElement("div");
        b.id = "ai-banner";
        b.style = "position:fixed; top:0; left:0; width:100%; color:white; padding:10px; z-index:9999; text-align:center; font-weight:bold; font-family:sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: background 0.5s;";
        document.body.prepend(b);
        document.body.style.marginTop = "45px";
    }
    b.style.background = bgColor;
    b.innerText = msg;
}

setTimeout(runFinalAnalysis, 2000);