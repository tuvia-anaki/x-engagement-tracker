// Popup script for X Tracker

const GOALS = {
  comments: 100,
  posts: 5,
  reposts: 3
};

async function updateDisplay() {
  const data = await chrome.storage.local.get([
    'commentCount',
    'postCount', 
    'repostCount',
    'lastResetDate', 
    'streak', 
    'lastCompletedDate',
    'weeklyHistory',
    'totalAllTime'
  ]);
  
  const today = new Date().toDateString();
  
  let commentCount = 0;
  let postCount = 0;
  let repostCount = 0;
  let streak = data.streak || 0;
  
  // Check if we need to reset for a new day
  if (data.lastResetDate !== today) {
    // Check if we completed all goals yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    // Update streak
    if (data.lastCompletedDate === yesterdayStr) {
      // Streak continues!
      streak = data.streak || 0;
    } else if (data.commentCount >= GOALS.comments && 
               data.postCount >= GOALS.posts && 
               data.repostCount >= GOALS.reposts && 
               data.lastResetDate) {
      // Yesterday's goals were met, increment streak
      streak = (data.streak || 0) + 1;
    } else if (data.lastResetDate) {
      // Streak broken
      streak = 0;
    }
    
    commentCount = 0;
    postCount = 0;
    repostCount = 0;
    await chrome.storage.local.set({ 
      commentCount: 0,
      postCount: 0,
      repostCount: 0,
      lastResetDate: today,
      streak: streak
    });
  } else {
    commentCount = data.commentCount || 0;
    postCount = data.postCount || 0;
    repostCount = data.repostCount || 0;
    
    // Check if all goals reached today
    if (commentCount >= GOALS.comments && 
        postCount >= GOALS.posts && 
        repostCount >= GOALS.reposts && 
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
  
  // Update Reposts
  const repostPercentage = Math.min((repostCount / GOALS.reposts) * 100, 100);
  document.getElementById('reposts-count').textContent = `${repostCount} / ${GOALS.reposts}`;
  document.getElementById('reposts-bar').style.width = repostPercentage + '%';
  document.getElementById('reposts-progress').textContent = Math.round(repostPercentage) + '%';
  
  if (repostCount >= GOALS.reposts) {
    document.getElementById('reposts-card').classList.add('goal-completed');
    document.getElementById('reposts-count').innerHTML = `${repostCount} / ${GOALS.reposts} <span class="checkmark">✓</span>`;
  } else {
    document.getElementById('reposts-card').classList.remove('goal-completed');
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
  if (commentCount >= GOALS.comments && postCount >= GOALS.posts && repostCount >= GOALS.reposts) {
    achievement.classList.add('show');
  } else {
    achievement.classList.remove('show');
  }
}

// Reset button handler
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset today\'s counters?')) {
    const today = new Date().toDateString();
    await chrome.storage.local.set({ 
      commentCount: 0,
      postCount: 0,
      repostCount: 0,
      lastResetDate: today 
    });
    updateDisplay();
  }
});

// Export button handler
document.getElementById('export-btn').addEventListener('click', async () => {
  const data = await chrome.storage.local.get(null);
  
  // Create CSV content
  let csv = 'X Engagement Tracker - Export Data\\n\\n';
  csv += `Export Date:,${new Date().toLocaleString()}\\n`;
  csv += `Comments Today:,${data.commentCount || 0}\\n`;
  csv += `Posts Today:,${data.postCount || 0}\\n`;
  csv += `Reposts Today:,${data.repostCount || 0}\\n`;
  csv += `Current Streak:,${data.streak || 0} days\\n`;
  csv += `Total All Time:,${data.totalAllTime || 0}\\n\\n`;
  
  csv += 'Date,Comments\\n';
  const weeklyHistory = data.weeklyHistory || {};
  const sortedDates = Object.keys(weeklyHistory).sort((a, b) => new Date(a) - new Date(b));
  
  sortedDates.forEach(date => {
    csv += `${date},${weeklyHistory[date]}\\n`;
  });
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `x-tracker-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  // Show feedback
  const btn = document.getElementById('export-btn');
  const originalText = btn.textContent;
  btn.textContent = '✓ Exported!';
  btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 2000);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    updateDisplay();
  }
});

// Initial display update
updateDisplay();