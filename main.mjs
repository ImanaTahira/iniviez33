import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
import promptSync from 'prompt-sync';
import chalk from 'chalk';
import boxen from 'boxen';
import blessed from 'blessed';

const prompt = promptSync();

puppeteer.use(StealthPlugin());

// Create a screen object.
const screen = blessed.screen({
    smartCSR: true,
    title: 'TikTok Liker'
});

// Create a box for displaying the like count.
const likeBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '50%',
    height: 'shrink',
    content: 'Initializing...',
    align: 'center',
    valign: 'middle',
    border: {
        type: 'line'
    },
    style: {
        fg: 'magenta',
        bg: 'black',
        border: {
            fg: '#f0f0f0'
        }
    }
});

// Create a box for the status bar.
const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 'shrink',
    content: 'Status: Initializing...',
    align: 'left',
    border: {
        type: 'line'
    },
    style: {
        fg: 'white',
        bg: 'blue',
        border: {
            fg: '#f0f0f0'
        }
    }
});

// Create a box for the running time.
const timeBox = blessed.box({
    top: 0,
    right: 0,
    width: 'shrink',
    height: 'shrink',
    content: 'Time: 0s',
    align: 'right',
    border: {
        type: 'line'
    },
    style: {
        fg: 'white',
        bg: 'green',
        border: {
            fg: '#f0f0f0'
        }
    }
});

// Append our boxes to the screen.
screen.append(likeBox);
screen.append(statusBar);
screen.append(timeBox);

// Add a way to quit the program.
screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
});

// Render the screen.
screen.render();

// Function to update the running time.
let startTime = Date.now();
function updateTime() {
    let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timeBox.setContent(`Time: ${elapsedTime}s`);
    screen.render();
}
setInterval(updateTime, 1000);

(async () => {
    // Prompt for TikTok username
    const username = prompt(chalk.green('Enter the TikTok username: '));

    const browser = await puppeteer.launch({
        headless: false, // set to false to see the browser in action
        // You can set the default window size here if you want a specific size
        // args: ['--window-size=1200,800']
    });
    const page = await browser.newPage();

    // Optional: Set a default viewport size
    await page.setViewport({ width: 1200, height: 800 });

    // Load cookies from mycookie.txt
    const cookieFilePath = 'mycookie.txt';

    try {
        const cookiesString = await fs.readFile(cookieFilePath, 'utf8');
        const cookies = JSON.parse(cookiesString);

        // Fix invalid sameSite values
        const validSameSiteValues = ['Strict', 'Lax', 'None'];
        const fixedCookies = cookies.map(cookie => {
            if (cookie.sameSite === null || !validSameSiteValues.includes(cookie.sameSite)) {
                delete cookie.sameSite;
            }
            return cookie;
        });

        // Remove any cookies with invalid parameters
        const validCookies = fixedCookies.filter(cookie => {
            try {
                return (
                    typeof cookie.name === 'string' &&
                    typeof cookie.value === 'string' &&
                    typeof cookie.domain === 'string' &&
                    (!cookie.sameSite || validSameSiteValues.includes(cookie.sameSite))
                );
            } catch {
                return false;
            }
        });

        likeBox.setContent(chalk.green('Cookies loaded successfully'));
        statusBar.setContent('Status: Cookies loaded successfully');
        screen.render();

        await page.setCookie(...validCookies);
    } catch (error) {
        likeBox.setContent(chalk.red('Error loading cookies:', error));
        statusBar.setContent('Status: Error loading cookies');
        screen.render();
        await browser.close();
        return;
    }

    // Navigate to the TikTok live URL
    await page.goto(`https://www.tiktok.com/@${username}/live`, { waitUntil: 'networkidle2' });
    statusBar.setContent('Status: Navigated to TikTok live');
    screen.render();

    // Function to hide an element by CSS selector
    async function hideElement(selector) {
        await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        }, selector);
    }

    // Hide the video element
    await hideElement('video'); // This will hide the video element

    // Function to click the like button in a loop with a 1-second delay
    async function clickLikeButton() {
        let clickCount = 0;
        const spinnerFrames = ['-', '\\', '|', '/'];
        let spinnerIndex = 0;
        
        while (true) {
            try {
                await page.click('div.css-1mk0i7a-DivLikeBtnIcon.ebnaa9i3');
                clickCount++;
                likeBox.setContent(`Clicked the like button ${clickCount} times ${spinnerFrames[spinnerIndex]}`);
                screen.render();
                spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
            } catch (error) {
                likeBox.setContent(chalk.red('Error clicking the like button:', error));
                screen.render();
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second
        }
    }

    // Start the loop
    await clickLikeButton();

    // You may add additional actions here...

    // Close the browser after a certain condition or time if needed
    // await browser.close();
})();
