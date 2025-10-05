// Popup script for X Tracker

const GOALS = {
  comments: 100,
  posts: 5
};

async function updateDisplay() {
  const data = await chrome.storage.local.get([
    'commentCount',
    'postCount', 
    'lastResetDate', 
    'streak', 
    'lastCompletedDate',
    'weeklyHistory',
    'totalAllTime'
  ]);
  
  const today = new Date().toDateString();
  
  let commentCount = 0;
  let postCount = 0;
  let streak = data.streak || 0;
  
  // Check if we need to reset for a new day
  if (data.lastResetDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    // Update streak
    if (data.lastCompletedDate === yesterdayStr) {
      streak = data.streak || 0;
    } else if (data.commentCount >= GOALS.comments && 
               data.postCount >= GOALS.posts && 
               data.lastResetDate) {
      streak = (data.streak || 0) + 1;
    } else if (data.lastResetDate) {
      streak = 0;
    }
    
    commentCount = 0;
    postCount = 0;
    await chrome.storage.local.set({ 
      commentCount: 0,
      postCount: 0,
      lastResetDate: today,
      streak: streak
    });
  } else {
    commentCount = data.commentCount || 0;
    postCount = data.postCount || 0;
    
    // Check if all goals reached today
    if (commentCount >= GOALS.comments && 
        postCount >= GOALS.posts && 
        data.lastCompletedDate !== today) {
      streak = (data.streak || 0) + 1;
      await chrome.storage.local.set({ 
        lastCompletedDate: today,
        streak: streak
      });
    }
  }
  
  // Update Comments
  const commentPercentage = Math.min((commentCount / GOALS.comments) * 100, 100);
  document.getElementById('comments-count').textContent = `${commentCount} / ${GOALS.comments}`;
  document.getElementById('comments-bar').style.width = commentPercentage + '%';
  document.getElementById('comments-progress').textContent = Math.round(commentPercentage) + '%';
  
  if (commentCount >= GOALS.comments) {
    document.getElementById('comments-card').classList.add('goal-completed');
    document.getElementById('comments-count').innerHTML = `${commentCount} / ${GOALS.comments} <span class="checkmark">✓</span>`;
  } else {
    document.getElementById('comments-card').classList.remove('goal-completed');
  }
  
  // Update Posts
  const postPercentage = Math.min((postCount / GOALS.posts) * 100, 100);
  document.getElementById('posts-count').textContent = `${postCount} / ${GOALS.posts}`;
  document.getElementById('posts-bar').style.width = postPercentage + '%';
  document.getElementById('posts-progress').textContent = Math.round(postPercentage) + '%';
  
  if (postCount >= GOALS.posts) {
    document.getElementById('posts-card').classList.add('goal-completed');
    document.getElementById('posts-count').innerHTML = `${postCount} / ${GOALS.posts} <span class="checkmark">✓</span>`;
  } else {
    document.getElementById('posts-card').classList.remove('goal-completed');
  }
  
  // Update Streak
  document.getElementById('streak').textContent = streak;
  
  // Calculate weekly stats
  const weeklyHistory = data.weeklyHistory || {};
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let weeklyTotal = 0;
  
  for (let d = new Date(weekAgo); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toDateString();
    weeklyTotal += weeklyHistory[dateStr] || 0;
  }
  weeklyTotal += commentCount; // Include today
  
  document.getElementById('weekly-count').textContent = weeklyTotal;
  
  // Show achievement if all goals reached
  const achievement = document.getElementById('achievement');
  if (commentCount >= GOALS.comments && postCount >= GOALS.posts) {
    achievement.classList.add('show');
  } else {
    achievement.classList.remove('show');
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    updateDisplay();
  }
});

// Initial display update
updateDisplay();