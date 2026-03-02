document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['aiScore', 'foundWords'], (data) => {
        const score = data.aiScore || 0;
        const words = data.foundWords || 0;

        document.getElementById('fill').style.width = score + "%";
        document.getElementById('percent').innerText = score + "%";
        
        if (score > 40) {
            document.getElementById('status').innerText = `Löydetty ${words} AI-tyylistä ilmaisua ja rakenteellinen tasaisuus on korkea.`;
        } else {
            document.getElementById('status').innerText = "Teksti vaikuttaa luonnolliselta.";
        }
    });
});