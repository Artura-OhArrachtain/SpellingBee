# Browser extension store listing

## Product details

**Name:** SpellingBee Writing Assistant

**Short description:** Proofread selected text in online editors with spelling, grammar, punctuation, and clarity suggestions.

**Category:** Productivity

**Homepage:** https://github.com/Artura-OhArrachtain/SpellingBee

**Support:** https://github.com/Artura-OhArrachtain/SpellingBee/issues

## Detailed description

SpellingBee Writing Assistant helps you review text while you write in common web editors.

1. Select text or focus a supported text field.
2. Open SpellingBee and review the suggested correction.
3. Replace the selected text only when the suggestion looks right.

Text is sent only when you choose **Check writing**. You set the SpellingBee app address in the extension, and the app sends the request to its configured AI provider. The extension stores that app address in local browser storage.

Google Docs uses the separate SpellingBee sidebar integration because Google Docs renders its document editor on a canvas. The browser extension detects Google Docs and directs you to that integration.

## Permission justifications

- **activeTab:** Read the active page only after the user opens the extension popup.
- **scripting:** Capture selected text from supported editors and replace it after the user chooses **Replace in page**.
- **storage:** Store the user's configured SpellingBee app address locally.
- **Optional host permissions:** Allow the extension to send proofreading requests to the app origin the user enters and approves.

## Data use disclosure

The extension handles user-provided writing text solely to provide proofreading suggestions. It does not sell data, use data for advertising, collect browsing history, or run background collection. Text is sent to the user-configured SpellingBee app only after the user selects **Check writing**. The privacy policy is hosted at `/privacy` on the SpellingBee app deployment.

## Submission assets

- Store icon: `integrations/browser-extension/icon128.png`
- Screenshots: capture at least one 1280×800 screenshot showing the popup with a suggestion and one showing replacement in a supported editor.
- Privacy policy URL: `https://YOUR-DEPLOYED-APP/privacy`
