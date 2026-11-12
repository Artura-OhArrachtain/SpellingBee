const SPELLINGBEE_APP_URL = 'https://tab.pythonanywhere.com';

function onOpen() {
  DocumentApp.getUi()
    .createMenu('SpellingBee')
    .addItem('Open writing checker', 'showSpellingBeeSidebar')
    .addToUi();
}
function showSpellingBeeSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SpellingBee');
  DocumentApp.getUi().showSidebar(html);
}

<<<<<<< HEAD
function checkSelection() {
  const text = getCurrentSelectionText();
  const response = UrlFetchApp.fetch(SPELLINGBEE_APP_URL + '/api/proofread', {
=======
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

function proofreadSelection(text) {
  if (!text || !text.trim()) throw new Error('Select text in the document first.');
  if (text.length > 12000) throw new Error('Select 12,000 characters or fewer.');
  const baseUrl = PropertiesService.getScriptProperties().getProperty('SPELLINGBEE_APP_URL');
  if (!baseUrl) throw new Error('Use the SpellingBee menu and choose Set app address first.');

  const response = UrlFetchApp.fetch(baseUrl + '/api/proofread', {
>>>>>>> d72bc15 (Validate Google Docs app connection)
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const result = parseJsonResponse(response);
  if (status < 200 || status >= 300) throw new Error(result.error || 'The SpellingBee app could not check this text.');
  if (typeof result.corrected_text !== 'string') throw new Error('SpellingBee returned an invalid suggestion.');

  PropertiesService.getUserProperties().setProperty('spellingBeePending', JSON.stringify({
    documentId: DocumentApp.getActiveDocument().getId(),
    original: text,
    corrected: result.corrected_text,
  }));
  return {
    original: text,
    corrected: result.corrected_text,
    explanation: result.explanation || '',
    unchanged: result.corrected_text.trim() === text.trim(),
  };
}

function applyPendingSuggestion() {
  const pendingValue = PropertiesService.getUserProperties().getProperty('spellingBeePending');
  if (!pendingValue) throw new Error('Check a selection first.');
  let pending;
  try {
    pending = JSON.parse(pendingValue);
  } catch (error) {
    PropertiesService.getUserProperties().deleteProperty('spellingBeePending');
    throw new Error('The pending suggestion expired. Check the selection again.');
  }

  if (pending.documentId !== DocumentApp.getActiveDocument().getId()) {
    throw new Error('This suggestion belongs to another document. Check the current selection again.');
  }
  const current = getCurrentSelectionText();
  if (current !== pending.original) {
    throw new Error('The document selection changed. Select the original passage again, then apply the suggestion.');
  }
  markSelection(pending.original, pending.corrected);
  PropertiesService.getUserProperties().deleteProperty('spellingBeePending');
  return 'Correction applied and highlighted in the document.';
}

function getCurrentSelectionText() {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error('Select text in the document first.');
  const ranges = selection.getRangeElements();
  if (ranges.length !== 1 || ranges[0].getElement().getType() !== DocumentApp.ElementType.TEXT) {
    throw new Error('Select text within one paragraph so corrections can be marked in place.');
  }
  const range = ranges[0];
  const textElement = range.getElement().asText();
  const start = range.isPartial() ? range.getStartOffset() : 0;
  const end = range.isPartial() ? range.getEndOffsetInclusive() : textElement.getText().length - 1;
  const text = textElement.getText().substring(start, end + 1);
  if (!text.trim()) throw new Error('Select some text in the document first.');
  return text;
}

function checkAndMarkSelection() {
  const result = checkSelection();
  if (!result.unchanged) return applyPendingSuggestion();
  PropertiesService.getUserProperties().deleteProperty('spellingBeePending');
  return 'No corrections suggested.';
}

function parseJsonResponse(response) {
  try {
    return JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error('SpellingBee returned a web page instead of JSON. Check that https://tab.pythonanywhere.com is serving the SpellingBee API.');
  }
}

function markSelection(original, corrected) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error('Select the text to mark in the document.');
  const ranges = selection.getRangeElements();
  if (ranges.length !== 1 || ranges[0].getElement().getType() !== DocumentApp.ElementType.TEXT) {
    throw new Error('Select text within one paragraph so corrections can be marked in place.');
  }

  const range = ranges[0];
  const textElement = range.getElement().asText();
  const start = range.isPartial() ? range.getStartOffset() : 0;
  const end = range.isPartial() ? range.getEndOffsetInclusive() : textElement.getText().length - 1;
  const selectedText = textElement.getText().substring(start, end + 1);
  if (selectedText !== original) {
    throw new Error('The document selection changed. Select the passage again, then check it.');
  }
  const changedRanges = findChangedRanges(original, corrected);

  textElement.deleteText(start, end);
  textElement.insertText(start, corrected);
  changedRanges.forEach(function (changedRange) {
    const changedStart = start + changedRange.start;
    const changedEnd = start + changedRange.end - 1;
    if (changedEnd >= changedStart) {
      textElement.setBackgroundColor(changedStart, changedEnd, '#fff2a8');
      textElement.setUnderline(changedStart, changedEnd, true);
    }
  });
}

function findChangedRanges(original, corrected) {
  if (original === corrected) return [];
  const prefixLength = commonPrefixLength(original, corrected);
  let originalEnd = original.length;
  let correctedEnd = corrected.length;
  while (originalEnd > prefixLength && correctedEnd > prefixLength
    && original.charAt(originalEnd - 1) === corrected.charAt(correctedEnd - 1)) {
    originalEnd -= 1;
    correctedEnd -= 1;
  }
  return [{ start: prefixLength, end: correctedEnd }];
}

function commonPrefixLength(first, second) {
  let index = 0;
  const limit = Math.min(first.length, second.length);
  while (index < limit && first.charAt(index) === second.charAt(index)) index += 1;
  return index;
}
