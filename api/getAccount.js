const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const getAccount = (app) => {
    app.get('/api/account/:iban', async (req, res) => {

        const data = req.body;

        console.log(req.params.iban)

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        
        await page.setCookie(...data.session_data.cookies_data);

        await page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/authenticated/payments/payment-dashboard/personal/dashboard');

        await page.waitForSelector('.lae-touch-group-accounts-tile-account-display-element', { timeout: 500 }).catch(() => false);

        const elements = await page.$$('.lae-touch-group-accounts-tile-account-display-element');

        await new Promise(r => setTimeout(r, 1500));
        for (const element of elements) {
            const textContent = await page.evaluate(el => el.textContent.trim(), element);
            if (textContent.replaceAll(' ', '').includes(req.params.iban)) {
                await element.click();
                break;
            }
        }

        await new Promise(r => setTimeout(r, 20000));
        res.status(200).send(JSON.stringify({
            success: true,
        }));
    })
}

exports.getAccount = getAccount