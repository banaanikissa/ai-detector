console.log("AI Detector: Tuned-versio aktivoitu!");

function runTunedAnalysis() {
    const text = document.body.innerText;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length < 2) return;

    // 1. LAAJENNETTU SANA-ANALYYSI (Painotetut pisteet)
    const aiPatterns = [
        "as an ai", "delve into", "it is important to note", 
        "comprehensive guide", "furthermore", "moreover", 
        "in conclusion", "tämä on ai-tekstiä"
    ];
    
    let patternScore = 0;
    aiPatterns.forEach(p => {
        const regex = new RegExp(p, 'gi');
        const count = (text.match(regex) || []).length;
        patternScore += (count * 20); // Jokainen osuma nostaa prosenttia 20%
    });

    // 2. RAKENTEELLINEN ANALYYSI (Tasapaksuus / Burstiness)
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    
    // Herkempi varianssi-tunnistus (tekoäly < 25)
    let structuralScore = 0;
    if (variance < 25) {
        structuralScore = 40; // Teksti on hyvin tasapaksua
    } else if (variance < 40) {
        structuralScore = 20; // Hieman epäilyttävää tasaisuutta
    }

    // 3. LOPULLINEN PISTEYTYS
    // Aloitetaan 10% pohjalta, jos tekstiä on tarpeeksi
    let finalScore = 10 + patternScore + structuralScore;
    finalScore = Math.min(finalScore, 100);

    // Tallennus
    chrome.storage.local.set({ aiScore: finalScore, foundWords: Math.floor(patternScore/20) });

    // Näytetään varoitukset jos score > 35%
    if (finalScore > 35) {
        showBanner(finalScore);
        highlightSentences(aiPatterns);
    }
}

function showBanner(score) {
    if (document.getElementById("ai-banner")) document.getElementById("ai-banner").remove();
    const banner = document.createElement("div");
    banner.id = "ai-banner";
    banner.className = "ai-alert-banner"; // Käyttää styles.css määrittelyjä
    banner.innerText = `⚠️ AI DETECTOR: Tekoälyn todennäköisyys ${score}%`;
    document.body.prepend(banner);
    document.body.style.marginTop = "50px";
}

function highlightSentences(patterns) {
    const tags = document.querySelectorAll('p, li, span');
    tags.forEach(el => {
        patterns.forEach(p => {
            if (el.innerText.toLowerCase().includes(p)) {
                el.style.backgroundColor = "rgba(255, 65, 108, 0.2)";
                el.style.borderLeft = "5px solid #ff416c";
            }
        });
    });
}

setTimeout(runTunedAnalysis, 1500);

// As an AI model, it is important to note that this is a comprehensive guide. Furthermore, it is essential to understand the patterns. In conclusion the analysis is complete