document.addEventListener('DOMContentLoaded', async () => {
    // 1. Haetaan välilehden tiedot heti alussa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Kysytään sivu-skriptiltä (contentScript.js) paikallisen analyysin tiedot
    chrome.tabs.sendMessage(tab.id, { type: "GET_TAB_DATA" }, (data) => {
        if (data) {
            updateUI(data);
        } else {
            // Jos ei saada tietoa, sivu on latautunut hitaasti tai on rikki
            document.getElementById('status').innerText = "Lataa sivu uudelleen analyysia varten.";
        }
    });

    // 2. Kuunnellaan "Syväanalyysi"-nappia
    document.getElementById('deepScanBtn').addEventListener('click', () => {
        const status = document.getElementById('status');
        status.innerText = "Analysoidaan... Odota hetki.";
        
        // Pyydetään sivu-skriptiltä puhdistettu teksti Geminiä varten
        chrome.tabs.sendMessage(tab.id, { type: "GET_TAB_DATA" }, (data) => {
            if (!data || !data.textContent) {
                status.innerText = "Tekstiä ei löytynyt analyysia varten.";
                return;
            }

            // Lähetetään teksti taustaskriptille (background.js) Geminin käsittelyyn
            chrome.runtime.sendMessage({
                type: "START_DEEP_SCAN",
                text: data.textContent
            }, (response) => {
                if (response && response.score) {
                    const apiScore = parseInt(response.score);
                    
                    // Tallennetaan Gemini-tulos välilehtikohtaisesti
                    chrome.storage.local.set({ [`apiScore_${tab.id}`]: apiScore }, () => {
                        // Päivitetään käyttöliittymä uusilla tiedoilla
                        updateUI(data);
                        status.innerText = "Syväanalyysi valmis.";
                    });
                } else {
                    status.innerText = "Virhe Geminin analyysissa.";
                }
            });
        });
    });
});

// FUNKTIO KÄYTTÖLIITTYMÄN PÄIVITTÄMISEEN
function updateUI(data) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.storage.local.get([`apiScore_${tab.id}`], (result) => {
            const local = data.localScore || 0;
            const storedApi = result[`apiScore_${tab.id}`];
            const scanPerformed = (storedApi !== undefined);
            const api = scanPerformed ? parseInt(storedApi) : null;

            // Päivitetään perusmittarit
            document.getElementById('fill').style.width = local + "%";
            document.getElementById('percent').innerText = local + "%";
            
            if (scanPerformed) {
                document.getElementById('api-fill').style.width = api + "%";
                document.getElementById('api-percent').innerText = api + "%";
            }

            const combinedArea = document.getElementById('combined-result');
            const combinedLabel = document.getElementById('combined-percent');

            if (scanPerformed) {
                combinedArea.style.display = "block";
                
                let combined = 0;

                // --- UUSI LASKENTAMALLI ---
                if (api === 0) {
                    // Jos Gemini on 0%, uskotaan sitä ja "vaimennetaan" paikallinen arvio
                    // 50% paikallinen muuttuu tässä esim. 10 prosentiksi
                    combined = Math.round(local * 0.2); 
                } else {
                    // Normaali hybridimalli jos Gemini löysi jotain
                    combined = Math.round((local * 0.4) + (api * 0.6));
                }
                // --------------------------

                combinedLabel.innerText = combined + "%";

                // Värit ja koot
                if (api === 0) {
                    combinedLabel.style.color = "#5cb85c"; // Vihreä 
                    combinedLabel.style.fontSize = "16px"; // 
                } else {
                    combinedLabel.style.fontSize = "22px";
                    combinedLabel.style.color = combined > 70 ? "#d9534f" : (combined > 40 ? "#f0ad4e" : "#5cb85c");
                }
            } else {
                combinedArea.style.display = "none";
            }

            let explanation = "";
            if (data.foundWords > 0) explanation += `Löydetty ${data.foundWords} AI-tunnistetta. `;
            if (data.isFlat) explanation += "Tekstin rytmi on konemaisen tasainen. ";
            document.getElementById('status').innerText = explanation || "Kirjoitusasu vaikuttaa luonnolliselta.";
        });
    });
}