// --- Database Setup ---
// Assuming WebsimSocket is globally available as per documentation
const room = new WebsimSocket();

// Define collection types (use versioning if schema changes)
const PROJECTS_COLLECTION = 'portfolio_projects_v1';
const POSTS_COLLECTION = 'blog_posts_v1';
const CONTACT_MESSAGES_COLLECTION = 'contact_messages_v1';

// --- Utility Functions ---
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Basic Markdown-like parser (extend as needed)
function parseContent(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
        .replace(/`(.*?)`/g, '<code>$1</code>')     // Inline code
        .replace(/\n/g, '<br>');                   // Line breaks
}


// --- UI Rendering Functions ---

function renderProjects(projects) {
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectsGrid) return;

    // Sort projects: newest first (default from getList is newest to oldest)
    // No need to reverse as getList already returns newest first.

    projectsGrid.innerHTML = projects.map(project => `
        <div class="project-item" data-id="${project.id}">
            ${project.thumbnail ? `<div class="project-thumbnail"><img src="${project.thumbnail}" alt="${project.title} thumbnail"></div>` : ''}
            <div class="project-info">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                ${project.link ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer">View Project</a>` : ''}
                 <small>Added by: ${project.username} on ${formatDate(project.created_at)}</small>
            </div>
        </div>
    `).join('');
}

function renderBlogPosts(posts) {
    const postsList = document.querySelector('.blog-posts-list');
    if (!postsList) return;

    // Sort posts: newest first
    postsList.innerHTML = posts.map(post => `
        <article class="blog-post-summary" data-id="${post.id}">
             <header>
                <h3>${post.title}</h3>
                <time datetime="${post.created_at}">${formatDate(post.created_at)}</time>
                <p class="author">By: ${post.username}</p>
            </header>
            <section>
                <p>${parseContent(post.content.substring(0, 150))}...</p> 
                <a href="#post-${post.id}" class="read-more-link" data-postid="${post.id}">Read More</a>
            </section>
        </article>
    `).join('');

    // Add event listeners for "Read More" links
    document.querySelectorAll('.read-more-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const postId = e.target.getAttribute('data-postid');
            const post = posts.find(p => p.id === postId);
            if (post) {
                displayFullPost(post);
            }
        });
    });
}

// Function to display the full blog post (e.g., in a modal or separate view)
function displayFullPost(post) {
    const mainContent = document.getElementById('main-content');
    const blogSection = document.getElementById('blog'); // Keep track of the blog section

    // Create a container for the full post view
    const postDetailView = document.createElement('div');
    postDetailView.classList.add('blog-post-detail-view'); // For potential styling/overlay
    postDetailView.innerHTML = `
        <div class="blog-post-detail">
             <button class="close-post-button" aria-label="Close post">&times;</button>
            <article>
                <header>
                    <h1>${post.title}</h1>
                    <time datetime="${post.created_at}">${formatDate(post.created_at)}</time>
                     <p class="author">By: ${post.username}</p>
                </header>
                <section>
                    ${parseContent(post.content)}
                </section>
            </article>
        </div>
    `;

    // Style the post detail view and button (add to style.css if needed)
    postDetailView.style.position = 'fixed';
    postDetailView.style.top = '0';
    postDetailView.style.left = '0';
    postDetailView.style.width = '100%';
    postDetailView.style.height = '100%';
    postDetailView.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    postDetailView.style.zIndex = '1100';
    postDetailView.style.display = 'flex';
    postDetailView.style.alignItems = 'center';
    postDetailView.style.justifyContent = 'center';
    postDetailView.style.overflowY = 'auto'; // Allow scrolling within the modal


    const detailBox = postDetailView.querySelector('.blog-post-detail');
    if (detailBox) {
         detailBox.style.position = 'relative'; // For button positioning
         detailBox.style.maxHeight = '90vh'; // Limit height
         detailBox.style.overflowY = 'auto'; // Scroll inside the box
    }


    const closeButton = postDetailView.querySelector('.close-post-button');
     if (closeButton) {
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '15px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '1.8rem';
        closeButton.style.color = '#555';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            mainContent.removeChild(postDetailView);
             if(blogSection) blogSection.style.display = ''; // Show blog section again
        });
     }


    // Hide the main blog list and append the detail view
     if(blogSection) blogSection.style.display = 'none'; // Hide the list
    mainContent.appendChild(postDetailView);
}


// --- Event Handlers ---

async function handleAddProject(e) {
    e.preventDefault();
    const titleInput = document.getElementById('project-title');
    const descriptionInput = document.getElementById('project-description');
    const thumbnailInput = document.getElementById('project-thumbnail');
    const linkInput = document.getElementById('project-link');
    const button = document.getElementById('add-project-button');

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const thumbnail = thumbnailInput.value.trim();
    const link = linkInput.value.trim();

    if (!title || !description || !link) {
        alert('Please fill in project title, description, and link.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Adding...';

    try {
        await room.collection(PROJECTS_COLLECTION).create({
            title: title,
            description: description,
            thumbnail: thumbnail || null, // Store null if empty
            link: link,
        });
        // Clear form
        titleInput.value = '';
        descriptionInput.value = '';
        thumbnailInput.value = '';
        linkInput.value = '';
        // No need to manually re-render, subscription will handle it
    } catch (error) {
        console.error("Error adding project:", error);
        alert('Failed to add project. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Add Project';
    }
}

async function handleAddPost(e) {
    e.preventDefault();
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const button = document.getElementById('add-post-button');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert('Please fill in post title and content.');
        return;
    }

     button.disabled = true;
     button.textContent = 'Publishing...';

    try {
        await room.collection(POSTS_COLLECTION).create({
            title: title,
            content: content,
        });
        // Clear form
        titleInput.value = '';
        contentInput.value = '';
        // Subscription will update the list
    } catch (error) {
        console.error("Error adding post:", error);
        alert('Failed to publish post. Please try again.');
    } finally {
         button.disabled = false;
         button.textContent = 'Publish Post';
    }
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const responseDiv = document.getElementById('contact-response');
    const button = e.target.querySelector('button');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

     if (!name || !email || !message) {
        responseDiv.textContent = 'Please fill in all fields.';
        responseDiv.className = 'error';
        return;
    }

    button.disabled = true;
    button.textContent = 'Sending...';
    responseDiv.textContent = ''; // Clear previous messages

     try {
        // Simulate sending or store in DB (as requested by prompt context)
         await room.collection(CONTACT_MESSAGES_COLLECTION).create({
            name: name,
            email: email,
            message: message,
        });

        responseDiv.textContent = 'Message sent successfully! Thank you.';
        responseDiv.className = 'success';
        nameInput.value = '';
        emailInput.value = '';
        messageInput.value = '';
    } catch (error) {
        console.error("Error sending contact message:", error);
        responseDiv.textContent = 'Failed to send message. Please try again later.';
        responseDiv.className = 'error';
    } finally {
        button.disabled = false;
        button.textContent = 'Send Message';
    }
}


// --- Initialization ---
function initializeApp() {
    // Set copyright year
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Add form event listeners
    const addProjectButton = document.getElementById('add-project-button');
    if (addProjectButton) {
        addProjectButton.addEventListener('click', handleAddProject);
    }

    const addPostButton = document.getElementById('add-post-button');
    if (addPostButton) {
        addPostButton.addEventListener('click', handleAddPost);
    }

     const contactForm = document.getElementById('contact-form');
     if (contactForm) {
         contactForm.addEventListener('submit', handleContactSubmit);
     }


    // Subscribe to data changes
    room.collection(PROJECTS_COLLECTION).subscribe(renderProjects);
    room.collection(POSTS_COLLECTION).subscribe(renderBlogPosts);

     // Initial load (optional, as subscribe triggers immediately)
     // renderProjects(room.collection(PROJECTS_COLLECTION).getList());
     // renderBlogPosts(room.collection(POSTS_COLLECTION).getList());

    // Active navigation link highlighting (basic example)
    const navLinks = document.querySelectorAll('.navigation a');
    const sections = document.querySelectorAll('main section');

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // Adjust threshold as needed (e.g., header height)
            if (pageYOffset >= sectionTop - 100) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });


    console.log("Portfolio & Blog Initialized");
}

// Run initialization when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}