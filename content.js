// Content script to listen for events and show popups

let commentCount = 0;
let postCount = 0;
let lastResetDate = null;

const GOALS = {
  comments: 100,
  posts: 5
};

// Initialize
async function init() {
  const data = await chrome.storage.local.get(['commentCount', 'postCount', 'lastResetDate']);
  const today = new Date().toDateString();
  
  if (data.lastResetDate !== today) {
    commentCount = 0;
    postCount = 0;
    lastResetDate = today;
    await chrome.storage.local.set({ 
      commentCount: 0, 
      postCount: 0,
      lastResetDate: today 
    });
  } else {
    commentCount = data.commentCount || 0;
    postCount = data.postCount || 0;
    lastResetDate = data.lastResetDate;
  }
  
  console.log('[X Tracker] Loaded:', { commentCount, postCount });
}

// Show popup
async function showProgressPopup(type = 'comment') {
  const existingPopup = document.getElementById('x-comment-tracker-popup');
  if (existingPopup) existingPopup.remove();

  const data = await chrome.storage.local.get(['streak']);
  const streak = data.streak || 0;

  const popup = document.createElement('div');
  popup.id = 'x-comment-tracker-popup';
  popup.className = 'x-tracker-popup';
  
  let mainTitle, mainCount, mainGoal;
  
  if (type === 'comment') {
    mainTitle = '💬 Comments';
    mainCount = commentCount;
    mainGoal = GOALS.comments;
  } else {
    mainTitle = '✍️ Posts';
    mainCount = postCount;
    mainGoal = GOALS.posts;
  }
  
  const mainRemaining = Math.max(mainGoal - mainCount, 0);
  const progressPercent = Math.min((mainCount / mainGoal) * 100, 100);
  
  const otherStats = [];
  if (type !== 'comment') otherStats.push(`💬 ${commentCount}/${GOALS.comments}`);
  if (type !== 'post') otherStats.push(`✍️ ${postCount}/${GOALS.posts}`);
  
  let streakHTML = '';
  if (streak > 0) {
    streakHTML = `<div class="x-tracker-streak">🔥 ${streak} day streak!</div>`;
  }
  
  popup.innerHTML = `
    <div class="x-tracker-content">
      <div class="x-tracker-header">
        <span class="x-tracker-title">${mainTitle}</span>
        <button class="x-tracker-close" id="x-tracker-close-btn">×</button>
      </div>
      <div class="x-tracker-stats">
        <span class="x-tracker-count">${mainCount} / ${mainGoal}</span>
        <span class="x-tracker-remaining">${mainRemaining} to go</span>
      </div>
      <div class="x-tracker-bar-container">
        <div class="x-tracker-bar" style="width: ${progressPercent}%"></div>
      </div>
      ${otherStats.length > 0 ? `<div style="margin-top: 8px; font-size: 11px; opacity: 0.8; text-align: center;">${otherStats.join(' • ')}</div>` : ''}
      ${mainCount >= mainGoal ? '<div class="x-tracker-congrats">🎉 Goal reached!</div>' : ''}
      ${streakHTML}
    </div>
  `;
  
  document.body.appendChild(popup);
  
  const closeBtn = document.getElementById('x-tracker-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => popup.remove());
  
  setTimeout(() => {
    if (popup.parentNode) {
      popup.classList.add('x-tracker-fade-out');
      setTimeout(() => popup.remove(), 300);
    }
  }, 5000);
}

async function incrementCommentCount() {
  commentCount++;
  console.log('[X Tracker] 💬 Comment #' + commentCount);
  await chrome.storage.local.set({ commentCount });
  
  const data = await chrome.storage.local.get(['weeklyHistory', 'totalAllTime']);
  const weeklyHistory = data.weeklyHistory || {};
  const today = new Date().toDateString();
  weeklyHistory[today] = (weeklyHistory[today] || 0) + 1;
  
  await chrome.storage.local.set({ 
    weeklyHistory,
    totalAllTime: (data.totalAllTime || 0) + 1
  });
  
  if (commentCount === GOALS.comments && postCount >= GOALS.posts) {
    showGoalReachedNotification();
  }
  
  showProgressPopup('comment');
}

async function incrementPostCount() {
  postCount++;
  console.log('[X Tracker] ✍️ Post #' + postCount);
  await chrome.storage.local.set({ postCount });
  
  if (commentCount >= GOALS.comments && postCount === GOALS.posts) {
    showGoalReachedNotification();
  }
  
  showProgressPopup('post');
}

async function showGoalReachedNotification() {
  const data = await chrome.storage.local.get(['streak']);
  const newStreak = (data.streak || 0) + 1;
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #a855f7, #ec4899);
    color: white;
    padding: 30px 50px;
    border-radius: 7px;
    font-size: 24px;
    font-weight: 700;
    z-index: 9999999;
    box-shadow: 0 20px 60px rgba(168, 85, 247, 0.5);
    animation: goalPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  notification.innerHTML = `
    🎉 ALL GOALS REACHED! 🎉<br>
    <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
      ${newStreak > 1 ? `🔥 ${newStreak} day streak!` : 'Amazing work!'}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'goalFadeOut 0.4s ease-out forwards';
    setTimeout(() => notification.remove(), 400);
  }, 3000);
  
  if (!document.getElementById('goal-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'goal-animation-styles';
    style.textContent = `
      @keyframes goalPop {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes goalFadeOut {
        to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Listen for events from inject script
window.addEventListener('xTrackerComment', () => {
  console.log('[X Tracker] Event: Comment');
  incrementCommentCount();
});

window.addEventListener('xTrackerPost', () => {
  console.log('[X Tracker] Event: Post');
  incrementPostCount();
});

console.log('[X Tracker] Initializing...');
init();
console.log('[X Tracker] ✅ Ready!');