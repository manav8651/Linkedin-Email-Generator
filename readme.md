# LinkedIn Email Generator - Chrome Extension

This Chrome extension helps you extract names from LinkedIn search results, generate potential email addresses in various formats, and save them directly to your personal Google Sheet.



## Features

* **Email Generation**: Scrapes full names from LinkedIn people search pages.
* **Custom Formats**: Provides multiple common email formats (e.g., `firstname.lastname`, `f.lastname`).
* **Email Buffering**: Collect up to 100 emails before saving to minimize API calls.
* **Google Sheets Integration**: Automatically saves data to a designated Google Sheet, creating new tabs for each company domain and a master "All Emails" tab.
* **Data Richness**: Saves the email, full name, company name, and a 'count' column with headers.
* **Modern UI**: A clean, intuitive, and redesigned user interface.

## Setup & Installation Instructions

Because this extension interacts with your personal Google Sheets, a one-time setup is required to link it to your Google account.

### Part 1: Set Up Your Google Cloud Project

1.  **Clone or Download this Repository**
    * Click the green "Code" button on GitHub and choose "Download ZIP".
    * Unzip the downloaded file to a permanent location on your computer.

2.  **Create a Google Cloud Project**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/) and sign in.
    * Click the project dropdown at the top and click **"NEW PROJECT"**.
    * Give your project a name (e.g., "Chrome Extension APIs") and click **"CREATE"**.

3.  **Enable the Google Sheets API**
    * In your new project, navigate to **"APIs & Services"** > **"Library"**.
    * Search for **"Google Sheets API"** and click on it.
    * Click the **"ENABLE"** button.

4.  **Configure the OAuth Consent Screen**
    * In the left menu, go to **"APIs & Services"** > **"OAuth consent screen"**.
    * Choose **"External"** for the User Type and click **"CREATE"**.
    * Fill in the required fields:
        * **App name**: `LinkedIn Email Generator`
        * **User support email**: Your email address
        * **Developer contact information**: Your email address
    * Click **"SAVE AND CONTINUE"** through the "Scopes" and "Optional info" pages.
    * On the "Test users" page, click **"+ ADD USERS"** and add the Google email address you will use to log into the extension.
    * Click **"SAVE AND CONTINUE"** and then **"BACK TO DASHBOARD"**.

### Part 2: Load the Extension and Get Its ID

5.  **Load the Extension in Chrome**
    * Open Chrome and navigate to `chrome://extensions`.
    * Turn on **"Developer mode"** using the toggle in the top-right corner.
    * Click the **"Load unpacked"** button.
    * Select the folder where you unzipped this repository's files. The extension will now appear on your extensions page.

6.  **Copy the Extension ID**
    * On the extension's card, find the **ID** (it's a long string of letters).
    * Click the copy button next to it.

### Part 3: Create and Configure Your Client ID

7.  **Create OAuth Credentials**
    * Go back to the Google Cloud Console.
    * Navigate to **"APIs & Services"** > **"Credentials"**.
    * Click **"+ CREATE CREDENTIALS"** and select **"OAuth client ID"**.
    * For **"Application type"**, choose **"Chrome App"**.
    * Give it a name (e.g., "LinkedIn Extension Credential").
    * In the **"Application ID"** field, paste the Extension ID you copied from `chrome://extensions`.
    * Click **"CREATE"**.

8.  **Copy Your Client ID**
    * A new Client ID will be created. Click the copy icon next to it.

### Part 4: Finalize the Extension

9.  **Update the `manifest.json` File**
    * Open the extension's folder on your computer.
    * Open the `manifest.json` file in a text editor.
    * Find the `client_id` field and paste your new Client ID as the value, replacing the placeholder text.
    * Save the file.

10. **Reload the Extension**
    * Go back to `chrome://extensions`.
    * Click the **reload icon** (a circular arrow) on the extension's card.

The setup is now complete!

## How to Use

1.  Create a blank Google Sheet and copy its **Sheet ID** from the URL.
2.  Navigate to a LinkedIn people search results page.
3.  Click the extension icon to open the popup.
4.  Paste your **Google Sheet ID**. (
    Steps to extract ID: 
    1. Look at the URL: Check the address bar of your browser. The URL will look something like this: https://docs.google.com/spreadsheets/d/1qZ_AbCdeFgHiJkLmNoPqRsTuVwXyZ_12345AbcdeFg/edit#gid=0

    2. Copy the ID: The Sheet ID is the long string of random letters, numbers, and symbols located between /d/ and /edit.

    3. From the example above, you would copy this part:
        1qZ_AbCdeFgHiJkLmNoPqRsTuVwXyZ_12345AbcdeFg )
5.  Enter the **Company Domain** and select an **Email Format**.
6.  Click **"Generate"** to find and collect emails from the page. You can navigate to other search pages and continue generating to add more emails (up to 100).
7.  Click **"Save to Sheet"** to authenticate (first time only) and upload all collected emails.