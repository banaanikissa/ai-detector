// Aivot: Hoitaa tekstin ja kuvien analyysin
const API_KEY = "AIzaSyAlO0AKUVcDVGxgCWCDy7G-TJ0Ps5KtO-E"; 
const MODEL_NAME = "gemini-3-flash-preview"; 

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "analyzeImage", title: "Analysoi kuva (Gemini)", contexts: ["image"] });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_DEEP_SCAN") {
    analyzeTextWithGemini(message.text).then(score => sendResponse({ score: score })).catch(() => sendResponse({ score: "0" }));
    return true; 
  }
});

async function analyzeImage(imageUrl, tabId) {
  // Lähetetään heti latausviesti
  chrome.tabs.sendMessage(tabId, { type: "IMAGE_LOADING" });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Data = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    const apiResponse = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Onko tämä AI-kuva? Vastaa luvulla 0-100." }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
      })
    });
    
    const data = await apiResponse.json();
    const result = data.candidates[0].content.parts[0].text.match(/\d+/)[0];
    chrome.tabs.sendMessage(tabId, { type: "IMAGE_RESULT", score: result });
  } catch (e) {
    chrome.tabs.sendMessage(tabId, { type: "IMAGE_RESULT", score: "Virhe" });
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyzeImage") analyzeImage(info.srcUrl, tab.id);
});

async function analyzeTextWithGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  const prompt = `Analysoi tekstin AI-todennäköisyys (0-100). Vastaa vain numerolla. Teksti: "${text.substring(0, 1000)}"`;
  const response = await fetch(url, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return rawText.match(/\d+/)[0];
}