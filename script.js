const topicForm = document.getElementById('topic-form');
const topicInput = document.getElementById('topic-input');
const resultContainer = document.getElementById('result-container');
const loadingIndicator = document.getElementById('loading-indicator');
const initialMessage = document.getElementById('initial-message');
const historyList = document.getElementById('history-list');
const historyPlaceholder = document.getElementById('history-placeholder');

let searchHistory = [];
const MAX_HISTORY_ITEMS = 7;

topicForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const topic = topicInput.value.trim();

    if (!topic) {
        resultContainer.innerHTML = '<p style="color: red;">Please enter a topic.</p>';
        return;
    }

    // Show loading indicator and clear previous results
    loadingIndicator.style.display = 'block';
    resultContainer.innerHTML = '';
    if (initialMessage) initialMessage.style.display = 'none';

    // Construct the Wikipedia API URL
    const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'extracts|info',
        explaintext: true,
        redirects: 1,
        inprop: 'url',
        origin: '*', // Required for CORS requests from a browser
        titles: topic,
    });

    try {
        // Make a request directly to the Wikipedia API
        const response = await fetch(`${WIKIPEDIA_API_URL}?${params}`);
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];

        // Check if Wikipedia found a page for the topic
        if (pageId === '-1') {
            throw new Error(`Could not find information for "${topic}". Please try a different topic.`);
        }

        const pageData = pages[pageId];
        
        // Handle cases where there's no summary (e.g., disambiguation pages)
        if (!pageData.extract) {
            throw new Error(`No summary available for "${pageData.title}". It might be a disambiguation page or a redirect.`);
        }

        // Process the extract to get clean paragraphs
        const allLines = pageData.extract
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.match(/^==.*==$/));

        // Take the first line as the main paragraph
        const introParagraph = allLines.length > 0 ? `<p class="summary-intro">${allLines[0]}</p>` : '';

        // Take the next few lines as bullet points
        const MAX_POINTS = 5;
        const points = allLines
            .slice(1, 1 + MAX_POINTS) // Start from the second item
            .map(line => `<li>${line}</li>`)
            .join('');
        
        const pointsList = points.length > 0 ? `<ul class="summary-points">${points}</ul>` : '';

        resultContainer.innerHTML = `
            <h2>${pageData.title}</h2>
            ${introParagraph}
            ${pointsList}
            <p>
                <a href="${pageData.fullurl}" target="_blank" rel="noopener noreferrer">
                    Read full article on Wikipedia
                </a>
            </p>
        `;
        // Add to history on success
        updateHistory(pageData.title);
    } catch (error) {
        resultContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
});

const renderHistory = () => {
    historyList.innerHTML = '';
    if (searchHistory.length === 0) {
        historyPlaceholder.style.display = 'block';
        historyList.style.display = 'none';
    } else {
        historyPlaceholder.style.display = 'none';
        historyList.style.display = 'block';
        searchHistory.forEach(topic => {
            const li = document.createElement('li');
            li.textContent = topic;
            li.dataset.topic = topic; // Store topic in data attribute for safety
            historyList.appendChild(li);
        });
    }
};

const updateHistory = (topic) => {
    // Remove existing entry to move it to the top
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== topic.toLowerCase());

    // Add new topic to the beginning
    searchHistory.unshift(topic);

    // Limit history size
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory.length = MAX_HISTORY_ITEMS;
    }

    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    renderHistory();
};

/**
 * Handles interactions for elements outside the main form,
 * like the theme toggler and featured topic buttons.
 */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            document.documentElement.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    };

    // --- Theme Toggler ---
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (userPrefersDark) {
        applyTheme('dark');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });

    // --- History ---
    const savedHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    searchHistory = savedHistory;
    renderHistory();

    historyList.addEventListener('click', (event) => {
        if (event.target.tagName === 'LI') {
            const topic = event.target.dataset.topic;
            topicInput.value = topic;
            topicForm.requestSubmit();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // --- Featured Topics Buttons ---
    const featuredTopicsGrid = document.querySelector('.topic-grid');
    featuredTopicsGrid.addEventListener('click', (event) => {
        if (event.target.classList.contains('topic-btn')) {
            topicInput.value = event.target.textContent;
            topicForm.requestSubmit();
        }
    });
});