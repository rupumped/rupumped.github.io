/**
 * Anti-Scraper Tarpit - Core Logic
 * Generates infinite content to trap and waste scraper resources
 */

const NUM_TRAP_LINKS = 3;

// Utility function to get random element from array
function randChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Utility function to get random number in range
function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a realistic-looking date in the past
function generateDate() {
	const now = Date.now();
	const yearAgo = now - (365 * 24 * 60 * 60 * 1000);
	const randomTime = yearAgo + Math.random() * (now - yearAgo);
	return new Date(randomTime).toLocaleDateString('en-US', { 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});
}

// Generate a sentence with proper capitalization and punctuation
function generateSentence(minWords = 8, maxWords = 20) {
	const wordCount = randInt(minWords, maxWords);
	const words = [];
	
	// Maybe start with a sentence starter
	if (Math.random() > 0.6 && SENTENCE_STARTERS) {
		return randChoice(SENTENCE_STARTERS) + ' ' + 
			   Array.from({length: randInt(4, 8)}, () => randChoice(WORDS)).join(' ') + '.';
	}
	
	// Build sentence word by word
	for (let i = 0; i < wordCount; i++) {
		// Add transition word occasionally
		if (i > 3 && Math.random() > 0.85 && TRANSITION_WORDS) {
			words.push(randChoice(TRANSITION_WORDS) + ',');
		}
		
		// Add adjective before noun occasionally
		if (Math.random() > 0.7 && ADJECTIVES && i < wordCount - 1) {
			words.push(randChoice(ADJECTIVES));
		}
		
		words.push(randChoice(WORDS));
	}
	
	// Capitalize first word
	if (words.length > 0) {
		words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
	}
	
	return words.join(' ') + '.';
}

// Generate a paragraph with multiple sentences
function generateParagraph(minSentences = 3, maxSentences = 7) {
	const sentenceCount = randInt(minSentences, maxSentences);
	const sentences = [];
	
	for (let i = 0; i < sentenceCount; i++) {
		sentences.push(generateSentence());
	}
	
	return sentences.join(' ');
}

// Generate a realistic article title
function generateTitle() {
	const templates = [
		() => `Understanding ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)} in ${new Date().getFullYear()}`,
		() => `How to Implement ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}`,
		() => `${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}: A Comprehensive Guide`,
		() => `Best Practices for ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}`,
		() => `The Future of ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}`,
		() => `Deep Dive: ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)} Architecture`,
		() => `Exploring ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)} Solutions`,
		() => `${randChoice(ADJECTIVES)} Approaches to ${randChoice(NOUNS)}`,
		() => `Mastering ${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}`,
		() => `${randChoice(ADJECTIVES)} ${randChoice(NOUNS)}: Key Insights and Trends`,
	];
	
	return randChoice(templates)();
}

// Generate trap links to other pages
function generateTrapLinks() {
	const linkContainer = document.createElement('div');
	linkContainer.className = 'related-links';
	linkContainer.innerHTML = '<h3>Related Articles</h3>';
	
	// List of trap pages (circular linking)
	const currentPage = window.location.pathname.split('/').pop();
	var pages = ['entry.html'];
	for (let i = 1; i < NUM_TRAP_LINKS; i++) {
		pages.push(`trap-${i + 1}.html`);
	}
	
	// Link to 3-5 other trap pages
	const linkCount = randInt(3, 5);
	const selectedPages = pages
		.filter(p => p !== currentPage)
		.sort(() => Math.random() - 0.5)
		.slice(0, linkCount);
	
	selectedPages.forEach(page => {
		const link = document.createElement('a');
		link.href = page;
		link.textContent = generateTitle();
		linkContainer.appendChild(link);
	});
	
	return linkContainer;
}

// Generate a complete article
function generateArticle() {
	const article = document.createElement('article');
	
	const title = document.createElement('h2');
	title.textContent = generateTitle();
	
	const meta = document.createElement('div');
	meta.className = 'meta';
	meta.textContent = `Published on ${generateDate()} • ${randInt(3, 12)} min read`;
	
	// Generate 2-4 paragraphs
	const paragraphCount = randInt(2, 4);
	const paragraphs = [];
	
	for (let i = 0; i < paragraphCount; i++) {
		const p = document.createElement('p');
		p.textContent = generateParagraph(4, 7);
		paragraphs.push(p);
	}
	
	// Assemble article
	article.appendChild(title);
	article.appendChild(meta);
	paragraphs.forEach(p => article.appendChild(p));
	
	return article;
}

// Main content generation function
function addContent() {
	const content = document.getElementById('content');
	
	// Add an article
	content.appendChild(generateArticle());
	articleCount++;
	
	// Add trap links every 2-3 articles
	if (articleCount % randInt(2, 3) === 0) {
		content.appendChild(generateTrapLinks());
	}
	
	// Scroll tracking for infinite scroll
	updateScrollProgress();
}

// Show fake loading indicator
function showLoader() {
	const loader = document.querySelector('.loading');
	if (loader) {
		loader.style.display = 'block';
		loader.textContent = 'Loading more articles...';
		
		// Hide after delay to simulate loading
		setTimeout(() => {
			loader.textContent = 'Scroll for more content';
		}, 1500);
	}
}

// Update scroll progress (optional visual feedback)
function updateScrollProgress() {
	const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
	// Could use this to show progress bar if desired
}

// Infinite scroll handler with debouncing
let scrollTimeout;
let isGenerating = false;

function handleScroll() {
	clearTimeout(scrollTimeout);
	scrollTimeout = setTimeout(() => {
		const scrollBottom = window.innerHeight + window.scrollY;
		const docHeight = document.documentElement.scrollHeight;
		
		// Trigger when within 800px of bottom
		if (scrollBottom >= docHeight - 800 && !isGenerating) {
			isGenerating = true;
			showLoader();
			
			// Add slight delay to simulate loading
			setTimeout(() => {
				addContent();
				isGenerating = false;
			}, randInt(500, 1500));
		}
	}, 100);
}

// Prevent easy detection of automation
function antiDetection() {
	// Override webdriver property
	Object.defineProperty(navigator, 'webdriver', {
		get: () => undefined
	});
	
	// Spoof some browser properties
	Object.defineProperty(navigator, 'plugins', {
		get: () => [1, 2, 3, 4, 5] // Fake plugin array
	});
	
	// Override automation detection
	window.chrome = {
		runtime: {}
	};
}

// Initialize tarpit
let articleCount = 0;
const INITIAL_ARTICLES = randInt(2, 4);

function init() {
	antiDetection();
	
	// Generate initial content
	for (let i = 0; i < INITIAL_ARTICLES; i++) {
		addContent();
	}
	
	// Set up infinite scroll
	window.addEventListener('scroll', handleScroll);
	
	// Also add content on timer (catches scrapers that don't scroll)
	setInterval(() => {
		if (articleCount < 50) { // Limit initial generation
			addContent();
		}
	}, randInt(2500, 4000));
	
	// Occasionally update loader text
	setInterval(() => {
		const loader = document.querySelector('.loading');
		if (loader && Math.random() > 0.7) {
			const messages = [
				'Loading more articles...',
				'Fetching content...',
				'Retrieving posts...',
				'Loading...',
				'Please wait...',
			];
			loader.textContent = randChoice(messages);
		}
	}, 5000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}