# FPL Player Selling Prices Guide

## Why direct API authentication fails

The Fantasy Premier League (FPL) website has implemented security measures that prevent programmatic logins. When attempting to authenticate directly via their API, you'll typically encounter a 403 Forbidden response, indicating that they're blocking automated access attempts.

Common security measures they likely employ:
- Browser fingerprinting to detect non-browser clients
- CAPTCHA challenges (visible or invisible)
- Rate limiting
- IP-based restrictions
- Complex JavaScript-based authentication flows

## Alternative approaches to get selling prices

Here are several approaches you can try to get player selling prices:

### 1. Using browser cookies (most reliable)

1. Log in to the FPL website in your browser
2. Use browser developer tools to copy your cookies
3. Use these cookies in your script to make authenticated requests

**Implementation steps:**
```typescript
// After logging in manually to the FPL website:
// 1. Open developer tools (F12)
// 2. Go to Application tab → Cookies → https://fantasy.premierleague.com
// 3. Copy all cookies and create a cookie string

// Add this to your script:
const axios = require('axios');

const cookieString = 'pl_profile=YOUR_COOKIE_VALUE; pl_auth=YOUR_AUTH_COOKIE; etc...';

const response = await axios.get(`https://fantasy.premierleague.com/api/my-team/${teamId}/`, {
  headers: {
    'Cookie': cookieString,
    'Referer': 'https://fantasy.premierleague.com/'
  }
});

// Now you can access selling prices in response.data.picks
```

### 2. Using a headless browser

Use a tool like Puppeteer or Playwright to automate a real browser that can handle modern authentication:

```typescript
const { chromium } = require('playwright');

async function getFplSellingPrices(email, password, teamId) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login
  await page.goto('https://users.premierleague.com/accounts/login/');
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('input[type="submit"]');
  
  // Wait for redirect to complete
  await page.waitForURL('https://fantasy.premierleague.com/**');
  
  // Navigate to transfers page (contains selling prices)
  await page.goto('https://fantasy.premierleague.com/transfers');
  
  // Extract data from page or use browser cookies for API calls
  const prices = await page.evaluate(() => {
    // Extract data from DOM or execute fetch inside browser context
    return fetch('/api/my-team/' + teamId + '/')
      .then(r => r.json())
      .then(data => data.picks);
  });
  
  await browser.close();
  return prices;
}
```

### 3. Manual data entry

If you're only checking prices occasionally, the simplest approach might be manual data entry:

1. Create a simple form in your application
2. Log in to FPL website manually and view your team/transfers page
3. Enter the purchase/sell values into your form
4. Save this data to use in your application

### 4. Use FPL's mobile app API

The FPL mobile app might use a different authentication flow that could be easier to work with. Analyzing the mobile app's network requests could reveal alternative endpoints.

## Next steps

If you need this data regularly, the browser cookie approach is relatively simple and reliable. The cookies typically remain valid for several days or weeks.

If you need a fully automated solution, the headless browser approach provides the most robust solution as it behaves exactly like a real browser.

Remember that any programmatic access to FPL should be done responsibly:
- Limit your request frequency
- Only access the data you need
- Consider caching responses to reduce load on their servers 