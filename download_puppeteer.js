import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        console.log("Navigating to SmashWiki image...");
        const response = await page.goto('https://www.ssbwiki.com/images/8/87/FDdark.png', {
            waitUntil: 'networkidle2'
        });

        if (response.ok()) {
            const buffer = await response.buffer();
            fs.writeFileSync('C:\\Antigravity_Projects\\スマブラSPマネージャー\\public\\bg_stage.png', buffer);
            console.log("Image downloaded and saved successfully to public/bg_stage.png!");
        } else {
            console.error("Failed to load image. Status:", response.status());
        }

        await browser.close();
    } catch (e) {
        console.error("Error during download:", e);
    }
})();
