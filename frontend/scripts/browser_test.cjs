const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/Users/vibhachandraker/.gemini/antigravity/brain/61381502-b665-4fc2-9193-67ef340c8b6e/screenshots';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('1. Starting headless Chrome on port ' + PORT);
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,850',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]);

  chromeProcess.stderr.on('data', () => {});
  chromeProcess.stdout.on('data', () => {});

  let cdpUrl = null;
  for (let i = 0; i < 20; i++) {
    await delay(300);
    try {
      const version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
      cdpUrl = version.webSocketDebuggerUrl;
      if (cdpUrl) break;
    } catch (e) {}
  }

  if (!cdpUrl) {
    throw new Error('Chrome failed to start or expose CDP debugger URL');
  }

  const targets = await fetchJson(`http://127.0.0.1:${PORT}/json`);
  let pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    pageTarget = await fetchJson(`http://127.0.0.1:${PORT}/json/new`);
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.ready;

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  const results = {};

  try {
    // TEST 1: Home page & Footer socials
    console.log('\n--- TEST 1: Home Page & Footer Social Links ---');
    await client.send('Page.navigate', { url: 'http://localhost:5173/' });
    await delay(2000);

    const footerLinks = await client.evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll('footer a'));
        return links.map(a => ({ text: a.innerText.trim(), href: a.href }));
      })()
    `);

    const instaLink = footerLinks.find(l => l.href.includes('instagram.com/simsraipur'));
    const fbLink = footerLinks.find(l => l.href.includes('facebook.com/simsraipur'));
    const ytLink = footerLinks.find(l => l.href.includes('youtube.com/@simsraipur'));

    results['footer_instagram'] = !!instaLink;
    results['footer_facebook'] = !!fbLink;
    results['footer_youtube'] = !!ytLink;

    console.log('Footer Instagram:', instaLink ? instaLink.href : 'FAIL');
    console.log('Footer Facebook:', fbLink ? fbLink.href : 'FAIL');
    console.log('Footer YouTube:', ytLink ? ytLink.href : 'FAIL');

    await client.screenshot(path.join(SCREENSHOT_DIR, '01_browser_home.png'));

    // TEST 2: Student Login
    console.log('\n--- TEST 2: Student Login Flow ---');
    await client.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await delay(1500);

    const loginResult = await client.evaluate(`
      (() => {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        if (!emailInput || !passInput) return { ok: false, msg: 'inputs not found' };

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(emailInput, 'student@example.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));

        setter.call(passInput, 'student123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));

        const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign in') || b.innerText.includes('Login'));
        if (submitBtn) {
          submitBtn.click();
          return { ok: true };
        }
        return { ok: false, msg: 'button not found' };
      })()
    `);
    console.log('Login form submitted:', loginResult);

    await delay(3000);

    const postLoginState = await client.evaluate(`
      (() => {
        return {
          url: window.location.href,
          token: localStorage.getItem('sims_auth_token'),
          errorText: document.querySelector('.bg-red-50, .text-red-600, [class*="error"]')?.innerText || null
        };
      })()
    `);
    console.log('Post login state:', postLoginState);
    results['login_successful'] = !!postLoginState.token;

    await client.screenshot(path.join(SCREENSHOT_DIR, '02_after_login.png'));

    // TEST 3: Header Profile Dropdown on Public Header
    console.log('\n--- TEST 3: Header Profile Dropdown (Public Header) ---');
    await client.send('Page.navigate', { url: 'http://localhost:5173/' });
    await delay(2000);

    const dropdownOpened = await client.evaluate(`
      (() => {
        const profileBtn = document.querySelector('button[aria-label="User menu"]');
        if (profileBtn) {
          profileBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Profile button clicked:', dropdownOpened);
    await delay(800);

    const dropdownMenuVisible = await client.evaluate(`
      (() => {
        const bodyText = document.body.innerText;
        return {
          hasMyProfile: bodyText.includes('My Profile'),
          hasMyPurchases: bodyText.includes('My Purchases'),
          hasLogout: bodyText.includes('Logout')
        };
      })()
    `);
    console.log('Dropdown menu contents:', dropdownMenuVisible);
    results['header_profile_dropdown'] = dropdownMenuVisible.hasMyProfile && dropdownMenuVisible.hasLogout;

    await client.screenshot(path.join(SCREENSHOT_DIR, '03_profile_dropdown.png'));

    // TEST 4: Student Profile Page & Avatar Upload UI
    console.log('\n--- TEST 4: Student Profile Page & Avatar Upload UI ---');
    await client.send('Page.navigate', { url: 'http://localhost:5173/student/profile' });
    await delay(2500);

    const profileUi = await client.evaluate(`
      (() => {
        const fileInput = document.querySelector('input[type="file"]');
        const uploadBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Upload') || b.querySelector('svg.lucide-camera'));
        const bodyText = document.body.innerText;
        return {
          hasFileInput: !!fileInput,
          accept: fileInput ? fileInput.getAttribute('accept') : null,
          hasUploadBtn: !!uploadBtn,
          hasProfileHeader: bodyText.includes('My Profile') || bodyText.includes('Personal Information')
        };
      })()
    `);
    console.log('Profile UI check:', profileUi);
    results['profile_avatar_upload_ui'] = profileUi.hasFileInput;

    await client.screenshot(path.join(SCREENSHOT_DIR, '04_student_profile.png'));

    // TEST 5: Test Series Catalog
    console.log('\n--- TEST 5: Test Series Catalog ---');
    await client.send('Page.navigate', { url: 'http://localhost:5173/test-series' });
    await delay(2000);

    const testSeriesUi = await client.evaluate(`
      (() => {
        return {
          cardsCount: document.querySelectorAll('.grid > div, [class*="card"]').length,
          bodySnippet: document.body.innerText.substring(0, 150)
        };
      })()
    `);
    console.log('Test Series page loaded, cards:', testSeriesUi.cardsCount);
    results['test_series_page'] = testSeriesUi.cardsCount > 0;

    await client.screenshot(path.join(SCREENSHOT_DIR, '05_test_series.png'));

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    client.close();
    chromeProcess.kill();
  }

  console.log('\n========================================');
  console.log('        TEST RESULTS SUMMARY');
  console.log('========================================');
  let passCount = 0;
  let totalCount = 0;
  for (const [k, v] of Object.entries(results)) {
    totalCount++;
    if (v) passCount++;
    console.log(`${k.padEnd(30)}: ${v ? 'PASS' : 'FAIL'}`);
  }
  console.log(`\nTOTAL: ${passCount}/${totalCount} PASSED`);
}

run().catch(console.error);
