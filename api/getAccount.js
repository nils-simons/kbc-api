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

        await page.waitForSelector('.account-display', { timeout: 500 }).catch(() => false);

        const accountElements = await page.$$('.account-display');
        for (const account of accountElements) {
            const iban = await account.$eval('.account-number', element => element.innerText.trim().replaceAll(' ', ''));
            
            if (iban == req.params.iban) {
                account.click();
            }
        }

        await new Promise(r => setTimeout(r, 20000));


        res.status(200).send(JSON.stringify({
            success: true,
        }));
    })
}

exports.getAccount = getAccount