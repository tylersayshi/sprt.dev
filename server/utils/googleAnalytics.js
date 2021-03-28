import axios from 'axios';

const paramString = obj => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, val]) => params.append(key, val));
  return params.toString();
};

/**
 * Helper to track a google analytics event
 * @see https://cloud.google.com/appengine/docs/standard/nodejs/integrating-with-analytics
 * @param {string} action method being tracked
 * @param {string} label description of action tracked
 * @returns promise to google analytics request
 */
export const trackEvent = type => {
  const data = {
    // API Version.
    v: '1',
    // Tracking ID / Property ID.
    tid: process.env.GA_TRACKING_ID,
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: '555',
    // Event hit type.
    t: type
  };

  return axios.post(
    `https://www.google-analytics.com/collect?${paramString(data)}`,
    data
  );
};
