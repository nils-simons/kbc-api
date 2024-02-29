const puppeteer = require('puppeteer');
const fs = require('fs');

const createSession = (app) => {
    app.post('/api/session/create', async (req, res) => {

        const data = req.body;

        if (data.auth_provider !== 'itsme') {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Invalid auth provider"
            }));
            return
        }


        if (data.auth_provider == 'itsme' && !data.phone_number) {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Missing phone number"
            }));
            return
        }


        const browser = await puppeteer.launch({ headless: false }); // Headless mode is set to false for visualization, change to true for production
        const page = await browser.newPage();

        const cookiesString = fs.readFileSync('cookies.json');
        const cookies = JSON.parse(cookiesString);

        // Set the cookies in the page
        await page.setCookie(...cookies);

        // Navigate to the website
        await page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/login/strategy/ITSME');

        await new Promise(r => setTimeout(r, 4000));

        await page.type('input[name="y9c-login-itsme-phone-number"]', data.phone_number);
        await new Promise(r => setTimeout(r, 100));
        await page.keyboard.press('Enter');

        while (true) {
            await new Promise(r => setTimeout(r, 200));
            const elementExists = await page.waitForSelector('.lae-touch-payment-dashboard-header-title', { timeout: 0 }).catch(() => false);
            if (elementExists) {
                const text = await page.evaluate(() => {
                    return document.querySelector('.lae-touch-payment-dashboard-header-title').textContent.trim();
                });
                if (text === "Payments") {
                    console.log("Logged in!");
                    break;
                }
            }
        }

        const sessionCookies = await page.cookies();
        fs.writeFileSync('sessionCookies.json', JSON.stringify(sessionCookies, null, 2));
        browser.close();

    })
}

exports.createSession = createSession