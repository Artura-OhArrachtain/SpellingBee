function onOpen() {
  DocumentApp.getUi()
    .createMenu('SpellingBee')
    .addItem('Open writing checker', 'showSpellingBeeSidebar')
    .addItem('Set app address', 'configureSpellingBee')
    .addToUi();
}

function showSpellingBeeSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SpellingBee');
  DocumentApp.getUi().showSidebar(html);
}

function configureSpellingBee() {
  const ui = DocumentApp.getUi();
  const result = ui.prompt(
    'Connect SpellingBee',
    'Enter the HTTPS address of your SpellingBee app (for example, https://spellingbee.example.com).',
    ui.ButtonSet.OK_CANCEL,
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const address = result.getResponseText().trim().replace(/\/$/, '');
  if (!/^https:\/\//i.test(address)) {
    ui.alert('Use an HTTPS address for your SpellingBee app.');
    return;
  }

  try {
    const response = UrlFetchApp.fetch(address + '/api/health', {
      method: 'get',
      muteHttpExceptions: true,
    });
    if (response.getResponseCode() !== 200) {
      ui.alert('That address is not responding as a SpellingBee app. Check the URL and try again.');
      return;
    }
    const health = JSON.parse(response.getContentText());
    if (health.status !== 'ok') {
      ui.alert('That address is not responding as a SpellingBee app. Check the URL and try again.');
      return;
    }
  } catch (error) {
    ui.alert('SpellingBee could not be reached. Check the URL and your internet connection.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('SPELLINGBEE_APP_URL', address);
  ui.alert('SpellingBee is connected. Open the SpellingBee menu to check selected text.');
}

function getSelectedText() {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) return '';
  const pieces = selection.getRangeElements().map(function (rangeElement) {
    const element = rangeElement.getElement();
    if (element.getType() !== DocumentApp.ElementType.TEXT) return '';
    const text = element.asText().getText();
    if (!rangeElement.isPartial()) return text;
    return text.substring(rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive() + 1);
  });
  return pieces.filter(Boolean).join('');
}

function getDocumentText() {
  const text = DocumentApp.getActiveDocument().getBody().getText().trim();
  if (!text) throw new Error('The document does not contain any text.');
  if (text.length > 12000) throw new Error('This document has more than 12,000 characters. Select a shorter passage.');
  return text;
}

function proofreadSelection(text) {
  if (!text || !text.trim()) throw new Error('Select text in the document first.');
  if (text.length > 12000) throw new Error('Select 12,000 characters or fewer.');
  const baseUrl = PropertiesService.getScriptProperties().getProperty('SPELLINGBEE_APP_URL');
  if (!baseUrl) throw new Error('Use the SpellingBee menu and choose Set app address first.');

  const response = UrlFetchApp.fetch(baseUrl + '/api/proofread', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const result = JSON.parse(response.getContentText());
  if (status < 200 || status >= 300) throw new Error(result.error || 'The SpellingBee app could not check this text.');
  return result;
}

function replaceSelectionWithText(text) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error('Select the text to replace in the document.');
  const ranges = selection.getRangeElements();
  if (ranges.length !== 1 || ranges[0].getElement().getType() !== DocumentApp.ElementType.TEXT) {
    throw new Error('Select text within one paragraph to replace it while preserving the surrounding document.');
  }
  const range = ranges[0];
  const textElement = range.getElement().asText();
  const start = range.isPartial() ? range.getStartOffset() : 0;
  const end = range.isPartial() ? range.getEndOffsetInclusive() : textElement.getText().length - 1;
  textElement.deleteText(start, end);
  textElement.insertText(start, text);
  return 'Replaced the selected text.';
}
