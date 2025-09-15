// A mapping of keys to functions that generate email formats.
const EMAIL_FORMATS = {
    'fn.ln': (first, middle, last) => `${first}.${last}`,
    'filn': (first, middle, last) => `${first.charAt(0)}${last}`,
    'fn': (first, middle, last) => `${first}`,
    'fnln': (first, middle, last) => `${first}${last}`,
    'fn_ln': (first, middle, last) => `${first}_${last}`,
    'fn.miln': (first, middle, last) => middle ? `${first}.${middle.charAt(0)}${last}` : `${first}.${last}`
};

document.getElementById('generateBtn').addEventListener('click', () => {
    const domain = document.getElementById('domain').value.trim().toLowerCase();
    const formatKey = document.getElementById('formatKey').value;

    if (!domain) {
        alert('Please enter a company domain.');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab.url.includes("linkedin.com/search/results/people")) {
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: extractNamesAndGenerateEmails,
                args: [domain, formatKey]
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    displayEmails(results[0].result);
                } else {
                    document.getElementById('status').textContent = 'No names found on this page.';
                }
            });
        } else {
            alert('Please navigate to a LinkedIn people search results page first.');
        }
    });
});

function extractNamesAndGenerateEmails(domain, formatKey) {
    const persons = [];
    // UPDATED SELECTOR FOR MORE PRECISION
    const nameElements = document.querySelectorAll('a[data-test-app-aware-link] span[aria-hidden="true"]');

    nameElements.forEach(element => {
        const fullName = element.textContent.trim().replace('', '');
        
        // Refined check to ensure we only get names
        // Names are typically two or more words.
        const nameParts = fullName.split(' ');
        if (nameParts.length < 2) {
            return; 
        }

        let firstName = '';
        let middleName = '';
        let lastName = '';
        
        // This is a mapping of keys to functions that generate email formats.
        const EMAIL_FORMATS = {
            'fn.ln': (first, middle, last) => `${first}.${last}`,
            'filn': (first, middle, last) => `${first.charAt(0)}${last}`,
            'fn': (first, middle, last) => `${first}`,
            'fnln': (first, middle, last) => `${first}${last}`,
            'fn_ln': (first, middle, last) => `${first}_${last}`,
            'fn.miln': (first, middle, last) => middle ? `${first}.${middle.charAt(0)}${last}` : `${first}.${last}`
        };

        if (nameParts.length === 2) {
            firstName = nameParts[0].toLowerCase();
            lastName = nameParts[1].toLowerCase();
        } else if (nameParts.length >= 3) {
            firstName = nameParts[0].toLowerCase();
            lastName = nameParts[nameParts.length - 1].toLowerCase();
            middleName = nameParts.slice(1, nameParts.length - 1).join('').toLowerCase();
        }
        
        const generateFormat = EMAIL_FORMATS[formatKey];
        if (generateFormat) {
            const emailUsername = generateFormat(firstName, middleName, lastName);
            persons.push({
                fullName: fullName,
                email: `${emailUsername}@${domain}`
            });
        }
    });

    return persons;
}

function displayEmails(data) {
    const statusElement = document.getElementById('status');
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    
    if (data.length === 0) {
        statusElement.textContent = 'No names found on this page.';
        return;
    }

    statusElement.textContent = `Generated emails for ${data.length} people:`;

    data.forEach(person => {
        const listItem = document.createElement('li');
        listItem.textContent = `${person.fullName}: ${person.email}`;
        emailList.appendChild(listItem);
    });
}