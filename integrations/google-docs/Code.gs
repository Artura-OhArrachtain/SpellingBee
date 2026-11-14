const SPELLINGBEE_APP_URL = 'https://tab.pythonanywhere.com';

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

function onHomepage(e) {
  return buildCheckerCard();
}

function buildCheckerCard() {
  const card = CardService.newCardBuilder();
  let issues;
  try {
    issues = checkGrammarWithApi(DocumentApp.getActiveDocument().getBody().getText());
  } catch (error) {
    return card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(escapeCardText(error.message || 'Could not check this document.'))))
      .build();
  }

  const refreshAction = CardService.newAction()
    .setFunctionName('refreshChecker');
  card.setHeader(CardService.newCardHeader()
    .setTitle('Grammar Suggestions')
    .setSubtitle(issues.length + ' issue(s) found'))
    .addCardAction(CardService.newCardAction()
      .setText('Re-scan Document')
      .setOnClickAction(refreshAction))
    .setFixedFooter(CardService.newFixedFooter()
      .setPrimaryButton(CardService.newTextButton()
        .setText('Re-scan Document')
        .setOnClickAction(refreshAction)));

  if (issues.length === 0) {
    return card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText('No spelling or grammar issues found.')))
      .build();
  }

  issues.forEach(function (issue) {
    const locateAction = CardService.newAction()
      .setFunctionName('highlightIssue')
      .setParameters({
        targetText: issue.original,
        occurrenceIndex: String(issue.occurrenceIndex),
      });
    const fixAction = CardService.newAction()
      .setFunctionName('applyCorrection')
      .setParameters({
        targetText: issue.original,
        replacementText: issue.suggestion,
        occurrenceIndex: String(issue.occurrenceIndex),
      });
    const section = CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setTopLabel(issue.ruleName)
        .setText('<b>' + escapeCardText(issue.original) + '</b> → <font color="#188038"><b>'
          + escapeCardText(issue.suggestion) + '</b></font>')
        .setWrapText(true))
      .addWidget(CardService.newTextParagraph().setText(escapeCardText(issue.message)))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton().setText('Locate').setOnClickAction(locateAction))
        .addButton(CardService.newTextButton()
          .setText('Accept')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(fixAction)));
    card.addSection(section);
  });
  return card.build();
}

function refreshChecker(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildCheckerCard()))
    .setNotification(CardService.newNotification().setText('Document re-scanned.'))
    .build();
}

function checkGrammarWithApi(text) {
  if (!text || !text.trim()) return [];
  if (text.length > 12000) throw new Error('This document is longer than the 12,000-character check limit.');
  const response = UrlFetchApp.fetch(getSpellingBeeAppUrl() + '/api/proofread', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const data = parseJsonResponse(response);
  if (status < 200 || status >= 300) throw new Error(data.error || 'The SpellingBee app could not check this document.');
  if (Array.isArray(data.issues)) return data.issues;
  return makeIssueFromCorrection(text, data.corrected_text, data.explanation || 'Review this suggested correction.');
}

function makeIssueFromCorrection(original, corrected, message) {
  if (typeof corrected !== 'string' || original === corrected) return [];
  const start = commonPrefixLength(original, corrected);
  let originalEnd = original.length;
  let correctedEnd = corrected.length;
  while (originalEnd > start && correctedEnd > start
    && original.charAt(originalEnd - 1) === corrected.charAt(correctedEnd - 1)) {
    originalEnd -= 1;
    correctedEnd -= 1;
  }
  const targetText = original.substring(start, originalEnd);
  const replacementText = corrected.substring(start, correctedEnd);
  if (!targetText) return [];
  return [{
    ruleName: 'Spelling and grammar',
    original: targetText,
    suggestion: replacementText,
    message: message,
    occurrenceIndex: countOccurrencesBefore(original, targetText, start),
  }];
}

function countOccurrencesBefore(text, target, endOffset) {
  let count = 0;
  let offset = 0;
  while (offset < endOffset) {
    const found = text.indexOf(target, offset);
    if (found < 0 || found >= endOffset) break;
    count += 1;
    offset = found + target.length;
  }
  return count;
}

function escapeCardText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

function checkSelection() {
  const text = getCurrentSelectionText();
  if (!text || !text.trim()) throw new Error('Select text in the document first.');
  if (text.length > 12000) throw new Error('Select 12,000 characters or fewer.');
  const baseUrl = PropertiesService.getScriptProperties().getProperty('SPELLINGBEE_APP_URL') || SPELLINGBEE_APP_URL;

  const response = UrlFetchApp.fetch(baseUrl + '/api/proofread', {
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

function applyCorrection(e) {
  const target = e.parameters.targetText;
  const replacement = e.parameters.replacementText;
  const occurrenceIndex = Number(e.parameters.occurrenceIndex || 0);
  const doc = DocumentApp.getActiveDocument();
  const foundRange = findTextOccurrence(doc.getBody(), target, occurrenceIndex);
  if (!foundRange) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Could not find that text. Refresh the suggestions.'))
      .build();
  }
  const element = foundRange.getElement().asText();
  const start = foundRange.getStartOffset();
  const end = foundRange.getEndOffsetInclusive();
  element.deleteText(start, end);
  element.insertText(start, replacement);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildCheckerCard()))
    .build();
}

function highlightIssue(e) {
  const target = e.parameters.targetText;
  const occurrenceIndex = Number(e.parameters.occurrenceIndex || 0);
  const doc = DocumentApp.getActiveDocument();
  const foundRange = findTextOccurrence(doc.getBody(), target, occurrenceIndex);
  if (!foundRange) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Could not find that text. Refresh the suggestions.'))
      .build();
  }
  const rangeBuilder = doc.newRange();
  rangeBuilder.addElement(
    foundRange.getElement(),
    foundRange.getStartOffset(),
    foundRange.getEndOffsetInclusive(),
  );
  doc.setSelection(rangeBuilder.build());
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Located the suggested text in the document.'))
    .build();
}

function findTextOccurrence(body, target, occurrenceIndex) {
  const pattern = escapeRegex(target);
  let found = null;
  for (let index = 0; index <= occurrenceIndex; index += 1) {
    found = found ? body.findText(pattern, found) : body.findText(pattern);
    if (!found) return null;
  }
  return found;
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
