// This buffer will hold the collected email objects
let emailBuffer = [];
const EMAIL_LIMIT = 100;

document.addEventListener('DOMContentLoaded', () => {
    // Restore saved settings and buffered emails
    loadPersistedData();

    // Add event listeners for all buttons
    document.getElementById('generateBtn').addEventListener('click', generateEmails);
    document.getElementById('saveBtn').addEventListener('click', saveToGoogleSheet);
    document.getElementById('clearIdBtn').addEventListener('click', clearSheetId);
    document.getElementById('clearListBtn').addEventListener('click', clearEmailBuffer);

    document.getElementById('formatKey').addEventListener('change', (event) => {
        localStorage.setItem('formatKey', event.target.value);
    });
});

function loadPersistedData() {
    const savedSpreadsheetId = localStorage.getItem('spreadsheetId');
    if (savedSpreadsheetId) {
        document.getElementById('spreadsheetId').value = savedSpreadsheetId;
    }
    const savedDomain = localStorage.getItem('domain');
    if (savedDomain) {
        document.getElementById('domain').value = savedDomain;
    }
    const savedFormatKey = localStorage.getItem('formatKey');
    if (savedFormatKey) {
        document.getElementById('formatKey').value = savedFormatKey;
    }
    
    emailBuffer = JSON.parse(localStorage.getItem('emailBuffer')) || [];
    renderBufferedEmails();
}

// Renders the list of currently buffered emails
function renderBufferedEmails() {
    const emailList = document.getElementById('emailList');
    const emailCountSpan = document.getElementById('emailCount');
    const saveBtn = document.getElementById('saveBtn');
    const clearListBtn = document.getElementById('clearListBtn');
    const generateBtn = document.getElementById('generateBtn');

    emailList.innerHTML = '';

    if (emailBuffer.length > 0) {
        emailBuffer.forEach(item => {
            const listItem = document.createElement('li');
            // --- THIS IS THE ONLY CHANGE IN THIS FILE ---
            // Use innerHTML to add a styled span for the full name
            listItem.innerHTML = `${item.email} <span class="full-name">(${item.fullName})</span>`;
            emailList.appendChild(listItem);
        });
        saveBtn.classList.remove('hidden');
        clearListBtn.classList.remove('hidden');
    } else {
        saveBtn.classList.add('hidden');
        clearListBtn.classList.add('hidden');
    }

    emailCountSpan.textContent = `${emailBuffer.length}`;

    if (emailBuffer.length >= EMAIL_LIMIT) {
        generateBtn.disabled = true;
        document.getElementById('status').textContent = "Email limit reached. Save or clear the list.";
    } else {
        generateBtn.disabled = false;
        // Clear status if not at limit
        const statusElement = document.getElementById('status');
        if(statusElement.textContent === "Email limit reached. Save or clear the list.") {
             statusElement.textContent = "";
        }
    }
}

// Clears the Sheet ID from input and localStorage
function clearSheetId() {
    document.getElementById('spreadsheetId').value = '';
    localStorage.removeItem('spreadsheetId');
}

// Clears the local email buffer and session inputs
function clearEmailBuffer() {
    emailBuffer = [];
    localStorage.removeItem('emailBuffer');
    renderBufferedEmails();
    clearSessionInputs();
    document.getElementById('status').textContent = "List cleared.";
}

// Helper function to clear session-specific inputs
function clearSessionInputs() {
    document.getElementById('domain').value = '';
    document.getElementById('formatKey').selectedIndex = 0;
    localStorage.removeItem('domain');
    localStorage.removeItem('formatKey');
}

// Triggers the content script and adds new emails to the buffer
function generateEmails() {
    const domain = document.getElementById('domain').value.trim().toLowerCase();
    const formatKey = document.getElementById('formatKey').value;
    const statusElement = document.getElementById('status');
    statusElement.textContent = '';

    if (!domain) {
        statusElement.textContent = 'Please enter a company domain.';
        return;
    }
    localStorage.setItem('domain', domain);
    localStorage.setItem('formatKey', formatKey);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.includes("linkedin.com/search/results/people")) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: extractNamesAndGenerateEmails,
                args: [domain, formatKey]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    statusElement.textContent = 'Error: ' + chrome.runtime.lastError.message;
                    return;
                }
                if (results && results[0]?.result?.length > 0) {
                    const newItems = results[0].result;
                    const existingEmails = new Set(emailBuffer.map(item => item.email));
                    const uniqueNewItems = newItems.filter(item => !existingEmails.has(item.email));
                    
                    emailBuffer.push(...uniqueNewItems);

                    if (emailBuffer.length > EMAIL_LIMIT) {
                        emailBuffer.length = EMAIL_LIMIT;
                    }
                    
                    localStorage.setItem('emailBuffer', JSON.stringify(emailBuffer));
                    renderBufferedEmails();
                    statusElement.textContent = `Added ${uniqueNewItems.length} new emails. Total: ${emailBuffer.length}.`;
                } else {
                    statusElement.textContent = 'No new names found on this page.';
                }
            });
        } else {
            statusElement.textContent = 'Navigate to a LinkedIn search page first.';
        }
    });
}

// Main function to save the entire buffer to Google Sheets
async function saveToGoogleSheet() {
    const statusElement = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    const domain = document.getElementById('domain').value.trim().toLowerCase();

    if (!spreadsheetId) {
        statusElement.textContent = 'Error: Please provide a Google Sheet ID.';
        return;
    }
    localStorage.setItem('spreadsheetId', spreadsheetId);

    if (emailBuffer.length === 0) {
        statusElement.textContent = 'Error: No emails to save.';
        return;
    }

    saveBtn.disabled = true;
    statusElement.textContent = 'Authenticating...';

    try {
        const token = await getToken();
        if (!token) throw new Error("Authentication failed.");

        statusElement.textContent = 'Checking spreadsheet...';
        
        const sheetInfo = await getSheetInfo(spreadsheetId, token);
        const existingSheetTitles = sheetInfo.sheets.map(s => s.properties.title);
        
        const requiredSheets = ["All Emails", domain];
        for (const title of requiredSheets) {
            if (!existingSheetTitles.includes(title)) {
                statusElement.textContent = `Creating tab: ${title}...`;
                await createSheet(spreadsheetId, title, token);
                const headers = [['email', 'full name', 'company name', 'count']];
                await appendData(spreadsheetId, title, headers, token);
            }
        }
        
        const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        const valuesToAppend = emailBuffer.map(item => [
            item.email,
            item.fullName,
            companyName,
            0
        ]);

        statusElement.textContent = 'Appending data...';
        await Promise.all([
            appendData(spreadsheetId, "All Emails", valuesToAppend, token),
            appendData(spreadsheetId, domain, valuesToAppend, token)
        ]);

        statusElement.textContent = `✅ Success! Saved ${emailBuffer.length} emails.`;
        clearEmailBuffer(); 
        saveBtn.disabled = false;

    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        saveBtn.disabled = false;
    }
}

// --- GOOGLE SHEETS API HELPERS ---
function getToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(token);
            }
        });
    });
}

async function getSheetInfo(spreadsheetId, token) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error((await response.json()).error.message);
    return response.json();
}

async function createSheet(spreadsheetId, sheetTitle, token) {
    const params = { requests: [{ addSheet: { properties: { title: sheetTitle } } }] };
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error((await response.json()).error.message);
    return response.json();
}

async function appendData(spreadsheetId, sheetTitle, values, token) {
    const params = { values: values };
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetTitle}!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error((await response.json()).error.message);
    return response.json();
}


// --- INJECTED SCRIPT ---
function extractNamesAndGenerateEmails(domain, formatKey) {
    const persons = [];
    const nameElements = document.querySelectorAll('a[data-test-app-aware-link] > span[dir="ltr"] > span[aria-hidden="true"]');

    nameElements.forEach(element => {
        const fullName = element.textContent.trim();
        if (!/^[a-zA-Z]+\s[a-zA-Z]+(\s[a-zA-Z]+)?/.test(fullName)) return;

        const nameParts = fullName.split(' ');
        if (nameParts.length < 2) return;

        let firstName = '', middleName = '', lastName = '';
        if (nameParts.length === 2) {
            [firstName, lastName] = nameParts;
        } else {
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
            middleName = nameParts.slice(1, -1).join('');
        }
        
        const EMAIL_FORMATS = {
            'fn.ln': (f, m, l) => `${f}.${l}`.toLowerCase(),
            'filn': (f, m, l) => `${f.charAt(0)}.${l}`.toLowerCase(),
            'fn': (f, m, l) => `${f}`.toLowerCase(),
            'fnln': (f, m, l) => `${f}${l}`.toLowerCase(),
            'fn_ln': (f, m, l) => `${f}_${l}`.toLowerCase(),
            'fn.miln': (f, m, l) => m ? `${f}.${m.charAt(0)}${l}`.toLowerCase() : `${f}.${l}`.toLowerCase(),
            'flast': (f, m, l) => `${f.charAt(0)}${l}`.toLowerCase(),
            'lastf': (f, m, l) => `${l}${f.charAt(0)}`.toLowerCase()
        };

        const generateFormat = EMAIL_FORMATS[formatKey];
        if (generateFormat) {
            const email = `${generateFormat(firstName, middleName, lastName)}@${domain}`;
            persons.push({ email: email, fullName: fullName });
        }
    });

    return persons;
}