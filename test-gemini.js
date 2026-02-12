const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const ai = new GoogleGenAI({ apiKey: 'AIzaSyBIx3cTTWKo9NQE_1BcpXJU_uqj-1DToIA' });

async function test() {
  const uploadsDir = path.join(__dirname, '../home/openclaw/dev/stage-ai/public/uploads');

  // Just generate an empty room then stage it
  console.log('Step 1: Generating empty room...');
  const genResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{
      role: 'user',
      parts: [{ text: 'Generate a photo of a completely empty living room with white walls, hardwood floors, and large windows. No furniture at all. Photorealistic.' }]
    }],
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const genParts = genResponse.candidates[0].content.parts || [];
  let emptyRoomBase64 = null;
  let mimeType = 'image/png';
  for (const part of genParts) {
    if (part.inlineData) {
      emptyRoomBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType || 'image/png';
      console.log('Empty room generated, data length:', emptyRoomBase64.length);
      fs.writeFileSync('/tmp/gemini-empty.png', Buffer.from(emptyRoomBase64, 'base64'));
    }
  }

  if (!emptyRoomBase64) {
    console.log('Failed to generate empty room');
    return;
  }

  console.log('Step 2: Staging the empty room...');
  const stageResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{
      role: 'user',
      parts: [
        { text: 'Add modern minimalist furniture to this empty room. Add a sofa, coffee table, rug, and some plants. Do NOT change the room structure, walls, or floors. ONLY add furniture and decor. Return the staged photo.' },
        { inlineData: { mimeType, data: emptyRoomBase64 } }
      ]
    }],
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const stageParts = stageResponse.candidates[0].content.parts || [];
  console.log('Stage response parts:', stageParts.length);
  for (const part of stageParts) {
    if (part.text) console.log('Text:', part.text.slice(0, 300));
    if (part.inlineData) {
      console.log('Staged image received! mimeType:', part.inlineData.mimeType, 'size:', part.inlineData.data.length);
      fs.writeFileSync('/tmp/gemini-staged.png', Buffer.from(part.inlineData.data, 'base64'));
      console.log('Saved to /tmp/gemini-staged.png');
    }
  }

  console.log('Done! Check /tmp/gemini-empty.png and /tmp/gemini-staged.png');
}

test().catch(e => console.error('Fatal:', e.message, e.stack));
