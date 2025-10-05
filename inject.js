// This script runs in the MAIN world to intercept fetch before X loads
(function() {
  'use strict';
  
  console.log('[X Tracker INJECT] Starting installation...');
  
  // Intercept Fetch
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const options = args[1] || {};
    
    // Log ALL twitter API calls to see what's happening
    if (url && (url.includes('twitter.com/i/api') || url.includes('x.com/i/api'))) {
      console.log('[X Tracker INJECT] 📡 API Call:', url);
      
      // Check for CreateTweet
      if (url.includes('CreateTweet') && options.body) {
        console.log('[X Tracker INJECT] 🎯 CreateTweet found!');
        
        try {
          const bodyData = JSON.parse(options.body);
          console.log('[X Tracker INJECT] Parsed body:', bodyData);
          
          if (bodyData.variables) {
            const vars = bodyData.variables;
            
            // Check if it's a reply/comment
            if (vars.reply && vars.reply.in_reply_to_tweet_id) {
              console.log('[X Tracker INJECT] ✅ COMMENT detected! Dispatching event...');
              window.dispatchEvent(new CustomEvent('xTrackerComment'));
            } 
            // Otherwise it's a post
            else if (vars.tweet_text !== undefined) {
              console.log('[X Tracker INJECT] ✅ POST detected! Dispatching event...');
              window.dispatchEvent(new CustomEvent('xTrackerPost'));
            }
          }
        } catch (e) {
          console.error('[X Tracker INJECT] Parse error:', e);
        }
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Also intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && this._url.includes('CreateTweet')) {
      console.log('[X Tracker INJECT] 🎯 CreateTweet (XHR) found!');
      
      try {
        const bodyData = JSON.parse(body);
        if (bodyData.variables) {
          const vars = bodyData.variables;
          
          if (vars.reply && vars.reply.in_reply_to_tweet_id) {
            console.log('[X Tracker INJECT] ✅ COMMENT (XHR) detected!');
            window.dispatchEvent(new CustomEvent('xTrackerComment'));
          } else if (vars.tweet_text !== undefined) {
            console.log('[X Tracker INJECT] ✅ POST (XHR) detected!');
            window.dispatchEvent(new CustomEvent('xTrackerPost'));
          }
        }
      } catch (e) {
        console.error('[X Tracker INJECT] XHR parse error:', e);
      }
    }
    
    return originalXHRSend.apply(this, arguments);
  };
  
  console.log('[X Tracker INJECT] ✅ Fetch and XHR interceptors installed!');
})();