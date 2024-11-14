// Define browserAPI similar to content script
const browserAPI = (typeof window !== 'undefined' && window.browser) ? window.browser :
    (typeof chrome !== 'undefined' ? chrome : {
        runtime: {
            onMessage: { addListener: () => { } },
        },
        tabs: {
            query: async () => [],
            sendMessage: async () => { }
        }
    });

// Listen for messages from the options page
browserAPI.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'reloadOptions') {
        // Query all tabs where the content script might be active
        browserAPI.tabs.query({}).then(tabs => {
            for (let tab of tabs) {
                // Send the message to each tab
                browserAPI.tabs.sendMessage(tab.id, { action: 'reloadOptions' }).catch((error) => {
                    // Handle cases where the tab doesn't have the content script
                    console.error(`Failed to send message to tab ${tab.id}:`, error);
                });
            }
        }).catch(error => {
            console.error('Error querying tabs:', error);
        });
    }
});
