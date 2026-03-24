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
        // Haetaan storagesta Gemini-tulos tälle välilehdelle
        chrome.storage.local.get([`apiScore_${tab.id}`], (result) => {
            
            // Paikallisen analyysin tulos sivulta
            const local = data.localScore || 0;
            
            // --- KORJAUS 0% TULOKSEEN ---
            // Jos storedApi on undefined (skannausta ei ole tehty), api on null.
            // Jos storedApi on 0, api on 0.
            const storedApi = result[`apiScore_${tab.id}`];
            const scanPerformed = (storedApi !== undefined);
            const api = scanPerformed ? parseInt(storedApi) : null;
            // ---------------------------

            // Päivitetään paikallinen ja Gemini mittari
            document.getElementById('fill').style.width = local + "%";
            document.getElementById('percent').innerText = local + "%";
            
            // Päivitetään Gemini-mittari vain jos se on skannattu
            if (scanPerformed) {
                document.getElementById('api-fill').style.width = api + "%";
                document.getElementById('api-percent').innerText = api + "%";
            } else {
                // Jos ei skannattu, jätetään nollaksi
                document.getElementById('api-fill').style.width = "0%";
                document.getElementById('api-percent').innerText = "0%";
            }

            const combinedArea = document.getElementById('combined-result');
            const combinedLabel = document.getElementById('combined-percent');
            // - tarvitsemme viitteen otsikkotekstiin "Yhdistetty luottamus..."
            const combinedDesc = combinedArea.querySelector('span');

            // --- YHTEISTULOKSEN NÄYTTÖ & PIENENNYS LOGIIKKA ---
            if (scanPerformed) {
                // Näytetään alue heti, kun analyysi on tehty (vaikka tulos olisi 0%)
                combinedArea.style.display = "block";
                
                // Lasketaan painotettu yhteistulos: 40% paikallinen, 60% Gemini
                const combined = Math.round((local * 0.4) + (api * 0.6));
                combinedLabel.innerText = combined + "%";

                // PYYNTÖ: Hyvin hyvin pieneksi jos Gemini on 0%
                if (api === 0) {
                    // Pienennetään koko laatikko
                    combinedArea.style.padding = "2px 5px";
                    combinedArea.style.marginTop = "5px";
                    
                    // Pienennetään tekstit
                    combinedDesc.style.fontSize = "8px"; // Tiny text
                    combinedLabel.style.fontSize = "10px"; // Tiny number
                    combinedLabel.style.fontWeight = "normal";
                    combinedLabel.style.color = "#999"; // Neutraali harmaa
                } else {
                    // Normaalikokoinen ja väritetty, jos Gemini > 0%
                    // Resetoidaan pienennykset
                    combinedArea.style.padding = "10px";
                    combinedArea.style.marginTop = "15px";
                    
                    // Resetoidaan tekstit
                    combinedDesc.style.fontSize = "12px";
                    combinedLabel.style.fontSize = "22px";
                    combinedLabel.style.fontWeight = "bold";
                    
                    // Värikoodaus ennallaan
                    combinedLabel.style.color = combined > 70 ? "#d9534f" : (combined > 40 ? "#f0ad4e" : "#5cb85c");
                }
            } else {
                // Ei näytetä ollenkaan, jos syväanalyysia ei ole tehty
                combinedArea.style.display = "none";
            }
            // ------------------------------------------------

            // Päivitetään statusteksti selityksillä
            let explanation = "";
            if (data.foundWords > 0) explanation += `Löydetty ${data.foundWords} AI-tunnistetta. `;
            if (data.isFlat) explanation += "Tekstin rytmi on konemaisen tasainen. ";
            
            document.getElementById('status').innerText = explanation || "Kirjoitusasu vaikuttaa luonnolliselta.";
        });
    });
}